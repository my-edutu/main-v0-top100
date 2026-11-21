import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { loadPublicAwardee } from '@/lib/admin-social/server'
import {
  createOpenAICaptionGenerator,
  SocialCaptionProviderError,
} from '@/lib/admin-social/openai-caption'
import {
  SPOTLIGHT_PLATFORMS,
  completeSpotlightCaption,
  validateSpotlightCaption,
} from '@/lib/admin-social/spotlight'
import { spotlightSignature } from '@/lib/admin-social/spotlight-snapshot'
import { publishingConfiguration } from '@/lib/admin-social/publishing-provider'
import { createAdminClient } from '@/lib/supabase/server'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'
export async function GET(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const awardeeId = z
    .guid()
    .safeParse(request.nextUrl.searchParams.get('awardeeId'))
  if (!awardeeId.success)
    return NextResponse.json({ message: 'Choose a profile.' }, { status: 400 })
  const { data, error } = await createAdminClient()
    .from('admin_social_publications')
    .select('platform,state,caption,message,post_id,post_url,updated_at')
    .eq('awardee_id', awardeeId.data)
  return NextResponse.json(
    {
      accounts: publishingConfiguration(),
      publications: data ?? [],
      storageReady: !error,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const input = z
    .object({
      awardeeId: z.guid(),
      platform: z.enum(SPOTLIGHT_PLATFORMS).optional(),
      editorialFocus: z.string().trim().max(800).optional(),
    })
    .strict()
    .safeParse(await request.json().catch(() => null))
  if (!input.success)
    return NextResponse.json(
      { message: 'Choose a public profile.' },
      { status: 400 },
    )
  try {
    const profile = await loadPublicAwardee(input.data.awardeeId, SITE_URL)
    if (!profile?.bio)
      return NextResponse.json(
        { message: 'A public profile with a bio is required.' },
        { status: 422 },
      )
    const generator = createOpenAICaptionGenerator({
      apiKey: process.env.OPENAI_API_KEY ?? '',
    })
    const platforms = input.data.platform
      ? [input.data.platform]
      : SPOTLIGHT_PLATFORMS
    const results = await Promise.all(
      platforms.map(async (platform) => {
        const caption = completeSpotlightCaption(
          await generator.generate(
            profile,
            platform,
            input.data.editorialFocus ?? '',
          ),
          profile.profileUrl,
        )
        return [platform, caption] as const
      }),
    )
    const captions = Object.fromEntries(results)
    const issues = Object.fromEntries(
      results.map(([platform, caption]) => [
        platform,
        validateSpotlightCaption(platform, caption, profile.profileUrl),
      ]),
    )
    return NextResponse.json({
      captions,
      issues,
      profile,
      signature: spotlightSignature(profile),
    })
  } catch (error) {
    if (
      error instanceof SocialCaptionProviderError &&
      error.code === 'provider_credentials'
    )
      return NextResponse.json(
        {
          message:
            'The AI connection needs attention. Renew the configured API key before rewriting. Your existing write-up is unchanged.',
        },
        { status: 503 },
      )
    return NextResponse.json(
      {
        message:
          'Could not generate the feature. Existing edits are unchanged. Try again.',
      },
      { status: 503 },
    )
  }
}
