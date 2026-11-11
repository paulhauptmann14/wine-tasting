import Link from 'next/link'

/** Legal links on every page. Extra bottom space on phones, so the fixed action bar never covers them. */
export function SiteFooter() {
  const link = 'inline-flex h-12 items-center transition-opacity duration-100 hover:text-foreground active:opacity-50'
  return (
    <footer className="mx-auto flex w-full max-w-[1100px] gap-6 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] text-sm text-muted-foreground sm:px-6 lg:pb-6">
      <Link href="/impressum" className={link}>
        Impressum
      </Link>
      <Link href="/datenschutz" className={link}>
        Datenschutz
      </Link>
    </footer>
  )
}
