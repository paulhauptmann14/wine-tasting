/**
 * In-browser image preprocessing for label OCR. Everything runs on the device – the photo never
 * leaves the browser. The pixel functions are pure (testable without a canvas); only
 * `decodeLabelImage` and `renderVariant` need a DOM.
 */

/**
 * - `gray`: grayscale only
 * - `stretch`: grayscale + contrast stretch (clips the darkest/brightest 1 %)
 * - `adaptive`: stretch + local mean threshold (black text on white), robust against uneven light
 * - `adaptiveLight`: like `adaptive`, but for light text on dark labels (text becomes black)
 * - `inverted`: stretch + inversion, for light text on dark labels
 */
export type PreprocessVariant = 'gray' | 'stretch' | 'adaptive' | 'adaptiveLight' | 'inverted'

/** Scales (up or down) so the longer side hits `longSide`; never returns a side below 1 px. */
export function fitSize(width: number, height: number, longSide: number): { width: number; height: number } {
  const scale = longSide / Math.max(width, height)
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** RGBA -> one luma byte per pixel (Rec. 601). */
export function toGrayscale(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(rgba.length / 4)
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    gray[p] = Math.round(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2])
  }
  return gray
}

/** Linear stretch so the `clip` / `1 - clip` percentiles map to 0 / 255. Flat images stay unchanged. */
export function stretchContrast(gray: Uint8ClampedArray, clip = 0.01): Uint8ClampedArray {
  const histogram = new Uint32Array(256)
  for (let i = 0; i < gray.length; i++) histogram[gray[i]]++
  const lowCount = gray.length * clip
  const highCount = gray.length * (1 - clip)
  let low = 0
  let high = 255
  let seen = 0
  for (let v = 0; v < 256; v++) {
    seen += histogram[v]
    if (seen > lowCount) {
      low = v
      break
    }
  }
  seen = 0
  for (let v = 0; v < 256; v++) {
    seen += histogram[v]
    if (seen >= highCount) {
      high = v
      break
    }
  }
  if (high - low < 8) return gray
  const out = new Uint8ClampedArray(gray.length)
  const scale = 255 / (high - low)
  for (let i = 0; i < gray.length; i++) out[i] = (gray[i] - low) * scale
  return out
}

export function invert(gray: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) out[i] = 255 - gray[i]
  return out
}

/**
 * Local mean threshold via an integral image: a pixel becomes black when it is clearly darker
 * than the average of its surrounding window (`ratio` < 1), otherwise white. With `lightText` it
 * is the other way round: clearly brighter pixels become black.
 */
export function adaptiveThreshold(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  windowSize = Math.max(15, Math.round(Math.min(width, height) / 16)),
  ratio = 0.9,
  lightText = false,
): Uint8ClampedArray {
  const stride = width + 1
  const integral = new Float64Array(stride * (height + 1))
  for (let y = 0; y < height; y++) {
    let rowSum = 0
    for (let x = 0; x < width; x++) {
      rowSum += gray[y * width + x]
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + rowSum
    }
  }
  const half = Math.floor(windowSize / 2)
  const out = new Uint8ClampedArray(gray.length)
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - half)
    const y1 = Math.min(height, y + half + 1)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - half)
      const x1 = Math.min(width, x + half + 1)
      const sum = integral[y1 * stride + x1] - integral[y0 * stride + x1] - integral[y1 * stride + x0] + integral[y0 * stride + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      const value = gray[y * width + x]
      // Foreground (text) is clearly darker – or, for light text, clearly brighter – than its surroundings
      const isText = lightText ? value > Math.min(255, mean / ratio) : value < mean * ratio
      out[y * width + x] = isText ? 0 : 255
    }
  }
  return out
}

/** Applies the variant to RGBA pixels and returns grayscale bytes. */
export function applyVariant(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  variant: PreprocessVariant,
): Uint8ClampedArray {
  const gray = toGrayscale(rgba)
  if (variant === 'gray') return gray
  const stretched = stretchContrast(gray)
  if (variant === 'stretch') return stretched
  if (variant === 'inverted') return invert(stretched)
  return adaptiveThreshold(stretched, width, height, undefined, undefined, variant === 'adaptiveLight')
}

/** A decoded, scaled photo as plain RGBA pixels – the shared input for all preprocessing variants. */
export type RgbaImage = { data: Uint8ClampedArray; width: number; height: number }

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas wird nicht unterstützt')
  return { canvas, context }
}

/**
 * Decodes the photo once (EXIF orientation is applied by `createImageBitmap`) and scales it to
 * `longSide`. The full-resolution bitmap (up to ~190 MB for a 48 MP photo) is closed right away, so
 * only the small scaled pixel buffer stays alive while the OCR passes run.
 */
export async function decodeLabelImage(file: Blob, longSide: number): Promise<RgbaImage> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const { width, height } = fitSize(bitmap.width, bitmap.height, longSide)
    const { context } = createCanvas(width, height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)
    return { data, width, height }
  } finally {
    bitmap.close()
  }
}

/** Applies the variant to decoded pixels (input stays untouched). Returns a canvas that tesseract.js accepts directly. */
export function renderVariant(image: RgbaImage, variant: PreprocessVariant): HTMLCanvasElement {
  const { width, height } = image
  const gray = applyVariant(image.data, width, height, variant)
  const { canvas, context } = createCanvas(width, height)
  const output = context.createImageData(width, height)
  for (let i = 0, p = 0; i < output.data.length; i += 4, p++) {
    output.data[i] = output.data[i + 1] = output.data[i + 2] = gray[p]
    output.data[i + 3] = 255
  }
  context.putImageData(output, 0, 0)
  return canvas
}
