import { describe, expect, it } from 'vitest'
import { MAX_LINES, labelLines } from './lines'

describe('labelLines', () => {
  it('merges winery and name candidates: list hits first, then names, then the other producers', () => {
    const lines = labelLines({
      nameCandidates: ['Blauschiefer', 'Alte Reben'],
      wineryCandidates: ['Cave Belle', 'Weingut Dr. Loosen'],
      listedWineries: ['Weingut Dr. Loosen'],
    })
    expect(lines).toEqual([
      { text: 'Weingut Dr. Loosen', inWineryList: true },
      { text: 'Blauschiefer', inWineryList: false },
      { text: 'Alte Reben', inWineryList: false },
      { text: 'Cave Belle', inWineryList: false },
    ])
  })

  it('shows ALL-CAPS lines in readable case', () => {
    const lines = labelLines({ nameCandidates: ['LA CROIX BELLE'], wineryCandidates: ['CAMP DEL GAL'] })
    expect(lines.map((l) => l.text)).toEqual(['La Croix Belle', 'Camp del Gal'])
  })

  it('merges duplicates regardless of case and spacing, and keeps the list-hit flag', () => {
    const lines = labelLines({
      nameCandidates: ['CAMP DEL GAL', 'Cave Belle'],
      wineryCandidates: ['Camp  del Gal', 'camp del gal'],
      listedWineries: ['Camp del Gal'],
    })
    expect(lines).toEqual([
      { text: 'Camp del Gal', inWineryList: true },
      { text: 'Cave Belle', inWineryList: false },
    ])
  })

  it('matches the list-hit flag regardless of case', () => {
    const lines = labelLines({ nameCandidates: ['CAMP DEL GAL'], listedWineries: ['Camp del Gal'] })
    expect(lines).toEqual([{ text: 'Camp del Gal', inWineryList: true }])
  })

  it('includes unsure name and winery guesses but not the sure values that were filled in', () => {
    const lines = labelLines({
      name: { value: 'Lacroix Belle', sure: false },
      nameCandidates: ['Camp del Gal', 'Kabinett'],
      winery: { value: 'Domaine de la Croix', sure: true },
      wineryCandidates: ['Domaine de la Croix', 'Cave Belle'],
    })
    expect(lines.map((l) => l.text)).toEqual(['Lacroix Belle', 'Camp del Gal', 'Kabinett', 'Cave Belle'])
    expect(labelLines({ name: { value: 'Kabinett', sure: true }, nameCandidates: ['kabinett'] })).toEqual([])
  })

  it('shows at most five lines and cuts to the field length', () => {
    const many = labelLines({
      nameCandidates: ['Eins', 'Zwei', 'Drei'],
      wineryCandidates: ['Vier', 'Fünf', 'Sechs'],
    })
    expect(MAX_LINES).toBe(5)
    expect(many.map((l) => l.text)).toEqual(['Eins', 'Zwei', 'Drei', 'Vier', 'Fünf'])
    expect(labelLines({ nameCandidates: ['x'.repeat(120)] })[0].text).toHaveLength(80)
  })

  it('is empty without candidates', () => {
    expect(labelLines({})).toEqual([])
    expect(labelLines({ nameCandidates: ['  '] })).toEqual([])
  })
})
