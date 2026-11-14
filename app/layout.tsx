import './globals.css'

import type { Metadata, Viewport } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'

export const metadata: Metadata = {
  title: { default: 'PlaENC', template: '%s | PlaENC' },
  description: 'Registra tus movimientos y entiende tu plata en contexto.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'PlaENC' },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
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
