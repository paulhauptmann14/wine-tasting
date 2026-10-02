import type { MetadataRoute } from 'next'
import { APP_ICON_COLORS } from '@/lib/app-icon'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wine Tasting',
    short_name: 'Tasting',
    description: 'Weine gemeinsam verkosten, bewerten und auflösen.',
    lang: 'de',
    start_url: '/',
    display: 'standalone',
    background_color: APP_ICON_COLORS.background,
    theme_color: APP_ICON_COLORS.background,
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
