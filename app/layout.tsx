import './globals.css'

import type { Metadata, Viewport } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'

export const metadata: Metadata = {
  title: 'Control de gastos',
  description: 'Control personal de gastos, presupuestos y bolsillos',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Gastos' },
  icons: { apple: '/icons/apple-touch-icon.png', icon: '/favicon-32.png' },
}

export const viewport: Viewport = {
  themeColor: '#0F1A2B',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}