'use client'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window { turnstile?: TurnstileApi }
}

export function TurnstileChallenge({ siteKey, onToken, resetCount }: {
  siteKey: string
  onToken: (token: string) => void
  resetCount: number
}) {
  const container = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const [unavailable, setUnavailable] = useState(false)

  function renderWidget() {
    if (!container.current || !window.turnstile || widget.current !== null) return
    widget.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      callback: (token: string) => { setUnavailable(false); onToken(token) },
      'expired-callback': () => onToken(''),
      'error-callback': () => { onToken(''); setUnavailable(true) },
    })
  }

  useEffect(() => {
    if (resetCount && widget.current !== null) window.turnstile?.reset(widget.current)
  }, [resetCount])

  useEffect(() => () => {
    if (widget.current !== null) window.turnstile?.remove(widget.current)
    widget.current = null
  }, [])

  return <div>
    <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderWidget} onError={() => setUnavailable(true)} />
    <div ref={container} />
    {unavailable && <p role="alert" className="feedback feedback-warning">No pudimos cargar la verificación. Actualiza la página e inténtalo de nuevo.</p>}
  </div>
}
