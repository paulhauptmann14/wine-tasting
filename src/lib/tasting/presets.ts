export const SCALE_KEYS = ['five', 'twenty', 'hundred'] as const
export type Scale = (typeof SCALE_KEYS)[number]

/** Range of the final score per rating system; stars (1–5) map linearly from 0 to `max` above `base`. */
export const SCALES: Record<Scale, { base: number; max: number; decimals: number }> = {
  five: { base: 0, max: 5, decimals: 1 },
  twenty: { base: 0, max: 20, decimals: 1 },
  // Parker: 50 points are the floor, the criteria add up to the other 50
  hundred: { base: 50, max: 100, decimals: 0 },
}

export const PRESET_KEYS = ['simple', 'five', 'twenty', 'hundred'] as const
export type PresetKey = (typeof PRESET_KEYS)[number]

type Preset = {
  label: string
  hint: string
  scale: Scale
  /** weight = the criterion's maximum points in the system; only the ratio between criteria matters */
  criteria: readonly { name: string; weight: number }[]
}

/** Starting values only – criteria are copied into each tasting on creation. */
export const PRESETS: Record<PresetKey, Preset> = {
  simple: {
    label: 'Einfach',
    hint: 'Nur ein Gesamteindruck – für viele Weine an einem Abend.',
    scale: 'five',
    criteria: [{ name: 'Gesamt', weight: 1 }],
  },
  five: {
    label: '5-Punkte-Schema',
    hint: 'Übersichtlich, alle Kriterien zählen gleich. Ergebnis von 5.',
    scale: 'five',
    criteria: [
      { name: 'Geruch', weight: 1 },
      { name: 'Geschmack', weight: 1 },
      { name: 'Harmonie', weight: 1 },
    ],
  },
  twenty: {
    label: '20-Punkte-Schema',
    hint: 'Wie bei vielen Sommeliers: Geruch und Geschmack zählen am meisten. Ergebnis von 20.',
    scale: 'twenty',
    criteria: [
      { name: 'Farbe', weight: 2 },
      { name: 'Klarheit', weight: 2 },
      { name: 'Geruch', weight: 6 },
      { name: 'Geschmack', weight: 6 },
      { name: 'Gesamteindruck', weight: 4 },
    ],
  },
  hundred: {
    label: '100-Punkte-Schema',
    hint: 'Wie bei Robert Parker: Jeder Wein startet mit 50 Punkten, Geschmack zählt am meisten. Ergebnis von 60 bis 100.',
    scale: 'hundred',
    criteria: [
      { name: 'Aussehen', weight: 5 },
      { name: 'Geruch', weight: 15 },
      { name: 'Geschmack', weight: 20 },
      { name: 'Gesamteindruck', weight: 10 },
    ],
  },
}
