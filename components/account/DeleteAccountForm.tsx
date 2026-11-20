'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { TurnstileChallenge } from '@/components/TurnstileChallenge'
import { deleteMyAccount } from '@/lib/actions/account-deletion'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function DeleteAccountForm({ email, deletionPending }: { email: string; deletionPending: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!TURNSTILE_SITE_KEY || !captchaToken) {
      setError('Completa la verificación de seguridad para continuar.')
      return
    }

    setBusy(true)
    const result = await deleteMyAccount({ password, confirmation, captchaToken })
    setPassword('')
    setCaptchaToken('')
    setCaptchaReset((count) => count + 1)
    if (!result.ok) {
      setError(result.error)
      setBusy(false)
      return
    }
    if (result.accountClosed) {
      router.replace('/cuenta-eliminada')
      router.refresh()
      return
    }
    router.refresh()
    setBusy(false)
  }

  return <form onSubmit={submit} className="mt-6 space-y-5">
    <div className="rounded-xl border border-ledger-line bg-ledger-paper/70 p-4 text-sm leading-6 text-ledger-muted">
      <p><span className="font-medium text-ledger-text">Cuenta:</span> {email}</p>
      {deletionPending && <p className="mt-2 text-amber-800">Tus datos de PlaENC ya se eliminaron. Falta cerrar la cuenta de acceso; vuelve a confirmar tu contraseña para completar ese paso.</p>}
    </div>
    <label className="block text-sm font-medium text-ledger-text">Contraseña actual
      <input className="input mt-2 min-h-12 w-full px-4" type="password" autoComplete="current-password" required minLength={1} maxLength={1024} value={password} onChange={(event) => setPassword(event.target.value)} />
    </label>
    <label className="block text-sm font-medium text-ledger-text">Escribe ELIMINAR para confirmar
      <input className="input mt-2 min-h-12 w-full px-4" type="text" autoComplete="off" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
    </label>
    {TURNSTILE_SITE_KEY && <TurnstileChallenge siteKey={TURNSTILE_SITE_KEY} onToken={setCaptchaToken} resetCount={captchaReset} />}
    {error && <p role="alert" className="feedback feedback-error">{error}</p>}
    <button className="btn btn-danger min-h-12" disabled={busy}>{busy ? 'Procesando…' : deletionPending ? 'Completar cierre de cuenta' : 'Eliminar mi cuenta y mis datos'}</button>
  </form>
}
