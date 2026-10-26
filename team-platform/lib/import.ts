import { isValidEmail, normalizePhone } from '@/lib/phone'

export const AWARDEE_FIELDS = [
  'public_awardee_id',
  'external_key',
  'name',
  'email',
  'phone',
  'country',
  'state',
  'city',
  'address',
] as const

export type AwardeeField = (typeof AWARDEE_FIELDS)[number]
export type Mapping = Record<AwardeeField, string | null>
export type RawRow = Record<string, string>

const ALIASES: Record<AwardeeField, string[]> = {
  public_awardee_id: ['public awardee id', 'top100 awardee id', 'awardee uuid', 'awardee record uuid'],
  external_key: ['externalid', 'external key', 'awardeeid', 'awardee id', 'id', 'source id', 'record id'],
  name: ['name', 'full name', 'awardee name', 'fullname', 'winner name', 'recipient'],
  email: ['email', 'email address', 'e mail', 'mail'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'telephone', 'tel', 'whatsapp', 'whatsapp number'],
  country: ['country', 'nation'],
  state: ['state', 'state province', 'region', 'province'],
  city: ['city', 'town', 'city town'],
  address: ['address', 'full address', 'postal address', 'delivery address'],
}

export function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

export function suggestMapping(headers: string[]): Mapping {
  const normalized = headers.map((header) => ({ original: header, key: normalizeHeader(header) }))
  const mapping = {} as Mapping
  for (const field of AWARDEE_FIELDS) {
    const direct = normalized.find((header) => header.key === normalizeHeader(field))
    const alias = normalized.find((header) =>
      ALIASES[field].includes(header.key.replace(/\s+/g, ' ')),
    )
    mapping[field] = (direct ?? alias)?.original ?? null
  }
  return mapping
}

export type ExistingAwardee = {
  id: string
  public_awardee_id?: string | null
  external_key: string | null
  email: string | null
  phone: string | null
}

export type ExistingLookup = {
  byPublicAwardeeId: Map<string, ExistingAwardee>
  byExternalKey: Map<string, ExistingAwardee>
  byEmail: Map<string, ExistingAwardee>
  byPhone: Map<string, ExistingAwardee>
}

export function buildExistingLookup(rows: ExistingAwardee[]): ExistingLookup {
  const byPublicAwardeeId = new Map<string, ExistingAwardee>()
  const byExternalKey = new Map<string, ExistingAwardee>()
  const byEmail = new Map<string, ExistingAwardee>()
  const phoneCounts = new Map<string, number>()
  for (const row of rows) {
    if (row.public_awardee_id) byPublicAwardeeId.set(row.public_awardee_id.toLowerCase(), row)
    if (row.external_key?.trim()) byExternalKey.set(row.external_key.trim().toLowerCase(), row)
    if (row.email?.trim()) byEmail.set(row.email.trim().toLowerCase(), row)
    if (row.phone?.trim()) phoneCounts.set(row.phone.trim(), (phoneCounts.get(row.phone.trim()) ?? 0) + 1)
  }
  const byPhone = new Map<string, ExistingAwardee>()
  for (const row of rows) {
    if (row.phone?.trim() && phoneCounts.get(row.phone.trim()) === 1) {
      byPhone.set(row.phone.trim(), row)
    }
  }
  return { byPublicAwardeeId, byExternalKey, byEmail, byPhone }
}

export type ImportPreviewRow = {
  row_number: number
  action: 'insert' | 'update'
  id?: string
  matched_by?: 'public_awardee_id' | 'external_key' | 'email' | 'phone'
  data: {
    public_awardee_id: string | null
    external_key: string | null
    name: string
    email: string | null
    phone: string | null
    country: string | null
    state: string | null
    city: string | null
    address: string | null
  }
  warnings: string[]
}

export type ImportIssue = {
  row_number: number
  field: string
  message: string
  value: string
}

export type ImportPreview = {
  rows: ImportPreviewRow[]
  errors: ImportIssue[]
  summary: {
    total_rows: number
    valid_rows: number
    error_rows: number
    inserts: number
    updates: number
  }
}

function valueFor(row: RawRow, mapping: Mapping, field: AwardeeField): string {
  const header = mapping[field]
  if (!header) return ''
  return String(row[header] ?? '').trim()
}

function cleanCountry(value: string): string | null {
  if (!value) return null
  const normalized = value.trim()
  if (/^(ng|nigeria)$/i.test(normalized)) return 'Nigeria'
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase())
}

/**
 * Pure validation + duplicate resolution. The database is still the final
 * authority: commit re-checks unique indexes inside a transaction.
 */
export function buildImportPreview(
  rawRows: RawRow[],
  mapping: Mapping,
  existing: ExistingLookup,
): ImportPreview {
  const rows: ImportPreviewRow[] = []
  const errors: ImportIssue[] = []
  const seenExternal = new Map<string, number>()
  const seenEmail = new Map<string, number>()
  const seenPhone = new Map<string, number>()

  if (!mapping.name) {
    errors.push({ row_number: 0, field: 'name', message: 'Map a name column before importing.', value: '' })
  }

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2
    const name = valueFor(raw, mapping, 'name')
    const rawEmail = valueFor(raw, mapping, 'email').toLowerCase()
    const rawPhone = valueFor(raw, mapping, 'phone')
    const externalKey = valueFor(raw, mapping, 'external_key')
    const publicAwardeeIdValue = valueFor(raw, mapping, 'public_awardee_id')
    const publicAwardeeId = publicAwardeeIdValue || null
    const country = cleanCountry(valueFor(raw, mapping, 'country')) ?? 'Nigeria'
    const state = valueFor(raw, mapping, 'state') || null
    const city = valueFor(raw, mapping, 'city') || null
    const address = valueFor(raw, mapping, 'address') || null
    const warnings: string[] = []
    const rowErrors: ImportIssue[] = []

    if (!name) {
      rowErrors.push({ row_number: rowNumber, field: 'name', message: 'Name is required.', value: '' })
    }
    if (publicAwardeeId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(publicAwardeeId)) {
      rowErrors.push({ row_number: rowNumber, field: 'public_awardee_id', message: 'Public awardee ID must be a UUID.', value: publicAwardeeId })
    }

    let email: string | null = rawEmail || null
    if (email && !isValidEmail(email)) {
      rowErrors.push({ row_number: rowNumber, field: 'email', message: 'Email address is not valid.', value: email })
      email = null
    }

    let phone: string | null = null
    if (rawPhone) {
      const normalized = normalizePhone(rawPhone, country)
      if (normalized.ok) phone = normalized.e164
      else rowErrors.push({ row_number: rowNumber, field: 'phone', message: normalized.reason, value: rawPhone })
    }
    if (!phone && !email && !rowErrors.some((error) => error.field === 'email')) {
      rowErrors.push({
        row_number: rowNumber,
        field: 'phone',
        message: 'A phone number or email address is required.',
        value: '',
      })
    }
    if (!phone && email) warnings.push('No valid phone number — calling and WhatsApp will be unavailable.')

    if (externalKey) {
      const seenAt = seenExternal.get(externalKey.toLowerCase())
      if (seenAt) rowErrors.push({ row_number: rowNumber, field: 'external_key', message: `Duplicate source ID in this file (row ${seenAt}).`, value: externalKey })
      else seenExternal.set(externalKey.toLowerCase(), rowNumber)
    }
    if (email) {
      const seenAt = seenEmail.get(email)
      if (seenAt) rowErrors.push({ row_number: rowNumber, field: 'email', message: `Duplicate email in this file (row ${seenAt}).`, value: email })
      else seenEmail.set(email, rowNumber)
    }
    if (phone) {
      const seenAt = seenPhone.get(phone)
      if (seenAt) rowErrors.push({ row_number: rowNumber, field: 'phone', message: `Duplicate phone in this file (row ${seenAt}).`, value: phone })
      else seenPhone.set(phone, rowNumber)
    }

    const publicIdMatch = publicAwardeeId ? existing.byPublicAwardeeId.get(publicAwardeeId.toLowerCase()) : undefined
    const externalMatch = externalKey ? existing.byExternalKey.get(externalKey.toLowerCase()) : undefined
    const emailMatch = email ? existing.byEmail.get(email) : undefined
    const phoneMatch = phone ? existing.byPhone.get(phone) : undefined
    const matches = [publicIdMatch, externalMatch, emailMatch, phoneMatch].filter(Boolean) as ExistingAwardee[]
    const matchedIds = new Set(matches.map((match) => match.id))

    if (matchedIds.size > 1) {
      rowErrors.push({
        row_number: rowNumber,
        field: 'identity',
        message: 'Source ID, email and phone point to different existing awardees. Resolve before importing.',
        value: '',
      })
    }

    const existingRow = matches[0]
    if (existingRow && emailMatch && emailMatch.id !== existingRow.id) {
      rowErrors.push({ row_number: rowNumber, field: 'email', message: 'Email belongs to another existing awardee.', value: email ?? '' })
    }
    if (existingRow && phoneMatch && phoneMatch.id !== existingRow.id) {
      rowErrors.push({ row_number: rowNumber, field: 'phone', message: 'Phone belongs to another existing awardee.', value: phone ?? '' })
    }

    if (rowErrors.length) {
      errors.push(...rowErrors)
      return
    }

    rows.push({
      row_number: rowNumber,
      action: existingRow ? 'update' : 'insert',
      id: existingRow?.id,
      matched_by: publicIdMatch ? 'public_awardee_id' : externalMatch ? 'external_key' : emailMatch ? 'email' : phoneMatch ? 'phone' : undefined,
      data: { public_awardee_id: publicAwardeeId, external_key: externalKey || null, name, email, phone, country, state, city, address },
      warnings,
    })
  })

  return {
    rows,
    errors,
    summary: {
      total_rows: rawRows.length,
      valid_rows: rows.length,
      error_rows: new Set(errors.map((error) => error.row_number)).size,
      inserts: rows.filter((row) => row.action === 'insert').length,
      updates: rows.filter((row) => row.action === 'update').length,
    },
  }
}

/**
 * Rows sent to team_commit_import. Blank optional values are omitted on
 * update so a spreadsheet with an empty cell cannot wipe existing data.
 */
export function toCommitRows(rows: ImportPreviewRow[], action: 'insert' | 'update') {
  return rows
    .filter((row) => row.action === action)
    .map((row) => {
      const data: Record<string, unknown> = {
        action,
        public_awardee_id: row.data.public_awardee_id,
        name: row.data.name,
        external_key: row.data.external_key,
        country: row.data.country,
        state: row.data.state,
        city: row.data.city,
        address: row.data.address,
      }
      if (row.id) data.id = row.id
      if (row.data.email) data.email = row.data.email
      if (row.data.phone) data.phone = row.data.phone
      return data
    })
}

export const SAMPLE_CSV = [
  'Public Awardee ID,Source ID,Full Name,Email Address,Phone Number,Country,State,City,Address',
  ',AFL-0001,Adaeze Okafor,adaeze@example.com,08031234567,Nigeria,Lagos,Ikeja,12 Example Street',
  ',AFL-0002,Chinedu Musa,chinedu@example.com,+2348039876543,Nigeria,Abuja,Gwarinpa,',
].join('\n')

export const IMPORT_TEMPLATE_HEADERS = SAMPLE_CSV.split('\n')[0].split(',')
