import type { ReactNode } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SidebarMenu } from '@/components/SidebarMenu'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('user_profiles').select('role').eq('user_id', user.id).maybeSingle()
    : { data: null }

  return (
    <div className="min-h-screen bg-ledger-paper">
      <SidebarMenu userEmail={user?.email} isAdmin={profile?.role === 'admin'} />
      <main id="main-content" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-9 lg:px-10">
        <div className="mb-8 flex items-center justify-between gap-4 border-b border-ledger-line/80 pb-5">
          <div>
            <p className="eyebrow">Control financiero personal</p>
            <p className="mt-1 text-xs text-ledger-muted">Registra y revisa cada movimiento con claridad.</p>
          </div>
          <Link href="/" className="btn btn-secondary btn-sm hidden shrink-0 sm:inline-flex">
            Resumen
          </Link>
        </div>
        {children}
      </main>
    </div>
  )
}
