import { NextRequest } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { INTERVIEW_SELECT } from '@/lib/interviews/queries'
import { parseYouTubeId } from '@/lib/interviews/mappers'
import { slugifyInterview, uniqueSlug } from '@/lib/interviews/matching'

const EDITABLE_FIELDS = [
  'title',
  'format',
  'duration_seconds',
  'thumbnail_url',
  'pull_quote',
  'summary',
  'body',
  'awardee_id',
  'awardee_name',
  'country',
  'cohort_year',
  'topics',
  'featured',
  'status',
  'sort_order',
  'application_id',
] as const

function pickEditable(body: Record<string, unknown>) {
  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      patch[field] = body[field]
    }
  }
  return patch
}

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('interviews')
    .select(INTERVIEW_SELECT)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ interviews: data ?? [] })
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = (await request.json()) as Record<string, unknown>
  const supabase = createAdminClient()

  const format = (body.format as string) === 'written' ? 'written' : 'video'
  let videoId: string | null = null

  if (format === 'video') {
    videoId = parseYouTubeId(String(body.videoUrl ?? body.video_id ?? ''))
    if (!videoId) {
      // Catching this here keeps a dead player off the public page.
      return Response.json(
        { success: false, message: 'Enter a valid YouTube link or 11-character video ID.' },
        { status: 400 },
      )
    }
  }

  const title = String(body.title ?? '').trim()
  if (!title) {
    return Response.json({ success: false, message: 'A title is required.' }, { status: 400 })
  }

  const awardeeName = String(body.awardee_name ?? '').trim()
  if (!awardeeName) {
    return Response.json(
      { success: false, message: 'An awardee name is required.' },
      { status: 400 },
    )
  }

  const { data: existing } = await supabase.from('interviews').select('slug')
  const requested = String(body.slug ?? '').trim()
  const slug = uniqueSlug(
    slugifyInterview(requested || awardeeName),
    (existing ?? []).map((row) => row.slug as string),
  )

  const status = (body.status as string) === 'published' ? 'published' : 'draft'

  const { data, error } = await supabase
    .from('interviews')
    .insert({
      ...pickEditable(body),
      slug,
      title,
      format,
      video_id: videoId,
      awardee_name: awardeeName,
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .select('id, slug')
    .single()

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true, interview: data })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = (await request.json()) as Record<string, unknown>
  const id = String(body.id ?? '')
  if (!id) {
    return Response.json(
      { success: false, message: 'An interview id is required.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const patch = pickEditable(body)

  const { data: current } = await supabase
    .from('interviews')
    .select('published_at, format')
    .eq('id', id)
    .maybeSingle()

  if ('videoUrl' in body) {
    const videoId = parseYouTubeId(String(body.videoUrl ?? ''))
    const nextFormat = (patch.format as string) ?? current?.format ?? 'video'
    if (!videoId && nextFormat === 'video') {
      return Response.json(
        { success: false, message: 'Enter a valid YouTube link or 11-character video ID.' },
        { status: 400 },
      )
    }
    patch.video_id = videoId
  }

  // Stamp the publish date the first time it goes live.
  if (patch.status === 'published' && !current?.published_at) {
    patch.published_at = new Date().toISOString()
  }

  const { error } = await supabase.from('interviews').update(patch).eq('id', id)

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return Response.json(
      { success: false, message: 'An interview id is required.' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('interviews').delete().eq('id', id)

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
