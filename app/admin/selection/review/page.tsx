import Link from 'next/link'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import PageHeader from '@/app/admin/components/PageHeader'
import { Button } from '@/components/ui/button'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import ReviewQueueClient, { type ReviewApplicant } from './review-queue-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0
const PAGE_SIZE = 25

type Props = { searchParams: Promise<{ page?: string; q?: string; cycle?: string; application?: string }> }
export default async function SelectionReviewQueuePage({ searchParams }: Props) {
  // Authorise at the data boundary before any service-role applicant query.
  const admin = await requireAdmin()
  if ('error' in admin) {
    if (admin.error.status === 401) redirect('/admin/login')
    return <div role="alert" className="rounded-xl border p-5">Current administrator access could not be verified. No applicant data was loaded.</div>
  }
  const params = await searchParams
  const requestedPage = /^\d+$/.test(params.page ?? '') ? Math.min(10000,Math.max(1,Number(params.page))) : 1
  const q = (params.q ?? '').trim().slice(0,100)
  const cycle = z.string().uuid().safeParse(params.cycle).success ? params.cycle : undefined
  const application = z.string().uuid().safeParse(params.application).success ? params.application : undefined
  const page = application ? 1 : requestedPage
  const db = createAdminClient()
  let query = db.from('selection_applications').select(
    'id,full_name,country,institution,course,claimed_cgpa,claimed_academic_status,leadership_narrative,selection_cycles(policy),selection_jobs(source_label),selection_assessments(verdict,total_score,score_breakdown,public_reasons,internal_reasons,revision,policy_version),selection_documents(id,original_name,size_bytes,sha256,extraction_status,extraction_confidence,integrity_flags)',
    { count: 'exact' },
  )
  if (application) query = query.eq('id',application)
  else {
    query = query.eq('status','review_required')
    if (cycle) query = query.eq('cycle_id',cycle)
    if (q) query = query.ilike('full_name',`%${q.replace(/[\\%_]/g,'\\$&')}%`)
  }
  const { data, error, count } = await query.order('updated_at',{ ascending:true }).order('id',{ ascending:true })
    .range((page-1)*PAGE_SIZE,page*PAGE_SIZE-1)
  const pageUrl = (next: number) => {
    const search = new URLSearchParams({page:String(next)})
    if (q) search.set('q',q)
    if (cycle) search.set('cycle',cycle)
    return `/admin/selection/review?${search}`
  }
  return <div className="space-y-6">
    <PageHeader title={application ? 'Applicant verification case' : 'Selection review queue'} description="Verify evidence, document uncertainty and make accountable decisions. This workspace does not certify identity automatically." actions={<Button asChild variant="outline"><a href={application ? '/admin/selection/review' : '/admin/selection'}>{application ? 'Back to review queue' : 'Selection Engine'}</a></Button>} />
    {!application && <form method="get" className="flex flex-wrap items-end gap-3"><div className="space-y-2"><label htmlFor="review-search" className="block text-sm font-medium">Find an applicant in this queue</label><input id="review-search" name="q" defaultValue={q} maxLength={100} className="min-h-11 rounded-lg border border-zinc-300 px-3" placeholder="Applicant name" /></div>{cycle && <input type="hidden" name="cycle" value={cycle} />}<Button type="submit" className="min-h-11">Search</Button><Link className="px-3 py-3 text-sm underline" href="/admin/selection/review">Clear filters</Link></form>}
    {error ? <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900">The review queue could not be loaded safely. Check preview migrations and server access; this is not an empty queue.</p> : <>
      <p className="text-sm text-zinc-600">{count ?? 0} matching case(s). {application ? 'Review one case at a time.' : `Page ${page} · up to ${PAGE_SIZE} cases per page.`}</p>
      <ReviewQueueClient applicants={(data ?? []) as unknown as ReviewApplicant[]} focusApplicationId={application} />
      {!application && <nav aria-label="Review queue pages" className="flex gap-4">{page>1 && <a className="min-h-11 rounded-lg border px-4 py-3 text-sm" href={pageUrl(page-1)}>Previous page</a>}{page*PAGE_SIZE<(count??0) && <a className="min-h-11 rounded-lg border px-4 py-3 text-sm" href={pageUrl(page+1)}>Next page</a>}</nav>}
    </>}
  </div>
}
