import type { MetadataRoute } from 'next'

const siteUrl = 'https://plaenc.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/inicio', '/terminos', '/privacidad', '/seguridad', '/soporte', '/sitemap.xml'],
      disallow: ['/', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
