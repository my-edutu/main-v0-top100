import { SELECTION_PDF_MAX_BYTES } from './contracts'

type UploadDescriptor = {
  name: string
  type: string
  size: number
}

const parseUrl = (value: string, label: string) => {
  const trimmed = value.trim()
  if (!trimmed) throw new Error(`${label} URL is required`)

  try {
    return new URL(trimmed)
  } catch {
    throw new Error(`Enter a valid ${label} URL`)
  }
}

export function parseGoogleFormId(value: string) {
  const url = parseUrl(value, 'Google Form')
  if (url.hostname !== 'docs.google.com') {
    throw new Error('Enter a valid Google Form URL')
  }

  const match = url.pathname.match(/^\/forms\/d\/(?:e\/)?([^/]+)/)
  if (!match?.[1]) {
    throw new Error('Enter a valid Google Form URL')
  }

  return match[1]
}

export function parseGoogleSpreadsheetId(value: string) {
  const url = parseUrl(value, 'Google Sheet')
  if (url.hostname !== 'docs.google.com') {
    throw new Error('Enter a valid Google Sheet URL')
  }

  const match = url.pathname.match(/^\/spreadsheets\/d\/([^/]+)/)
  if (!match?.[1]) {
    throw new Error('Enter a valid Google Sheet URL')
  }

  return match[1]
}

export function validateSelectionPdfUpload(file: UploadDescriptor) {
  const normalizedName = file.name.trim().toLowerCase()
  const normalizedType = file.type.trim().toLowerCase()

  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('The uploaded PDF is empty')
  }

  if (file.size > SELECTION_PDF_MAX_BYTES) {
    throw new Error('PDF evidence must not exceed 25MB')
  }

  if (normalizedType !== 'application/pdf' || !normalizedName.endsWith('.pdf')) {
    throw new Error('Only PDF evidence files are accepted')
  }

  return {
    extension: 'pdf' as const,
    normalizedMimeType: 'application/pdf' as const,
  }
}
