import { promises as fs } from 'fs'
import path from 'path'
import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { read, utils } from 'xlsx'
import type { AwardeeDirectoryEntry } from '@/types/profile'
import { normalizeAwardeeEntry, type StaticAwardeeRecord, type Awardee, type ProofAwardee } from './awardees-shared'

export * from './awardees-shared'

const EXCEL_FILE_NAME = 'top100 Africa future Leaders 2025.xlsx'
const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)

const normalizeCellText = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (typeof value === 'number') {
    return value.toString()
  }

  return null
}

const normalizeKey = (obj: Record<string, unknown>, keyVariants: string[]): unknown => {
  for (const variant of keyVariants) {
    const foundKey = Object.keys(obj).find((key) =>
      key.toLowerCase().replace(/\s+/g, '').includes(variant.toLowerCase().replace(/\s+/g, '')),
    )

    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== '') {
      return obj[foundKey]
    }
  }

  return null
}

const parseFeaturedFlag = (value: unknown) => {
  if (typeof value === 'string') {
    return ['true', 'yes', '1', 'featured'].includes(value.trim().toLowerCase())
  }

  return Boolean(value)
}

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

async function readAwardeeExcelRows(): Promise<Record<string, unknown>[]> {
  try {
    const excelPath = path.join(process.cwd(), 'public', EXCEL_FILE_NAME)
    const buffer = await fs.readFile(excelPath)
    const workbook = read(buffer, { type: 'buffer' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = utils.sheet_to_json(worksheet) as Record<string, unknown>[]

    return Array.isArray(jsonData) ? jsonData : []
  } catch (error) {
    console.error('Error reading awardee Excel file:', error)
    return []
  }
}

function mapExcelRowsToAwardeeDirectoryEntries(rows: Record<string, unknown>[]): AwardeeDirectoryEntry[] {
  return rows.map((row, index) => {
    let country = normalizeKey(row, ['country', 'nationality'])
    if (typeof country === 'string' && country.includes(' ')) {
      const parts = country.split(' ')
      if (parts.length >= 2 && parts[0].length === 2) {
        country = parts.slice(1).join(' ')
      }
    }

    const rawYear = normalizeKey(row, ['year', 'batch'])
    const year =
      typeof rawYear === 'number'
        ? rawYear
        : typeof rawYear === 'string' && rawYear.trim().length > 0 && !Number.isNaN(Number.parseInt(rawYear, 10))
          ? Number.parseInt(rawYear, 10)
          : 2025

    const name =
      normalizeCellText(normalizeKey(row, ['name', 'fullname', 'awardee'])) ?? `Awardee ${index + 1}`

    const about = normalizeCellText(normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']))
    const department = normalizeCellText(normalizeKey(row, ['course', 'program', 'department', 'institution']))
    const cgpa = normalizeCellText(normalizeKey(row, ['cgpa', 'gpa', 'grade']))
    const email = normalizeCellText(normalizeKey(row, ['email', 'mail', 'e-mail']))
    const featuredRaw = normalizeKey(row, ['featured', 'isfeatured', 'spotlight', 'homepage'])

    return {
      awardee_id: `excel-${index + 1}`,
      profile_id: null,
      slug: toSlug(name),
      name,
      email: typeof email === 'string' ? email : null,
      country: typeof country === 'string' ? country : null,
      current_school: null,
      field_of_study: typeof department === 'string' ? department : null,
      bio: typeof about === 'string' ? about : null,
      avatar_url: null,
      cover_image_url: null,
      headline: typeof department === 'string' ? department : null,
      tagline: about && typeof about === 'string' ? about.split(/\s+/).slice(0, 18).join(' ') : null,
      personal_email: null,
      phone: null,
      location: typeof country === 'string' ? country : null,
      achievements: null,
      gallery: null,
      video_links: null,
      social_links: null,
      interests: null,
      cohort: '2025',
      metadata: {
        source: 'excel',
        workbook: EXCEL_FILE_NAME,
        row: index + 1,
      },
      cgpa: typeof cgpa === 'string' ? cgpa : null,
      year,
      featured: parseFeaturedFlag(featuredRaw),
      created_at: null,
      updated_at: null,
      is_public: true,
      role: 'awardee',
      mentor: null,
      course: typeof department === 'string' ? department : null,
      impact_projects: null,
      lives_impacted: null,
      awards_received: null,
      youtube_video_url: null,
    }
  })
}

async function loadAwardeesFromExcel(): Promise<Awardee[]> {
  const rows = await readAwardeeExcelRows()
  if (rows.length === 0) {
    return []
  }

  return mapExcelRowsToAwardeeDirectoryEntries(rows).map(normalizeAwardeeEntry)
}

const getAwardeesCached = unstable_cache(
  async (): Promise<Awardee[]> => {
    if (!hasServiceRoleKey) {
      const fallbackAwardees = await loadStaticAwardees()
      if (fallbackAwardees.length === 0) {
        console.warn('Static awardees seed is empty; returning safe fallback')
      }
      return fallbackAwardees
    }

    try {
      const supabase = await createClient()

      // Query the awardee_directory view instead of the table directly
      const { data, error } = await supabase
        .from('awardee_directory')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.warn('Error fetching awardees from Supabase, using static seed:', error)
        return await loadStaticAwardees()
      }

      // If no awardee records are found, attempt to initialize from Excel
      if (!data || data.length === 0) {
        const seededAwardees = await initializeAwardeesFromExcel()
        if (seededAwardees.length > 0) {
          return seededAwardees
        }

        const fallbackAwardees = await loadStaticAwardees()
        if (fallbackAwardees.length === 0) {
          console.warn('Awardee workbook fallback is empty; returning safe fallback')
        }
        return fallbackAwardees
      }

      return (data as AwardeeDirectoryEntry[]).map(normalizeAwardeeEntry)
    } catch (error) {
      console.error('Error in getAwardees:', error)
      const fallbackAwardees = await loadStaticAwardees()
      if (fallbackAwardees.length === 0) {
        console.warn('Static awardees seed is empty; returning safe fallback')
      }
      return fallbackAwardees
    }
  },
  ['awardees-directory'],
  { revalidate: 600, tags: ['awardees'] },
)

export const getAwardees = getAwardeesCached

async function initializeAwardeesFromExcel(): Promise<Awardee[]> {
  try {
    const supabase = await createClient(true)
    const rows = await readAwardeeExcelRows()

    if (rows.length === 0) {
      console.warn('Excel file is empty, skipping initialization')
      return []
    }

    const awardeesToInsert = mapExcelRowsToAwardeeDirectoryEntries(rows)

    const { error } = await supabase.from('awardees').insert(awardeesToInsert).select()

    if (error) {
      console.error('Error initializing awardees from Excel:', error)
      return awardeesToInsert.map(normalizeAwardeeEntry)
    }

    console.log(`Successfully initialized ${awardeesToInsert.length} awardees from Excel`)
    return awardeesToInsert.map(normalizeAwardeeEntry)
  } catch (error) {
    console.error('Error during Excel initialization:', error)
    const fallback = await loadAwardeesFromExcel()
    return fallback
  }
}

async function loadStaticAwardees(): Promise<Awardee[]> {
  return loadAwardeesFromExcel()
}

async function readSeedJSON(): Promise<StaticAwardeeRecord[] | undefined> {
  // In a browser environment, we can't read files from the filesystem
  // Return undefined to indicate no static seed data is available
  if (typeof window !== 'undefined') {
    return undefined;
  }

  // For server-side, we would need to implement a different approach
  // For now, we'll return undefined to prevent the fs import
  return undefined;
}

function normalizeYear(year: StaticAwardeeRecord['year']): number | null {
  if (typeof year === 'number') {
    return year
  }

  if (typeof year === 'string' && year.trim().length > 0) {
    const parsed = Number.parseInt(year, 10)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return 2025
}


// Fetch ALL awardees for the proof/merit list page
// This reads directly from the static Excel file to show the full 400+ list
// Completely independent of database - admin controls don't affect this
const getAllAwardeesForProofCached = unstable_cache(
  async (): Promise<ProofAwardee[]> => {
    try {
      // Import required modules for reading Excel file
      const { promises: fs } = await import('fs')
      const path = await import('path')
      const xlsx = await import('xlsx')

      const excelPath = path.join(process.cwd(), 'public', 'top100 Africa future Leaders 2025.xlsx')

      let buffer: Buffer
      try {
        buffer = await fs.readFile(excelPath)
      } catch (fileError) {
        console.error('Excel file not found:', excelPath)
        return []
      }

      const workbook = xlsx.read(buffer, { type: 'buffer' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const jsonData = xlsx.utils.sheet_to_json(worksheet)

      if (!jsonData || jsonData.length === 0) {
        console.warn('Excel file is empty')
        return []
      }

      // Helper function to normalize keys
      const normalizeKey = (obj: any, keyVariants: string[]): any => {
        for (const variant of keyVariants) {
          const foundKey = Object.keys(obj).find((k) =>
            k.toLowerCase().replace(/\s+/g, '').includes(variant.toLowerCase().replace(/\s+/g, '')),
          )
          if (foundKey && obj[foundKey]) {
            return obj[foundKey]
          }
        }
        return null
      }

      // Parse and return all awardees from Excel
      return jsonData.map((row: any, index: number) => {
        const rawName = normalizeKey(row, ['name', 'fullname', 'awardee'])
        const name = typeof rawName === 'string' ? rawName.trim() : `Awardee ${index + 1}`

        let country = normalizeKey(row, ['country', 'nationality']) || ''
        if (country && typeof country === 'string' && country.includes(' ')) {
          const parts = country.split(' ')
          if (parts.length >= 2 && parts[0].length === 2) {
            country = parts.slice(1).join(' ')
          }
        }

        const rawCgpa = normalizeKey(row, ['cgpa', 'gpa', 'grade'])
        const cgpa = rawCgpa !== null && rawCgpa !== undefined ? rawCgpa.toString().trim() : null

        let year = normalizeKey(row, ['year', 'batch'])
        if (typeof year === 'string') {
          year = parseInt(year)
        }

        return {
          id: `proof-${index + 1}`,
          name,
          cgpa,
          country: country ? country.toString().trim() : null,
          year: typeof year === 'number' ? year : null,
        }
      })
    } catch (error) {
      console.error('Error in getAllAwardeesForProof:', error)
      return []
    }
  },
  ['awardee-proof-list'],
  { revalidate: 600, tags: ['awardees'] },
)

export const getAllAwardeesForProof = getAllAwardeesForProofCached
