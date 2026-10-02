import type { Metadata } from 'next'
import { CreateTastingForm } from '@/components/create-tasting-form'
import { FormPage } from '@/components/form-page'

export const metadata: Metadata = { title: 'Tasting erstellen · Wine Tasting' }

export default function NewTastingPage() {
  return (
    <FormPage
      title="Neues Tasting"
      intro={
        <p>
          Gib dem Abend einen Namen und such dir ein Bewertungssystem aus. Weine trägst du danach in der Verwaltung
          ein.
        </p>
      }
    >
      <CreateTastingForm />
    </FormPage>
  )
}
