import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadExistingLookup, normalizeMapping, previewRows } from '@/lib/import-server'
import { importRemapSchema } from '@/lib/validation'
import type { RawRow } from '@/lib/import'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = importRemapSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data: job, error } = await admin
      .from('team_import_jobs')
      .select('id, team_id, status, raw_rows, filename')
      .eq('id', payload.jobId)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (error) throw new ApiError('Could not load the import', 500)
    if (!job) throw new ApiError('Import not found', 404)
    if (job.status !== 'previewed') throw new ApiError('This import has already been committed', 409)

    const rawRows = (job.raw_rows ?? []) as RawRow[]
    if (!rawRows.length) {
      throw new ApiError('This preview has no stored rows. Upload the file again.', 409)
    }
    const headers = Object.keys(rawRows[0])
    const mapping = normalizeMapping(payload.mapping, headers)
    if (!mapping.name) throw new ApiError('Map a name column before continuing')

    const existing = await loadExistingLookup(member.membership.team_id)
    const { preview, commitRows } = previewRows(rawRows, mapping, existing)

    const { error: updateError } = await admin
      .from('team_import_jobs')
      .update({
        mapping,
        rows: commitRows,
        errors: preview.errors.slice(0, 2000),
        summary: preview.summary,
      })
      .eq('id', job.id)
      .eq('status', 'previewed')
    if (updateError) throw new ApiError('Could not update the preview', 500)

    await audit(member, 'import.remapped', 'import_job', job.id, {
      mapping,
      summary: preview.summary,
    })

    return NextResponse.json({
      jobId: job.id,
      filename: job.filename,
      headers,
      mapping,
      preview: {
        rows: preview.rows.slice(0, 100),
        errors: preview.errors.slice(0, 500),
        summary: preview.summary,
      },
      commitRows: commitRows.length,
      truncated: preview.rows.length > 100,
    })
  } catch (error) {
    return jsonError(error)
  }
}
