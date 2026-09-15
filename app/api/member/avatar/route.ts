import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { POST as upload } from '@/app/api/profiles/avatar/route'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import { hasValidDemoSession } from '@/lib/dev-dashboard/auth'
import { DEMO_MEMBER_ID, getDemoDashboardStore } from '@/lib/dev-dashboard/store'
import { AVATAR_PRESET, processUpload } from '@/lib/image-processing'
import { uploadMedia } from '@/lib/media/storage'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'

const CACHE_CONTROL = String(60 * 60 * 24 * 365)

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked
  const user = await getCurrentUser()
  const demo = !user?.id && hasValidDemoSession(request, process.env.NODE_ENV)
  const memberId = user?.id ?? (demo ? DEMO_MEMBER_ID : null)
  if (!memberId) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 })

  if (demo) {
    try {
      const formData = await request.formData()
      const file = formData.get('file')
      if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
      if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Choose an image file.' }, { status: 400 })
      if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File size too large. Maximum size is 5MB.' }, { status: 400 })
      const processed = await processUpload(await file.arrayBuffer(), AVATAR_PRESET, file.type)
      const uploaded = await uploadMedia({ bucket: process.env.SUPABASE_AVATARS_BUCKET ?? 'avatars', path: `users/${memberId}-${Date.now()}.${processed.extension}`, body: processed.data, contentType: processed.contentType, cacheControl: CACHE_CONTROL, upsert: false })
      getDemoDashboardStore().profile.avatarUrl = uploaded.publicUrl
      return NextResponse.json({ url: uploaded.publicUrl })
    } catch (error) {
      console.error('[member-avatar demo] unexpected error', error)
      return NextResponse.json({ error: 'Could not upload your photo. Check Cloudflare media storage configuration.' }, { status: 503 })
    }
  }

  const response = await upload(request)
  if (!response.ok) return response
  const { url } = await response.json()
  const supabase = createAdminClient()
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', memberId)
  if (error) return NextResponse.json({ error: 'Photo uploaded but could not be saved to your profile.' }, { status: 503 })

  // Public bios read avatar_url through the cached awardee_directory view.
  // Invalidate the linked profile immediately so a new upload is visible on
  // the public bio without waiting for the normal cache window to expire.
  const { data: awardee } = await supabase.from('awardees').select('slug').eq('profile_id', memberId).maybeSingle()
  if (awardee?.slug) revalidatePath(`/awardees/${awardee.slug}`)
  revalidatePath('/awardees')
  revalidateTag('awardees')

  return NextResponse.json({ url })
}
