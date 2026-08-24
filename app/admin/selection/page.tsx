import PageHeader from '@/app/admin/components/PageHeader'
import SelectionEngineClient from './selection-engine-client'

export const dynamic = 'force-dynamic'

export default function SelectionEnginePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Selection Engine"
        description="Import applicants, verify private PDF evidence, process 100 applications per batch, review decisions, and publish explainable results."
      />
      <SelectionEngineClient />
    </div>
  )
}
