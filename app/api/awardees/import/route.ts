import { NextRequest, NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/api/require-admin'
import { z } from 'zod'

const awardeeSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal('')),
  personal_email: z.string().email().optional().or(z.literal('')),
  country: z.string().optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  category: z.string().optional(),
  bio: z.string().optional(),
  organization: z.string().optional(),
  role: z.string().optional(),
  linkedin: z.string().optional(),
  twitter: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().optional(),
  photo_url: z.string().optional(),
  slug: z.string().optional(),
})

type AwardeeInput = z.infer<typeof awardeeSchema>

function normalizeHeader(header: unknown): string {
  return String(header ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeader(key)] = typeof value === 'string' ? value.trim() : value
  }
  return normalized
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseRows(rows: Record<string, unknown>[]): AwardeeInput[] {
  return rows
    .map(normalizeRow)
    .map((raw) => {
      const candidate = {
        full_name: raw.full_name ?? raw.name ?? raw.fullname,
        email: raw.email,
        personal_email: raw.personal_email,
        country: raw.country,
        year: raw.year,
        category: raw.category,
        bio: raw.bio,
        organization: raw.organization,
        role: raw.role,
        linkedin: raw.linkedin,
        twitter: raw.twitter,
        instagram: raw.instagram,
        website: raw.website,
        photo_url: raw.photo_url ?? raw.photo ?? raw.image_url,
        slug: raw.slug,
      }

      const parsed = awardeeSchema.safeParse(candidate)
      if (!parsed.success) return null

      return {
        ...parsed.data,
        slug: parsed.data.slug || toSlug(parsed.data.full_name),
      }
    })
    .filter((row): row is AwardeeInput => Boolean(row))
}

function getRowsFromWorkbook(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) return []
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: '',
  })
}

async function resolveFallbackExcelBuffer(): Promise<Buffer> {
  const response = await fetch(new URL('../../../../public/awardees.xlsx', import.meta.url))
  if (!response.ok) throw new Error('No import file was supplied')
  return Buffer.from(await response.arrayBuffer())
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  try {
    let buffer: Buffer | null = null
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      if (Array.isArray(body?.rows)) {
        const rows = body.rows as Record<string, unknown>[]
        const payload = parseRows(rows)
        if (!payload.length) {
          throw new Error('Import payload appears to be empty')
        }

        const supabase = createAdminClient()
        const { data, error } = await supabase
          .from('awardees')
          .upsert(payload, { onConflict: 'slug' })
          .select()

        if (error) throw error
        return NextResponse.json({ success: true, imported: data?.length ?? payload.length })
      }
    }

    if (contentType.includes('text/csv')) {
      const csv = await request.text()
      const rows = parse(csv, { columns: true, skip_empty_lines: true }) as Record<string, unknown>[]
      const payload = parseRows(rows)
      if (!payload.length) throw new Error('CSV appears to be empty')

      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('awardees')
        .upsert(payload, { onConflict: 'slug' })
        .select()
      if (error) throw error
      return NextResponse.json({ success: true, imported: data?.length ?? payload.length })
    }

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file')
      if (file instanceof File) {
        if (!/\.(xlsx|xls)$/i.test(file.name)) {
          throw new Error('Please upload a valid Excel file (.xlsx or .xls)')
        }
        buffer = Buffer.from(await file.arrayBuffer())
      } else if (file) {
        throw new Error('Invalid file upload payload')
      }
    }

    if (!buffer) {
      buffer = await resolveFallbackExcelBuffer()
    }

    const rows = getRowsFromWorkbook(buffer)
    const payload = parseRows(rows)

    if (!payload.length) {
      throw new Error('Excel sheet appears to be empty')
    }

    // Process in chunks to handle large imports
    const chunkSize = 100
    const supabase = createAdminClient()
    let imported = 0

    for (let index = 0; index < payload.length; index += chunkSize) {
      const chunk = payload.slice(index, index + chunkSize)
      const { data, error } = await supabase
        .from('awardees')
        .upsert(chunk, { onConflict: 'slug' })
        .select('id')

      if (error) throw error
      imported += data?.length ?? chunk.length
    }

    return NextResponse.json({ success: true, imported })
  } catch (error) {
    console.error('[awardee import] failed', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not import awardees.' },
      { status: 400 },
    )
  }
}
