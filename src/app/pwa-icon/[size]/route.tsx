import { notFound } from 'next/navigation'
import { appIconImage } from '@/app/app-icon-image'

/** PNG icons for the web app manifest (Android home screen). */
const PWA_ICON_SIZES = [192, 512] as const

export const dynamic = 'force-static'
export const generateStaticParams = () => PWA_ICON_SIZES.map((size) => ({ size: String(size) }))

export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const size = Number((await params).size)
  if (!PWA_ICON_SIZES.includes(size as (typeof PWA_ICON_SIZES)[number])) notFound()
  return appIconImage(size)
}
