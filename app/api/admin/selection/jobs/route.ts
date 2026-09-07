import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { SELECTION_BATCH_SIZE } from '@/lib/selection/contracts'
import { parseGoogleFormId, parseGoogleSpreadsheetId } from '@/lib/selection/source'

export const runtime = 'nodejs'

const createJobSchema = z.object({
  cycleName: z.string().trim().min(3).max(160),
  cycleYear: z.number().int().min(2000).max(2200),
  sourceType: z.enum(['google_form', 'google_sheet', 'pdf_upload']),
  sourceLabel: z.string().trim().min(2).max(200),
  googleFormUrl: z.string().trim().optional().default(''),
  googleSheetUrl: z.string().trim().optional().default(''),
  minimumMeritScore: z.number().min(0).max(100).optional().default(60),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120)

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  let input: z.infer<typeof createJobSchema>
  try {
    input = createJobSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Invalid selection job details',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  let sourceConfig: Record<string, string> = {}
  try {
    if (input.sourceType === 'google_form') {
      sourceConfig = {
        formId: parseGoogleFormId(input.googleFormUrl),
        spreadsheetId: parseGoogleSpreadsheetId(input.googleSheetUrl),
      }
    } else if (input.sourceType === 'google_sheet') {
      sourceConfig = {
        spreadsheetId: parseGoogleSpreadsheetId(input.googleSheetUrl),
      }
    }
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Invalid Google source' },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const cycleSlug = `${slugify(input.cycleName)}-${input.cycleYear}`
  const { data: existingCycle, error: cycleLookupError } = await supabase
    .from('selection_cycles')
    .select('id, name, year, policy')
    .eq('slug', cycleSlug)
    .maybeSingle()

  if (cycleLookupError && cycleLookupError.code !== 'PGRST116') {
    return NextResponse.json({ message: cycleLookupError.message }, { status: 500 })
  }

  let cycle = existingCycle
  if (!cycle) {
    const { data, error } = await supabase
      .from('selection_cycles')
      .insert({
        name: input.cycleName,
        slug: cycleSlug,
        year: input.cycleYear,
        status: 'draft',
        policy: {
          version: `${input.cycleYear}.1`,
          minimumMeritScore: input.minimumMeritScore,
          academicRequirement: 'first_class_or_equivalent',
          requireVerifiedAcademicEvidence: true,
        },
        created_by: adminCheck.user.id,
      })
      .select('id, name, year, policy')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { message: error?.message || 'Failed to create the selection cycle' },
        { status: 500 },
      )
    }
    cycle = data
  }

  const { data: job, error: jobError } = await supabase
    .from('selection_jobs')
    .insert({
      cycle_id: cycle.id,
      source_type: input.sourceType,
      source_label: input.sourceLabel,
      source_config: sourceConfig,
      status: 'ready',
      batch_size: SELECTION_BATCH_SIZE,
      created_by: adminCheck.user.id,
    })
    .select('*')
    .single()

  if (jobError || !job) {
    return NextResponse.json(
      { message: jobError?.message || 'Failed to create the selection job' },
      { status: 500 },
    )
  }

  await supabase.from('selection_audit_events').insert({
    cycle_id: cycle.id,
    job_id: job.id,
    actor_id: adminCheck.user.id,
    event_type: 'selection_job_created',
    event_data: {
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceConfig,
      batchSize: SELECTION_BATCH_SIZE,
    },
  })

  return NextResponse.json({ cycle, job }, { status: 201 })
}
