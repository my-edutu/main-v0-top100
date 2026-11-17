import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

import { sanitizeSpeaker } from '@/lib/programme-speaker-input'

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error
  const { data, error } = await createAdminClient().from('programme_speakers').select('*').order('name')
  if (error) return NextResponse.json({ message: 'Could not load programme speakers.' }, { status: 500 })
  return NextResponse.json({ speakers: data ?? [] })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error
  try {
    const body = await request.json() as Record<string, unknown>
    const payload = sanitizeSpeaker(body)
    const { data, error } = await createAdminClient().from('programme_speakers').insert(payload).select('*').single()
    if (error) return NextResponse.json({ message: 'Could not create programme speaker.', error: error.message }, { status: 500 })
    return NextResponse.json({ speaker: data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Invalid speaker.' }, { status: 400 })
  }
}
