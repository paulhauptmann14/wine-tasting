import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Bodoni_Moda, IBM_Plex_Mono, Schibsted_Grotesk } from 'next/font/google'
import { ThemeToggle } from '@/components/theme-toggle'
import { THEME_COOKIE, parseTheme } from '@/lib/theme'
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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Gespeicherte Wahl serverseitig setzen – so gibt es kein Aufblitzen der falschen Farben
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html lang="de" data-theme={theme} className={`${bodoni.variable} ${schibsted.variable} ${plex.variable}`}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <div className="mx-auto flex w-full max-w-[1100px] justify-end px-2 pt-2 sm:px-4">
          <ThemeToggle initial={theme} />
        </div>
        {children}
      </body>
    </html>
  )
}
