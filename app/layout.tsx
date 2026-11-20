import './globals.css'

import type { Metadata, Viewport } from 'next'
import { RegisterServiceWorker } from '@/components/RegisterServiceWorker'

export const metadata: Metadata = {
  metadataBase: new URL('https://plaenc.vercel.app'),
  title: { default: 'PlaENC', template: '%s | PlaENC' },
  description: 'Registra tus movimientos y entiende tu plata en contexto.',
  openGraph: {
    type: 'website',
    locale: 'es_CO',
    siteName: 'PlaENC',
    title: 'PlaENC | Tu plata, en contexto',
    description: 'Registra tus movimientos y entiende dónde está tu plata y para qué la separaste.',
    url: 'https://plaenc.vercel.app/inicio',
    images: [{ url: '/icons/icon-512.png', width: 512, height: 512, alt: 'PlaENC' }],
  },
  twitter: {
    card: 'summary',
    title: 'PlaENC | Tu plata, en contexto',
    description: 'Registra tus movimientos y entiende dónde está tu plata y para qué la separaste.',
    images: ['/icons/icon-512.png'],
  },
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
