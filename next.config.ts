import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Standalone server for the Docker image (Raspberry Pi); doesn't affect the Vercel deployment
  output: 'standalone',
  // Make the dev server reachable from the home network too (e.g. phone via http://192.168.x.y:3000).
  // Without this entry Next.js blocks the hot-reload connection, the page doesn't hydrate
  // and no button responds. `*` matches exactly one segment of the address.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
}

export default nextConfig
