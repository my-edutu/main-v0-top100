import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import PageHeader from '@/app/admin/components/PageHeader'
import { Button } from '@/components/ui/button'
import { createAdminClient } from '@/lib/supabase/server'
import type { ReviewAssessment } from '../human-review-form'
import ReviewQueueClient from './review-queue-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type ReviewQueueApplicant = {
  id: string
  full_name: string
  primary_email: string | null
  country: string | null
  institution: string | null
  course: string | null
  claimed_cgpa: string | null
  claimed_academic_status: string | null
  leadership_narrative: string | null
  selection_jobs: { source_label?: string } | Array<{ source_label?: string }> | null
  selection_assessments: Array<
    ReviewAssessment & {
      reason_codes?: string[]
      internal_reasons?: string[]
    }
  > | null
  selection_documents: Array<{
    id: string
    original_name: string
    size_bytes: number
    sha256: string | null
    extraction_status: string
    extraction_confidence: number | null
    integrity_flags: string[]
    extracted_data: Record<string, unknown> | null
    last_error: string | null
  }> | null
}

export default async function SelectionReviewQueuePage() {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('selection_applications')
    .select(
      'id, full_name, primary_email, country, institution, course, claimed_cgpa, claimed_academic_status, leadership_narrative, selection_jobs(source_label), selection_assessments(verdict, total_score, score_breakdown, public_reasons, reason_codes, internal_reasons), selection_documents(id, original_name, size_bytes, sha256, extraction_status, extraction_confidence, integrity_flags, extracted_data, last_error)',
    )
    .eq('status', 'review_required')
    .order('updated_at', { ascending: true })
    .limit(100)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Selection review queue"
        description="Resolve unreadable evidence, conflicting data, duplicate signals, and uncertain merit assessments before any result is published."
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/selection">
              <ArrowLeft className="mr-2 size-4" /> Selection Engine
            </Link>
          </Button>
        }
      />

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-800">
          The review queue could not be loaded: {error.message}
        </div>
      ) : (
        <ReviewQueueClient
          applicants={(data ?? []) as unknown as ReviewQueueApplicant[]}
        />
      )}
    </div>
  )
}
