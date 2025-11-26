/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zsavekrhfwrpqudhjvlq.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
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
          }
          // CSP TEMPORARILY DISABLED - Was blocking images
          // Re-enable after confirming images work, then tune the policy
          // {
          //   key: 'Content-Security-Policy',
          //   value: [
          //     "default-src 'self'",
          //     "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
          //     "style-src 'self' 'unsafe-inline'",
          //     "img-src * data: blob:",
          //     "font-src 'self' data:",
          //     "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          //     "media-src 'self' https: data:"
          //   ].join('; ')
          // }
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
