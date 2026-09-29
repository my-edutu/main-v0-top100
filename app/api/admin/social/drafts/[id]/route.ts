import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { mapSocialDraft, SOCIAL_DRAFT_SELECT } from '@/lib/admin-social/server'
import { parseMarkPostedInput } from '@/lib/admin-social/validation'

export const runtime = 'nodejs'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const { id } = await params
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ message: 'Invalid draft ID.' }, { status: 400 })
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }
  const input = parseMarkPostedInput(body)
  if (!input) return NextResponse.json({ message: 'Enter a valid HTTPS post link.' }, { status: 400 })

  try {
    const db = createAdminClient()
    const { data, error } = await db.from('admin_social_share_drafts').update({
      status: 'marked_posted',
      publish_state: 'published',
      publish_error: null,
      marked_posted_by: access.user.id,
      marked_posted_at: new Date().toISOString(),
      public_post_url: input.publicPostUrl,
      updated_by: access.user.id,
      updated_at: new Date().toISOString(),
    }).eq('id', id).eq('status', 'draft').in('publish_state', ['ready', 'failed', 'uncertain']).select(SOCIAL_DRAFT_SELECT).maybeSingle()
    if (error) return NextResponse.json({ message: 'Could not update share history.' }, { status: 503 })
    if (!data) return NextResponse.json({ message: 'Draft was not found or has already been marked posted.' }, { status: 409 })
    return NextResponse.json({ draft: mapSocialDraft(data) })
  } catch {
    return NextResponse.json({ message: 'Could not update share history.' }, { status: 503 })
  }
}
