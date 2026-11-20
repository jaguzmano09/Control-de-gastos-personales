import type { MetadataRoute } from 'next'

const siteUrl = 'https://plaenc.vercel.app'
const publicPages = ['/inicio', '/terminos', '/privacidad', '/seguridad', '/soporte']

export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map((path) => ({
    url: `${siteUrl}${path}`,
  }))
}
