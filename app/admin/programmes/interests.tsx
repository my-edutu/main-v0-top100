'use client'

import { useEffect, useState } from 'react'
import { communityApplicationSections, type CommunityQuestion } from '@/lib/programme-manager/community-application'
import { communityCategories, communityRoles, type CommunityDetails } from '@/lib/programme-manager/interest'

type Entry = {
  id: string
  kind: string
  community_details: CommunityDetails | null
  consented_at: string
  profiles: { full_name: string | null; email: string | null } | null
  programme_manager_activities: { title: string } | null
}

function CommunityAnswers({ details }: { details: CommunityDetails }) {
  if (details.version === 2) {
    return <details className="mt-3">
      <summary className="w-fit cursor-pointer text-sm font-medium underline underline-offset-4">View application answers</summary>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {communityApplicationSections.map(section => <section key={section.title} className="min-w-0 rounded-lg border p-3 text-sm">
          <h3 className="font-semibold">{section.title}</h3>
          <dl className="mt-2 space-y-3">
            {(section.questions as readonly CommunityQuestion[]).map(({ name, label }) => {
              const value = details.answers[name]
              if (!value || (Array.isArray(value) && value.length === 0)) return null
              return <div key={name}>
                <dt className="font-medium">{name === 'confirmation' ? 'Confirmation' : label}</dt>
                <dd className="whitespace-pre-wrap break-words text-neutral-700">
                  {Array.isArray(value) ? value.join(', ') : value === true ? 'Confirmed' : value}
                </dd>
              </div>
            })}
          </dl>
        </section>)}
      </div>
    </details>
  }

  return <dl className="mt-2 space-y-1 text-sm">
    <div><dt className="inline font-medium">Roles </dt><dd className="inline">{details.roles.map(role => communityRoles[role]).join(', ')}</dd></div>
    <div><dt className="inline font-medium">Categories </dt><dd className="inline">{details.categories.map(category => communityCategories[category]).join(', ')}</dd></div>
    <div><dt className="inline font-medium">Location and availability </dt><dd className="inline">{details.location} · {details.availability}</dd></div>
    <div><dt className="inline font-medium">Contribution </dt><dd className="inline whitespace-pre-wrap break-words">{details.contribution}</dd></div>
  </dl>
}

export function Interests() {
  const [items, setItems] = useState<Entry[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/programme-manager/interests').then(async response => {
      const body = await response.json()
      if (!response.ok) throw new Error(body.message)
      setItems(body.interests)
    }).catch(error => setError(error.message)).finally(() => setLoading(false))
  }, [])

  return <section className="rounded-lg border bg-white p-5">
    <h2 className="font-semibold">Member interest</h2>
    <p className="mt-1 text-sm text-neutral-600">Members have consented to follow-up. Engagements are agreed separately.</p>
    {error && <p role="alert" className="mt-4 text-red-700">{error}</p>}
    {loading && <p>Loading…</p>}
    {!loading && !error && items.length === 0 && <p className="mt-4 text-sm">No interests recorded yet.</p>}
    {items.length > 0 && <ul className="mt-4 divide-y">{items.map(item => {
      const details = item.community_details
      const contact = details?.version === 2 ? details.answers : details
      const name = typeof contact?.full_name === 'string' ? contact.full_name : item.profiles?.full_name ?? 'Member'
      const email = typeof contact?.email === 'string' ? contact.email : item.profiles?.email ?? 'No email'
      return <li key={item.id} className="py-3">
        <p className="font-medium">{name} · {item.kind === 'community' ? 'Community Impact Network' : item.kind}</p>
        <p className="break-words text-sm text-neutral-600">{email} · {item.programme_manager_activities?.title || 'General interest'} · {new Date(item.consented_at).toLocaleDateString('en-GB')}</p>
        {details && <CommunityAnswers details={details} />}
      </li>
    })}</ul>}
  </section>
}
