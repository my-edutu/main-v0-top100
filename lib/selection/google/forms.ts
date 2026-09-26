import { getGoogleServiceAccountAccessToken } from '../extraction/google-auth'

const GOOGLE_FORMS_BODY_SCOPE = 'https://www.googleapis.com/auth/forms.body.readonly'
const GOOGLE_FORMS_RESPONSES_SCOPE = 'https://www.googleapis.com/auth/forms.responses.readonly'
const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const GOOGLE_SHEETS_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'

export type GoogleFormQuestion = {
  questionId?: string
}

export type GoogleFormItem = {
  title?: string
  questionItem?: { question?: GoogleFormQuestion }
  questionGroupItem?: { questions?: GoogleFormQuestion[] }
}

export type GoogleFormDefinition = {
  formId?: string
  linkedSheetId?: string
  revisionId?: string
  info?: { title?: string; description?: string }
  items?: GoogleFormItem[]
}

export type GoogleTextAnswer = { value?: string }
export type GoogleFileUploadAnswer = {
  fileId?: string
  fileName?: string
  mimeType?: string
}
export type GoogleQuestionAnswer = {
  textAnswers?: { answers?: GoogleTextAnswer[] }
  fileUploadAnswers?: { answers?: GoogleFileUploadAnswer[] }
}

export type GoogleFormResponse = {
  responseId?: string
  createTime?: string
  lastSubmittedTime?: string
  respondentEmail?: string
  answers?: Record<string, GoogleQuestionAnswer>
}

export type NormalizedGoogleFile = {
  fileId: string
  fileName: string
  mimeType: string
}

export type NormalizedGoogleFormApplication = {
  sourceRecordId: string
  sourceSubmittedAt: string | null
  fullName: string
  primaryEmail: string | null
  secondaryEmail: string | null
  phone: string | null
  country: string | null
  institution: string | null
  graduationYear: number | null
  claimedCgpa: string | null
  course: string | null
  claimedAcademicStatus: string
  leadershipNarrative: string | null
  declarationConfirmed: boolean
  rawData: Record<string, unknown>
}

export type NormalizedGoogleFormResponse = {
  application: NormalizedGoogleFormApplication
  academicPdfFiles: NormalizedGoogleFile[]
  unsupportedAcademicFiles: NormalizedGoogleFile[]
}

const normalizeTitle = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const patterns = {
  fullName: [/\bfull name\b/, /\bwhat is your name\b/],
  email: [/\be mail\b/, /\bemail\b/],
  phone: [/\bphone number\b/, /\btelephone\b/],
  country: [/\bcountry.*reside\b/, /\bcountry of residence\b/, /^country$/],
  institution: [/\buniversity.*graduate\b/, /\bhigher institution\b/, /\binstitution.*graduate\b/],
  graduationYear: [/\bwhat year.*graduate\b/, /\bgraduation year\b/],
  cgpa: [/\bcgpa\b/, /\bcumulative grade point average\b/],
  course: [/\bdepartment.*graduate\b/, /\bcourse of study\b/, /\bfield of study\b/],
  bgs: [/\bbest graduating student\b/],
  academicProof: [/\bupload proof.*first class\b/, /\bproof.*bgs status\b/, /\bacademic proof\b/],
  leadership: [/\bleadership roles.*impact\b/, /\bleadership.*positions.*impact\b/],
  declaration: [/\bconfirm.*everything.*correct\b/, /\bdeclaration\b/],
} as const

type CanonicalField = keyof typeof patterns

const canonicalFieldForTitle = (title: string): CanonicalField | null => {
  const normalized = normalizeTitle(title)
  for (const [field, matchers] of Object.entries(patterns) as Array<
    [CanonicalField, readonly RegExp[]]
  >) {
    if (matchers.some((matcher) => matcher.test(normalized))) return field
  }
  return null
}

export function flattenGoogleFormQuestions(form: GoogleFormDefinition) {
  const questions = new Map<string, string>()

  for (const item of form.items ?? []) {
    const title = item.title?.trim() || 'Untitled question'
    const questionId = item.questionItem?.question?.questionId
    if (questionId) questions.set(questionId, title)

    for (const groupQuestion of item.questionGroupItem?.questions ?? []) {
      if (groupQuestion.questionId) questions.set(groupQuestion.questionId, title)
    }
  }

  return questions
}

const textValue = (answer: GoogleQuestionAnswer | undefined) =>
  (answer?.textAnswers?.answers ?? [])
    .map((entry) => entry.value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(' | ')

const normalizedFiles = (answer: GoogleQuestionAnswer | undefined): NormalizedGoogleFile[] =>
  (answer?.fileUploadAnswers?.answers ?? [])
    .filter(
      (entry): entry is Required<GoogleFileUploadAnswer> =>
        Boolean(entry.fileId?.trim() && entry.fileName?.trim() && entry.mimeType?.trim()),
    )
    .map((entry) => ({
      fileId: entry.fileId.trim(),
      fileName: entry.fileName.trim(),
      mimeType: entry.mimeType.trim().toLowerCase(),
    }))

const nullable = (value: string | undefined | null) => value?.trim() || null
const parseGraduationYear = (value: string | null) => {
  const match = value?.match(/\b(19|20|21)\d{2}\b/)
  if (!match) return null
  const year = Number.parseInt(match[0], 10)
  return Number.isInteger(year) ? year : null
}

const confirmsTruth = (value: string | null) =>
  /^(yes|i confirm|confirmed|true)\b/i.test(value?.trim() ?? '')
const confirmsBgs = (value: string | null) => /^(yes|true|confirmed)\b/i.test(value?.trim() ?? '')

export function normalizeGoogleFormResponse({
  form,
  response,
}: {
  form: GoogleFormDefinition
  response: GoogleFormResponse
}): NormalizedGoogleFormResponse {
  const sourceRecordId = response.responseId?.trim()
  if (!sourceRecordId) throw new Error('Google Form responseId is required')

  const questionTitles = flattenGoogleFormQuestions(form)
  const canonicalAnswers = new Map<CanonicalField, GoogleQuestionAnswer>()
  const rawAnswers: Record<string, unknown> = {}

  for (const [questionId, answer] of Object.entries(response.answers ?? {})) {
    const title = questionTitles.get(questionId) ?? `Question ${questionId}`
    const field = canonicalFieldForTitle(title)
    if (field && !canonicalAnswers.has(field)) canonicalAnswers.set(field, answer)

    rawAnswers[title] = {
      text: textValue(answer) || null,
      files: normalizedFiles(answer),
      questionId,
    }
  }

  const fullName = textValue(canonicalAnswers.get('fullName')).trim()
  if (!fullName) throw new Error('Google Form response is missing the applicant full name')

  const collectedEmail = nullable(response.respondentEmail)
  const submittedEmail = nullable(textValue(canonicalAnswers.get('email')))
  const primaryEmail = collectedEmail ?? submittedEmail
  const secondaryEmail =
    collectedEmail && submittedEmail && collectedEmail.toLowerCase() !== submittedEmail.toLowerCase()
      ? submittedEmail
      : null

  const proofFiles = normalizedFiles(canonicalAnswers.get('academicProof'))
  const academicPdfFiles = proofFiles.filter((file) => file.mimeType === 'application/pdf')
  const unsupportedAcademicFiles = proofFiles.filter((file) => file.mimeType !== 'application/pdf')
  const bgsClaimed = confirmsBgs(nullable(textValue(canonicalAnswers.get('bgs'))))

  return {
    application: {
      sourceRecordId,
      sourceSubmittedAt: response.lastSubmittedTime ?? response.createTime ?? null,
      fullName,
      primaryEmail,
      secondaryEmail,
      phone: nullable(textValue(canonicalAnswers.get('phone'))),
      country: nullable(textValue(canonicalAnswers.get('country'))),
      institution: nullable(textValue(canonicalAnswers.get('institution'))),
      graduationYear: parseGraduationYear(
        nullable(textValue(canonicalAnswers.get('graduationYear'))),
      ),
      claimedCgpa: nullable(textValue(canonicalAnswers.get('cgpa'))),
      course: nullable(textValue(canonicalAnswers.get('course'))),
      claimedAcademicStatus: bgsClaimed
        ? 'Best Graduating Student and First Class/equivalent claimed'
        : 'First Class/equivalent claimed',
      leadershipNarrative: nullable(textValue(canonicalAnswers.get('leadership'))),
      declarationConfirmed: confirmsTruth(
        nullable(textValue(canonicalAnswers.get('declaration'))),
      ),
      rawData: {
        formId: form.formId ?? null,
        formTitle: form.info?.title ?? null,
        formRevisionId: form.revisionId ?? null,
        respondentEmail: collectedEmail,
        bgsClaimed,
        unsupportedAcademicFiles,
        answers: rawAnswers,
      },
    },
    academicPdfFiles,
    unsupportedAcademicFiles,
  }
}

const googleAccessToken = () =>
  getGoogleServiceAccountAccessToken({
    scopes: [
      GOOGLE_FORMS_BODY_SCOPE,
      GOOGLE_FORMS_RESPONSES_SCOPE,
      GOOGLE_DRIVE_SCOPE,
      GOOGLE_SHEETS_SCOPE,
    ],
    subject: process.env.GOOGLE_SELECTION_IMPERSONATED_USER?.trim() || undefined,
  })

const googleJson = async <T>(url: string): Promise<T> => {
  const accessToken = await googleAccessToken()
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  })
  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: { message?: string } })
    | null

  if (!response.ok || !payload) {
    throw new Error(payload?.error?.message || `Google Forms request failed with HTTP ${response.status}`)
  }
  return payload
}

export async function fetchGoogleFormDefinition(formId: string) {
  return googleJson<GoogleFormDefinition>(
    `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`,
  )
}

export async function listGoogleFormResponses({
  formId,
  pageToken,
  pageSize = 100,
}: {
  formId: string
  pageToken?: string | null
  pageSize?: number
}) {
  const params = new URLSearchParams({
    pageSize: String(Math.min(100, Math.max(1, Math.floor(pageSize)))),
  })
  if (pageToken) params.set('pageToken', pageToken)

  return googleJson<{
    responses?: GoogleFormResponse[]
    nextPageToken?: string
  }>(
    `https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses?${params.toString()}`,
  )
}

export async function getGoogleDriveFileMetadata(fileId: string) {
  return googleJson<{
    id: string
    name?: string
    mimeType?: string
    size?: string
    modifiedTime?: string
    md5Checksum?: string
  }>(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime,md5Checksum&supportsAllDrives=true`,
  )
}

export async function downloadGoogleDriveFile(fileId: string) {
  const accessToken = await googleAccessToken()
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(120_000),
    },
  )

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null
    throw new Error(payload?.error?.message || `Google Drive download failed with HTTP ${response.status}`)
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    mimeType: response.headers.get('content-type')?.split(';')[0]?.trim() || 'application/octet-stream',
  }
}
