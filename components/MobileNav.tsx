'use client'

import { useState } from 'react'
import { NAV_ITEMS } from '@/lib/nav-items'
import { signOut } from '@/lib/actions/auth'

export function MobileNav({ userEmail }: { userEmail?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <div className="flex items-center justify-between border-b border-black/10 bg-ledger-paper px-4 py-3">
        <span className="font-serif text-lg text-ledger-text">Control de gastos</span>
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" className="rounded-sm border border-black/10 p-2 text-ledger-text">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-ledger-ink/40" onClick={() => setOpen(false)}>
          <nav className="absolute inset-y-0 left-0 w-64 bg-ledger-paper p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg text-ledger-text">Menú</span>
              <button onClick={() => setOpen(false)} aria-label="Cerrar menú" className="text-ledger-muted">✕</button>
            </div>
            <div className="mt-2 h-px w-8 bg-ledger-green" />

            <ul className="mt-6 space-y-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a href={item.href} onClick={() => setOpen(false)} className="block rounded-sm px-2 py-2 text-sm text-ledger-text hover:bg-black/5">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-8 border-t border-black/10 pt-4">
              {userEmail && <p className="truncate text-xs text-ledger-muted">{userEmail}</p>}
              <button onClick={() => signOut()} className="mt-2 text-sm text-ledger-green hover:underline">Salir</button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}