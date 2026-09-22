import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { sanitizeSpeaker } from '@/app/api/admin/programme-speakers/route'
import { createAdminClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error
  const { id } = await params
  try {
    const body = await request.json() as Record<string, unknown>
    const payload = sanitizeSpeaker(body, true)
    const { data, error } = await createAdminClient().from('programme_speakers').update(payload).eq('id', id).select('*').maybeSingle()
    if (error) return NextResponse.json({ message: 'Could not update programme speaker.', error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ message: 'Speaker not found.' }, { status: 404 })
    return NextResponse.json({ speaker: data })
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Invalid speaker.' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error
  const { id } = await params
  const { error } = await createAdminClient().from('programme_speakers').update({ status: 'archived' }).eq('id', id)
  if (error) return NextResponse.json({ message: 'Could not archive programme speaker.' }, { status: 500 })
  return new Response(null, { status: 204 })
}
