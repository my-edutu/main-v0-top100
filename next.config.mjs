import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

function deploymentId() {
  if (process.env.NEXT_DEPLOYMENT_ID) return process.env.NEXT_DEPLOYMENT_ID
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch {
    // Build contexts can omit .git. Derive a stable source fingerprint rather
    // than choosing a new random ID every time next start reads this config.
    const hash = createHash('sha256')
    function add(path) {
      for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const file = join(path, entry.name)
        if (entry.isDirectory()) add(file)
        else if (entry.isFile()) hash.update(file).update(readFileSync(file))
      }
    }
    for (const folder of ['app', 'lib', 'components']) if (existsSync(folder)) add(folder)
    for (const file of ['package-lock.json', 'next.config.mjs']) if (existsSync(file)) hash.update(readFileSync(file))
    return hash.digest('hex').slice(0, 40)
  }
}

/** @type {import('next').NextConfig} */
const productionScriptSrc = "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cdn.brevo.com https://sibautomation.com"
const developmentScriptSrc = "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://cdn.brevo.com https://sibautomation.com"
const scriptSrc = process.env.NODE_ENV === 'production' ? productionScriptSrc : developmentScriptSrc

const nextConfig = {
  deploymentId: deploymentId(),
  // Cloudflare supplies Brotli/gzip. Avoid duplicate origin compression and its
  // drain-listener accumulation in Next's bundled compression middleware.
  compress: false,
  // Docker runs its minimal server; Dokploy's npm build uses next start.
  ...(process.env.NEXT_OUTPUT_STANDALONE === 'true' ? { output: 'standalone' } : {}),
  async redirects() {
    return [
      {
        source: '/initiatives/talk100',
        destination: '/initiatives/talk100-live',
        permanent: true,
      },
    ]
  },
  images: {
    // Keep image optimization enabled so remote originals are resized and cached
    // by the deployment CDN instead of repeatedly streamed from Storage.
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'supabase.top100afl.com',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        // Public selected covers served from Cloudflare R2.
        protocol: 'https',
        hostname: 'media.top100afl.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src * data: blob:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://supabase.top100afl.com wss://supabase.top100afl.com https://api.brevo.com https://in-automate.brevo.com https://sibautomation.com https://challenges.cloudflare.com https://cloudflareinsights.com",
              "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com",
              "media-src 'self' https: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ]
  },
}

export default nextConfig
