'use client'

import { FormEvent, useState, useTransition } from 'react'
import { replyToSupportRequest } from '@/lib/actions/support'

export type AdminSupportRequest = {
  id: string
  user_id: string
  request_type: string
  subject: string
  message: string
  status: string
  admin_response: string | null
  responded_at: string | null
  created_at: string
}

export function SupportInbox({ requests, error }: { requests: AdminSupportRequest[]; error: boolean }) {
  if (error) return <p role="alert" className="p-5 text-sm text-red-700">No fue posible cargar las solicitudes privadas.</p>
  if (!requests.length) return <p className="p-5 text-sm text-ledger-muted">No hay solicitudes pendientes.</p>
  return <ul className="divide-y divide-ledger-line">{requests.map((request) => <SupportRequest key={request.id} request={request} />)}</ul>
}

function SupportRequest({ request }: { request: AdminSupportRequest }) {
  const [response, setResponse] = useState(request.admin_response ?? '')
  const [status, setStatus] = useState(request.status === 'resolved' ? 'resolved' : 'in_progress')
  const [feedback, setFeedback] = useState('')
  const [pending, startTransition] = useTransition()
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback('')
    startTransition(async () => {
      const result = await replyToSupportRequest({ requestId: request.id, response, status })
      setFeedback(result.message)
    })
  }
  return <li className="p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h3 className="font-serif text-xl text-ledger-text">{request.subject}</h3><p className="mt-1 text-xs text-ledger-muted">{typeName(request.request_type)} · {new Date(request.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })}</p></div>
      <span className="rounded-full bg-ledger-paper px-3 py-1 text-xs font-medium text-ledger-muted">{request.status === 'resolved' ? 'Respondida' : request.status === 'in_progress' ? 'En gestión' : 'Recibida'}</span>
    </div>
    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ledger-text">{request.message}</p>
    <p className="mt-2 text-xs text-ledger-muted">Cuenta solicitante: {request.user_id}</p>
    <form onSubmit={submit} className="mt-5 grid gap-3 rounded-xl bg-ledger-paper p-4">
      <label className="grid gap-1.5 text-sm font-medium text-ledger-text">Respuesta privada<textarea className="input min-h-24 resize-y" required maxLength={3000} value={response} onChange={(event) => setResponse(event.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-3"><label className="text-sm text-ledger-text">Estado <select className="input ml-2" value={status} onChange={(event) => setStatus(event.target.value)}><option value="in_progress">En gestión</option><option value="resolved">Respondida</option></select></label><button disabled={pending} className="btn btn-primary">{pending ? 'Guardando…' : 'Guardar respuesta'}</button></div>
      {feedback && <p role="status" className="text-sm text-ledger-green">{feedback}</p>}
    </form>
  </li>
}

function typeName(type: string) { return ({ support: 'Soporte', privacy: 'Privacidad', security: 'Seguridad' } as Record<string, string>)[type] ?? 'Soporte' }
