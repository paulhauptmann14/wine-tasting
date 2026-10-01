import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { Bodoni_Moda, IBM_Plex_Mono, Schibsted_Grotesk } from 'next/font/google'
import './globals.css'

const bodoni = Bodoni_Moda({ subsets: ['latin'], variable: '--font-bodoni', style: ['normal', 'italic'] })
const schibsted = Schibsted_Grotesk({ subsets: ['latin'], variable: '--font-schibsted' })
const plex = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-plex' })

export const metadata: Metadata = {
  title: 'Wine Tasting',
  description: 'Weine gemeinsam verkosten, bewerten und auflösen.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F4F4F6' },
    { media: '(prefers-color-scheme: dark)', color: '#121214' },
  ],
  colorScheme: 'light dark',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de" className={`${bodoni.variable} ${schibsted.variable} ${plex.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  )
}
