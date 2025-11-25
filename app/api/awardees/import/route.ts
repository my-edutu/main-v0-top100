import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { read, utils } from 'xlsx'
import { promises as fs } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const FALLBACK_FILENAME = 'top100 Africa future Leaders 2025.xlsx'
const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel'
])

const normalizeKey = (obj: Record<string, any>, keyVariants: string[]): any => {
  const normalize = (value: string | number | null | undefined) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

  for (const variant of keyVariants) {
    const normalizedVariant = normalize(variant)
    const foundKey = Object.keys(obj).find(key =>
      normalize(String(key)).includes(normalizedVariant)
    )
    if (foundKey) {
      const candidate = obj[foundKey]
      if (candidate !== undefined && candidate !== null && candidate !== '') {
        return candidate
      }
    }
  }
  return null
}

const slugify = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

const parseRows = (rows: any[]) => {
  const currentYear = new Date().getFullYear()

  return rows.map((row, index) => {
    let country = normalizeKey(row, ['country', 'nationality']) || ''
    if (country && typeof country === 'string' && country.includes(' ')) {
      const parts = country.split(' ')
      if (parts.length >= 2 && parts[0].length === 2) {
        country = parts.slice(1).join(' ')
      }
    }
    if (typeof country === 'string') {
      country = country.trim()
    } else if (country) {
      country = String(country)
    }

    let year: any = normalizeKey(row, ['year', 'batch'])
    if (typeof year === 'string') {
      const parsed = parseInt(year, 10)
      year = Number.isFinite(parsed) ? parsed : null
    }

    const rawName = normalizeKey(row, ['name', 'fullname', 'awardee'])
    const name = (() => {
      if (typeof rawName === 'string') return rawName.trim()
      if (rawName !== null && rawName !== undefined) return String(rawName)
      return `Awardee ${index + 1}`
    })()
    const slug = slugify(name)
    const rawId = normalizeKey(row, ['id', 'identifier', 'uid'])
    const id = rawId ? rawId.toString().trim() : slug
    const rawEmail = normalizeKey(row, ['email', 'mail', 'e-mail'])

    const rawCgpa = normalizeKey(row, ['cgpa', 'gpa', 'grade'])
    const rawCourse = normalizeKey(row, ['course', 'program', 'department'])
    const rawBio = normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30'])

    // Extract additional fields
    const rawAvatarUrl = normalizeKey(row, ['avatar', 'avatar_url', 'image', 'photo', 'picture'])
    const rawTagline = normalizeKey(row, ['tagline', 'title', 'position'])
    const rawHeadline = normalizeKey(row, ['headline', 'summary', 'intro'])

    // Social links - try to extract from various possible columns
    const rawLinkedIn = normalizeKey(row, ['linkedin', 'linkedin_url', 'linked_in'])
    const rawTwitter = normalizeKey(row, ['twitter', 'twitter_url', 'x'])
    const rawInstagram = normalizeKey(row, ['instagram', 'instagram_url', 'ig'])
    const rawFacebook = normalizeKey(row, ['facebook', 'facebook_url', 'fb'])
    const rawWebsite = normalizeKey(row, ['website', 'website_url', 'portfolio'])

    const socialLinks: Record<string, string> = {}
    if (rawLinkedIn) socialLinks.linkedin = rawLinkedIn.toString().trim()
    if (rawTwitter) socialLinks.twitter = rawTwitter.toString().trim()
    if (rawInstagram) socialLinks.instagram = rawInstagram.toString().trim()
    if (rawFacebook) socialLinks.facebook = rawFacebook.toString().trim()
    if (rawWebsite) socialLinks.website = rawWebsite.toString().trim()

    return {
      id,
      name,
      slug,
      email: rawEmail ? rawEmail.toString().trim() : null,
      country: typeof country === 'string' && country.length > 0 ? country : null,
      cgpa: rawCgpa !== null && rawCgpa !== undefined ? rawCgpa.toString().trim() : null,
      course: rawCourse ? rawCourse.toString().trim() : null,
      bio: rawBio ? rawBio.toString().trim() : null,
      year: typeof year === 'number' && Number.isFinite(year) ? year : currentYear,
      avatar_url: rawAvatarUrl ? rawAvatarUrl.toString().trim() : null,
      tagline: rawTagline ? rawTagline.toString().trim() : null,
      headline: rawHeadline ? rawHeadline.toString().trim() : null,
      social_links: Object.keys(socialLinks).length > 0 ? socialLinks : {},
      achievements: [],
      interests: [],
      is_public: true
    }
  })
}

const getRowsFromWorkbook = (buffer: Buffer) => {
  const workbook = read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    throw new Error('Excel workbook does not contain any sheets')
  }

  const worksheet = workbook.Sheets[sheetName]
  const rows = utils.sheet_to_json(worksheet)
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('Excel sheet appears to be empty')
  }

  return rows
}

const resolveFallbackExcelBuffer = async () => {
  const absolutePath = path.join(process.cwd(), 'public', FALLBACK_FILENAME)
  try {
    return await fs.readFile(absolutePath)
  } catch (error) {
    throw new Error('No file uploaded and fallback Excel file is missing')
  }
}

export async function POST(request: NextRequest) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) {
    return adminCheck.error
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY ?? ''

  if (!supabaseUrl) {
    return NextResponse.json({
      success: false,
      message: 'Awardee import is not configured',
      error: 'NEXT_PUBLIC_SUPABASE_URL is missing.'
    }, { status: 500 })
  }

  if (!supabaseServiceKey) {
    return NextResponse.json({
      success: false,
      message: 'Awardee import is not configured',
      error: 'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY) is required for awardee imports. Add it to your server environment.'
    }, { status: 500 })
  }

  let supabase
  try {
    supabase = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to initialise Supabase client'
    console.error('Supabase client initialisation error:', message)
    return NextResponse.json({
      success: false,
      message: 'Failed to initialise Supabase client',
      error: message
    }, { status: 500 })
  }

  try {
    const formData = await request.formData().catch(() => null)

    let buffer: Buffer | null = null
    if (formData) {
      const file = formData.get('file')
      if (file instanceof File) {
        if (file.size === 0) {
          throw new Error('Uploaded file is empty')
        }
        if (file.type && !EXCEL_MIME_TYPES.has(file.type)) {
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
    let payload = parseRows(rows)

    if (!payload.length) {
      throw new Error('Excel sheet appears to be empty')
    }

    // Process in chunks to handle large imports
    const chunkSize = 100
    let imported = 0
    let updated = 0

    for (let i = 0; i < payload.length; i += chunkSize) {
      const chunk = payload.slice(i, i + chunkSize)

      // Check which awardees already exist based on slug
      const { data: existingAwardees, error: lookupError } = await supabase
        .from('awardees')
        .select('id, slug')
        .in('slug', chunk.map(item => item.slug))

      if (lookupError) {
        console.error('Supabase lookup error:', lookupError)
        return NextResponse.json({
          success: false,
          message: 'Failed to prepare awardee import',
          error: lookupError.message
        }, { status: 500 })
      }

      // Map existing slugs to IDs
      const existingMap = new Map(existingAwardees?.map(item => [item.slug, item.id]) ?? [])

      // Separate into updates and inserts
      const toUpdate: any[] = []
      const toInsert: any[] = []

      for (const item of chunk) {
        const existingId = existingMap.get(item.slug)
        if (existingId) {
          // Update existing awardee
          toUpdate.push({ ...item, id: existingId })
        } else {
          // Insert new awardee (remove id if it was auto-generated from Excel)
          const { id, ...rest } = item
          toInsert.push(rest)
        }
      }

      // Perform updates
      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('awardees')
          .upsert(toUpdate, { onConflict: 'id' })

        if (updateError) {
          console.error('Update error:', updateError)
          return NextResponse.json({
            success: false,
            message: 'Failed to update existing awardees',
            error: updateError.message
          }, { status: 500 })
        }
        updated += toUpdate.length
      }

      // Perform inserts
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('awardees')
          .insert(toInsert)

        if (insertError) {
          console.error('Insert error:', insertError)
          return NextResponse.json({
            success: false,
            message: 'Failed to insert new awardees',
            error: insertError.message
          }, { status: 500 })
        }
        imported += toInsert.length
      }
    }

    const totalProcessed = imported + updated
    const message = `Successfully processed ${totalProcessed} awardee${totalProcessed === 1 ? '' : 's'} (${imported} new, ${updated} updated)`

    return NextResponse.json({
      success: true,
      message,
      imported,
      updated,
      total: totalProcessed
    })

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    console.error('Awardees import error:', message)
    return NextResponse.json({
      success: false,
      message
    }, { status: 400 })
  }
}
