import Link from 'next/link'
import { ArrowLeft, ExternalLink, Linkedin } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'

export default async function ProgrammeSpeakerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const db = createAdminClient()
  const { data: speaker, error } = await db.from('programme_speakers').select('*').eq('slug', slug).eq('status', 'published').maybeSingle()
  if (error || !speaker) notFound()
  const { data: events } = await db.from('events').select('slug, title, start_at').eq('speaker_id', speaker.id).eq('status', 'published').eq('visibility', 'public').order('start_at')

  return <article className="programme-speaker-page">
    <Link href="/dashboard/discover/events" className="programme-back-link"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to events</Link>
    <div className="programme-speaker-hero">
      <div className="programme-speaker-portrait" style={speaker.portrait_url ? { backgroundImage: `url("${speaker.portrait_url}")` } : undefined} aria-label={`${speaker.name} portrait`} role="img"><span>{speaker.name.slice(0, 1)}</span></div>
      <div><p className="programme-kicker text-orange-700">Africa Future Leaders speaker</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-stone-950">{speaker.name}</h1>{speaker.role || speaker.organisation ? <p className="mt-3 text-base text-stone-600">{[speaker.role, speaker.organisation].filter(Boolean).join(' · ')}</p> : null}</div>
    </div>
    {speaker.biography ? <p className="mt-8 max-w-2xl text-base leading-8 text-stone-700">{speaker.biography}</p> : <p className="mt-8 max-w-2xl text-base leading-8 text-stone-600">This speaker’s full profile will be unveiled soon.</p>}
    <div className="mt-7 flex flex-wrap gap-3">{speaker.linkedin_url ? <a className="programme-speaker-link" href={speaker.linkedin_url} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" />LinkedIn</a> : null}{speaker.website_url ? <a className="programme-speaker-link" href={speaker.website_url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Website</a> : null}</div>
    {events?.length ? <section className="mt-12"><h2 className="text-xl font-semibold text-stone-950">Speaking at</h2><div className="mt-4 space-y-3">{events.map(event => <Link key={event.slug} href={`/dashboard/discover/events/${event.slug}`} className="block rounded-2xl border border-stone-200 bg-white p-4 text-sm font-medium text-stone-900 transition hover:border-orange-300 hover:bg-orange-50">{event.title}</Link>)}</div></section> : null}
  </article>
}
