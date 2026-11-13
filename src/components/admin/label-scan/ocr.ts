import { MIN_CONFIDENCE } from '@/lib/label/confidence'
import type { OcrLine } from '@/lib/label/types'
import { decodeLabelImage, renderVariant, type PreprocessVariant } from './preprocess'

/**
 * On-device label OCR (tesseract.js). All assets are served from `public/tesseract` – no
 * third-party CDN, and the photo never leaves the browser. Client-only: imports tesseract.js lazily.
 */

export const TESSERACT_BASE_PATH = '/tesseract'
export const OCR_LANGUAGES = ['deu', 'eng', 'fra', 'ita', 'spa', 'por']

/**
 * Loading the worker, core and language data (~9 MB on the first scan, then from the HTTP cache)
 * fails once tesseract has reported no progress for this long. On slow mobile data the
 * longest silent stretch is the six language files, which download in parallel without progress
 * events (~58 s measured at 0.5 Mbit/s), so the limit leaves room above that.
 */
export const WORKER_IDLE_TIMEOUT_MS = 90_000
/** Overall limit for loading the engine, however steadily the downloads progress. */
export const WORKER_LOAD_TIMEOUT_MS = 180_000
/** Upper bound for decoding plus all OCR passes of one photo (slow phones, busy labels). */
export const RECOGNIZE_TIMEOUT_MS = 120_000

/**
 * The OCR engine could not be loaded (network error, missing file, stalled or too slow download) –
 * unlike a photo that cannot be decoded or read. The UI tells the host to check the connection.
 */
export class OcrLoadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'OcrLoadError'
  }
}

export type LoadTimeouts = { idle?: number; total?: number }

type OcrPass = { variant: PreprocessVariant; psm: string }

/**
 * Settings chosen with an evaluation over 25 real label photos (5 own, 20 Open Food Facts) in
 * Chrome: sparse-text mode (psm 11) clearly beats auto/block modes on labels, the longer side at
 * 2000 px was best (1400-1600 and 2400+ were worse), and two passes – a locally thresholded and a
 * plain grayscale image – find more text than either alone. About 1.6 s per photo on a laptop.
 */
export const OCR_SETTINGS: { longSide: number; minConfidence: number; maxPassStartMs: number; passes: OcrPass[] } = {
  longSide: 2000,
  minConfidence: MIN_CONFIDENCE,
  // Busy backgrounds make sparse-text mode very slow (up to 14 s measured): after that much time
  // the remaining passes are skipped and the lines found so far are returned
  maxPassStartMs: 8000,
  passes: [
    { variant: 'adaptive', psm: '11' },
    { variant: 'gray', psm: '11' },
  ],
}

type CreateWorker = typeof import('tesseract.js').createWorker
type Worker = Awaited<ReturnType<CreateWorker>>

/** Minimal shape of tesseract.js' `data.blocks`, so the conversion is testable without the library. */
export type OcrBlock = {
  paragraphs: { lines: { text: string; confidence: number; bbox: OcrLine['bbox'] }[] }[]
}

/** Flattens tesseract's block tree to lines; drops lines without any letter or digit. */
export function linesFromBlocks(blocks: OcrBlock[] | null | undefined): OcrLine[] {
  const lines: OcrLine[] = []
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs) {
      for (const line of paragraph.lines) {
        const text = line.text.replace(/\s+/g, ' ').trim()
        if (!/[\p{L}\p{N}]/u.test(text)) continue
        const { x0, y0, x1, y1 } = line.bbox
        lines.push({ text, confidence: line.confidence, bbox: { x0, y0, x1, y1 } })
      }
    }
  }
  return lines
}

const area = (b: OcrLine['bbox']) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)

function overlap(a: OcrLine['bbox'], b: OcrLine['bbox']): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.min(area(a), area(b) || 1)
}

const squash = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')

/**
 * Merges the lines of several passes over the same image. Different passes often read the same
 * text slightly differently, and a worse read of one pass can hide a better one of another, so
 * lines are only dropped as duplicates: same area and one text contains the other (the more
 * confident line stays). Result is sorted top to bottom, left to right.
 */
export function mergeLines(passes: OcrLine[][], minConfidence = 0): OcrLine[] {
  const candidates = passes.flat().filter((line) => line.confidence >= minConfidence)
  candidates.sort((a, b) => b.confidence - a.confidence)
  const kept: OcrLine[] = []
  for (const line of candidates) {
    const text = squash(line.text)
    const duplicate = kept.some((other) => {
      if (overlap(line.bbox, other.bbox) <= 0.5) return false
      const otherText = squash(other.text)
      return otherText.includes(text) || text.includes(otherText)
    })
    if (!duplicate) kept.push(line)
  }
  return kept.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
}

/**
 * tesseract.js builds its Web Worker inside `createWorker` and only hands it out once loading has
 * succeeded. To be able to terminate a worker whose load never finishes, the constructor call is
 * observed: `createWorker` spawns the worker synchronously, before its first await.
 */
function observeWorkerSpawn(): { spawned: () => { terminate: () => void } | null; stop: () => void } {
  const Native = globalThis.Worker
  let spawned: InstanceType<typeof Worker> | null = null
  if (typeof Native !== 'function') return { spawned: () => null, stop: () => {} }
  globalThis.Worker = function (...args: ConstructorParameters<typeof Worker>) {
    spawned = new Native(...args)
    return spawned
  } as unknown as typeof Worker
  return { spawned: () => spawned, stop: () => void (globalThis.Worker = Native) }
}

/**
 * Creates the OCR worker. In tesseract.js 7 a failing language or core download only rejects an
 * internal job: without an `errorHandler` it throws inside the worker's message handler, and the
 * promise from `createWorker` stays pending forever. So failures are routed through `errorHandler`,
 * and two timers cover downloads that stall or crawl. Either way the half-built worker is
 * terminated and the promise rejects with an `OcrLoadError`.
 *
 * Progress events while loading (tesseract.js 7, `src/worker-script`): "loading tesseract core"
 * 0 and 1 around the core download, "initializing tesseract" 0 and 1, "loading language
 * traineddata" 0, then two per language (downloaded, written; the six run in parallel),
 * "initializing api" 0 and 1. Every event resets the idle timer.
 *
 * `cacheMethod: 'none'` keeps tesseract.js from writing the language data (~7 MB) to IndexedDB –
 * the files are same-origin static assets, the HTTP cache is enough, and the privacy policy only
 * promises strictly necessary storage. `debug_file /dev/null` silences tesseract's diagnostics
 * ("Detected N diacritics" and similar), which the worker would print via console.error.
 */
export function createLabelWorker(
  createWorker: CreateWorker,
  basePath = TESSERACT_BASE_PATH,
  onProgress?: (p: number) => void,
  { idle = WORKER_IDLE_TIMEOUT_MS, total = WORKER_LOAD_TIMEOUT_MS }: LoadTimeouts = {},
): Promise<Worker> {
  return new Promise<Worker>((resolve, reject) => {
    let settled = false
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const observer = observeWorkerSpawn()
    const stopTimers = () => {
      clearTimeout(idleTimer)
      clearTimeout(totalTimer)
    }
    const fail = (reason: unknown) => {
      if (settled) return
      settled = true
      stopTimers()
      try {
        observer.spawned()?.terminate()
      } catch {
        // nothing left to clean up
      }
      if (reason instanceof OcrLoadError) reject(reason)
      else reject(new OcrLoadError(reason instanceof Error ? reason.message : String(reason), { cause: reason }))
    }
    const armIdle = () => {
      clearTimeout(idleTimer)
      idleTimer = setTimeout(() => fail(new OcrLoadError(`OCR engine load stalled: no progress for ${idle} ms`)), idle)
    }
    const totalTimer = setTimeout(() => fail(new OcrLoadError(`OCR engine load timed out after ${total} ms`)), total)
    armIdle()
    let pending: Promise<Worker>
    try {
      pending = createWorker(OCR_LANGUAGES, 1, {
        workerPath: `${basePath}/worker.min.js`,
        corePath: `${basePath}/core`,
        langPath: `${basePath}/lang`,
        cacheMethod: 'none',
        logger: (m) => {
          if (settled) return
          armIdle()
          if (m.status !== 'recognizing text') onProgress?.(m.progress)
        },
        errorHandler: fail,
      }, 'debug_file /dev/null\n')
    } catch (error) {
      observer.stop()
      fail(error)
      return
    }
    observer.stop()
    pending.then(
      (worker) => {
        if (settled) {
          // The load timed out earlier but finished after all: do not leak the worker
          void worker.terminate()
          return
        }
        settled = true
        stopTimers()
        resolve(worker)
      },
      fail,
    )
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

async function recognizeCanvas(worker: Worker, image: HTMLCanvasElement, psm: string): Promise<OcrLine[]> {
  // The typed parameter list is incomplete: tesseract accepts any variable (values are strings)
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    preserve_interword_spaces: '1',
    user_defined_dpi: '300',
  } as unknown as Parameters<Worker['setParameters']>[0])
  const { data } = await worker.recognize(image, {}, { blocks: true })
  return linesFromBlocks(data.blocks as OcrBlock[] | null)
}

/**
 * Reads the text lines from a label photo. Rejects with an `OcrLoadError` when the OCR engine
 * cannot be loaded, with a plain error when the photo cannot be decoded or read in time.
 */
export async function recognizeLabel(
  file: File | Blob,
  onProgress?: (p: number) => void,
  timeouts: { loadIdle?: number; load?: number; recognize?: number } = {},
): Promise<OcrLine[]> {
  const { passes, longSide, minConfidence, maxPassStartMs } = OCR_SETTINGS
  const { createWorker } = await import('tesseract.js').catch((error: unknown) => {
    throw new OcrLoadError('OCR library could not be loaded', { cause: error })
  })
  // Loading the engine and the language data counts for the first fifth of the progress
  let loaded = 0
  const worker = await createLabelWorker(
    createWorker,
    TESSERACT_BASE_PATH,
    (p) => {
      loaded = Math.max(loaded, p)
      onProgress?.(loaded * 0.2)
    },
    { idle: timeouts.loadIdle, total: timeouts.load },
  )
  try {
    const run = async () => {
      const results: OcrLine[][] = []
      const startedAt = Date.now()
      // The photo is decoded once; every pass derives its variant from the same scaled pixels
      const image = await decodeLabelImage(file, longSide)
      for (const [index, pass] of passes.entries()) {
        if (index > 0 && Date.now() - startedAt > maxPassStartMs) break
        results.push(await recognizeCanvas(worker, renderVariant(image, pass.variant), pass.psm))
        onProgress?.(0.2 + (0.8 * (index + 1)) / passes.length)
      }
      onProgress?.(1)
      return mergeLines(results, minConfidence)
    }
    return await withTimeout(run(), timeouts.recognize ?? RECOGNIZE_TIMEOUT_MS, 'OCR timed out')
  } finally {
    await worker.terminate()
  }
}
