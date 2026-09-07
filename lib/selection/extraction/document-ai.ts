import { getGoogleServiceAccountAccessToken } from './google-auth'

const DOCUMENT_AI_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

export type AcademicDocumentFields = {
  degreeClassification: 'first_class' | 'other_classification' | 'unknown'
  cgpa: number | null
  cgpaScale: number | null
  bestGraduatingStudent: boolean
  institutionCandidates: string[]
}

type DocumentAiLayout = {
  confidence?: number
}

type DocumentAiToken = {
  layout?: DocumentAiLayout
}

type DocumentAiPage = {
  tokens?: DocumentAiToken[]
}

type DocumentAiDocument = {
  text?: string
  pages?: DocumentAiPage[]
}

type ProcessDocumentResponse = {
  document?: DocumentAiDocument
}

export type SelectionDocumentExtraction = {
  provider: 'google_document_ai'
  text: string
  pageCount: number
  confidence: number
  academic: AcademicDocumentFields
}

const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is required for Google Document AI`)
  return value
}

const sanitizeDisplayName = (value: string) =>
  value
    .replace(/[\*?\[\]%{}'",~=:]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'selection-evidence.pdf'

const parseNumber = (value: string | undefined) => {
  if (!value) return null
  const parsed = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

const unique = <T>(values: T[]) => Array.from(new Set(values))

export function extractAcademicFieldsFromText(text: string): AcademicDocumentFields {
  const normalized = text.replace(/\r/g, '\n')
  const upper = normalized.toUpperCase()

  const degreeClassification = /\bFIRST\s+CLASS(?:\s+HONOU?RS?)?\b/.test(upper)
    ? 'first_class'
    : /\b(?:SECOND\s+CLASS|THIRD\s+CLASS|PASS\s+DEGREE)\b/.test(upper)
      ? 'other_classification'
      : 'unknown'

  const cgpaMatch = normalized.match(
    /(?:CUMULATIVE\s+GRADE\s+POINT\s+AVERAGE|C\.?G\.?P\.?A\.?)\s*(?:\([^)]*\))?\s*[:=-]?\s*(\d+(?:[.,]\d+)?)\s*(?:\/|OUT\s+OF)?\s*(\d+(?:[.,]\d+)?)?/i,
  )

  const institutionCandidates = unique(
    normalized
      .split(/\n+/)
      .map((line) => line.trim().replace(/\s+/g, ' '))
      .filter(
        (line) =>
          line.length >= 5 &&
          line.length <= 140 &&
          /\b(?:UNIVERSITY|POLYTECHNIC|COLLEGE|INSTITUTE)\b/i.test(line),
      )
      .map((line) => line.toUpperCase()),
  ).slice(0, 10)

  return {
    degreeClassification,
    cgpa: parseNumber(cgpaMatch?.[1]),
    cgpaScale: parseNumber(cgpaMatch?.[2]),
    bestGraduatingStudent: /\bBEST\s+GRADUATING\s+STUDENT\b/i.test(normalized),
    institutionCandidates,
  }
}

export function averageDocumentAiConfidence(document: DocumentAiDocument) {
  const confidenceValues = (document.pages ?? [])
    .flatMap((page) => page.tokens ?? [])
    .map((token) => token.layout?.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))

  if (confidenceValues.length === 0) return 0
  const average = confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
  return Math.round(average * 10_000) / 10_000
}

export function buildDocumentAiProcessorUrl({
  projectId,
  location,
  processorId,
}: {
  projectId: string
  location: string
  processorId: string
}) {
  const safeProjectId = encodeURIComponent(projectId)
  const safeLocation = encodeURIComponent(location)
  const safeProcessorId = encodeURIComponent(processorId)
  return `https://${safeLocation}-documentai.googleapis.com/v1/projects/${safeProjectId}/locations/${safeLocation}/processors/${safeProcessorId}:process`
}

export async function extractSelectionPdfWithDocumentAi({
  bytes,
  fileName,
}: {
  bytes: ArrayBuffer | Uint8Array | Buffer
  fileName: string
}): Promise<SelectionDocumentExtraction> {
  const projectId = requiredEnv('GOOGLE_DOCUMENT_AI_PROJECT_ID')
  const location = requiredEnv('GOOGLE_DOCUMENT_AI_LOCATION')
  const processorId = requiredEnv('GOOGLE_DOCUMENT_AI_PROCESSOR_ID')
  const accessToken = await getGoogleServiceAccountAccessToken({ scopes: [DOCUMENT_AI_SCOPE] })
  const content = Buffer.from(bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes).toString('base64')

  const response = await fetch(
    buildDocumentAiProcessorUrl({ projectId, location, processorId }),
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        rawDocument: {
          content,
          mimeType: 'application/pdf',
          displayName: sanitizeDisplayName(fileName),
        },
        fieldMask: 'text,pages',
        imagelessMode: true,
      }),
      cache: 'no-store',
    },
  )

  const payload = (await response.json().catch(() => null)) as
    | (ProcessDocumentResponse & { error?: { message?: string } })
    | null

  if (!response.ok || !payload?.document) {
    const detail = payload?.error?.message || `HTTP ${response.status}`
    throw new Error(`Google Document AI failed to process the PDF: ${detail}`)
  }

  const text = payload.document.text?.trim() ?? ''
  return {
    provider: 'google_document_ai',
    text,
    pageCount: payload.document.pages?.length ?? 0,
    confidence: averageDocumentAiConfidence(payload.document),
    academic: extractAcademicFieldsFromText(text),
  }
}
