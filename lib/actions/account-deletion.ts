'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { revokeGoogleOAuthToken } from '@/lib/gmail/client'

export type DeleteAccountResult = { ok: true; accountClosed: boolean } | { ok: false; error: string }

export async function deleteMyAccount(input: {
  password: string
  confirmation: string
  captchaToken: string
}): Promise<DeleteAccountResult> {
  if (!input || typeof input.password !== 'string' || typeof input.confirmation !== 'string' || typeof input.captchaToken !== 'string'
    || input.confirmation !== 'ELIMINAR' || input.password.length < 1 || input.password.length > 1024 || input.captchaToken.length > 4096) {
    return { ok: false, error: 'Confirma la frase y vuelve a escribir tu contraseña para continuar.' }
  }

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey || !input.captchaToken) {
    return { ok: false, error: 'Completa la verificación de seguridad para continuar.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, error: 'Tu sesión terminó. Inicia sesión nuevamente.' }

  const { data: reauthenticatedUser, error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: input.password,
    options: { captchaToken: input.captchaToken || undefined },
  })
  if (authError || reauthenticatedUser.user?.id !== user.id) {
    if (!authError && reauthenticatedUser.user?.id !== user.id) {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    }
    return { ok: false, error: 'No pudimos verificar tu contraseña. Revisa tus datos e inténtalo de nuevo.' }
  }

  const service = createServiceRoleClient()
  const { data: connection, error: connectionError } = await service
    .from('gmail_connections')
    .select('refresh_token, access_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (connectionError) return { ok: false, error: 'No pudimos preparar la desconexión segura de Gmail. Inténtalo más tarde.' }

  const googleToken = connection?.refresh_token || connection?.access_token
  if (googleToken && !(await revokeGoogleOAuthToken(googleToken))) {
    return { ok: false, error: 'No pudimos revocar el acceso de Gmail. Tu cuenta sigue activa; inténtalo más tarde.' }
  }

  const { error: preparationError } = await service.rpc('prepare_account_deletion', { p_user_id: user.id })
  if (preparationError) {
    if (googleToken) await service.from('gmail_connections').delete().eq('user_id', user.id)
    return { ok: false, error: 'No pudimos completar la eliminación. Tu cuenta de PlaENC y tus datos siguen activos; Gmail quedó desconectado. Contacta soporte privado.' }
  }

  const { error: deletionError } = await service.auth.admin.deleteUser(user.id, false)
  if (deletionError) {
    return { ok: true, accountClosed: false }
  }

  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
  return { ok: true, accountClosed: true }
}
