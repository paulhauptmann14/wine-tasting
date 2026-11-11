import type { ReactNode } from 'react'
import type { Metadata, Viewport } from 'next'
import { cookies } from 'next/headers'
import { Newsreader } from 'next/font/google'
import { ThemeToggle } from '@/components/theme-toggle'
import { VercelAnalytics } from '@/components/vercel-analytics'
import { THEME_COOKIE, parseTheme } from '@/lib/theme'
import './globals.css'

// Serif with optical sizes for titles and wine names – only used where ui-serif (New York) is missing
const newsreader = Newsreader({ subsets: ['latin'], axes: ['opsz'], style: ['normal'], variable: '--font-newsreader' })

export const metadata: Metadata = {
  title: 'Wine Tasting',
  description: 'Weine gemeinsam verkosten, bewerten und auflösen.',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F2F2F7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  colorScheme: 'light dark',
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Apply the saved choice on the server – avoids a flash of the wrong colors
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value)
  return (
    <html lang="de" data-theme={theme} className={newsreader.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <div className="mx-auto flex w-full max-w-[1100px] justify-end px-2 pt-2 sm:px-4">
          <ThemeToggle initial={theme} />
        </div>
        {/* Own wrapper instead of overflow on body: that would propagate to the viewport */}
        <div className="overflow-x-clip">{children}</div>
        {/* Vercel only – the analytics endpoint doesn't exist when running in Docker */}
        {process.env.VERCEL === '1' && <VercelAnalytics />}
      </body>
    </html>
  )
}
