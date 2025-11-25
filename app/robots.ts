import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/auth/admin-setup',
          '/auth/fix-admin',
          '/auth/status',
        ],
      },
      {
        userAgent: 'GPTBot', // ChatGPT crawler
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/'],
      },
      {
        userAgent: 'Claude-Web', // Claude crawler
        allow: '/',
        disallow: ['/api/', '/admin/', '/auth/'],
      },
    ],
    sitemap: 'https://www.top100afl.org/sitemap.xml',
  }
}
