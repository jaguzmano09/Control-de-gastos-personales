import { NextResponse, type NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getProfile, revokeGoogleOAuthToken } from '@/lib/gmail/client'
import { timingSafeEqual } from 'node:crypto'
import { getTrustedSiteOrigin } from '@/lib/site-origin'

export async function GET(request: NextRequest) {
  const origin = getTrustedSiteOrigin(request.url)
  if (!origin) return new Response('Unsupported site origin', { status: 400 })
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const storedState = request.cookies.get('gmail_oauth_state')?.value
  const clearStateCookie = (response: NextResponse) => {
    response.cookies.set('gmail_oauth_state', '', {
      expires: new Date(0),
      httpOnly: true,
      path: '/api/gmail',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response
  }

  if (!code || !state || !storedState || !safeEqual(state, storedState)) {
    return clearStateCookie(
      NextResponse.redirect(new URL('/correo?error=Estado+OAuth+inv%C3%A1lido+o+expirado', request.url))
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let pendingGoogleToken: string | null = null

  try {
    const tokens = await exchangeCodeForTokens(code, `${origin}/api/gmail/callback`)
    pendingGoogleToken = tokens.refresh_token || tokens.access_token
    if (!user) {
      const revoked = await revokeGoogleOAuthToken(pendingGoogleToken)
      if (!revoked) return clearStateCookie(new NextResponse('PlaENC could not revoke the Google grant. Revoke PlaENC from your Google Account connections.', { status: 502, headers: { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain; charset=utf-8' } }))
      pendingGoogleToken = null
      return clearStateCookie(NextResponse.redirect(new URL('/login', request.url)))
    }

    const serviceRoleSupabase = createServiceRoleClient()
    const { data: deletionJob, error: deletionCheckError } = await serviceRoleSupabase
      .from('account_deletion_jobs')
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle()
    if (deletionCheckError || deletionJob?.status === 'data_removed') {
      const revoked = await revokeGoogleOAuthToken(pendingGoogleToken)
      if (revoked) pendingGoogleToken = null
      return clearStateCookie(NextResponse.redirect(new URL(revoked ? '/eliminar-cuenta?error=No+se+pudo+conectar+Gmail' : '/eliminar-cuenta?error=No+se+pudo+revocar+el+acceso+de+Gmail', request.url)))
    }

    if (!tokens.refresh_token) {
      await revokeGoogleOAuthToken(tokens.access_token)
      pendingGoogleToken = null
      return clearStateCookie(NextResponse.redirect(
        new URL('/correo?error=No+se+recibi%C3%B3+refresh_token%2C+revoca+el+acceso+en+Google+y+reintenta', request.url)
      ))
    }

    const profile = await getProfile(tokens.access_token)

    const { error } = await serviceRoleSupabase.from('gmail_connections').upsert(
      {
        user_id: user.id,
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        gmail_history_id: profile.historyId,
        is_active: true,
      },
      { onConflict: 'user_id' }
    )
    if (error) {
      throw error
    }

    pendingGoogleToken = null
    return clearStateCookie(NextResponse.redirect(new URL('/correo?connected=true', request.url)))
  } catch {
    const revoked = !pendingGoogleToken || await revokeGoogleOAuthToken(pendingGoogleToken)
    console.error('Gmail OAuth callback failed')
    if (!revoked && !user) {
      return clearStateCookie(new NextResponse('PlaENC could not revoke the Google grant. Revoke PlaENC from your Google Account connections.', { status: 502, headers: { 'Cache-Control': 'private, no-store', 'Content-Type': 'text/plain; charset=utf-8' } }))
    }
    if (!revoked && user) {
      return clearStateCookie(NextResponse.redirect(new URL('/eliminar-cuenta?error=No+se+pudo+revocar+el+acceso+de+Gmail', request.url)))
    }
    return clearStateCookie(
      NextResponse.redirect(new URL('/correo?error=No+se+pudo+conectar+Gmail', request.url))
    )
  }
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}
