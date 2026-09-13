import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { POST as upload } from '@/app/api/profiles/avatar/route'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })
  const response = await upload(request)
  if (!response.ok) return response
  const { url } = await response.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id)
  if (error) return NextResponse.json({ error: 'Photo uploaded but could not be saved to your profile.' }, { status: 503 })

  // Public bios read avatar_url through the cached awardee_directory view.
  // Invalidate the linked profile immediately so a new upload is visible on
  // the public bio without waiting for the normal cache window to expire.
  const { data: awardee } = await supabase.from('awardees').select('slug').eq('profile_id', user.id).maybeSingle()
  if (awardee?.slug) revalidatePath(`/awardees/${awardee.slug}`)
  revalidatePath('/awardees')
  revalidateTag('awardees')

  return NextResponse.json({ url })
}
