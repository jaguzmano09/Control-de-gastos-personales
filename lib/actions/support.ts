'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

const REQUEST_TYPES = new Set(['support', 'privacy', 'security'])
const REQUEST_STATUSES = new Set(['in_progress', 'resolved'])

export async function submitSupportRequest(input: { requestType: string; subject: string; message: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'Inicia sesión para enviar una solicitud.' }

  if (!input || typeof input !== 'object' || typeof input.requestType !== 'string' || typeof input.subject !== 'string' || typeof input.message !== 'string') {
    return { ok: false, message: 'Revisa la información de la solicitud.' }
  }
  const requestType = input.requestType.trim()
  const subject = input.subject.trim()
  const message = input.message.trim()
  if (!REQUEST_TYPES.has(requestType) || subject.length < 3 || subject.length > 120 || message.length < 10 || message.length > 3000) {
    return { ok: false, message: 'Revisa el tipo, el asunto y el mensaje. El mensaje debe tener entre 10 y 3000 caracteres.' }
  }

  const { error } = await supabase.rpc('submit_support_request', {
    p_request_type: requestType,
    p_subject: subject,
    p_message: message,
  })
  if (error) {
    const message = error.message.toLowerCase().includes('limit')
      ? 'Alcanzaste el límite temporal de solicitudes. Intenta nuevamente más tarde.'
      : 'No pudimos enviar tu solicitud. Revisa la información e intenta nuevamente.'
    return { ok: false, message }
  }
  revalidatePath('/soporte')
  return { ok: true, message: 'Solicitud recibida. Puedes consultar aquí el estado y nuestra respuesta.' }
}

export async function replyToSupportRequest(input: { requestId: string; response: string; status: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !input || typeof input !== 'object' || typeof input.requestId !== 'string' || typeof input.response !== 'string' || typeof input.status !== 'string' || !/^[0-9a-f-]{36}$/i.test(input.requestId) || !REQUEST_STATUSES.has(input.status) || input.response.trim().length < 1 || input.response.trim().length > 3000) {
    return { ok: false, message: 'No pudimos guardar la respuesta.' }
  }
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle()
  if (profile?.role !== 'admin') return { ok: false, message: 'No tienes autorización para responder.' }

  const { data, error } = await supabase.rpc('admin_reply_support_request', {
    p_request_id: input.requestId,
    p_response: input.response.trim(),
    p_status: input.status,
  })
  if (error || !data) return { ok: false, message: 'No pudimos guardar la respuesta.' }
  revalidatePath('/admin')
  revalidatePath('/soporte')
  return { ok: true, message: 'Respuesta guardada.' }
}
