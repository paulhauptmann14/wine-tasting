import type { Metadata } from 'next'
import { FormPage } from '@/components/form-page'
import { ManageLoginForm } from '@/components/manage-login-form'

export const metadata: Metadata = { title: 'Tasting verwalten · Wine Tasting' }

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  return (
    <FormPage title="Tasting verwalten" intro={<p>Mit dem Code und der PIN, die du beim Erstellen vergeben hast.</p>}>
      <ManageLoginForm defaultCode={code} />
    </FormPage>
  )
}
