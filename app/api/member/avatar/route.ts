import { NextRequest, NextResponse } from 'next/server'
import { POST as upload } from '@/app/api/profiles/avatar/route'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const response = await upload(request)
  if (!response.ok) return response
  const { url } = await response.json()
  const { error } = await createAdminClient().from('profiles').update({ avatar_url: url }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Photo uploaded but could not be saved to your profile.' }, { status: 503 })
  return NextResponse.json({ url })
}
