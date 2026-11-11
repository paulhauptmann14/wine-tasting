import { ImageResponse } from 'next/og'
import { APP_ICON_COLORS, appIconDataUri } from '@/lib/app-icon'

/** The glass mark as a solid PNG tile – for home screens, where transparency isn't allowed. */
export function appIconImage(size: number): ImageResponse {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img>
    <img src={appIconDataUri(APP_ICON_COLORS.background)} width={size} height={size} alt="" />,
    { width: size, height: size },
  )
}
