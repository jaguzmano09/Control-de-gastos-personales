import './globals.css'

import type { Metadata, Viewport } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'

export const metadata: Metadata = {
  title: { default: 'PlaENC', template: '%s | PlaENC' },
  description: 'Registra tus movimientos y entiende tu plata en contexto.',
  manifest: '/manifest.webmanifest?v=plaenc-b2',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PlaENC' },
  icons: {
    icon: [
      { url: '/favicon.svg?v=plaenc-b2', type: 'image/svg+xml' },
      { url: '/icons/favicon-16.png?v=plaenc-b2', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png?v=plaenc-b2', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=plaenc-b2',
    apple: '/icons/apple-touch-icon.png?v=plaenc-b2',
  },
}

export const viewport: Viewport = {
  themeColor: '#1D5138',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-CO">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
