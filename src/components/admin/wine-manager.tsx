'use client'

import { Shuffle } from 'lucide-react'
import { useActionState, useEffect, useId, useRef, useState } from 'react'
import {
  addWineAction,
  deleteWineAction,
  moveWineAction,
  shuffleWinesAction,
  updateWineAction,
} from '@/app/tasting/[code]/admin/actions'
import { LabelScan } from '@/components/admin/label-scan/label-scan'
import { LabelLines, fieldFilledNotice, type LineField } from '@/components/admin/label-scan/label-lines'
import { ScanMarkNote, ScanSuggestions, scanMarkClass, scanSummary } from '@/components/admin/label-scan/scan-fields'
import { RowActions } from '@/components/admin/row-actions'
import { WineryInput } from '@/components/admin/winery-input'
import { FieldError } from '@/components/field-error'
import { GlassRing } from '@/components/glass-ring'
import { InfoPopover } from '@/components/info-popover'
import { RequiredLegend, RequiredMark } from '@/components/required-mark'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FormAction } from '@/lib/action-state'
import { PREFILL_FIELDS, planPrefill, type PrefillField, type PrefillOption, type PrefillPlan } from '@/lib/label/prefill'
import type { LabelLine } from '@/lib/label/lines'
import type { LabelSuggestion } from '@/lib/label/types'
import { wineDetails, type WineLike } from '@/lib/tasting/display'
import {
  SHUFFLE_EXPLAIN_HINT,
  SHUFFLE_RUNNING_HINT,
  SHUFFLE_TOO_FEW_HINT,
  WINE_LOCK_HINT,
  WINE_REORDER_INFO,
  canShuffleWines,
  type TastingStatus,
} from '@/lib/tasting/rules'
import { SWEETNESS_KEYS, SWEETNESS_LABELS } from '@/lib/tasting/sweetness'
import { WINE_TYPE_KEYS, WINE_TYPE_LABELS } from '@/lib/tasting/wine-type'
import { cn } from '@/lib/utils'

type WineRowData = { id: string } & WineLike

export const SCAN_UNSURE_NOTE = 'Vom Etikett gelesen – das kann falsch sein. Prüf die markierten Felder, bevor du speicherst.'
export const SCAN_SUGGESTIONS_NOTE = 'Vom Etikett gelesen – das kann falsch sein. Tipp auf einen Vorschlag, wenn er stimmt.'

/** What the label scan did to one field: marked as filled from the label and/or suggestions to tap. */
type FieldScan = {
  marked: boolean
  options?: PrefillOption[]
  confirm: () => void
  pick: (option: PrefillOption, form: HTMLFormElement | null) => void
}

/** Marker text, "passt" button and suggestion buttons under a field. */
function ScanExtras({ id, label, scan }: { id: string; label: string; scan: FieldScan }) {
  return (
    <>
      <ScanMarkNote id={`${id}-scan`} label={label} marked={scan.marked} onConfirm={scan.confirm} />
      <ScanSuggestions label={label} options={scan.options} onPick={scan.pick} />
    </>
  )
}

/** Native select styled like <Input> – on phones it opens the system picker. */
function ChoiceField<K extends string>({
  id,
  name,
  label,
  keys,
  labels,
  defaultValue,
  errors,
  required,
  scan,
}: {
  id: string
  name: string
  label: string
  keys: readonly K[]
  labels: Record<K, string>
  defaultValue: string
  errors?: string[]
  required?: boolean
  scan: FieldScan
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required && <RequiredMark />}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={!!errors}
        aria-describedby={scan.marked ? `${id}-scan` : undefined}
        className={cn(
          'mt-2 h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30',
          scanMarkClass(scan.marked),
        )}
      >
        <option value="">{required ? 'Bitte wählen' : 'keine Angabe'}</option>
        {keys.map((key) => (
          <option key={key} value={key}>
            {labels[key]}
          </option>
        ))}
      </select>
      <FieldError errors={errors} />
      <ScanExtras id={id} label={label} scan={scan} />
    </div>
  )
}

function WineForm({
  action,
  initial,
  submitLabel,
  onDone,
  scan,
}: {
  action: FormAction
  initial?: WineRowData
  submitLabel: string
  onDone?: () => void
  /** Offer "Etikett scannen" above the fields */
  scan?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const errors = state?.fieldErrors ?? {}
  const values = state?.values
  // What the label scan did: fields filled from the label (marked until edited or confirmed) and
  // uncertain values offered as buttons. Each submit resets the form, so both start over with it.
  const [marked, setMarked] = useState<Partial<Record<PrefillField, true>>>({})
  const [options, setOptions] = useState<Partial<Record<PrefillField, PrefillOption[]>>>({})
  // Lines read from the label, the field each was assigned to (by its text), and why a tap did nothing
  const [lines, setLines] = useState<LabelLine[]>([])
  const [assigned, setAssigned] = useState<Record<string, LineField | undefined>>({})
  const [lineNotice, setLineNotice] = useState('')
  const [noticeFor, setNoticeFor] = useState('')
  // The text a tap from the list wrote into a field: only such text may be replaced by a later tap
  const [written, setWritten] = useState<Partial<Record<LineField, string>>>({})
  // The value a scan wrote into each field: while the field still holds it unconfirmed, a later scan
  // (the back label, a sharper photo) may replace it with a sure value of its own; once the host
  // edits or confirms it, it is his
  const [scanned, setScanned] = useState<Partial<Record<PrefillField, string>>>({})
  const [round, setRound] = useState(0)
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    // A failed submit keeps the scan as it is: the form comes back with the submitted values
    if (state?.ok || !state?.values) {
      setMarked({})
      setOptions({})
      setLines([])
      setAssigned({})
      setLineNotice('')
      setWritten({})
      setScanned({})
      setRound((r) => r + 1)
    } else {
      setLineNotice('')
    }
  }

  const fieldElement = (name: PrefillField) =>
    formRef.current?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null | undefined

  /**
   * Writes the values read with confidence into the fields that are still empty, keeps the rest as
   * suggestions; returns the status line. Front and back label complement each other: what an
   * earlier scan wrote and nobody touched since is replaced only by a sure value of the new photo,
   * otherwise it stays, still marked. Typed, confirmed, picked and assigned text is never touched.
   */
  function applySuggestion(suggestion: LabelSuggestion): string {
    if (!formRef.current) return ''
    const before = Object.fromEntries(PREFILL_FIELDS.map((name) => [name, fieldElement(name)?.value ?? ''])) as Record<
      PrefillField,
      string
    >
    const replaceable = new Set(
      PREFILL_FIELDS.filter((name) => marked[name] && scanned[name] !== undefined && before[name] === scanned[name]),
    )
    const plan = planPrefill(
      suggestion,
      Object.fromEntries(PREFILL_FIELDS.map((name) => [name, replaceable.has(name) ? '' : before[name]])),
    )
    for (const [name, value] of Object.entries(plan.values) as [PrefillField, string][]) {
      const element = fieldElement(name)
      if (element) element.value = value
    }
    // A value an earlier scan wrote and that stays is not offered again as a suggestion
    const suggestions: PrefillPlan['suggestions'] = {}
    for (const [name, list] of Object.entries(plan.suggestions) as [PrefillField, PrefillOption[]][]) {
      const kept = (plan.values[name] ?? before[name]).toLowerCase()
      const rest = list.filter((option) => option.value.toLowerCase() !== kept)
      if (rest.length > 0) suggestions[name] = rest
    }
    const nextMarked: Partial<Record<PrefillField, true>> = { ...marked }
    for (const name of plan.marked) nextMarked[name] = true
    setMarked(nextMarked)
    setScanned({ ...scanned, ...plan.values })
    // Suggestions belong to one photo: the new scan's replace the old ones
    setOptions(suggestions)
    setLines(plan.lines)
    setAssigned({})
    setLineNotice('')
    // Text an earlier tap wrote stays replaceable by a tap from the new list
    setWritten((prev) => {
      const next: Partial<Record<LineField, string>> = {}
      for (const field of ['name', 'winery'] as const) if (prev[field] && fieldElement(field)?.value === prev[field]) next[field] = prev[field]
      return next
    })
    // Only what actually changed counts as filled: reading the same value again is no news
    const changed = plan.marked.filter((name) => plan.values[name] !== before[name])
    return scanSummary({ ...plan, marked: changed, suggestions })
  }

  /**
   * [Name] / [Weingut] on a label line. Fills the field only if it is empty, still holds what an
   * earlier tap wrote or what an earlier scan filled and nobody checked; text the host typed is
   * never replaced. Tapping the other field moves the line.
   */
  function assignLine(line: LabelLine, field: LineField) {
    const element = fieldElement(field)
    if (!element) return
    if (assigned[line.text] === field) {
      // Second tap on the pressed button: take the line out again, unless the host changed the text
      if (element.value === written[field]) {
        element.value = ''
        setMarked((prev) => ({ ...prev, [field]: undefined }))
      }
      setWritten((prev) => ({ ...prev, [field]: undefined }))
      setAssigned((prev) => ({ ...prev, [line.text]: undefined }))
      setLineNotice('')
      return
    }
    const value = element.value.trim()
    const unchecked = marked[field] && scanned[field] === element.value
    if (value && value !== written[field] && !unchecked) {
      setLineNotice(fieldFilledNotice(field))
      setNoticeFor(line.text)
      return
    }
    const previous = assigned[line.text]
    if (previous) {
      const old = fieldElement(previous)
      if (old && old.value === written[previous]) {
        old.value = ''
        setMarked((prev) => ({ ...prev, [previous]: undefined }))
      }
    }
    element.value = line.text
    setScanned((prev) => ({ ...prev, [field]: undefined }))
    setWritten((prev) => ({ ...prev, [previous ?? field]: undefined, [field]: line.text }))
    setMarked((prev) => ({ ...prev, [field]: true }))
    setAssigned((prev) => {
      const next: Record<string, LineField | undefined> = {}
      for (const [text, to] of Object.entries(prev)) if (to !== field && text !== line.text) next[text] = to
      next[line.text] = field
      return next
    })
    setLineNotice('')
  }

  function fieldScan(name: PrefillField): FieldScan {
    return {
      marked: !!marked[name],
      options: options[name],
      confirm: () => {
        setMarked((prev) => ({ ...prev, [name]: undefined }))
        setScanned((prev) => ({ ...prev, [name]: undefined }))
      },
      pick: (option, form) => {
        const element = form?.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null | undefined
        if (element) element.value = option.value
        // Picked by the host: a later scan leaves it alone
        setScanned((prev) => ({ ...prev, [name]: undefined }))
        setMarked((prev) => ({ ...prev, [name]: true }))
        setOptions((prev) => ({ ...prev, [name]: prev[name]?.filter((o) => o.value !== option.value) }))
      },
    }
  }

  const markedCount = PREFILL_FIELDS.filter((name) => marked[name]).length
  const optionCount = PREFILL_FIELDS.filter((name) => options[name]?.length).length
  const describedBy = (name: PrefillField) => (marked[name] ? `${id}-${name}-scan` : undefined)

  useEffect(() => {
    if (state?.ok) onDone?.()
  }, [state, onDone])

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      // Once the host edits a field himself, its marker and suggestions have done their job
      onChange={(e) => {
        const target: EventTarget = e.target
        const name = (target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target.name : '') as PrefillField
        if (marked[name]) setMarked((prev) => ({ ...prev, [name]: undefined }))
        if (options[name]) setOptions((prev) => ({ ...prev, [name]: undefined }))
        if (scanned[name] !== undefined) setScanned((prev) => ({ ...prev, [name]: undefined }))
        if (name === 'name' || name === 'winery') {
          // The host took over this field: the line is no longer "in" it, and the text is his now
          setWritten((prev) => ({ ...prev, [name]: undefined }))
          setAssigned((prev) => Object.fromEntries(Object.entries(prev).filter(([, to]) => to !== name)))
          setLineNotice('')
        }
      }}
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start"
    >
      {scan && (
        <div className="sm:col-span-2">
          <LabelScan key={round} onResult={applySuggestion} />
          {/* Always rendered, so a screen reader announces the note when it appears */}
          <div role="status">
            {(markedCount > 0 || optionCount > 0) && (
              <p className={cn(marginNote, 'mt-3')}>{markedCount > 0 ? SCAN_UNSURE_NOTE : SCAN_SUGGESTIONS_NOTE}</p>
            )}
          </div>
        </div>
      )}
      <RequiredLegend className="text-sm text-muted-foreground sm:col-span-2" />
      <div className="sm:col-span-2">
        <Label htmlFor={`${id}-name`}>
          Name
          <RequiredMark />
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={values?.name ?? initial?.name}
          maxLength={80}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={describedBy('name')}
          className={cn('mt-2 h-12', scanMarkClass(!!marked.name))}
        />
        <FieldError errors={errors.name} />
        <ScanExtras id={`${id}-name`} label="Name" scan={fieldScan('name')} />
      </div>
      <LabelLines lines={lines} assigned={assigned} notice={lineNotice} noticeFor={noticeFor} onAssign={assignLine} className="sm:col-span-2" />
      <ChoiceField
        id={`${id}-wine-type`}
        name="wineType"
        label="Weinart"
        keys={WINE_TYPE_KEYS}
        labels={WINE_TYPE_LABELS}
        defaultValue={values?.wineType ?? initial?.wineType ?? ''}
        errors={errors.wineType}
        required
        scan={fieldScan('wineType')}
      />
      <div>
        <Label htmlFor={`${id}-winery`}>Weingut</Label>
        <WineryInput
          id={`${id}-winery`}
          name="winery"
          defaultValue={values?.winery ?? initial?.winery ?? ''}
          maxLength={80}
          aria-invalid={!!errors.winery}
          aria-describedby={describedBy('winery')}
          className={cn('mt-2 h-12', scanMarkClass(!!marked.winery))}
        />
        <FieldError errors={errors.winery} />
        <ScanExtras id={`${id}-winery`} label="Weingut" scan={fieldScan('winery')} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Vorschläge: ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2">
            OpenStreetMap-Mitwirkende
          </a>
          , Wikidata
        </p>
      </div>
      <div>
        <Label htmlFor={`${id}-vintage`}>Jahrgang</Label>
        <Input
          id={`${id}-vintage`}
          name="vintage"
          inputMode="numeric"
          defaultValue={values?.vintage ?? initial?.vintage ?? ''}
          maxLength={4}
          aria-invalid={!!errors.vintage}
          aria-describedby={describedBy('vintage')}
          className={cn('mt-2 h-12', scanMarkClass(!!marked.vintage))}
        />
        <FieldError errors={errors.vintage} />
        <ScanExtras id={`${id}-vintage`} label="Jahrgang" scan={fieldScan('vintage')} />
      </div>
      <div>
        <Label htmlFor={`${id}-grape`}>Rebsorte</Label>
        <Input
          id={`${id}-grape`}
          name="grapeVariety"
          defaultValue={values?.grapeVariety ?? initial?.grapeVariety ?? ''}
          maxLength={60}
          aria-invalid={!!errors.grapeVariety}
          aria-describedby={describedBy('grapeVariety')}
          className={cn('mt-2 h-12', scanMarkClass(!!marked.grapeVariety))}
        />
        <FieldError errors={errors.grapeVariety} />
        <ScanExtras id={`${id}-grapeVariety`} label="Rebsorte" scan={fieldScan('grapeVariety')} />
      </div>
      <ChoiceField
        id={`${id}-sweetness`}
        name="sweetness"
        label="Geschmacksrichtung"
        keys={SWEETNESS_KEYS}
        labels={SWEETNESS_LABELS}
        defaultValue={values?.sweetness ?? initial?.sweetness ?? ''}
        errors={errors.sweetness}
        scan={fieldScan('sweetness')}
      />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="lg" className="h-12" disabled={pending}>
          {submitLabel}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" size="lg" className="h-12" onClick={onDone}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  )
}

function WineRow({
  code,
  wine,
  isFirst,
  isLast,
  locked,
}: {
  code: string
  wine: WineRowData
  isFirst: boolean
  isLast: boolean
  locked: boolean
}) {
  const [editing, setEditing] = useState(false)
  const subtitle = wineDetails(wine)

  return (
    <li className="border-b border-border py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <GlassRing seed={wine.position} size={48}>
          <span className="font-display text-lg">{wine.position}</span>
        </GlassRing>
        <div className="min-w-40 flex-1">
          <p className="truncate font-medium">{wine.name}</p>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <RowActions
          label={`Wein #${wine.position}`}
          moveUp={moveWineAction.bind(null, code, wine.id, 'up')}
          moveDown={moveWineAction.bind(null, code, wine.id, 'down')}
          upDisabled={isFirst}
          downDisabled={isLast}
          editLabel={`Wein #${wine.position} bearbeiten`}
          editing={editing}
          onToggleEdit={() => setEditing((v) => !v)}
          remove={{
            action: deleteWineAction.bind(null, code, wine.id),
            disabled: locked,
            label: `Wein #${wine.position} löschen`,
            title: `Wein #${wine.position} löschen?`,
            description:
              'Alle Bewertungen dieses Weins werden ebenfalls gelöscht. Die folgenden Weine rücken eine Nummer nach vorn.',
            confirmLabel: 'Löschen',
          }}
        />
      </div>
      {editing && (
        <div className="mt-3 pb-2">
          <WineForm
            action={updateWineAction.bind(null, code, wine.id)}
            initial={wine}
            submitLabel="Speichern"
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </li>
  )
}

/** Shuffles the wines nobody has rated yet. Hidden once the tasting is finished. */
function ShuffleControl({
  code,
  status,
  unratedCount,
  wineCount,
}: {
  code: string
  status: TastingStatus
  unratedCount: number
  wineCount: number
}) {
  const [state, action, pending] = useActionState(shuffleWinesAction.bind(null, code), undefined)
  const hintId = useId()
  const tooFew = unratedCount < 2
  if (!canShuffleWines(status)) return null

  return (
    <div className="grid grid-cols-1 gap-1">
      <p className="mb-1 text-sm text-muted-foreground">{SHUFFLE_EXPLAIN_HINT}</p>
      {(status === 'active' || unratedCount < wineCount) && <p className={cn(marginNote, 'mb-2')}>{SHUFFLE_RUNNING_HINT}</p>}
      <form action={action}>
        <button
          type="submit"
          disabled={tooFew || pending}
          aria-describedby={tooFew ? hintId : undefined}
          className={cn(textLink, textLinkFocus, 'gap-2 disabled:pointer-events-none disabled:opacity-50')}
        >
          <Shuffle className="size-4" aria-hidden />
          Reihenfolge mischen
        </button>
      </form>
      {tooFew && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {SHUFFLE_TOO_FEW_HINT}
        </p>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {state?.message && (
          <span
            key={state.values?.nonce}
            className={state.ok ? 'text-muted-foreground' : 'text-destructive'}
          >
            {state.message}
          </span>
        )}
      </p>
    </div>
  )
}

export function WineManager({
  code,
  wines,
  locked,
  status,
  unratedCount,
}: {
  code: string
  wines: WineRowData[]
  locked: boolean
  status: TastingStatus
  /** Wines nobody has rated yet – only these take part in the shuffle */
  unratedCount: number
}) {
  return (
    <div className="grid grid-cols-1 gap-8">
      {locked && (
        <div className="flex items-start gap-1">
          <p className={cn(marginNote, 'flex-1 self-center')}>{WINE_LOCK_HINT}</p>
          <InfoPopover label="Umsortieren oder falsch eingeschenkt?">{WINE_REORDER_INFO}</InfoPopover>
        </div>
      )}
      {wines.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Weine. Füg den ersten hinzu.</p>
      ) : (
        <ol className="grid grid-cols-1 border-t border-border">
          {wines.map((wine, i) => (
            <WineRow
              key={wine.id}
              code={code}
              wine={wine}
              isFirst={i === 0}
              isLast={i === wines.length - 1}
              locked={locked}
            />
          ))}
        </ol>
      )}
      {wines.length > 0 && <ShuffleControl code={code} status={status} unratedCount={unratedCount} wineCount={wines.length} />}
      <section aria-labelledby="add-wine-heading">
        <h2 id="add-wine-heading" className="mb-4 font-display text-xl font-medium">
          Wein #{wines.length + 1} hinzufügen
        </h2>
        <WineForm action={addWineAction.bind(null, code)} submitLabel="Wein hinzufügen" scan />
      </section>
    </div>
  )
}
