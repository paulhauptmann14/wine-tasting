/**
 * Visual "*" next to the label of a required field. Decoration only: the input carries `required`.
 * Drawn by CSS so it is not part of the label's text – the label stays "Name" for assistive tech,
 * label lookups in tests and anything else that reads the text.
 */
export function RequiredMark() {
  return <span aria-hidden="true" data-slot="required-mark" className="-ml-1 text-wine after:content-['*']" />
}

/** One legend per form that marks fields with <RequiredMark>. Hidden from screen readers – the inputs say it themselves. */
export function RequiredLegend({ className }: { className?: string }) {
  return (
    <p aria-hidden="true" className={className ?? 'text-sm text-muted-foreground'}>
      <span className="text-wine">*</span> Pflichtfeld
    </p>
  )
}
