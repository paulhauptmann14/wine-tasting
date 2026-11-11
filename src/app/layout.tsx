import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Newsreader } from 'next/font/google'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { VercelAnalytics } from '@/components/vercel-analytics'
import { THEME_COLORS, THEME_COOKIE, parseTheme } from '@/lib/theme'
import './globals.css'

// Serif with optical sizes for titles and wine names – only used where ui-serif (New York) is missing
const newsreader = Newsreader({ subsets: ['latin'], axes: ['opsz'], style: ['normal'], variable: '--font-newsreader' })

export const metadata: Metadata = {
  title: 'Wine Tasting',
  description: 'Weine gemeinsam verkosten, bewerten und auflösen.',
}

// Safari tints its bars with theme-color: follow the in-app choice, not only the system setting
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return {
    themeColor: theme
      ? THEME_COLORS[theme]
      : [
          { media: '(prefers-color-scheme: light)', color: THEME_COLORS.light },
          { media: '(prefers-color-scheme: dark)', color: THEME_COLORS.dark },
        ],
    colorScheme: theme ?? 'light dark',
  }
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Apply the saved choice on the server – avoids a flash of the wrong colors
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html lang="de" data-theme={theme} className={newsreader.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <SiteHeader theme={theme} />
        {/* Own wrapper instead of overflow on body: that would propagate to the viewport */}
        <div className="overflow-x-clip">{children}</div>
        <SiteFooter />
        {/* Vercel only – the analytics endpoint doesn't exist when running in Docker */}
        {process.env.VERCEL === '1' && <VercelAnalytics />}
      </body>
    </html>
  )
}
