import * as XLSX from 'xlsx'
import { IMPORT_FIELDS, type ImportField } from './awardee-import-fields'
export type SheetMapping = {
  sheet: string
  headerRow: number
  fields: Partial<Record<ImportField, string>>
  defaults?: Partial<Record<ImportField, string>>
}
export type WorkbookMapping = {
  primarySheet: string
  sheets: SheetMapping[]
}
export type SheetInfo = {
  name: string
  rowCount: number
  headerRow: number
  headers: string[]
  headerOptions: { row: number; headers: string[] }[]
  sample: Record<string, string>[]
}
export type ImportRecord = {
  externalId: string | null
  name: string
  email: string
  country?: string
  course?: string
  bio?: string
  year?: number
  image_url?: string
  tagline?: string
  headline?: string
  cgpa?: string
  profile_import?: Record<string, string>
  social_links?: Record<string, string>
  sources: string[]
}
export type ImportIssue = { source: string; message: string }

const aliases: Record<ImportField, string[]> = {
  externalId: ['winner id', 'awardee id', 'application id', 'external id', 'reference id'],
  name: ['full name', 'name', 'awardee name', 'winner name', 'what is your full name'],
  email: ['email address', 'email', 'e-mail', 'mail'],
  country: ['country', 'nationality', 'what country do you reside in'],
  course: ['field of study', 'department', 'course', 'programme', 'program', 'what department did you graduate from'],
  bio: ['about', 'biography', 'bio', 'description'],
  year: ['award year', 'cohort year', 'year', 'batch'],
  imageUrl: ['image url', 'photo url', 'avatar url', 'portrait', 'photo', 'image', 'upload a clear professional photo of yourself preferably a studio or high quality portrait'],
  tagline: ['tagline', 'position', 'title', 'what university higher institution did you attend'],
  headline: ['headline', 'summary', 'intro'],
  linkedin: ['linkedin url', 'linkedin', 'linked in'],
  twitter: ['twitter url', 'twitter', 'x profile'],
  instagram: ['instagram url', 'instagram'],
  facebook: ['facebook url', 'facebook'],
  website: ['website url', 'website', 'portfolio'],
  cgpa: ['cgpa', 'gpa', 'what was your cgpa or academic achievement'],
  educationLevel: ['education level', 'level of education', 'what level of education have you completed'],
  graduationYear: ['graduation year', 'year graduated', 'what year did you graduate'],
  firstClass: ['first class', 'bgs', 'first class graduate or best graduating student', 'are you a first class graduate or best graduating student'],
  proofUrl: ['first class proof', 'proof upload', 'proof of first class degree or bgs', 'kindly upload proof of your first class degree or bgs status'],
  leadershipJourney: ['leadership journey', 'leadership story', 'tell us about your leadership journey as a potential africa future leader'],
  notableImpact: ['notable impact', 'what notable impact have you created share the problem you solved people reached or change created'],
  impactArea: ['impact area', 'area of impact', 'what area best describes your impact'],
  peopleBenefited: ['people benefited', 'beneficiaries', 'how many people have benefited from your work'],
}

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function cell(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim()
}

function rows(book: XLSX.WorkBook, sheet: string): unknown[][] {
  const worksheet = book.Sheets[sheet]
  if (!worksheet) throw new Error(`Worksheet ${sheet} was not found.`)
  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, raw: false, defval: null })
}

export function readAwardeeWorkbook(bytes: Uint8Array, filename: string): XLSX.WorkBook {
  if (!/\.(xlsx|xls|csv)$/i.test(filename)) throw new Error('Upload an .xlsx, .xls, or .csv file.')
  const book = XLSX.read(bytes, { type: 'array', dense: true, sheetRows: 10021 })
  if (!book.SheetNames.length) throw new Error('The spreadsheet has no worksheets.')
  return book
}

export function inspectAwardeeWorkbook(book: XLSX.WorkBook): SheetInfo[] {
  return book.SheetNames.map((name) => {
    const data = rows(book, name)
    const first = data.findIndex((row) => row.some((value) => cell(value)))
    const headers = first < 0 ? [] : data[first].map(cell)
    return {
      name,
      rowCount: Math.max(0, data.length - first - 1),
      headerRow: first + 1,
      headers,
      headerOptions: data.slice(0, 20).map((row, index) => ({ row: index + 1, headers: row.map(cell) })),
      sample: data.slice(first + 1, first + 4).map((row) =>
        Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, cell(row[index]).slice(0, 120)])),
      ),
    }
  })
}

export function suggestWorkbookMapping(sheets: SheetInfo[]): WorkbookMapping {
  const mappings: SheetMapping[] = sheets.map((sheet) => {
    const fields: Partial<Record<ImportField, string>> = {}
    const used = new Set<string>()
    for (const field of IMPORT_FIELDS) {
      const header = sheet.headers.find((candidate) =>
        !used.has(candidate) && aliases[field].some((alias) => normalized(candidate) === normalized(alias)),
      )
      if (header) {
        fields[field] = header
        used.add(header)
      }
    }
    return { sheet: sheet.name, headerRow: sheet.headerRow, fields }
  })
  const primary = mappings.find((sheet) => sheet.fields.name && sheet.fields.email)
    ?? mappings.find((sheet) => sheet.fields.name)
    ?? mappings[0]
  if (primary && !primary.fields.year) primary.defaults = { ...primary.defaults, year: '2026' }
  return { primarySheet: primary.sheet, sheets: mappings }
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function valuesForRow(row: unknown[], headers: string[], mapping: SheetMapping): Partial<Record<ImportField, string>> {
  const result: Partial<Record<ImportField, string>> = {}
  for (const field of IMPORT_FIELDS) {
    const header = mapping.fields[field]
    if (!header) continue
    const index = headers.indexOf(header)
    if (index >= 0) result[field] = cell(row[index])
  }
  return result
}

export function extractAwardeeRecords(book: XLSX.WorkBook, mapping: WorkbookMapping): {
  records: ImportRecord[]
  issues: ImportIssue[]
} {
  const issues: ImportIssue[] = []
  const primaryMapping = mapping.sheets.find((entry) => entry.sheet === mapping.primarySheet)
  if (!primaryMapping?.fields.name || !primaryMapping.fields.email) {
    throw new Error('The winners tab must map both Name and Email.')
  }
  const sheetNames = new Set(book.SheetNames)
  const uniqueSheets = new Set<string>()
  for (const entry of mapping.sheets) {
    if (!sheetNames.has(entry.sheet) || uniqueSheets.has(entry.sheet)) throw new Error('The sheet mapping is invalid.')
    uniqueSheets.add(entry.sheet)
    if (!Number.isInteger(entry.headerRow) || entry.headerRow < 1 || entry.headerRow > 20) {
      throw new Error('Header row must be between 1 and 20.')
    }
  }

  const records: ImportRecord[] = []
  const byEmail = new Map<string, ImportRecord>()
  const byExternalId = new Map<string, ImportRecord>()
  const readMapped = (entry: SheetMapping) => {
    const data = rows(book, entry.sheet)
    const headers = (data[entry.headerRow - 1] ?? []).map(cell)
    for (const header of Object.values(entry.fields)) {
      if (header && !headers.includes(header)) throw new Error(`Column ${header} was not found in ${entry.sheet}.`)
    }
    return data.slice(entry.headerRow).map((row, index) => {
      const fields = valuesForRow(row, headers, entry)
      for (const [field, value] of Object.entries(entry.defaults ?? {}) as [ImportField, string][]) {
        if (!fields[field] && value) fields[field] = value
      }
      return { source: `${entry.sheet}, row ${entry.headerRow + index + 1}`, fields }
    }).filter(({ fields }) => Object.values(fields).some(Boolean))
  }

  for (const { source, fields } of readMapped(primaryMapping)) {
    const name = cell(fields.name)
    const email = cell(fields.email).toLowerCase()
    const externalId = cell(fields.externalId) || null
    if (!name || !validEmail(email)) {
      issues.push({ source, message: 'A winner needs a name and a valid email.' })
      continue
    }
    if (byEmail.has(email) || (externalId && byExternalId.has(externalId))) {
      issues.push({ source, message: 'Duplicate winner email or winner ID.' })
      continue
    }
    const record: ImportRecord = { externalId, name, email, sources: [source] }
    applyFields(record, fields, issues, source)
    records.push(record)
    byEmail.set(email, record)
    if (externalId) byExternalId.set(externalId, record)
  }

  for (const entry of mapping.sheets) {
    if (entry.sheet === mapping.primarySheet) continue
    if (!entry.fields.email && !entry.fields.externalId) {
      issues.push({ source: entry.sheet, message: 'Map Email or Winner ID to join this tab.' })
      continue
    }
    for (const { source, fields } of readMapped(entry)) {
      const email = cell(fields.email).toLowerCase()
      const externalId = cell(fields.externalId)
      const emailMatch = email ? byEmail.get(email) : undefined
      const idMatch = externalId ? byExternalId.get(externalId) : undefined
      if (emailMatch && idMatch && emailMatch !== idMatch) {
        issues.push({ source, message: 'Email and winner ID point to different people.' })
        continue
      }
      const record = emailMatch ?? idMatch
      if (!record) {
        issues.push({ source, message: 'No winner in the primary tab matches this row.' })
        continue
      }
      if (email && email !== record.email) {
        issues.push({ source, message: 'Email conflicts with the primary winner record.' })
        continue
      }
      if (externalId && record.externalId && externalId !== record.externalId) {
        issues.push({ source, message: 'Winner ID conflicts with the primary winner record.' })
        continue
      }
      if (externalId && !record.externalId) {
        record.externalId = externalId
        byExternalId.set(externalId, record)
      }
      applyFields(record, fields, issues, source)
      record.sources.push(source)
    }
  }
  return { records, issues }
}

function applyFields(record: ImportRecord, fields: Partial<Record<ImportField, string>>, issues: ImportIssue[], source: string) {
  const direct: Array<[ImportField, keyof ImportRecord]> = [
    ['country', 'country'], ['course', 'course'], ['tagline', 'tagline'],
    ['headline', 'headline'], ['cgpa', 'cgpa'], ['imageUrl', 'image_url'],
  ]
  for (const [from, to] of direct) {
    const value = cell(fields[from])
    if (!value) continue
    const previous = record[to]
    if (previous && previous !== value) {
      issues.push({ source, message: `Conflicting ${from}; kept the first value.` })
      continue
    }
    ;(record as unknown as Record<string, unknown>)[to] = value
  }
  const profileImport: Record<string, string> = {}
  for (const field of ['educationLevel', 'graduationYear', 'firstClass', 'proofUrl'] as const) {
    const value = cell(fields[field])
    if (value) profileImport[field] = value
  }
  if (Object.keys(profileImport).length) {
    record.profile_import = { ...(record.profile_import ?? {}), ...profileImport }
  }

  const bioParts = [
    ['', fields.bio],
    ['Education level', fields.educationLevel],
    ['Graduation year', fields.graduationYear],
    ['CGPA / academic achievement', fields.cgpa],
    ['First-Class / BGS status', fields.firstClass],
    ['Leadership journey', fields.leadershipJourney],
    ['Notable impact', fields.notableImpact],
    ['Area of impact', fields.impactArea],
    ['People benefited', fields.peopleBenefited],
  ].flatMap(([label, rawValue]) => {
    const value = cell(rawValue)
    return value ? [label ? `${label}: ${value}` : value] : []
  })
  if (bioParts.length) {
    const additions = bioParts.filter((part) => !record.bio?.includes(part))
    record.bio = [record.bio, ...additions].filter(Boolean).join('\n\n')
  }
  const year = Number(fields.year)
  if (fields.year && (!Number.isInteger(year) || year < 2000 || year > 2100)) {
    issues.push({ source, message: 'Invalid award year.' })
  } else if (fields.year) {
    record.year = year
  }
  for (const social of ['linkedin', 'twitter', 'instagram', 'facebook', 'website'] as const) {
    const value = cell(fields[social])
    if (!value) continue
    try {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid protocol')
      record.social_links = { ...record.social_links, [social]: url.toString() }
    } catch {
      issues.push({ source, message: `Invalid ${social} URL.` })
    }
  }
}
