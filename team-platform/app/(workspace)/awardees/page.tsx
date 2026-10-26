import { AwardeesView, type AwardeeSearchParams } from '@/components/awardees-view'
import { requireMember } from '@/lib/auth'

export const metadata = { title: 'Awardees' }
export const dynamic = 'force-dynamic'

export default async function AwardeesPage({
  searchParams,
}: {
  searchParams: Promise<AwardeeSearchParams>
}) {
  const member = await requireMember()
  return <AwardeesView member={member} params={await searchParams} basePath="/awardees" />
}
