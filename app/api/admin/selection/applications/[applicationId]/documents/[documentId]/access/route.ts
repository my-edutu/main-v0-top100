import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ applicationId: string; documentId: string }> }
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, noarchive' }
export async function GET(request: NextRequest, { params }: Context) {
  const admin = await requireAdmin(request)
  if ('error' in admin) return admin.error
  const { applicationId, documentId } = await params
  if (![applicationId, documentId].every((id) => z.string().uuid().safeParse(id).success)) {
    return NextResponse.json({ message: 'Invalid evidence identifier' }, { status: 400, headers })
  }
  const db = createAdminClient()
  const { data: document, error } = await db.from('selection_documents')
    .select('id, application_id, job_id, storage_path, sha256, size_bytes')
    .eq('id', documentId).eq('application_id', applicationId).single()
  if (error || !document || !document.sha256 || document.size_bytes <= 0) {
    return NextResponse.json({ message: 'Confirmed evidence is not available for this application.' }, { status: 404, headers })
  }
  const { data: file, error: storageError } = await db.storage.from('selection-evidence')
    .download(document.storage_path)
  if (storageError || !file || file.size <= 0 || file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ message: 'Evidence access is temporarily unavailable.' }, { status: 503, headers })
  }
  const bytes = await file.arrayBuffer()
  if (createHash('sha256').update(new Uint8Array(bytes)).digest('hex') !== document.sha256) {
    return NextResponse.json({ message: 'The evidence snapshot changed and must be reviewed again.' }, { status: 409, headers })
  }
  const { error: auditError } = await db.from('selection_audit_events').insert({
    application_id: applicationId, job_id: document.job_id, actor_id: admin.user.id,
    event_type: 'selection_evidence_access_granted', event_data: { documentId, sha256: document.sha256 },
  })
  if (auditError) return NextResponse.json({ message: 'Evidence access could not be recorded safely.' }, { status: 503, headers })
  // Proxy privately instead of handing a reusable storage token to the browser.
  return new NextResponse(new Blob([bytes]).stream(), { headers: {
    ...headers, 'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="selection-evidence.pdf"',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': 'sandbox',
  } })
}
