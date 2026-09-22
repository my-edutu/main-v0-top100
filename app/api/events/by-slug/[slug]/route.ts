import { NextRequest, NextResponse } from 'next/server'

import { toMemberProgrammeEvent } from '@/lib/events/programme-api'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select('*, programme_speakers(id, slug, name, portrait_url, role, organisation, biography, website_url, linkedin_url, social_url, status)')
    .eq('slug', slug)
    .eq('status', 'published')
    .eq('visibility', 'public')
    .maybeSingle()

  if (error) {
    console.error('[events/by-slug] Failed to load event:', error)
    return NextResponse.json({ message: 'Could not load this event.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ message: 'Event not found.' }, { status: 404 })

  return NextResponse.json(toMemberProgrammeEvent({ ...data, speaker: data.programme_speakers }))
}
