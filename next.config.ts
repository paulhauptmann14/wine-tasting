import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone server for the Docker image (Raspberry Pi); doesn't affect the Vercel deployment
  output: 'standalone',
  // Make the dev server reachable from the home network too (e.g. phone via http://192.168.x.y:3000).
  // Without this entry Next.js blocks the hot-reload connection, the page doesn't hydrate
  // and no button responds. `*` matches exactly one segment of the address.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
  // Same on Vercel and Docker. HSTS is left to the platform (Vercel, Cloudflare Tunnel).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // The tasting code is in the URL – never send it to other sites
          { key: 'Referrer-Policy', value: 'same-origin' },
          // No embedding in frames on other sites (clickjacking on admin actions)
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Tastings are private – even if a link ends up somewhere public
        source: '/(tasting|manage)/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
}

export default nextConfig
