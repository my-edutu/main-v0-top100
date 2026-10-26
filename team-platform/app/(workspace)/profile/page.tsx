import { PageHeader, Card } from '@/components/ui'
import { ProfileForm } from '@/components/profile-form'
import { requireMember } from '@/lib/auth'

export const metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const member = await requireMember()
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Your account" title="Profile" description="Keep your contact details up to date for team operations and payout support." />
      <Card className="p-5 md:p-6">
        <ProfileForm fullName={member.membership.full_name} phone={member.membership.phone} email={member.user.email} />
      </Card>
    </div>
  )
}
