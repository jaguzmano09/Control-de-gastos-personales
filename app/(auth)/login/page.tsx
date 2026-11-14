'use client'

import { FormEvent, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

const TERMS_VERSION = '2026-11-08'
const PRIVACY_VERSION = '2026-11-08'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function selectMode(nextMode: Mode) {
    setMode(nextMode)
    setError('')
    setMessage('')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (mode === 'signup') {
      if (!acceptedTerms) {
        setError('Debes aceptar los Términos de uso y la Política de privacidad para crear tu cuenta.')
        return
      }
      if (password !== passwordConfirmation) {
        setError('Las contraseñas no coinciden.')
        return
      }
    }

    setLoading(true)
    const supabase = createClient()

    if (mode === 'login') {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) setError(signInError.message)
      else window.location.assign('/')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          terms_version: TERMS_VERSION,
          privacy_version: PRIVACY_VERSION,
          terms_accepted_at: new Date().toISOString(),
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
    } else if (data.session) {
      window.location.assign('/')
    } else {
      setMessage('Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.')
    }
    setLoading(false)
  }

  return (
    <div>
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(23rem,.75fr)] lg:gap-16">
          <div className="relative z-10 max-w-2xl pt-2">
            <p className="eyebrow">Tu espacio financiero personal</p>
            <h1 className="mt-5 font-serif text-5xl leading-[0.92] tracking-tight text-ledger-text sm:text-6xl lg:text-7xl">
              Entiende tu dinero.<br />
              <span className="text-ledger-green">Decide con tranquilidad.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ledger-muted sm:text-lg">
              Registra movimientos, organiza presupuestos y conserva el contexto que necesitas para tomar mejores decisiones cotidianas.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ledger-text">
              Tú revisas y confirmas cada dato antes de que afecte tus saldos, presupuestos o resúmenes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#acceso" onClick={() => selectMode('signup')} className="btn btn-primary">Crear mi cuenta</a>
              <a href="#como-funciona" className="btn btn-secondary">Conocer la plataforma</a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-ledger-muted">
              <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden="true" />
              Las integraciones de correo y captura por foto se habilitan progresivamente según su confiabilidad.
            </p>
          </div>

          <section id="acceso" aria-labelledby="access-title" className="relative z-10 scroll-mt-6 rounded-[1.75rem] border border-ledger-line bg-white/95 p-6 shadow-[0_20px_50px_rgba(20,37,29,0.11)] sm:p-8">
            <div className="flex rounded-xl bg-ledger-paper p-1" role="tablist" aria-label="Acceso a la plataforma">
              <button type="button" role="tab" aria-selected={mode === 'login'} onClick={() => selectMode('login')} className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30 ${mode === 'login' ? 'bg-white text-ledger-green shadow-sm' : 'text-ledger-muted hover:text-ledger-text'}`}>Iniciar sesión</button>
              <button type="button" role="tab" aria-selected={mode === 'signup'} onClick={() => selectMode('signup')} className={`min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30 ${mode === 'signup' ? 'bg-white text-ledger-green shadow-sm' : 'text-ledger-muted hover:text-ledger-text'}`}>Crear cuenta</button>
            </div>

            <div className="mt-7">
              <p className="eyebrow">{mode === 'login' ? 'Qué bueno verte' : 'Crea tu espacio'}</p>
              <h2 id="access-title" className="mt-2 font-serif text-3xl tracking-tight text-ledger-text">{mode === 'login' ? 'Continúa donde quedaste' : 'Empieza con claridad'}</h2>
              <p className="mt-2 text-sm leading-6 text-ledger-muted">{mode === 'login' ? 'Accede a tu espacio financiero personal.' : 'Configura tu espacio y registra tu primer movimiento a tu ritmo.'}</p>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submit}>
              <label className="block text-sm font-medium text-ledger-text">Correo electrónico
                <input className="input mt-2 min-h-12 w-full px-4" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
              <label className="block text-sm font-medium text-ledger-text">Contraseña
                <input className="input mt-2 min-h-12 w-full px-4" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
                {mode === 'signup' && <span className="mt-1.5 block text-xs font-normal leading-5 text-ledger-muted">Usa al menos 8 caracteres y una contraseña que no reutilices.</span>}
              </label>
              {mode === 'signup' && <>
                <label className="block text-sm font-medium text-ledger-text">Confirmar contraseña
                  <input className="input mt-2 min-h-12 w-full px-4" type="password" autoComplete="new-password" minLength={8} required value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} />
                </label>
                <label className="flex items-start gap-3 rounded-xl border border-ledger-line bg-ledger-paper/60 p-3 text-sm leading-5 text-ledger-muted">
                  <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-ledger-line text-ledger-green focus:ring-ledger-green" required />
                  <span>He leído y acepto los <a className="font-medium text-ledger-green underline underline-offset-2" href="/terminos" target="_blank">Términos de uso</a> y la <a className="font-medium text-ledger-green underline underline-offset-2" href="/privacidad" target="_blank">Política de privacidad</a>.</span>
                </label>
              </>}
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-5 text-red-700">{error}</p>}
              {message && <p role="status" className="rounded-xl border border-ledger-green/20 bg-ledger-green/5 px-3 py-2.5 text-sm leading-5 text-ledger-green">{message}</p>}
              <button className="btn btn-primary btn-full min-h-12" disabled={loading}>{loading ? 'Procesando...' : mode === 'login' ? 'Entrar a mi espacio' : 'Crear mi cuenta'}</button>
            </form>
            {mode === 'login' && <p className="mt-5 text-center text-sm text-ledger-muted">¿Aún no tienes cuenta? <button type="button" onClick={() => selectMode('signup')} className="font-semibold text-ledger-green underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ledger-green/30">Crear cuenta</button></p>}
          </section>
        </div>
      </section>

      <section id="como-funciona" className="relative z-10 border-y border-ledger-line/80 bg-white/70 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl"><p className="eyebrow">Cómo funciona</p><h2 className="mt-3 font-serif text-3xl tracking-tight text-ledger-text sm:text-4xl">Control para lo cotidiano, contexto para decidir.</h2><p className="mt-3 leading-7 text-ledger-muted">La plataforma reúne las tareas financieras que se repiten cada mes sin convertirlas en un tablero difícil de entender.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-3">
            <Feature number="01" title="Configura tu espacio" description="Crea cuentas, categorías y presupuestos que reflejen tu forma real de manejar el dinero." />
            <Feature number="02" title="Registra y revisa" description="Añade movimientos manualmente o usa herramientas asistidas. Las automatizaciones esperan tu revisión." />
            <Feature number="03" title="Decide con contexto" description="Consulta disponible, presupuesto, actividad y pendientes sin perder de vista lo importante." />
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div><p className="eyebrow">Diseñada para darte control</p><h2 className="mt-3 font-serif text-3xl tracking-tight text-ledger-text sm:text-4xl">Tus decisiones siguen siendo tuyas.</h2><p className="mt-4 leading-7 text-ledger-muted">La plataforma está diseñada para que un dato automático no modifique tus finanzas sin tu confirmación. El correo y la captura por foto son opcionales y se habilitan progresivamente mientras comprobamos que funcionen con fiabilidad.</p><a href="/seguridad" className="btn btn-secondary mt-6">Conocer nuestras prácticas</a></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TrustCard title="Revisión antes de impacto" description="Solo los movimientos confirmados afectan tus cálculos financieros." />
            <TrustCard title="Integraciones opcionales" description="Tú decides cuándo usar correo o captura inteligente." />
            <TrustCard title="Privacidad visible" description="Consulta cómo se usa tu información antes de crear una cuenta." />
            <TrustCard title="Producto en evolución" description="Tu feedback ayuda a mejorar las integraciones con criterio y responsabilidad." />
          </div>
        </div>
      </section>

      <section className="relative z-10 bg-ledger-green px-4 py-14 text-white sm:px-6 sm:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Nuestro propósito</p><h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">Hacer que el control financiero personal sea más claro, humano y práctico.</h2><p className="mt-4 text-sm leading-6 text-white/75">PlaENC es un proyecto independiente creado para transformar movimientos cotidianos en información útil para quien los registra.</p></div>
      </section>
    </div>
  )
}

function Feature({ number, title, description }: { number: string; title: string; description: string }) {
  return <article className="surface-card p-5"><p className="text-xs font-semibold tracking-[0.16em] text-ledger-green">{number}</p><h3 className="mt-4 font-serif text-2xl text-ledger-text">{title}</h3><p className="mt-2 text-sm leading-6 text-ledger-muted">{description}</p></article>
}

function TrustCard({ title, description }: { title: string; description: string }) {
  return <article className="rounded-2xl border border-ledger-line bg-white/90 p-5 shadow-[0_10px_28px_rgba(20,37,29,0.055)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ledger-green/10 text-ledger-green" aria-hidden="true">✓</span><h3 className="mt-4 font-semibold text-ledger-text">{title}</h3><p className="mt-2 text-sm leading-6 text-ledger-muted">{description}</p></article>
}
