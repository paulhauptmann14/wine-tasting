import type { MetadataRoute } from 'next'

/** Only the home page may be crawled; tastings are private. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/$', disallow: '/' },
  }
}
