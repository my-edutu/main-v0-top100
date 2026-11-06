import { requireAdmin } from '@/lib/api/require-admin'
import PageHeader from '@/app/admin/components/PageHeader'
import SocialSharingWorkspace from './social-sharing-workspace'

export default async function AdminSocialSharingPage() {
  const access = await requireAdmin()
  if ('error' in access) {
    return <p className="rounded-xl border border-[#e7e3dc] bg-white p-5 text-sm text-zinc-600">Sign in with an admin account to use Social Sharing.</p>
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Social Sharing"
        eyebrow="Awardee spotlights"
        description="Create a third-person feature, preview and edit each platform’s caption, then publish to LinkedIn, Facebook, Instagram and X."
      />
      <SocialSharingWorkspace />
    </div>
  )
}
