'use client'

import { FormEvent, useState, useTransition } from 'react'
import { submitSupportRequest } from '@/lib/actions/support'

export function SupportRequestForm() {
  const [type, setType] = useState('support')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const result = await submitSupportRequest({ requestType: type, subject, message })
      setFeedback(result)
      if (result.ok) { setSubject(''); setMessage('') }
    })
  }

  return <form onSubmit={submit} className="mt-5 grid gap-4">
    <label className="grid gap-1.5 text-sm font-medium text-ledger-text">Tipo de solicitud
      <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
        <option value="support">Ayuda con PlaENC</option><option value="privacy">Solicitud sobre mis datos</option><option value="security">Reporte de seguridad</option>
      </select>
    </label>
    <label className="grid gap-1.5 text-sm font-medium text-ledger-text">Asunto
      <input className="input" required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} />
    </label>
    <label className="grid gap-1.5 text-sm font-medium text-ledger-text">Mensaje
      <textarea className="input min-h-36 resize-y" required minLength={10} maxLength={3000} value={message} onChange={(event) => setMessage(event.target.value)} />
      <span className="text-right text-xs font-normal text-ledger-muted">{message.length}/3000</span>
    </label>
    {feedback && <p role={feedback.ok ? 'status' : 'alert'} className={`text-sm ${feedback.ok ? 'text-ledger-green' : 'text-red-700'}`}>{feedback.message}</p>}
    <button className="btn btn-primary w-fit" disabled={pending}>{pending ? 'Enviando…' : 'Enviar solicitud'}</button>
  </form>
}
