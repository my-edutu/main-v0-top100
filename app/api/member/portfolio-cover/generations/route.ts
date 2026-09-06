import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/auth-server'
import { checkRateLimit, createRateLimitResponse, getClientIdentifier, RATE_LIMITS } from '@/lib/rate-limit'
import { rejectCrossOriginMutation } from '@/lib/security/same-origin'
import { createAdminClient } from '@/lib/supabase/server'

import { portfolioCoverConfig } from '@/lib/portfolio-cover/config'
import { generatePortfolioCoverSet } from '@/lib/portfolio-cover/generate'
import { prepareEditMask, preparePortrait, validatePortraitUpload } from '@/lib/portfolio-cover/image'
import { createPortfolioCoverRepository, portfolioObjectPath } from '@/lib/portfolio-cover/repository'
import { createDemoImageEditor } from '@/lib/portfolio-cover/providers/demo'
import { createOpenAIImageEditor } from '@/lib/portfolio-cover/providers/openai'
import { portfolioCoverRequestSchema, normalizePortfolioCoverFields } from '@/lib/portfolio-cover/validation'
import { enqueuePortfolioGeneration, portfolioQueueConfigured } from '@/lib/portfolio-cover/queue'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  const blocked = rejectCrossOriginMutation(request)
  if (blocked) return blocked
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })
  const config = portfolioCoverConfig()
  if (!config.enabled) return NextResponse.json({ message: 'Portfolio cover generation is not available yet.' }, { status: 503 })

  const rate = await checkRateLimit({ ...RATE_LIMITS.UPLOAD, identifier: `portfolio-cover:${getClientIdentifier(request.headers)}:${user.id}` })
  if (!rate.success) return createRateLimitResponse(rate, 'Too many image generations. Please try again later.')

  let form: FormData
  try { form = await request.formData() } catch { return NextResponse.json({ message: 'Invalid form submission.' }, { status: 400 }) }
  const rawFields = String(form.get('fields') ?? '{}')
  let fieldsInput: unknown
  try { fieldsInput = JSON.parse(rawFields) } catch { return NextResponse.json({ message: 'Invalid profile details.' }, { status: 400 }) }
  const parsed = portfolioCoverRequestSchema.safeParse({ tailoring: String(form.get('tailoring') ?? ''), consent: form.get('consent') === 'true', fields: fieldsInput })
  if (!parsed.success) return NextResponse.json({ message: 'Choose Male or Female, provide valid details, and accept the photo-edit consent.' }, { status: 400 })
  const file = form.get('portrait')
  if (!(file instanceof File)) return NextResponse.json({ message: 'A portrait photo is required.' }, { status: 400 })
  const original = Buffer.from(await file.arrayBuffer())
  const validation = validatePortraitUpload(original, file.type)
  if (!validation.ok) return NextResponse.json({ message: validation.code === 'too_large' ? 'Portrait must be 8 MB or smaller.' : 'Upload a valid JPEG, PNG, or WebP portrait.' }, { status: 400 })

  const fields = normalizePortfolioCoverFields(parsed.data.fields ?? {})
  const repo = createPortfolioCoverRepository()
  const current = await repo.getCurrent(user.id)
  if (current && ['queued', 'processing', 'ready', 'selected'].includes(current.status)) return NextResponse.json({ message: 'You already have a portfolio cover set in progress or ready to choose.' }, { status: 409 })

  const id = crypto.randomUUID()
  let portrait: Buffer
  let mask: Buffer
  try {
    portrait = await preparePortrait(original)
    mask = await prepareEditMask()
  } catch {
    return NextResponse.json({ message: 'We could not decode that portrait. Upload a clear JPEG, PNG, or WebP image.' }, { status: 400 })
  }
  const sourcePath = portfolioObjectPath(user.id, id, 'source')
  await repo.uploadSource(sourcePath, portrait)
  const generation = await repo.create({ id, memberId: user.id, tailoring: parsed.data.tailoring, fields, sourcePath })

  const profile = await createAdminClient().from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  const memberName = String(profile.data?.full_name ?? fields.name ?? 'Top100 Future Leader')
  const editor = config.demo ? createDemoImageEditor() : createOpenAIImageEditor({ apiKey: process.env.OPENAI_API_KEY! })
  if (portfolioQueueConfigured()) {
    try {
      await enqueuePortfolioGeneration({ generationId: id, memberId: user.id, attempt: 1 })
    } catch (error) {
      await repo.update(id, { status: 'failed', failure_code: 'queue_unavailable' })
      console.error('[portfolio-cover] queue enqueue failed', error)
      return NextResponse.json({ message: 'We could not start image generation. Please try again.' }, { status: 503 })
    }
  } else {
    after(async () => {
      try {
        await generatePortfolioCoverSet({ id, memberId: user.id, memberName, tailoring: parsed.data.tailoring, fields, portrait, mask }, { repo, editor })
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') console.warn('[portfolio-cover] generation failed', error instanceof Error ? error.message : 'unknown')
      }
    })
  }
  return NextResponse.json({ generation }, { status: 202 })
}
