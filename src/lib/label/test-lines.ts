// Test helper: builds OCR lines stacked top to bottom like on a label.
import type { OcrLine } from './types'

/** [text, height = 20, confidence = 90, options] */
export type LineSpec = [text: string, height?: number, confidence?: number, opts?: { gap?: number; x0?: number; width?: number }]

export function stack(specs: LineSpec[]): OcrLine[] {
  let y = 10
  return specs.map(([text, height = 20, confidence = 90, opts = {}]) => {
    const width = opts.width ?? Math.max(20, text.length * height * 0.6)
    const x0 = opts.x0 ?? 200 - width / 2
    const y0 = y + (opts.gap ?? 0)
    const line: OcrLine = { text, confidence, bbox: { x0, y0, x1: x0 + width, y1: y0 + height } }
    y = y0 + height * 1.4
    return line
  })
}
