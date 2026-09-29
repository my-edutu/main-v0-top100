import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { extractAwardeeRecords, inspectAwardeeWorkbook, readAwardeeWorkbook, suggestWorkbookMapping, type WorkbookMapping } from '@/lib/awardee-workbook'
import { planReviewedImport, type ExistingAwardee } from '@/lib/awardee-import-review'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 10000

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const { data, error } = await createAdminClient().from('awardee_import_batches')
    .select('id,filename,summary,created_at,created_by,rolled_back_at')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) return NextResponse.json({ message: 'Could not load import history.' }, { status: 500 })
  return NextResponse.json({ batches: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const body = await request.json().catch(() => null) as { batchId?: unknown } | null
  const batchId = typeof body?.batchId === 'string' ? body.batchId : ''
  if (!/^[0-9a-f-]{36}$/i.test(batchId)) {
    return NextResponse.json({ message: 'Choose a valid import batch.' }, { status: 400 })
  }
  const { data, error } = await createAdminClient().rpc('rollback_reviewed_awardee_import', { p_batch_id: batchId })
  if (error) {
    return NextResponse.json({ message: 'This batch cannot be undone because a winner changed or claimed a record.' }, { status: 409 })
  }
  revalidatePath('/awardees')
  revalidatePath('/admin/awardees')
  return NextResponse.json({ success: true, reverted: data })
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function existingAwardees(): Promise<ExistingAwardee[]> {
  const db = createAdminClient()
  const all: ExistingAwardee[] = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from('awardees')
      .select('id,name,slug,email,profile_id,metadata,country,course,bio,year,image_url,tagline,headline,cgpa,social_links')
      .order('id', { ascending: true })
      .range(offset, offset + 999)
    if (error) throw new Error('Could not read existing awardees.')
    all.push(...((data ?? []) as ExistingAwardee[]))
    if ((data ?? []).length < 1000) break
  }
  return all
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error

  try {
    const form = await request.formData()
    const file = form.get('file')
    const action = String(form.get('action') ?? 'inspect')
    if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) {
      return NextResponse.json({ message: 'Upload a spreadsheet smaller than 5 MiB.' }, { status: 400 })
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const book = readAwardeeWorkbook(bytes, file.name)
    const sheets = inspectAwardeeWorkbook(book)
    if (sheets.reduce((total, sheet) => total + sheet.rowCount, 0) > MAX_ROWS) {
      return NextResponse.json({ message: 'Limit each import to 10,000 spreadsheet rows.' }, { status: 400 })
    }
    if (action === 'inspect') {
      return NextResponse.json({ sheets, mapping: suggestWorkbookMapping(sheets) })
    }
    if (action !== 'preview' && action !== 'commit') {
      return NextResponse.json({ message: 'Unknown import action.' }, { status: 400 })
    }

    let mapping: WorkbookMapping
    try {
      mapping = JSON.parse(String(form.get('mapping') ?? '')) as WorkbookMapping
    } catch {
      return NextResponse.json({ message: 'Check the worksheet mappings.' }, { status: 400 })
    }
    if (!mapping || !Array.isArray(mapping.sheets) || typeof mapping.primarySheet !== 'string') {
      return NextResponse.json({ message: 'Check the worksheet mappings.' }, { status: 400 })
    }
    const extracted = extractAwardeeRecords(book, mapping)
    const review = planReviewedImport(extracted.records, await existingAwardees(), extracted.issues)
    const fileHash = createHash('sha256').update(bytes).digest('hex')
    const previewId = digest({ fileHash, mapping, review })
    if (action === 'preview') {
      return NextResponse.json({ ...review, previewId, totalRecords: extracted.records.length })
    }
    if (form.get('previewId') !== previewId) {
      return NextResponse.json({ message: 'The import changed since preview. Review it again before importing.' }, { status: 409 })
    }
    if (!review.actions.length) {
      return NextResponse.json({ message: 'No new profile details to import.' }, { status: 400 })
    }
    const db = createAdminClient()
    const { data, error } = await db.rpc('apply_reviewed_awardee_import', {
      p_actions: review.actions,
      p_admin_id: admin.user.id,
      p_filename: file.name.slice(0, 255),
      p_file_sha256: fileHash,
      p_mapping: mapping,
      p_summary: review.summary,
    })
    if (error) throw new Error(`Import could not be saved: ${error.message}`)
    revalidatePath('/awardees')
    revalidatePath('/admin/awardees')
    return NextResponse.json({ success: true, batch: data, summary: review.summary, issues: review.issues })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
