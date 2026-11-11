import type { Metadata } from 'next'
import { LegalPage } from '@/components/legal-page'
import { OPERATOR } from '@/lib/legal'

export const metadata: Metadata = { title: 'Impressum · Wine Tasting' }

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>
        {OPERATOR.name}
        <br />
        {OPERATOR.street}
        <br />
        {OPERATOR.city}
        <br />
        Deutschland
      </p>
      <h2>Kontakt</h2>
      <p>
        E-Mail: <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>
      </p>
      <p className="text-muted-foreground">
        Wine Tasting ist ein privates, nicht kommerzielles Projekt. Es gibt keine Werbung und keine kostenpflichtigen
        Angebote.
      </p>
    </LegalPage>
  )
}
