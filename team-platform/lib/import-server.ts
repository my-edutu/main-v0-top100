import 'server-only'
import { createHash } from 'node:crypto'
import * as XLSX from 'xlsx'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildExistingLookup,
  buildImportPreview,
  suggestMapping,
  toCommitRows,
  AWARDEE_FIELDS,
  type AwardeeField,
  type ExistingAwardee,
  type ExistingLookup,
  type Mapping,
  type RawRow,
} from '@/lib/import'

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024
export const MAX_IMPORT_ROWS = 5000

export type ParsedSpreadsheet = {
  filename: string
  sha256: string
  headers: string[]
  rows: RawRow[]
}

function uniqueHeaders(values: unknown[]): string[] {
  const seen = new Map<string, number>()
  return values.map((value, index) => {
    const base = String(value ?? '').trim() || `Column ${index + 1}`
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base} (${count + 1})`
  })
}

export function parseSpreadsheet(buffer: Buffer, filename: string): ParsedSpreadsheet {
  if (buffer.byteLength === 0) throw new Error('The uploaded file is empty.')
  if (buffer.byteLength > MAX_IMPORT_BYTES) throw new Error('The file is larger than 10 MB.')

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('The workbook has no sheets.')
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    blankrows: false,
    raw: false,
  })
  if (!matrix.length) throw new Error('The sheet has no rows.')

  const headers = uniqueHeaders(matrix[0])
  const body = matrix.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''))
  if (!body.length) throw new Error('The sheet has a header row but no awardee rows.')
  if (body.length > MAX_IMPORT_ROWS) {
    throw new Error(`The file has ${body.length.toLocaleString()} rows. The limit is 5,000 per import.`)
  }

  const rows: RawRow[] = body.map((row) => {
    const record: RawRow = {}
    headers.forEach((header, index) => {
      record[header] = String(row[index] ?? '').trim()
    })
    return record
  })

  return {
    filename,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    headers,
    rows,
  }
}

export async function loadExistingLookup(teamId: string): Promise<ExistingLookup> {
  const admin = createAdminClient()
  const all: ExistingAwardee[] = []
  const pageSize = 1000
  for (let from = 0; from < 50_000; from += pageSize) {
    const { data, error } = await admin
      .from('team_awardees')
      .select('id, public_awardee_id, external_key, email, phone')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw new Error(`Could not load existing awardees: ${error.message}`)
    all.push(...((data ?? []) as ExistingAwardee[]))
    if (!data || data.length < pageSize) break
  }
  return buildExistingLookup(all)
}

export function normalizeMapping(
  input: Record<string, unknown>,
  headers: string[],
): Mapping {
  const mapping = {} as Mapping
  for (const field of AWARDEE_FIELDS) {
    const value = input[field]
    mapping[field as AwardeeField] =
      typeof value === 'string' && headers.includes(value) ? value : null
  }
  return mapping
}

export function previewRows(rows: RawRow[], mapping: Mapping, existing: ExistingLookup) {
  const preview = buildImportPreview(rows, mapping, existing)
  return {
    preview,
    commitRows: [...toCommitRows(preview.rows, 'insert'), ...toCommitRows(preview.rows, 'update')],
  }
}

export { suggestMapping }
