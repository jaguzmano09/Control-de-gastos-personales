import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'

const NAV_ITEMS = [
  { href: '/', label: 'Resumen' },
  { href: '/transacciones', label: 'Transacciones' },
  { href: '/revision', label: 'Revisión' },
  { href: '/presupuestos/categorias', label: 'Presupuesto por categoría' },
  { href: '/presupuestos/bolsillos', label: 'Presupuesto por bolsillo' },
  { href: '/cuentas', label: 'Cuentas' },
  { href: '/reglas', label: 'Reglas' },
  { href: '/correo', label: 'Correo' },
]

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-ledger-paper">
      <div className="mx-auto flex max-w-6xl">
        <aside className="hidden w-56 shrink-0 border-r border-black/10 px-4 py-8 md:block">
          <h1 className="font-serif text-lg text-ledger-text">Control de gastos</h1>
          <div className="mt-2 h-px w-8 bg-ledger-green" />
          <nav className="mt-8 flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-sm px-2 py-1.5 text-sm text-ledger-muted hover:bg-black/5 hover:text-ledger-text"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-10 border-t border-black/10 pt-4">
            <p className="truncate text-xs text-ledger-muted">{user?.email}</p>
            <form action={signOut}>
              <button className="mt-2 text-sm text-ledger-green hover:underline">
                Salir
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  )
}