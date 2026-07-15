// app/api/member/features/route.ts
// The authenticated member submits a "feature my story" request.
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { mapFeature } from '@/lib/member-hub-server'
import { sanitizeInput } from '@/lib/security'

export const runtime = 'nodejs'

const CATEGORIES = ['bio', 'story', 'product', 'project'] as const

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const title = sanitizeInput(String(body.title ?? ''))
  const summary = sanitizeInput(String(body.summary ?? ''))
  const memberName = sanitizeInput(String(body.memberName ?? ''))
  const category = CATEGORIES.includes(body.category as any) ? (body.category as string) : 'bio'
  const contactEmail = String(body.contactEmail ?? user.email ?? '')

  if (!title || !summary) {
    return NextResponse.json({ message: 'Add a title and short summary before submitting.' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('member_features')
    .insert({
      member_id: user.id,
      member_name: memberName || user.email || 'Awardee',
      title,
      category,
      summary,
      contact_email: contactEmail,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ message: 'Could not submit this feature request.' }, { status: 500 })
  }

  return NextResponse.json({ submission: mapFeature(data) }, { status: 201 })
}
