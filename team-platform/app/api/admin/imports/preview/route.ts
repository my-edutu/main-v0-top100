import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  loadExistingLookup,
  normalizeMapping,
  parseSpreadsheet,
  previewRows,
  suggestMapping,
} from '@/lib/import-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const form = await request.formData()
    const file = form.get('file')
    if (!(file instanceof File)) throw new ApiError('Choose a CSV or Excel file to upload')

    const name = file.name || 'awardees.xlsx'
    if (!/\.(csv|xlsx|xls)$/i.test(name)) {
      throw new ApiError('Only .csv, .xlsx and .xls files are supported')
    }

    let parsed
    try {
      parsed = parseSpreadsheet(Buffer.from(await file.arrayBuffer()), name)
    } catch (error) {
      throw new ApiError(error instanceof Error ? error.message : 'Could not read the file')
    }

    let mapping = suggestMapping(parsed.headers)
    const suppliedMapping = form.get('mapping')
    if (typeof suppliedMapping === 'string' && suppliedMapping.trim()) {
      try {
        mapping = normalizeMapping(JSON.parse(suppliedMapping), parsed.headers)
      } catch {
        throw new ApiError('The column mapping is not valid JSON')
      }
    }

    const existing = await loadExistingLookup(member.membership.team_id)
    const { preview, commitRows } = previewRows(parsed.rows, mapping, existing)

    const admin = createAdminClient()
    const { data: job, error } = await admin
      .from('team_import_jobs')
      .insert({
        team_id: member.membership.team_id,
        filename: name,
        file_sha256: parsed.sha256,
        status: 'previewed',
        mapping,
        raw_rows: parsed.rows,
        rows: commitRows,
        errors: preview.errors.slice(0, 2000),
        summary: preview.summary,
        created_by: member.user.id,
      })
      .select('id')
      .single()
    if (error) throw new ApiError(`Could not save the import preview: ${error.message}`, 500)

    await audit(member, 'import.previewed', 'import_job', job.id, {
      filename: name,
      summary: preview.summary,
      sha256: parsed.sha256,
    })

    return NextResponse.json(
      {
        jobId: job.id,
        filename: name,
        headers: parsed.headers,
        mapping,
        preview: {
          rows: preview.rows.slice(0, 100),
          errors: preview.errors.slice(0, 500),
          summary: preview.summary,
        },
        commitRows: commitRows.length,
        truncated: preview.rows.length > 100,
      },
      { status: 201 },
    )
  } catch (error) {
    return jsonError(error)
  }
}
