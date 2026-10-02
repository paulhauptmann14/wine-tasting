import { expect, it } from 'vitest'
import { SWEETNESS_KEYS, SWEETNESS_LABELS } from './sweetness'

it('defines the four official German sweetness levels in order', () => {
  expect(SWEETNESS_KEYS).toEqual(['dry', 'off_dry', 'medium', 'sweet'])
  expect(SWEETNESS_KEYS.map((k) => SWEETNESS_LABELS[k])).toEqual(['trocken', 'halbtrocken', 'lieblich', 'süß'])
})
