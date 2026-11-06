import { NextRequest } from 'next/server'
import { z } from 'zod'
import { loadPublicAwardee } from '@/lib/admin-social/server'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'
import { renderSpotlightImage } from '@/lib/admin-social/spotlight-image'
import { SITE_URL } from '@/lib/site'
export const runtime = 'nodejs'
// Public by design: Meta downloads this image without an admin session. Only
// already-public profiles on our own image hosts can be rendered.
export async function GET(request: NextRequest, context: { params: Promise<{ awardeeId: string }> }) {
  const { awardeeId } = await context.params
  if (!z.string().uuid().safeParse(awardeeId).success) return new Response('Not found', { status: 404 })
  try {
    const profile = await loadPublicAwardee(awardeeId, SITE_URL)
    if (!profile?.imageUrl || request.nextUrl.searchParams.get('v') !== spotlightSignature(profile)) return new Response('Not found', { status: 404 })
    const image = await renderSpotlightImage(profile.imageUrl)
    return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
  } catch { return new Response('Image unavailable', { status: 422 }) }
}
