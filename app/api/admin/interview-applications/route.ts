import { NextRequest } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

const HEADSHOT_BUCKET = 'interview-applications'
const SIGNED_URL_TTL_SECONDS = 60 * 60

const EDITABLE_FIELDS = ['status', 'admin_notes', 'scheduled_at', 'published_interview_id'] as const

export async function GET(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const supabase = createAdminClient()
  const status = request.nextUrl.searchParams.get('status')

  let query = supabase
    .from('interview_applications')
    .select('*')
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  // The bucket is private, so headshots are only ever exposed as short-lived
  // signed URLs generated here — never as a public object path.
  const applications = await Promise.all(
    (data ?? []).map(async (application) => {
      if (!application.headshot_path) {
        return { ...application, headshotUrl: null }
      }

      const { data: signed } = await supabase.storage
        .from(HEADSHOT_BUCKET)
        .createSignedUrl(application.headshot_path, SIGNED_URL_TTL_SECONDS)

      return { ...application, headshotUrl: signed?.signedUrl ?? null }
    }),
  )

  return Response.json({ applications })
}

export async function PATCH(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const body = (await request.json()) as Record<string, unknown>
  const id = String(body.id ?? '')
  if (!id) {
    return Response.json(
      { success: false, message: 'An application id is required.' },
      { status: 400 },
    )
  }

  const patch: Record<string, unknown> = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      patch[field] = body[field]
    }
  }

  if (Object.keys(patch).length === 0) {
    return Response.json({ success: false, message: 'Nothing to update.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('interview_applications').update(patch).eq('id', id)

  if (error) {
    return Response.json({ success: false, message: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}
