import { requireAdmin } from '@/lib/api/require-admin'
import PageHeader from '@/app/admin/components/PageHeader'
import SocialSharingWorkspace from './social-sharing-workspace'

export default async function AdminSocialSharingPage() {
  const access = await requireAdmin()
  if ('error' in access) {
    return (
      <p className="rounded-xl border border-[#e7e3dc] bg-white p-5 text-sm text-zinc-600">
        Sign in with an admin account to use Social Sharing.
      </p>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Awardee features"
        description="Write, review and share awardee spotlights."
      />
      <SocialSharingWorkspace />
    </div>
  )
}
