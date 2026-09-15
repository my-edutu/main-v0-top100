const normalizeSegment = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'

export function sanitizeSelectionFileName(value: string) {
  const withoutPath = value.split(/[\\/]/).pop()?.trim() ?? ''
  const stem = withoutPath.replace(/\.pdf$/i, '')
  const normalizedStem = stem
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)

  return `${normalizedStem || 'evidence'}.pdf`
}

export function buildSelectionEvidencePath({
  cycleId,
  jobId,
  applicationId,
  documentId,
  fileName,
}: {
  cycleId: string
  jobId: string
  applicationId: string
  documentId: string
  fileName: string
}) {
  return [
    normalizeSegment(cycleId),
    normalizeSegment(jobId),
    normalizeSegment(applicationId),
    `${normalizeSegment(documentId)}-${sanitizeSelectionFileName(fileName)}`,
  ].join('/')
}

export function hasPdfMagicBytes(value: ArrayBuffer | Uint8Array | Buffer) {
  const bytes = Buffer.from(value instanceof ArrayBuffer ? new Uint8Array(value) : value)
  return bytes.length >= 5 && bytes.subarray(0, 5).toString('ascii') === '%PDF-'
}
