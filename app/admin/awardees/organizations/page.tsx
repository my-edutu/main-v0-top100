import type { Metadata } from 'next'
import Link from 'next/link'
import { Linkedin } from 'lucide-react'
import PageHeader from '@/app/admin/components/PageHeader'
import { requireAdmin } from '@/lib/api/require-admin'
import { readProfileCareer, type ProfileCareer } from '@/lib/profile-career'
import { createAdminClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Awardee organizations', robots: { index: false, follow: false } }

type Affiliation = { id: string; awardeeName: string; career: ProfileCareer }

async function loadOrganizations() {
  const db = createAdminClient()
  const organizations = new Map<string, Affiliation[]>()
  const pageSize = 100

  for (let offset = 0; ; offset += pageSize) {
    const { data: awardees, error } = await db.from('awardees')
      .select('id,name,profile_id').not('profile_id', 'is', null)
      .order('id').range(offset, offset + pageSize - 1)
    if (error) throw error
    if (!awardees.length) break

    const profileIds = [...new Set(awardees.map(awardee => awardee.profile_id))]
    const { data: profiles, error: profileError } = await db.from('member_profile_careers')
      .select('profile_id,details').in('profile_id', profileIds)
    if (profileError) throw profileError
    const careers = new Map(profiles.map(profile => [profile.profile_id, readProfileCareer(profile.details)]))

    for (const awardee of awardees) {
      const career = careers.get(awardee.profile_id)
      if (!career) continue
      const key = career.name.normalize('NFKC').replace(/\s+/g, ' ').toLowerCase()
      const affiliation = { id: awardee.id, awardeeName: awardee.name, career }
      const group = organizations.get(key)
      if (group) group.push(affiliation)
      else organizations.set(key, [affiliation])
    }

    if (awardees.length < pageSize) break
  }

  return [...organizations.values()].sort((left, right) => left[0].career.name.localeCompare(right[0].career.name))
}

export default async function AwardeeOrganizationsPage() {
  const access = await requireAdmin()
  if ('error' in access) {
    return <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Sign in with an admin account to view awardee organizations.</p>
  }

  let organizations
  try {
    organizations = await loadOrganizations()
  } catch (error) {
    console.error('[awardee organizations] Could not load directory', error)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <PageHeader
        title="Awardee organizations"
        description="Startups and employers shared by Top100 awardees."
        backHref="/admin/awardees"
        backLabel="Awardee directory"
      />
      {!organizations ? (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Organizations couldn’t load. Refresh the page to try again.</p>
      ) : organizations.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">Organizations will appear here when awardees add career details to their profiles.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white">
          {organizations.map(affiliations => {
            const { id, career: { name } } = affiliations[0]
            return (
              <li key={id} className="grid gap-2 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] sm:gap-6">
                <h2 className="break-words font-semibold text-zinc-950">{name}</h2>
                <ul className="space-y-1">
                  {affiliations.map(({ id, awardeeName, career }) => (
                    <li key={id} className="flex min-w-0 items-center gap-2">
                      <div className="min-w-0 flex-1 break-words text-sm">
                        <Link href={`/admin/awardees/edit/${encodeURIComponent(id)}`} className="font-medium text-orange-800 hover:underline">{awardeeName}</Link>
                        <p className="mt-1 text-zinc-600">
                          {career.type === 'startup' ? 'Startup' : 'Employer'}
                          {career.role ? ` · ${career.role}` : ''}
                        </p>
                      </div>
                      {career.linkedinUrl ? <a href={career.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`${career.name} on LinkedIn`} className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-[#0a66c2] hover:bg-zinc-50"><Linkedin className="size-4" aria-hidden="true" /></a> : null}
                    </li>
                  ))}
                </ul>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
