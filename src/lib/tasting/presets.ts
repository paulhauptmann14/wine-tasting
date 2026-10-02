export const PRESET_KEYS = ['simple', 'classic', 'detailed'] as const
export type PresetKey = (typeof PRESET_KEYS)[number]

/** Starting values only – criteria are copied into each tasting on creation. */
export const PRESETS: Record<PresetKey, { label: string; criteria: readonly string[] }> = {
  simple: { label: 'Einfach', criteria: ['Gesamt'] },
  classic: { label: 'Classic', criteria: ['Aussehen', 'Aroma', 'Geschmack', 'Gesamt'] },
  detailed: {
    label: 'Detailliert',
    criteria: ['Aussehen', 'Aroma', 'Geschmack', 'Säure', 'Süße', 'Körper', 'Abgang', 'Gesamt'],
  },
}
