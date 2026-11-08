import type { ReactNode } from 'react'
import { PublicFooter } from '@/components/PublicFooter'
import { PublicHeader } from '@/components/PublicHeader'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ledger-paper">
      <PublicHeader />
      <main id="main-content" className="relative overflow-hidden before:pointer-events-none before:absolute before:-left-28 before:-top-32 before:h-80 before:w-80 before:rounded-full before:bg-ledger-green/10 before:blur-3xl after:pointer-events-none after:absolute after:-bottom-40 after:-right-28 after:h-96 after:w-96 after:rounded-full after:bg-amber-200/30 after:blur-3xl">
        {children}
      </main>
      <PublicFooter />
    </div>
  )
}
