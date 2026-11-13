// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareResultsImage } from './share-results-image'

const IMAGE_URL = '/tasting/8GXBW5/results/image'

function imageResponse(disposition: string | null = 'inline; filename="weinabend-bei-paul-ergebnis.png"') {
  const headers = new Headers({ 'content-type': 'image/png' })
  if (disposition) headers.set('content-disposition', disposition)
  return { ok: true, status: 200, headers, blob: async () => new Blob(['png'], { type: 'image/png' }) }
}

function stubShare({ canShare, share }: { canShare?: (data: ShareData) => boolean; share?: (data: ShareData) => Promise<void> }) {
  Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true })
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
}

let createObjectURL: ReturnType<typeof vi.fn>
let revokeObjectURL: ReturnType<typeof vi.fn>

beforeEach(() => {
  createObjectURL = vi.fn(() => 'blob:mock')
  revokeObjectURL = vi.fn()
  Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  stubShare({})
})

const ERROR_TEXT = 'Das Bild ging nicht. Versuch es noch einmal.'

function renderShare(name = 'Ergebnis als Bild teilen', imageCount = 1) {
  render(<ShareResultsImage code="8GXBW5" title="Weinabend bei Paul" imageCount={imageCount} />)
  return screen.getByRole('button', { name })
}

const canShareFiles = (data: ShareData) => Boolean(data.files?.length)

it('shares the image as a PNG file when the device can share files', async () => {
  const fetchMock = vi.fn(async () => imageResponse())
  vi.stubGlobal('fetch', fetchMock)
  const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {})
  stubShare({ canShare: canShareFiles, share })

  await userEvent.click(renderShare())

  expect(fetchMock).toHaveBeenCalledWith(IMAGE_URL, expect.anything())
  expect(share).toHaveBeenCalledTimes(1)
  const data = share.mock.calls[0][0]
  expect(data.title).toBe('Weinabend bei Paul')
  const file = data.files![0]
  expect(file).toBeInstanceOf(File)
  expect(file.name).toBe('weinabend-bei-paul-ergebnis.png')
  expect(file.type).toBe('image/png')
  expect(createObjectURL).not.toHaveBeenCalled()
})

it('loads the image before the tap, so the share sheet still gets a fresh tap', async () => {
  const fetchMock = vi.fn(async () => imageResponse())
  vi.stubGlobal('fetch', fetchMock)
  const share = vi.fn(async () => {})
  stubShare({ canShare: canShareFiles, share })

  const button = renderShare()
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  // From here on the server would be slow – the tap must not wait for it
  fetchMock.mockImplementation(() => new Promise(() => {}))
  await userEvent.click(button)

  expect(share).toHaveBeenCalledTimes(1)
  // ...and prepares a fresh image for the next tap
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('asks the server whether the image changed instead of always taking a new one', async () => {
  const fetchMock = vi.fn(async () => imageResponse())
  vi.stubGlobal('fetch', fetchMock)
  stubShare({ canShare: canShareFiles, share: vi.fn(async () => {}) })

  renderShare()

  // no-cache: the browser revalidates its copy (ETag) – the server only renders when the ranking changed
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(IMAGE_URL, { cache: 'no-cache' }))
})

it('checks for a fresh image when the page comes back', async () => {
  const fetchMock = vi.fn(async () => imageResponse())
  vi.stubGlobal('fetch', fetchMock)
  stubShare({ canShare: canShareFiles, share: vi.fn(async () => {}) })

  renderShare()
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  document.dispatchEvent(new Event('visibilitychange'))

  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('loads nothing ahead on devices that download – a download needs no fresh tap', async () => {
  const fetchMock = vi.fn(async () => imageResponse())
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  const button = renderShare('Bild herunterladen')
  document.dispatchEvent(new Event('visibilitychange'))
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(fetchMock).not.toHaveBeenCalled()

  await userEvent.click(button)
  await userEvent.click(button)

  // One request per tap, none in between
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it('downloads the image when the share sheet refuses', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => imageResponse()))
  const share = vi.fn(async () => {
    throw new DOMException('Not allowed', 'NotAllowedError')
  })
  stubShare({ canShare: canShareFiles, share })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  await userEvent.click(renderShare())

  expect(share).toHaveBeenCalledTimes(1)
  expect(click).toHaveBeenCalledTimes(1)
  expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument()
})

it('offers a download when sharing files is not supported', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => imageResponse(null)))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    expect(this.download).toBe('wine-tasting-ergebnis.png')
    expect(this.href).toBe('blob:mock')
  })

  await userEvent.click(renderShare('Bild herunterladen'))

  expect(createObjectURL).toHaveBeenCalledWith(expect.any(File))
  expect(click).toHaveBeenCalledTimes(1)
  expect(document.querySelector('a[download]')).toBeNull()
  expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument()
})

it('treats a cancelled share sheet as no error', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => imageResponse()))
  const share = vi.fn(async () => {
    throw new DOMException('Share canceled', 'AbortError')
  })
  stubShare({ canShare: () => true, share })
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  const button = renderShare()
  await userEvent.click(button)

  expect(share).toHaveBeenCalledTimes(1)
  expect(click).not.toHaveBeenCalled()
  expect(screen.queryByText(ERROR_TEXT)).not.toBeInTheDocument()
  expect(button).not.toHaveAttribute('aria-disabled', 'true')
})

it('shows an error when the image cannot be loaded, in a live region that is there from the start', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ...imageResponse(), ok: false, status: 404 })))
  stubShare({ canShare: canShareFiles, share: vi.fn(async () => {}) })

  const button = renderShare()
  const live = document.querySelector('[aria-live="polite"]')!
  expect(live).toBeVisible()
  await userEvent.click(button)

  expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
  expect(live).toHaveTextContent(ERROR_TEXT)
  expect(button).not.toHaveAttribute('aria-disabled', 'true')
})

it('shows an error when the network fails', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))

  await userEvent.click(renderShare('Bild herunterladen'))

  expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
})

it('says so while the image is still loading and keeps the focus on the button', async () => {
  let resolve!: (value: ReturnType<typeof imageResponse>) => void
  vi.stubGlobal('fetch', vi.fn(() => new Promise((r) => (resolve = r))))
  const share = vi.fn(async () => {})
  stubShare({ canShare: () => true, share })

  const button = renderShare()
  await userEvent.click(button)
  await userEvent.click(button)

  expect(button).toHaveAccessibleName('Bild wird erstellt …')
  expect(button).toHaveAttribute('aria-disabled', 'true')
  expect(button).toHaveFocus()
  resolve(imageResponse())
  await waitFor(() => expect(button).toHaveAccessibleName('Ergebnis als Bild teilen'))
  // The second tap while loading did nothing
  expect(share).toHaveBeenCalledTimes(1)
})

it('offers a plain link to open the image', () => {
  vi.stubGlobal('fetch', vi.fn(async () => imageResponse()))
  renderShare('Bild herunterladen')
  const link = screen.getByRole('link', { name: 'Bild öffnen' })
  expect(link).toHaveAttribute('href', IMAGE_URL)
  expect(link).toHaveAttribute('target', '_blank')
})

function multiImageFetch(failOn?: string) {
  return vi.fn(async (url: string) => {
    if (failOn && url === failOn) return { ...imageResponse(), ok: false, status: 500 }
    const n = new URL(url, 'http://x').searchParams.get('bild') ?? '1'
    return imageResponse(`inline; filename="weinabend-ergebnis-${n}.png"`)
  })
}

it('shares all images in one go', async () => {
  const fetchMock = multiImageFetch()
  vi.stubGlobal('fetch', fetchMock)
  const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {})
  stubShare({ canShare: canShareFiles, share })

  await userEvent.click(renderShare('Ergebnis als Bilder teilen', 3))

  expect(share).toHaveBeenCalledTimes(1)
  const data = share.mock.calls[0][0]
  expect(data.title).toBe('Weinabend bei Paul')
  expect(data.files!.map((file) => file.name)).toEqual(['weinabend-ergebnis-1.png', 'weinabend-ergebnis-2.png', 'weinabend-ergebnis-3.png'])
  expect(fetchMock).toHaveBeenCalledWith(IMAGE_URL, expect.anything())
  expect(fetchMock).toHaveBeenCalledWith(`${IMAGE_URL}?bild=2`, expect.anything())
  expect(fetchMock).toHaveBeenCalledWith(`${IMAGE_URL}?bild=3`, expect.anything())
})

it('downloads every image without file sharing', async () => {
  vi.stubGlobal('fetch', multiImageFetch())
  const names: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download)
  })

  await userEvent.click(renderShare('Bilder herunterladen', 3))

  expect(names).toEqual(['weinabend-ergebnis-1.png', 'weinabend-ergebnis-2.png', 'weinabend-ergebnis-3.png'])
})

it('shows the error when one image fails', async () => {
  vi.stubGlobal('fetch', multiImageFetch(`${IMAGE_URL}?bild=2`))
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  await userEvent.click(renderShare('Bilder herunterladen', 3))

  expect(await screen.findByText(ERROR_TEXT)).toBeInTheDocument()
  // Nothing is handed out half-finished
  expect(click).not.toHaveBeenCalled()
})

it('says images while they are created', async () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  const button = renderShare('Bilder herunterladen', 2)
  await userEvent.click(button)
  expect(button).toHaveAccessibleName('Bilder werden erstellt …')
})

it('leaves the links of several images to <ResultImageLinks>, so the bar holds only the button', () => {
  vi.stubGlobal('fetch', multiImageFetch())
  renderShare('Bilder herunterladen', 3)
  expect(screen.queryAllByRole('link')).toHaveLength(0)
})

it('keeps the blob URL alive long enough for queued downloads', async () => {
  vi.stubGlobal('fetch', multiImageFetch())
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  const button = renderShare('Bilder herunterladen', 3)
  vi.useFakeTimers({ toFake: ['setTimeout'] })
  try {
    button.click()
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(3))
    // Chrome may ask "Mehrere Dateien herunterladen?" first and only then start the queued ones
    vi.advanceTimersByTime(30_000)
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    expect(revokeObjectURL).toHaveBeenCalledTimes(3)
  } finally {
    vi.useRealTimers()
  }
})
