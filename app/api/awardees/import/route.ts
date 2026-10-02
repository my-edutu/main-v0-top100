import { createHash, randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { extractAwardeeRecords, inspectAwardeeWorkbook, readAwardeeWorkbook, suggestWorkbookMapping, type WorkbookMapping } from '@/lib/awardee-workbook'
import { planReviewedImport, type ExistingAwardee } from '@/lib/awardee-import-review'

export const runtime = 'nodejs'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROWS = 10000
const STAGING_BUCKET = 'awardee-import-staging'
const UPLOAD_MAX_AGE_MS = 24 * 60 * 60 * 1000

function uploadExtension(filename: string): string | null {
  return filename.match(/\.(xlsx|xls|csv)$/i)?.[1]?.toLowerCase() ?? null
}

function ownedUploadPath(path: unknown, adminId: string): path is string {
  return typeof path === 'string' && new RegExp(`^admin-imports/${adminId}/[0-9]{13}-[0-9a-f-]{36}\\.(xlsx|xls|csv)$`, 'i').test(path)
}

function uploadCreatedAt(path: string): number {
  return Number(path.split('/').pop()?.slice(0, 13) ?? 0)
}

async function clearOldUploads(adminId: string) {
  const storage = createAdminClient().storage.from(STAGING_BUCKET)
  const prefix = `admin-imports/${adminId}`
  const { data, error } = await storage.list(prefix, { limit: 1000 })
  if (error) return
  const oldPaths = (data ?? [])
    .map((item) => `${prefix}/${item.name}`)
    .filter((path) => ownedUploadPath(path, adminId) && Date.now() - uploadCreatedAt(path) > UPLOAD_MAX_AGE_MS)
  if (oldPaths.length) await storage.remove(oldPaths)
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  await clearOldUploads(admin.user.id)
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
  const body = await request.json().catch(() => null) as { batchId?: unknown; uploadPath?: unknown } | null
  if (body?.uploadPath !== undefined) {
    if (!ownedUploadPath(body.uploadPath, admin.user.id)) {
      return NextResponse.json({ message: 'Choose a valid import upload.' }, { status: 400 })
    }
    const { error } = await createAdminClient().storage.from(STAGING_BUCKET).remove([body.uploadPath])
    if (error) return NextResponse.json({ message: 'Could not remove the uploaded spreadsheet.' }, { status: 500 })
    return NextResponse.json({ success: true })
  }
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
    const isMultipart = request.headers.get('content-type')?.includes('multipart/form-data') ?? false
    const form = isMultipart ? await request.formData() : null
    const payload = !isMultipart ? await request.json().catch(() => null) as Record<string, unknown> | null : null
    const action = String(form?.get('action') ?? payload?.action ?? 'inspect')
    if (action === 'prepare-upload') {
      const filename = typeof payload?.filename === 'string' ? payload.filename.trim() : ''
      const fileSize = Number(payload?.fileSize)
      const extension = uploadExtension(filename)
      if (!extension || !Number.isInteger(fileSize) || fileSize < 1 || fileSize > MAX_BYTES) {
        return NextResponse.json({ message: 'Choose an Excel or CSV file up to 5 MiB.' }, { status: 400 })
      }
      await clearOldUploads(admin.user.id)
      const uploadPath = `admin-imports/${admin.user.id}/${Date.now()}-${randomUUID()}.${extension}`
      const { data, error } = await createAdminClient().storage.from(STAGING_BUCKET).createSignedUploadUrl(uploadPath)
      if (error || !data?.token) {
        console.error('[awardee-import] could not prepare storage upload', error)
        return NextResponse.json({ message: 'Import upload storage is unavailable. Check that the staging bucket migration is applied.' }, { status: 503 })
      }
      return NextResponse.json({ bucket: STAGING_BUCKET, uploadPath, token: data.token })
    }

    if (action !== 'inspect' && action !== 'preview' && action !== 'commit') {
      return NextResponse.json({ message: 'Unknown import action.' }, { status: 400 })
    }

    let filename: string
    let bytes: Uint8Array
    let uploadPath: string | null = null
    if (form) {
      const file = form.get('file')
      if (!(file instanceof File) || !file.size || file.size > MAX_BYTES) {
        return NextResponse.json({ message: 'Upload a spreadsheet smaller than 5 MiB.' }, { status: 400 })
      }
      filename = file.name
      bytes = new Uint8Array(await file.arrayBuffer())
    } else {
      filename = typeof payload?.filename === 'string' ? payload.filename.trim().slice(0, 255) : ''
      if (!ownedUploadPath(payload?.uploadPath, admin.user.id) || !uploadExtension(filename)) {
        return NextResponse.json({ message: 'Choose a valid uploaded spreadsheet.' }, { status: 400 })
      }
      uploadPath = payload.uploadPath
      if (Date.now() - uploadCreatedAt(uploadPath) > UPLOAD_MAX_AGE_MS || !uploadPath.endsWith(`.${uploadExtension(filename)}`)) {
        return NextResponse.json({ message: 'This upload has expired. Choose the spreadsheet again.' }, { status: 400 })
      }
      const { data, error } = await createAdminClient().storage.from(STAGING_BUCKET).download(uploadPath)
      if (error || !data) return NextResponse.json({ message: 'Uploaded spreadsheet was not found. Choose it again.' }, { status: 404 })
      if (!data.size || data.size > MAX_BYTES) {
        return NextResponse.json({ message: 'Upload a spreadsheet smaller than 5 MiB.' }, { status: 400 })
      }
      bytes = new Uint8Array(await data.arrayBuffer())
    }

    const book = readAwardeeWorkbook(bytes, filename)
    const sheets = inspectAwardeeWorkbook(book)
    if (sheets.reduce((total, sheet) => total + sheet.rowCount, 0) > MAX_ROWS) {
      return NextResponse.json({ message: 'Limit each import to 10,000 spreadsheet rows.' }, { status: 400 })
    }
    if (action === 'inspect') {
      return NextResponse.json({ sheets, mapping: suggestWorkbookMapping(sheets) })
    }
    let mapping: WorkbookMapping
    try {
      const rawMapping = form?.get('mapping') ?? payload?.mapping
      mapping = (typeof rawMapping === 'string' ? JSON.parse(rawMapping) : rawMapping) as WorkbookMapping
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
      return NextResponse.json({
        ...review,
        actions: review.actions.slice(0, 100),
        issues: review.issues.slice(0, 100),
        actionCount: review.actions.length,
        issueCount: review.issues.length,
        previewId,
        totalRecords: extracted.records.length,
      })
    }
    if ((form?.get('previewId') ?? payload?.previewId) !== previewId) {
      return NextResponse.json({ message: 'The import changed since preview. Review it again before importing.' }, { status: 409 })
    }
    if (!review.actions.length) {
      return NextResponse.json({ message: 'No new profile details to import.' }, { status: 400 })
    }
    const db = createAdminClient()
    const { data, error } = await db.rpc('apply_reviewed_awardee_import', {
      p_actions: review.actions,
      p_admin_id: admin.user.id,
      p_filename: filename.slice(0, 255),
      p_file_sha256: fileHash,
      p_mapping: mapping,
      p_summary: review.summary,
    })
    if (error) throw new Error(`Import could not be saved: ${error.message}`)
    if (uploadPath) {
      const { error: cleanupError } = await createAdminClient().storage.from(STAGING_BUCKET).remove([uploadPath])
      if (cleanupError) console.error('[awardee-import] imported workbook cleanup failed', cleanupError)
    }
    revalidatePath('/awardees')
    revalidatePath('/admin/awardees')
    return NextResponse.json({
      success: true,
      batch: data,
      summary: review.summary,
      issues: review.issues.slice(0, 100),
      issueCount: review.issues.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
