import { NextRequest, NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/server'
import { portfolioCoverConfig } from '@/lib/portfolio-cover/config'
import { isPortfolioWorkerAuthorized } from '@/lib/portfolio-cover/internal'
import { createPortfolioCoverRepository } from '@/lib/portfolio-cover/repository'
import { generatePortfolioCoverSet } from '@/lib/portfolio-cover/generate'
import { prepareEditMask } from '@/lib/portfolio-cover/image'
import { createDemoImageEditor } from '@/lib/portfolio-cover/providers/demo'
import { createOpenAIImageEditor } from '@/lib/portfolio-cover/providers/openai'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function POST(request: NextRequest) {
  if (!isPortfolioWorkerAuthorized(request.headers.get('authorization'))) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null) as {
    type?: unknown
    generationId?: unknown
    memberId?: unknown
    attempt?: unknown
  } | null

  if (
    body?.type !== 'portfolio-cover.generate' ||
    typeof body.generationId !== 'string' ||
    typeof body.memberId !== 'string' ||
    typeof body.attempt !== 'number' ||
    !Number.isInteger(body.attempt)
  ) {
    return NextResponse.json({ message: 'Invalid generation job.' }, { status: 400 })
  }

  const repo = createPortfolioCoverRepository()
  const row = await repo.getForProcessing(body.generationId, body.memberId)
  if (!row) return NextResponse.json({ message: 'Generation not found.' }, { status: 404 })
  if (['ready', 'selected', 'rejected', 'expired'].includes(row.status)) {
    return NextResponse.json({ status: row.status })
  }
  if (!row.source_path) return NextResponse.json({ message: 'Generation source is missing.' }, { status: 409 })

  const config = portfolioCoverConfig()
  if (!config.enabled) return NextResponse.json({ message: 'Portfolio generation is not configured.' }, { status: 503 })

  const source = await repo.downloadSource(row.source_path)
  const mask = await prepareEditMask()
  const profile = await createAdminClient().from('profiles').select('full_name').eq('id', body.memberId).maybeSingle()
  const memberName = String(profile.data?.full_name ?? row.fields?.name ?? 'Top100 Future Leader')
  const editor = config.demo
    ? createDemoImageEditor()
    : createOpenAIImageEditor({ apiKey: process.env.OPENAI_API_KEY! })

  await generatePortfolioCoverSet(
    {
      id: row.id,
      memberId: row.member_id,
      memberName,
      tailoring: row.tailoring,
      fields: row.fields ?? {},
      portrait: source,
      mask,
      attempt: body.attempt,
    },
    { repo, editor },
  )

  return NextResponse.json({ status: 'ready' })
}
