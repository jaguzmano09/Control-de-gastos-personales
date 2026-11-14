const CANONICAL_ORIGIN = 'https://plaenc.vercel.app'
const LEGACY_ORIGIN = 'https://control-de-gastos-personales-nine.vercel.app'
const PRODUCTION_ORIGINS = new Set([CANONICAL_ORIGIN, LEGACY_ORIGIN])
const LEGACY_ASSET_PATHS = new Set(['/manifest.webmanifest', '/sw.js', '/offline.html'])

export function getTrustedSiteOrigin(requestUrl: string): string | null {
  const origin = new URL(requestUrl).origin
  if (PRODUCTION_ORIGINS.has(origin)) return origin
  if (process.env.NODE_ENV !== 'production' && origin === 'http://localhost:3000') return origin
  return null
}

export function getCanonicalPageUrl(requestUrl: string, method: string): string | null {
  const url = new URL(requestUrl)
  if (url.origin !== LEGACY_ORIGIN || (method !== 'GET' && method !== 'HEAD')) return null
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/') || LEGACY_ASSET_PATHS.has(url.pathname)) return null
  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`
}
