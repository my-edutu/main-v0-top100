import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'

import PageHeader from '@/app/admin/components/PageHeader'
import { Button } from '@/components/ui/button'
import SelectionEngineClient from './selection-engine-client'

export const dynamic = 'force-dynamic'

export default function SelectionEnginePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Selection Engine"
        description="Import applicants, verify private PDF evidence, process 100 applications per batch, review decisions, and publish explainable results."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/selection/review">
              <ShieldAlert className="mr-2 size-4" /> Review queue
            </Link>
          </Button>
        }
      />
      <SelectionEngineClient />
    </div>
  )
}
