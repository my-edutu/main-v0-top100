/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // `unoptimized: true` came from the v0 scaffold and was the single largest
    // driver of Supabase cached egress: it disables Vercel's optimizer, so every
    // <Image> streamed the full-size original out of Storage on every view and
    // Vercel never kept a resized copy. Leave it off — the optimizer downscales
    // to the requested `sizes` and serves the result from its own CDN, which
    // turns N views of a photo into one Storage read.
    formats: ['image/avif', 'image/webp'],
    // Storage objects are content-addressed by upload path, so a long TTL is
    // safe and keeps re-fetches off Supabase.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'flagcdn.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
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
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            // Enforce HTTPS in production
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            // Prevent clickjacking attacks
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            // Prevent MIME type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            // XSS Protection (legacy but good to have)
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            // Control referrer information
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            // Disable unnecessary browser features
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          },
          {
            // Content Security Policy - protects against XSS and injection attacks
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: self, inline (for Next.js), eval (for dev), Turnstile
              // CAPTCHA, and the Brevo SDK loader injected by app/layout.tsx.
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com https://cdn.brevo.com",
              // Styles: self and inline (for styled components)
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: allow all sources, data URIs, and blobs (for uploaded images)
              "img-src * data: blob:",
              // Fonts: self, data URIs, and Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Connections: self, Supabase, Turnstile verification, and Brevo.
              // The browser SDK talks to in-automate.brevo.com and
              // sibautomation.com — api.brevo.com is only ever called
              // server-side, so allowing it alone left the SDK mute.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com https://in-automate.brevo.com https://sibautomation.com https://challenges.cloudflare.com",
              // Frames: Turnstile CAPTCHA widget + YouTube players (Impact
              // Interviews, awardee profile videos). Without youtube-nocookie.com
              // here the embeds are silently blocked by CSP in production.
              "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com",
              // Media: self and external sources
              "media-src 'self' https: data:",
              // Object: none (no plugins)
              "object-src 'none'",
              // Base URI: self only
              "base-uri 'self'",
              // Form action: self only
              "form-action 'self'",
              // Frame ancestors: prevent embedding
              "frame-ancestors 'none'"
            ].join('; ')
          }
        ]
      },

      {
        // API routes - additional security headers
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0'
          }
        ]
      }
    ]
  },
}

export default nextConfig
