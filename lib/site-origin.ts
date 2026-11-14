const PRODUCTION_ORIGINS = new Set([
  'https://plaenc.vercel.app',
  'https://control-de-gastos-personales-nine.vercel.app',
])

export function getTrustedSiteOrigin(requestUrl: string): string | null {
  const origin = new URL(requestUrl).origin
  if (PRODUCTION_ORIGINS.has(origin)) return origin
  if (process.env.NODE_ENV !== 'production' && origin === 'http://localhost:3000') return origin
  return null
}
