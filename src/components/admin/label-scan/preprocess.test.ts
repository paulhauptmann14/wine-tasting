import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  adaptiveThreshold,
  applyVariant,
  decodeLabelImage,
  fitSize,
  renderVariant,
  stretchContrast,
  toGrayscale,
} from './preprocess'

describe('fitSize', () => {
  it('scales the longer side to the target, keeping the aspect ratio', () => {
    expect(fitSize(1000, 2000, 1800)).toEqual({ width: 900, height: 1800 })
    expect(fitSize(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
  })

  it('upscales small photos', () => {
    expect(fitSize(190, 330, 1650)).toEqual({ width: 950, height: 1650 })
  })

  it('never returns a side below 1 px', () => {
    expect(fitSize(1, 5000, 100)).toEqual({ width: 1, height: 100 })
  })
})

describe('toGrayscale', () => {
  it('converts RGBA to one luma byte per pixel', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255])
    expect(Array.from(toGrayscale(rgba))).toEqual([255, 0, 76])
  })
})

describe('stretchContrast', () => {
  it('spreads a narrow range over 0..255', () => {
    const gray = new Uint8ClampedArray(100).map((_, i) => 100 + (i % 50))
    const out = stretchContrast(gray, 0)
    expect(Math.min(...out)).toBe(0)
    expect(Math.max(...out)).toBe(255)
  })

  it('leaves flat images unchanged', () => {
    const gray = new Uint8ClampedArray(50).fill(120)
    expect(Array.from(stretchContrast(gray))).toEqual(Array.from(gray))
  })
})

describe('adaptiveThreshold', () => {
  // 40 x 40 gradient background (30 -> 200 left to right) with a dark text bar in the middle
  const width = 40
  const height = 40
  const gray = new Uint8ClampedArray(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      gray[y * width + x] = Math.round(30 + (170 * x) / (width - 1))
    }
  }
  const bar = (x: number, y: number) => y === 20 && x >= 18 && x <= 22
  for (let x = 18; x <= 22; x++) gray[20 * width + x] = 0

  it('keeps text black and the uneven background white', () => {
    const out = adaptiveThreshold(gray, width, height, 15)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (bar(x, y)) expect(out[y * width + x]).toBe(0)
        else if (y !== 20 && y > 8 && y < height - 8 && x > 8 && x < width - 8) expect(out[y * width + x]).toBe(255)
      }
    }
  })
})

describe('applyVariant', () => {
  const rgba = new Uint8ClampedArray([200, 200, 200, 255, 100, 100, 100, 255, 100, 100, 100, 255, 200, 200, 200, 255])

  it('returns one byte per pixel for every variant', () => {
    for (const variant of ['gray', 'adaptive'] as const) {
      expect(applyVariant(rgba, 2, 2, variant)).toHaveLength(4)
    }
  })

  it('gray keeps the luma, adaptive turns the darker pixels black', () => {
    expect(Array.from(applyVariant(rgba, 2, 2, 'gray'))).toEqual([200, 100, 100, 200])
    expect(Array.from(applyVariant(rgba, 2, 2, 'adaptive'))).toEqual([255, 0, 0, 255])
  })
})

describe('decodeLabelImage / renderVariant', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Minimal canvas stand-in: records draws and hands back the pixels it was given
  function stubDom(pixels: (width: number, height: number) => Uint8ClampedArray) {
    const contexts: { drawImage: ReturnType<typeof vi.fn>; putImageData: ReturnType<typeof vi.fn> }[] = []
    vi.stubGlobal('document', {
      createElement: () => {
        const canvas = { width: 0, height: 0, getContext: () => context }
        const context = {
          drawImage: vi.fn(),
          putImageData: vi.fn(),
          getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: pixels(w, h), width: w, height: h }),
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h }),
        }
        contexts.push(context)
        return canvas
      },
    })
    return contexts
  }

  it('decodes once with EXIF orientation, scales to the long side and closes the bitmap', async () => {
    const close = vi.fn()
    const createImageBitmapMock = vi.fn().mockResolvedValue({ width: 4000, height: 3000, close })
    vi.stubGlobal('createImageBitmap', createImageBitmapMock)
    const contexts = stubDom((w, h) => new Uint8ClampedArray(w * h * 4))
    const photo = new Blob(['x'])

    const image = await decodeLabelImage(photo, 2000)

    expect(createImageBitmapMock).toHaveBeenCalledTimes(1)
    expect(createImageBitmapMock).toHaveBeenCalledWith(photo, { imageOrientation: 'from-image' })
    expect(image).toMatchObject({ width: 2000, height: 1500 })
    expect(image.data).toHaveLength(2000 * 1500 * 4)
    expect(contexts[0].drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2000, 1500)
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('closes the bitmap even when drawing fails', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 10, height: 10, close }))
    vi.stubGlobal('document', {
      createElement: () => ({
        getContext: () => ({
          drawImage: () => {
            throw new Error('canvas too large')
          },
        }),
      }),
    })
    await expect(decodeLabelImage(new Blob(['x']), 100)).rejects.toThrow('canvas too large')
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('renders several variants from the same pixels without changing them', () => {
    const data = new Uint8ClampedArray([200, 200, 200, 255, 10, 10, 10, 255, 10, 10, 10, 255, 200, 200, 200, 255])
    const original = Array.from(data)
    const contexts = stubDom(() => data)
    const image = { data, width: 2, height: 2 }

    renderVariant(image, 'gray')
    renderVariant(image, 'adaptive')

    expect(Array.from(data)).toEqual(original)
    const written = contexts.map((c) => c.putImageData.mock.calls[0][0].data as Uint8ClampedArray)
    expect(Array.from(written[0].slice(0, 4))).toEqual([200, 200, 200, 255])
    expect(Array.from(written[1].slice(0, 8))).toEqual([255, 255, 255, 255, 0, 0, 0, 255])
  })
})
