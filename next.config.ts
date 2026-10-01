import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Dev-Server auch aus dem Heimnetz erreichbar machen (z. B. Handy über http://192.168.x.y:3000).
  // Ohne diesen Eintrag blockiert Next.js die Hot-Reload-Verbindung, die Seite wird nicht
  // hydriert und kein Button reagiert. `*` steht für genau ein Segment der Adresse.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
}

export default nextConfig
