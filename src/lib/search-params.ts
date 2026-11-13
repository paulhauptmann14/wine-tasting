/** Wine number from the URL (`/wine/[nr]`, `?saved=`): a whole number from 1 on, otherwise undefined. */
export function parsePosition(value: string | undefined): number | undefined {
  if (!value) return undefined
  const position = Number(value)
  return Number.isInteger(position) && position >= 1 ? position : undefined
}
