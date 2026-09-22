import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { toMemberProgrammeEvent } from '@/lib/events/programme-api'
import { ProgrammeEventDetail } from '../_components/programme-event-detail'

export default async function ProgrammeEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await createAdminClient()
    .from('events')
    .select('*, programme_speakers(id, slug, name, portrait_url, role, organisation, biography, website_url, linkedin_url, social_url, status)')
    .eq('slug', slug)
    .eq('status', 'published')
    .in('visibility', ['public', 'awardee_only'])
    .maybeSingle()

  if (error || !data) notFound()
  return <ProgrammeEventDetail event={toMemberProgrammeEvent({ ...data, speaker: data.programme_speakers })} />
}
