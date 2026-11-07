import type { Metadata } from 'next'
import { requireAdmin } from '@/lib/api/require-admin'
import { loadProfileQuality } from '@/lib/admin/profile-quality-server'
import PageHeader from '@/app/admin/components/PageHeader'
import QualityWorkspace from './quality-workspace'

export const metadata: Metadata = { title: 'Profile quality', robots: { index: false, follow: false } }

export default async function ProfileQualityPage() {
  const access = await requireAdmin()
  if ('error' in access) {
    return <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Sign in with an admin account to review profile quality.</p>
  }

  let rows
  try {
    rows = (await loadProfileQuality()).map(({ row }) => row).sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('[profile quality] Could not load report', error)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      <PageHeader
        eyebrow="People"
        title="Profile quality"
        description="Find gaps in public awardee profiles, check their links and open the records that need attention."
        backHref="/admin/awardees"
        backLabel="Awardee directory"
      />
      {rows ? <QualityWorkspace rows={rows} /> : (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
          The report couldn’t load. Refresh this page to try again.
        </p>
      )}
    </div>
  )
}
