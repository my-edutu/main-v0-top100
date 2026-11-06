import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { loadPublicAwardee } from '@/lib/admin-social/server'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'
import { SPOTLIGHT_PLATFORMS, spotlightImageUrl, validateSpotlightCaption, type PublicationResult } from '@/lib/admin-social/spotlight'
import { publishingConfiguration, createSocialPublisher } from '@/lib/admin-social/publishing-provider'
import { publishSpotlight } from '@/lib/admin-social/publish-spotlight'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
const caption = z.string().trim().min(1).max(5000)
export const publishInput = z.object({
  awardeeId: z.string().uuid(), signature: z.string().regex(/^[a-f0-9]{64}$/),
  captions: z.object({ linkedin: caption, facebook: caption, instagram: caption, x: caption }).strict(),
}).strict()

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const raw = await request.text()
  if (raw.length > 30_000) return NextResponse.json({ message: 'Request is too large.' }, { status: 413 })
  let body: unknown
  try { body = JSON.parse(raw) } catch { return NextResponse.json({ message: 'Invalid request.' }, { status: 400 }) }
  const parsed = publishInput.safeParse(body)
  if (!parsed.success) return NextResponse.json({ message: 'Preview all four captions before publishing.' }, { status: 400 })
  const input = parsed.data
  try {
    const profile = await loadPublicAwardee(input.awardeeId, SITE_URL)
    if (!profile) return NextResponse.json({ message: 'Public profile no longer available.' }, { status: 404 })
    if (spotlightSignature(profile) !== input.signature) return NextResponse.json({ message: 'The public profile has changed. Generate and review a fresh preview before publishing.' }, { status: 409 })
    for (const platform of SPOTLIGHT_PLATFORMS) {
      const issue = validateSpotlightCaption(platform, input.captions[platform], profile.profileUrl)
      if (issue) return NextResponse.json({ message: `${platform}: ${issue}` }, { status: 422 })
    }
    if (!profile.imageUrl?.startsWith('https://')) return NextResponse.json({ message: 'Instagram needs a public HTTPS image. Add profile artwork before publishing to all.' }, { status: 422 })
    const missing = publishingConfiguration().filter(item => !item.configured).map(item => item.platform)
    if (missing.length) return NextResponse.json({ message: `Publishing accounts need setup: ${missing.join(', ')}.` }, { status: 503 })
    const db = createAdminClient()
    // Insert all records before any external call. The unique key protects this
    // profile across refreshes, different administrators, and concurrent requests.
    const { error: prepareError } = await db.from('admin_social_publications').upsert(SPOTLIGHT_PLATFORMS.map(platform => ({
      awardee_id: input.awardeeId, platform, state: 'ready', caption: input.captions[platform],
      profile_signature: input.signature, image_url: profile.imageUrl, created_by: access.user.id,
    })), { onConflict: 'awardee_id,platform', ignoreDuplicates: true })
    if (prepareError) throw new Error('Storage unavailable')
    const send = createSocialPublisher()
    const results = await Promise.all(SPOTLIGHT_PLATFORMS.map(async platform => {
      try {
        const result = await publishSpotlight({
          claim: async () => {
            const claim = randomUUID()
            const { data, error } = await db.from('admin_social_publications').update({
              state: 'publishing', claim_id: claim, caption: input.captions[platform], profile_signature: input.signature,
              image_url: profile.imageUrl, message: null, updated_at: new Date().toISOString(), updated_by: access.user.id,
            }).eq('awardee_id', input.awardeeId).eq('platform', platform).in('state', ['ready', 'failed']).select('id').maybeSingle()
            if (error) throw new Error('Claim failed')
            return data ? claim : null
          },
          read: async () => {
            const { data, error } = await db.from('admin_social_publications').select('state,caption,message,post_id,post_url')
              .eq('awardee_id', input.awardeeId).eq('platform', platform).single()
            if (error || !data) throw new Error('Status unavailable')
            return { state: data.state, caption: data.caption, message: data.message, postId: data.post_id, postUrl: data.post_url } as PublicationResult
          },
          finish: async (claim, result) => {
            const { data, error } = await db.from('admin_social_publications').update({ state: result.state,
              message: result.message ?? null, post_id: result.postId ?? null, post_url: result.postUrl ?? null, updated_at: new Date().toISOString(),
            }).eq('claim_id', claim).eq('state', 'publishing').select('id').single()
            if (error || !data) throw new Error('Status save failed')
          },
          send: () => send(platform, input.captions[platform], spotlightImageUrl(profile.profileUrl, profile.awardeeId, input.signature)),
        })
        return { ...result, caption: result.caption ?? input.captions[platform], platform }
      } catch {
        return { platform, state: 'uncertain', message: 'Status could not be confirmed. Refresh to check the saved record before retrying.' }
      }
    }))
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ message: 'Publishing storage is unavailable. Refresh to check delivery status before retrying.' }, { status: 503 })
  }
}
