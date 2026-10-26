import { AwardeesView, type AwardeeSearchParams } from '@/components/awardees-view'
import { requireAdmin } from '@/lib/auth'

export const metadata = { title: 'Awardee directory' }
export const dynamic = 'force-dynamic'

export default async function AdminAwardeesPage({
  searchParams,
}: {
  searchParams: Promise<AwardeeSearchParams>
}) {
  const member = await requireAdmin()
  return (
    <AwardeesView
      member={member}
      params={await searchParams}
      basePath="/admin/awardees"
      admin
    />
  )
}
