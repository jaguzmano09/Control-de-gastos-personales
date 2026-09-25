'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silencioso: si falla el registro, la app sigue funcionando normal, solo sin modo offline
      })
    }
  }, [])
  return null
}