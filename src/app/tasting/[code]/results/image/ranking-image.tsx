/* eslint-disable @next/next/no-img-element -- ImageResponse renders plain <img> */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import type { CSSProperties } from 'react'
import { APP_ICON_COLORS, svgDataUri } from '@/lib/app-icon'
import { glassMarkSvg } from '@/lib/glass-mark'
import { ringPath } from '@/lib/ring-path'
import type { RankingCard, RankingCardLayout, RankingCardWine } from '@/lib/tasting/ranking-card'

const RANKING_IMAGE_SIZE = { width: 1080, height: 1350 } as const

/** Concrete values of the light theme tokens in globals.css – images can't use CSS variables. */
const COLORS = {
  background: APP_ICON_COLORS.background,
  foreground: '#000000',
  mutedForeground: '#6c6c70',
  wine: APP_ICON_COLORS.wine,
  // --border is rgb(60 60 67 / 0.22) on the background, flattened for the renderer
  border: '#d1d1d6',
} as const

// Fonts don't depend on the request – read on first use and keep them, but only once they loaded:
// a failed read is retried on the next request. Literal paths so the standalone build (Docker)
// traces and copies the files. Their character set is CARD_CHAR in ranking-card.ts.
let fonts: Promise<Buffer[]> | undefined
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(process.cwd(), 'assets/fonts/newsreader-latin-500-normal.woff')),
    readFile(join(process.cwd(), 'assets/fonts/inter-latin-400-normal.woff')),
    readFile(join(process.cwd(), 'assets/fonts/inter-latin-500-normal.woff')),
  ]).catch((error) => {
    fonts = undefined
    throw error
  })
  return fonts
}

const SERIF = 'Newsreader'
// Close to the system fonts of the app (SF Pro / Roboto); Satori can't use local fonts
const SANS = 'Inter'

/** The glass ring from <GlassRing> as SVG – absolute dash lengths because resvg ignores pathLength. */
function ringSvg(seed: number): string {
  const rim = ringPath(seed + 3, 40.5)
  const c = 2 * Math.PI * 40.5
  const dash = (...parts: number[]) => parts.map((p) => (p * c).toFixed(1)).join(' ')
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    `<g transform="rotate(${(seed * 47) % 360} 50 50)" stroke="${COLORS.wine}" fill="none">`,
    `<path d="${ringPath(seed, 38)}" stroke="none" fill="${COLORS.wine}" fill-opacity="0.07"/>`,
    `<path d="${ringPath(seed + 7, 37)}" stroke-opacity="0.3" stroke-width="1"/>`,
    `<path d="${rim}" stroke-opacity="0.85" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="${dash(0.82, 1)}"/>`,
    `<path d="${rim}" stroke-opacity="0.6" stroke-width="7.5" stroke-linecap="round" stroke-dasharray="${dash(0.2, 1)}" stroke-dashoffset="${dash(-0.45)}"/>`,
    '</g>',
    '</svg>',
  ].join('')
}

const ringUri = (seed: number) => svgDataUri(ringSvg(seed))

// The logo; bold because shared images are mostly seen shrunk to a phone's width
const MARK_URI = svgDataUri(glassMarkSvg({ color: COLORS.wine, bold: true }))

/** Same size in every ring of an image, from the widest score ("20,0", "100") so it stays inside the rim. */
function scoreFontSize(maxScore: string, size: number) {
  const glyphs = Array.from(maxScore).reduce((n, c) => n + (c === ',' ? 0.3 : 1), 0)
  return Math.round(size * Math.min(0.36, 0.9 / glyphs))
}

/** The rim sits inside its square – pull it left so its edge lines up with the text column. */
const RING_INSET = 0.08

function ScoreRing({ wine, size, card }: { wine: RankingCardWine; size: number; card: RankingCard }) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        marginLeft: -Math.round(size * RING_INSET),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <img src={ringUri(wine.position)} width={size} height={size} alt="" style={{ position: 'absolute', top: 0, left: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: SERIF, fontSize: scoreFontSize(card.maxScore, size), lineHeight: 1 }}>{wine.score}</div>
        <div style={{ fontSize: Math.max(18, Math.round(size * 0.1)), color: COLORS.mutedForeground, marginTop: Math.round(size * 0.035) }}>
          {card.maxLabel}
        </div>
      </div>
    </div>
  )
}

/** One line of secondary text – the view model already shortened it to fit. */
function Muted({ text, fontSize, style }: { text: string; fontSize: number; style?: CSSProperties }) {
  return <div style={{ display: 'flex', fontSize, color: COLORS.mutedForeground, whiteSpace: 'nowrap', ...style }}>{text}</div>
}

/** Name and details; the view model shortened both per slot, lineClamp is only the safety net. */
function Identity({ wine, nameSize, detailSize }: { wine: RankingCardWine; nameSize: number; detailSize: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ display: 'block', fontFamily: SERIF, fontSize: nameSize, lineHeight: 1.1, letterSpacing: -0.01 * nameSize, lineClamp: 2 }}>
        {wine.name}
      </div>
      {wine.details && <Muted text={wine.details} fontSize={detailSize} style={{ marginTop: 8 }} />}
    </div>
  )
}

function Place({ rank, size }: { rank: number; size: number }) {
  return <div style={{ fontSize: size, fontWeight: 500, color: COLORS.wine, marginBottom: 4 }}>{`Platz ${rank}`}</div>
}

/** Ring and type sizes per layout – fewer wines get more room instead of an empty sheet. */
const SIZES: Record<
  RankingCardLayout,
  {
    winnerRing: number
    winnerName: number
    winnerPlace: number
    runnerRing: number
    runnerName: number
    runnerDetail: number
    /** Runner-up text below the top of its ring */
    runnerTop: number
    podiumGap: number
    rowHeight: number
  }
> = {
  stacked: { winnerRing: 280, winnerName: 60, winnerPlace: 28, runnerRing: 200, runnerName: 44, runnerDetail: 24, runnerTop: 0, podiumGap: 48, rowHeight: 0 },
  roomy: { winnerRing: 280, winnerName: 60, winnerPlace: 28, runnerRing: 164, runnerName: 36, runnerDetail: 22, runnerTop: 28, podiumGap: 56, rowHeight: 80 },
  compact: { winnerRing: 200, winnerName: 50, winnerPlace: 26, runnerRing: 148, runnerName: 30, runnerDetail: 22, runnerTop: 12, podiumGap: 36, rowHeight: 64 },
}

function Podium({ card }: { card: RankingCard }) {
  const [winner, ...runnersUp] = card.podium
  const s = SIZES[card.layout]
  const stacked = card.layout === 'stacked'
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ScoreRing wine={winner} size={s.winnerRing} card={card} />
        <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 36, flex: 1, minWidth: 0 }}>
          <Place rank={winner.rank} size={s.winnerPlace} />
          <Identity wine={winner} nameSize={s.winnerName} detailSize={24} />
        </div>
      </div>

      {runnersUp.length > 0 && (
        <div style={{ display: 'flex', flexDirection: stacked ? 'column' : 'row', marginTop: s.podiumGap }}>
          {runnersUp.map((wine, i) => (
            <div
              key={wine.wineId}
              style={
                stacked
                  ? // One below the other, like the winner: the image has room for it
                    { display: 'flex', alignItems: 'center', marginTop: i === 0 ? 0 : 32 }
                  : { display: 'flex', alignItems: 'flex-start', width: '50%', paddingRight: 24 }
              }
            >
              <ScoreRing wine={wine} size={s.runnerRing} card={card} />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginLeft: stacked ? 32 : 20,
                  paddingTop: s.runnerTop,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Place rank={wine.rank} size={stacked ? 24 : 22} />
                <Identity wine={wine} nameSize={s.runnerName} detailSize={s.runnerDetail} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Rows({ card }: { card: RankingCard }) {
  const { rowHeight } = SIZES[card.layout]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 44, borderTop: `1px solid ${COLORS.border}` }}>
      {card.rest.map((wine) => (
        <div key={wine.wineId} style={{ display: 'flex', alignItems: 'center', height: rowHeight, borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ width: 52, fontSize: 24, color: COLORS.mutedForeground }}>{String(wine.rank)}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <div style={{ fontFamily: SERIF, fontSize: 29, whiteSpace: 'nowrap' }}>{wine.name}</div>
            {wine.details && <Muted text={wine.details} fontSize={22} style={{ marginLeft: 16 }} />}
          </div>
          <div style={{ fontFamily: SERIF, fontSize: 32, marginLeft: 24 }}>{wine.score}</div>
        </div>
      ))}
    </div>
  )
}

function Card({ card }: { card: RankingCard }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        width: '100%',
        height: '100%',
        padding: '72px 80px 64px',
        backgroundColor: COLORS.background,
        color: COLORS.foreground,
        fontFamily: SANS,
        overflow: 'hidden',
      }}
    >
      {/* Glass set down on the sheet, cropped at the top right like <CornerStain> */}
      <img src={ringUri(7)} width={320} height={320} alt="" style={{ position: 'absolute', top: -120, right: -110 }} />

      <div style={{ display: 'flex', alignItems: 'center', fontSize: 24, fontWeight: 500, color: COLORS.wine }}>
        <img src={MARK_URI} width={40} height={40} alt="" style={{ marginRight: 12 }} />
        Wine Tasting
      </div>
      <div
        style={{
          display: 'block',
          fontFamily: SERIF,
          fontSize: card.title.length > 30 ? 60 : 72,
          lineHeight: 1.08,
          letterSpacing: -1.5,
          marginTop: 28,
          // Clear of the corner stain
          maxWidth: 800,
          lineClamp: 2,
        }}
      >
        {card.title}
      </div>
      <div style={{ display: 'flex', fontSize: 26, color: COLORS.mutedForeground, marginTop: 14 }}>{card.date}</div>

      {/* Like a filled-in sheet: the ranking follows the title, spare room collects above the footer.
          The top gap gives way first when ten wines need the whole page. */}
      <div style={{ display: 'flex', flexShrink: 1, flexBasis: 64, minHeight: 16 }} />
      <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {card.podium.length === 0 ? (
          <div style={{ display: 'flex', paddingLeft: 20, borderLeft: `3px solid ${COLORS.wine}`, fontSize: 32, color: COLORS.mutedForeground }}>
            Keine Bewertungen abgegeben.
          </div>
        ) : (
          <Podium card={card} />
        )}
        {card.rest.length > 0 && <Rows card={card} />}
        {card.hiddenCount > 0 && (
          <div style={{ display: 'flex', fontSize: 22, color: COLORS.mutedForeground, marginTop: 14 }}>{`+ ${card.hiddenCount} weitere`}</div>
        )}
      </div>
      <div style={{ display: 'flex', flex: 1, minHeight: 24 }} />

      <Muted text={card.footer} fontSize={22} />
    </div>
  )
}

/** The final ranking as a 4:5 PNG to share (Instagram/WhatsApp friendly). */
export async function rankingImage(card: RankingCard, headers: Record<string, string>): Promise<ImageResponse> {
  const [serif, sans, sansMedium] = await loadFonts()
  return new ImageResponse(<Card card={card} />, {
    ...RANKING_IMAGE_SIZE,
    headers,
    fonts: [
      { name: SERIF, data: serif, weight: 500, style: 'normal' },
      { name: SANS, data: sans, weight: 400, style: 'normal' },
      { name: SANS, data: sansMedium, weight: 500, style: 'normal' },
    ],
  })
}
