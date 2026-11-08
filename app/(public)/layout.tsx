import type { ReactNode } from 'react'
import { PublicFooter } from '@/components/PublicFooter'
import { PublicHeader } from '@/components/PublicHeader'

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ledger-paper">
      <PublicHeader />
      <main id="main-content">{children}</main>
      <PublicFooter />
    </div>
  )
}
