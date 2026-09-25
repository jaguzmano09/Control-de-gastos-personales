import type { ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import { SidebarMenu } from '@/components/SidebarMenu'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-ledger-paper">
      <SidebarMenu userEmail={user?.email} />
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex justify-end">
          <a href="/" className="btn btn-secondary">
            Volver al inicio
          </a>
        </div>
        {children}
      </main>
    </div>
  )
}