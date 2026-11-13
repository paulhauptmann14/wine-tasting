/**
 * Maximum lengths of user input, in characters. The schemas in validation.ts enforce them on the server,
 * the forms repeat them as `maxLength` so the browser stops typing at the same point.
 */
export const LIMITS = {
  tastingName: 60,
  tastingDescription: 300,
  guestName: 40,
  wineName: 80,
  winery: 80,
  grapeVariety: 60,
  wineDescription: 200,
  criterionName: 40,
  ratingNotes: 1000,
  pin: 12,
  /** "13,5" – room for a few stray spaces, the parser decides */
  alcoholInput: 10,
  /** "2022" */
  vintageInput: 4,
  /** Rejoin link token as bound from the client (UUID + '.' + 22 characters, with headroom) */
  rejoinLink: 100,
} as const
