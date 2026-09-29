import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { loadPublicAwardee } from '@/lib/admin-social/server'
import { createOpenAICaptionGenerator, SocialCaptionProviderError } from '@/lib/admin-social/openai-caption'
import { parseGenerateInput } from '@/lib/admin-social/validation'
import { SITE_URL } from '@/lib/site'

export const runtime = 'nodejs'

const SAFE_PROVIDER_MESSAGES: Record<string, string> = {
  provider_unavailable: 'Caption generation is temporarily unavailable. Your existing draft is unchanged.',
  provider_rejected: 'Caption generation could not be completed. Your existing draft is unchanged.',
  invalid_provider_output: 'The generated caption could not be validated. Please try again.',
  provider_timeout: 'Caption generation took too long. Your existing draft is unchanged.',
}

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if ('error' in access) return access.error
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > 2000) return NextResponse.json({ message: 'Request is too large.' }, { status: 413 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }
  const input = parseGenerateInput(body)
  if (!input) return NextResponse.json({ message: 'Choose a public awardee and supported platform.' }, { status: 400 })

  try {
    const origin = process.env.NODE_ENV === 'development' ? request.nextUrl.origin : SITE_URL
    const profile = await loadPublicAwardee(input.awardeeId, origin)
    if (!profile) return NextResponse.json({ message: 'Public awardee profile not found.' }, { status: 404 })
    if (!profile.bio) return NextResponse.json({ message: 'Add a public BIO before generating a caption.' }, { status: 422 })
    const generator = createOpenAICaptionGenerator({ apiKey: process.env.OPENAI_API_KEY ?? '' })
    const caption = await generator.generate(profile, input.platform)
    return NextResponse.json({ caption, platform: input.platform, profile })
  } catch (error) {
    if (error instanceof SocialCaptionProviderError) {
      const status = error.code === 'provider_unavailable' ? 503 : error.code === 'provider_timeout' ? 504 : 502
      return NextResponse.json({ message: SAFE_PROVIDER_MESSAGES[error.code] }, { status })
    }
    return NextResponse.json({ message: 'Could not generate a caption. Your draft is unchanged.' }, { status: 503 })
  }
}
