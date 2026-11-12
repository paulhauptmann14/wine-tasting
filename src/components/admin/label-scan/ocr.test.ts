import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OcrLine } from '@/lib/label/types'
import {
  createLabelWorker,
  linesFromBlocks,
  mergeLines,
  OCR_SETTINGS,
  OcrLoadError,
  RECOGNIZE_TIMEOUT_MS,
  recognizeLabel,
  WORKER_IDLE_TIMEOUT_MS,
  WORKER_LOAD_TIMEOUT_MS,
} from './ocr'

const mocks = vi.hoisted(() => ({
  createWorker: vi.fn(),
  decodeLabelImage: vi.fn(),
  renderVariant: vi.fn(),
}))

vi.mock('tesseract.js', () => ({ createWorker: mocks.createWorker }))
vi.mock('./preprocess', () => ({
  decodeLabelImage: mocks.decodeLabelImage,
  renderVariant: mocks.renderVariant,
}))

const box = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 })
const line = (text: string, confidence: number, bbox = box(0, 0, 100, 20)): OcrLine => ({ text, confidence, bbox })

describe('linesFromBlocks', () => {
  it('flattens blocks and paragraphs, trims text and drops lines without letters or digits', () => {
    const blocks = [
      {
        paragraphs: [
          {
            lines: [
              { text: '  Château   Musar\n', confidence: 91.5, bbox: box(1, 2, 3, 4) },
              { text: ' -- ~ ', confidence: 80, bbox: box(0, 0, 1, 1) },
            ],
          },
          { lines: [{ text: '2019', confidence: 70, bbox: box(5, 6, 7, 8) }] },
        ],
      },
    ]
    expect(linesFromBlocks(blocks)).toEqual([
      { text: 'Château Musar', confidence: 91.5, bbox: box(1, 2, 3, 4) },
      { text: '2019', confidence: 70, bbox: box(5, 6, 7, 8) },
    ])
  })

  it('handles missing blocks', () => {
    expect(linesFromBlocks(null)).toEqual([])
    expect(linesFromBlocks(undefined)).toEqual([])
  })
})

describe('mergeLines', () => {
  it('keeps the more confident of two reads of the same line', () => {
    const merged = mergeLines([[line('INNAMOR', 60)], [line('INNAMORATI', 90)]])
    expect(merged.map((l) => l.text)).toEqual(['INNAMORATI'])
  })

  it('keeps both when the same area was read differently and neither contains the other', () => {
    const merged = mergeLines([[line('WEINBIET', 70)], [line('NEINBIET', 80)]])
    expect(merged).toHaveLength(2)
  })

  it('keeps equal texts in different places', () => {
    const merged = mergeLines([[line('2024', 80, box(0, 0, 50, 20)), line('2024', 80, box(0, 500, 50, 520))]])
    expect(merged).toHaveLength(2)
  })

  it('drops lines below the minimum confidence and sorts top to bottom, left to right', () => {
    const merged = mergeLines(
      [[line('unten', 80, box(0, 300, 50, 320)), line('rechts', 80, box(200, 10, 250, 30)), line('links', 80, box(0, 10, 50, 30)), line('Müll', 5, box(0, 100, 50, 120))]],
      30,
    )
    expect(merged.map((l) => l.text)).toEqual(['links', 'rechts', 'unten'])
  })
})

type FakeWorker = {
  setParameters: ReturnType<typeof vi.fn>
  recognize: ReturnType<typeof vi.fn>
  terminate: ReturnType<typeof vi.fn>
}

const fakeWorker = (): FakeWorker => ({
  setParameters: vi.fn().mockResolvedValue(undefined),
  recognize: vi.fn().mockResolvedValue({ data: { blocks: [] } }),
  terminate: vi.fn().mockResolvedValue(undefined),
})

type Options = {
  errorHandler: (e: unknown) => void
  logger: (m: { status: string; progress: number }) => void
  cacheMethod: string
  langPath: string
}

describe('createLabelWorker', () => {
  const NativeWorker = globalThis.Worker
  let spawned: { terminate: ReturnType<typeof vi.fn> }[]

  beforeEach(() => {
    vi.useFakeTimers()
    spawned = []
    // Stand-in for the browser Worker: createWorker spawns it synchronously
    globalThis.Worker = class {
      terminate = vi.fn()
      constructor() {
        spawned.push(this)
      }
    } as unknown as typeof Worker
  })

  afterEach(() => {
    vi.useRealTimers()
    globalThis.Worker = NativeWorker
  })

  // A createWorker that spawns a Worker like tesseract.js does, then never settles by itself
  const hangingCreate = (capture?: { options?: Options }) =>
    vi.fn((_langs: unknown, _oem: unknown, options: Options) => {
      if (capture) capture.options = options
      new globalThis.Worker('/tesseract/worker.min.js')
      return new Promise(() => {})
    }) as never

  it('hands the self-hosted paths to tesseract and disables its IndexedDB cache and diagnostics', async () => {
    const worker = fakeWorker()
    const createWorker = vi.fn().mockResolvedValue(worker)
    await expect(createLabelWorker(createWorker as never, '/base')).resolves.toBe(worker)
    const [langs, oem, options, config] = createWorker.mock.calls[0]
    expect(langs).toEqual(['deu', 'eng', 'fra', 'ita', 'spa', 'por'])
    expect(oem).toBe(1)
    expect(options).toMatchObject({
      workerPath: '/base/worker.min.js',
      corePath: '/base/core',
      langPath: '/base/lang',
      cacheMethod: 'none',
    })
    expect(config).toContain('debug_file /dev/null')
  })

  it('forwards load progress but not recognition progress, and nothing once the worker is ready', async () => {
    const onProgress = vi.fn()
    const capture: { options?: Options } = {}
    let finish: (w: FakeWorker) => void = () => {}
    const createWorker = vi.fn((_l: unknown, _o: unknown, options: Options) => {
      capture.options = options
      return new Promise<FakeWorker>((resolve) => (finish = resolve))
    })
    const promise = createLabelWorker(createWorker as never, '/base', onProgress)
    capture.options!.logger({ status: 'loading language traineddata', progress: 0.5 })
    capture.options!.logger({ status: 'recognizing text', progress: 0.9 })
    finish(fakeWorker())
    await promise
    capture.options!.logger({ status: 'initializing api', progress: 1 })
    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(onProgress).toHaveBeenCalledWith(0.5)
  })

  it('rejects with a load error and terminates the half-built worker when tesseract reports a load error', async () => {
    const capture: { options?: Options } = {}
    const promise = createLabelWorker(hangingCreate(capture))
    capture.options!.errorHandler('Network error while fetching /tesseract/lang/deu.traineddata.gz. Response code: 404')
    await expect(promise).rejects.toThrow('Response code: 404')
    await expect(promise).rejects.toBeInstanceOf(OcrLoadError)
    expect(spawned).toHaveLength(1)
    expect(spawned[0].terminate).toHaveBeenCalledTimes(1)
  })

  it('rejects with a load error when the worker script fails (createWorker rejects)', async () => {
    const createWorker = vi.fn().mockRejectedValue('importScripts failed')
    const promise = createLabelWorker(createWorker as never)
    await expect(promise).rejects.toBeInstanceOf(OcrLoadError)
    await expect(promise).rejects.toThrow('importScripts failed')
  })

  it('waits 90 s without any progress event by default, then gives up', async () => {
    expect(WORKER_IDLE_TIMEOUT_MS).toBe(90_000)
    const promise = createLabelWorker(hangingCreate())
    let rejected: unknown = null
    promise.catch((error) => (rejected = error))
    await vi.advanceTimersByTimeAsync(WORKER_IDLE_TIMEOUT_MS - 1)
    expect(rejected).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(rejected).toBeInstanceOf(OcrLoadError)
    expect(spawned[0].terminate).toHaveBeenCalledTimes(1)
  })

  it('keeps waiting as long as tesseract reports progress (slow download on mobile data)', async () => {
    const capture: { options?: Options } = {}
    const promise = createLabelWorker(hangingCreate(capture), '/tesseract', undefined, { idle: 1000, total: 10_000 })
    let rejected: unknown = null
    promise.catch((error) => (rejected = error))
    // An event every 900 ms: never idle for a full second, well past the first second
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(900)
      capture.options!.logger({ status: 'loading language traineddata', progress: i / 10 })
    }
    expect(rejected).toBeNull()
    // Then the download stalls
    await vi.advanceTimersByTimeAsync(999)
    expect(rejected).toBeNull()
    await vi.advanceTimersByTimeAsync(1)
    expect(rejected).toBeInstanceOf(OcrLoadError)
    expect((rejected as Error).message).toMatch(/no progress/)
    expect(spawned[0].terminate).toHaveBeenCalledTimes(1)
  })

  it('gives up after the overall limit even while progress keeps coming in', async () => {
    expect(WORKER_LOAD_TIMEOUT_MS).toBe(180_000)
    const capture: { options?: Options } = {}
    const promise = createLabelWorker(hangingCreate(capture))
    let rejected: unknown = null
    promise.catch((error) => (rejected = error))
    for (let t = 0; t < WORKER_LOAD_TIMEOUT_MS - 30_000; t += 30_000) {
      await vi.advanceTimersByTimeAsync(30_000)
      capture.options!.logger({ status: 'loading tesseract core', progress: 0 })
    }
    expect(rejected).toBeNull()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(rejected).toBeInstanceOf(OcrLoadError)
    expect((rejected as Error).message).toMatch(/timed out/)
    expect(spawned[0].terminate).toHaveBeenCalledTimes(1)
  })

  it('terminates a worker that finishes loading only after the timeout', async () => {
    const worker = fakeWorker()
    let finish: (w: FakeWorker) => void = () => {}
    const createWorker = vi.fn(() => new Promise<FakeWorker>((resolve) => (finish = resolve)))
    const promise = createLabelWorker(createWorker as never, '/tesseract', undefined, { idle: 1000 })
    const assertion = expect(promise).rejects.toBeInstanceOf(OcrLoadError)
    await vi.advanceTimersByTimeAsync(1000)
    await assertion
    finish(worker)
    await vi.advanceTimersByTimeAsync(0)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('does not time out once the worker is ready, and ignores later errors', async () => {
    const worker = fakeWorker()
    const capture: { options?: Options } = {}
    const createWorker = vi.fn((_l: unknown, _o: unknown, options: Options) => {
      capture.options = options
      return Promise.resolve(worker)
    })
    const promise = createLabelWorker(createWorker as never, '/tesseract', undefined, { idle: 1000, total: 2000 })
    await expect(promise).resolves.toBe(worker)
    await vi.advanceTimersByTimeAsync(5000)
    expect(() => capture.options!.logger({ status: 'recognizing text', progress: 0.5 })).not.toThrow()
    expect(() => capture.options!.errorHandler('recognize failed')).not.toThrow()
    expect(spawned).toHaveLength(0)
  })

  it('rejects when createWorker throws synchronously, and restores the Worker constructor', async () => {
    const Before = globalThis.Worker
    const createWorker = vi.fn(() => {
      throw new Error('boom')
    })
    const promise = createLabelWorker(createWorker as never)
    await expect(promise).rejects.toThrow('boom')
    await expect(promise).rejects.toBeInstanceOf(OcrLoadError)
    expect(globalThis.Worker).toBe(Before)
  })

  it('restores the Worker constructor after creating the worker', async () => {
    const Before = globalThis.Worker
    await createLabelWorker(vi.fn().mockResolvedValue(fakeWorker()) as never)
    expect(globalThis.Worker).toBe(Before)
  })
})

describe('recognizeLabel', () => {
  const canvas = {} as HTMLCanvasElement
  const photo = new Blob(['x'])
  let worker: FakeWorker

  beforeEach(() => {
    worker = fakeWorker()
    mocks.createWorker.mockReset().mockResolvedValue(worker)
    mocks.decodeLabelImage.mockReset().mockResolvedValue({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
    mocks.renderVariant.mockReset().mockReturnValue(canvas)
  })

  it('decodes the photo once and derives every pass from it', async () => {
    await recognizeLabel(photo)
    expect(mocks.decodeLabelImage).toHaveBeenCalledTimes(1)
    expect(mocks.decodeLabelImage).toHaveBeenCalledWith(photo, OCR_SETTINGS.longSide)
    expect(mocks.renderVariant).toHaveBeenCalledTimes(OCR_SETTINGS.passes.length)
    expect(mocks.renderVariant.mock.calls.map((c) => c[1])).toEqual(OCR_SETTINGS.passes.map((p) => p.variant))
    expect(worker.recognize).toHaveBeenCalledTimes(OCR_SETTINGS.passes.length)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('terminates the worker and rejects with a plain error (not a load error) when decoding fails', async () => {
    mocks.decodeLabelImage.mockRejectedValue(new Error('cannot decode'))
    const promise = recognizeLabel(photo)
    await expect(promise).rejects.toThrow('cannot decode')
    await expect(promise).rejects.not.toBeInstanceOf(OcrLoadError)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('terminates the worker and rejects when recognition hangs', async () => {
    worker.recognize.mockReturnValue(new Promise(() => {}))
    const promise = recognizeLabel(photo, undefined, { recognize: 20 })
    await expect(promise).rejects.toThrow('timed out')
    await expect(promise).rejects.not.toBeInstanceOf(OcrLoadError)
    expect(worker.terminate).toHaveBeenCalledTimes(1)
  })

  it('allows two minutes for recognition by default', async () => {
    expect(RECOGNIZE_TIMEOUT_MS).toBe(120_000)
    vi.useFakeTimers()
    try {
      worker.recognize.mockReturnValue(new Promise(() => {}))
      let rejected: unknown = null
      recognizeLabel(photo).catch((error) => (rejected = error))
      await vi.advanceTimersByTimeAsync(RECOGNIZE_TIMEOUT_MS - 1)
      expect(rejected).toBeNull()
      await vi.advanceTimersByTimeAsync(1)
      expect((rejected as Error).message).toMatch(/timed out/)
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects with a load error when the engine cannot be loaded, without a worker to clean up', async () => {
    mocks.createWorker.mockRejectedValue(new Error('load failed'))
    const promise = recognizeLabel(photo)
    await expect(promise).rejects.toThrow('load failed')
    await expect(promise).rejects.toBeInstanceOf(OcrLoadError)
    expect(mocks.decodeLabelImage).not.toHaveBeenCalled()
  })

  it('passes the load timeouts on to the worker', async () => {
    vi.useFakeTimers()
    try {
      mocks.createWorker.mockReturnValue(new Promise(() => {}))
      let rejected: unknown = null
      recognizeLabel(photo, undefined, { loadIdle: 50, load: 1000 }).catch((error) => (rejected = error))
      await vi.advanceTimersByTimeAsync(50)
      expect(rejected).toBeInstanceOf(OcrLoadError)
    } finally {
      vi.useRealTimers()
    }
  })
})
