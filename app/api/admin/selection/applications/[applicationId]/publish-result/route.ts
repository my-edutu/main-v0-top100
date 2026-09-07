import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
type Context = { params: Promise<{ applicationId: string }> }
const headers = { 'Cache-Control': 'private, no-store' }
export async function POST(request: NextRequest, { params }: Context) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const { applicationId } = await params
  if (!z.string().uuid().safeParse(applicationId).success) return NextResponse.json({ message: 'Invalid application identifier' }, { status: 400, headers })
  const { data, error } = await createAdminClient().rpc('publish_selection_reviewed_result', {
    p_application_id: applicationId, p_actor_id: admin.user.id,
  })
  if (error || !data?.length) return NextResponse.json({
    message: ['23514', '40001', '42501'].includes(error?.code ?? '')
      ? 'Publication requires current verified evidence, a different administrator and no active processing. Qualified applicants also need a current committee-approved ranking.'
      : 'The result could not be published safely. Nothing was published.',
  }, { status: ['23514', '40001', '42501'].includes(error?.code ?? '') ? 409 : 503, headers })
  return NextResponse.json({ applicationId, accessToken: data[0].access_token,
    resultPath: `/selection-results/${data[0].access_token}`, publishedAt: data[0].published_at }, { headers })
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const { applicationId } = await params
  if (!z.string().uuid().safeParse(applicationId).success) return NextResponse.json({ message: 'Invalid application identifier' }, { status: 400, headers })
  const { error } = await createAdminClient().rpc('unpublish_selection_reviewed_result', {
    p_application_id: applicationId, p_actor_id: admin.user.id,
  })
  if (error) return NextResponse.json({ message: 'The result could not be withdrawn safely.' }, { status: 503, headers })
  return NextResponse.json({ applicationId, published: false }, { headers })
}
