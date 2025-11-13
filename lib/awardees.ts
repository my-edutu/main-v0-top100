import { createClient } from '@/lib/supabase/server'
import { read, utils } from 'xlsx'
import type { AwardeeDirectoryEntry } from '@/types/profile'

export type Awardee = AwardeeDirectoryEntry & {
  course?: string | null
}

type StaticAwardeeRecord = {
  id?: string
  slug?: string
  name?: string
  email?: string | null
  country?: string | null
  current_school?: string | null
  field_of_study?: string | null
  course?: string | null
  category?: string | null
  bio?: string | null
  bio30?: string | null
  avatar_url?: string | null
  headline?: string | null
  location?: string | null
  cgpa?: string | null
  year?: number | string | null
  featured?: boolean | null
  cohort?: string | null
  role?: string | null
  mentor?: string | null
}

export const normalizeAwardeeEntry = (entry: AwardeeDirectoryEntry): Awardee => ({
  ...entry,
  course: entry.field_of_study ?? entry.current_school ?? null,
  impact_projects: entry.impact_projects ?? null,
  lives_impacted: entry.lives_impacted ?? null,
  awards_received: entry.awards_received ?? null,
  youtube_video_url: entry.youtube_video_url ?? null,
})

export async function getAwardees(): Promise<Awardee[]> {
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
      await initializeAwardeesFromExcel()
      // Re-fetch after initialization
      const reSupabase = await createClient()
      const { data: newData, error: newError } = await reSupabase
        .from('awardee_directory')
        .select('*')
        .order('name', { ascending: true })

      if (newError) {
        console.warn('Error fetching awardees after initialization, using static seed:', newError)
        return await loadStaticAwardees()
      }

      if (!newData || newData.length === 0) {
        console.warn('Awardee directory is empty after initialization; using static seed data')
        return await loadStaticAwardees()
      }

      return (newData as AwardeeDirectoryEntry[]).map(normalizeAwardeeEntry)
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
}

async function initializeAwardeesFromExcel() {
  try {
    const supabase = await createClient(true)
    const excelPath = `/top100 Africa future Leaders 2025.xlsx`
    const excelResponse = await fetch(excelPath)

    if (!excelResponse.ok) {
      console.warn(`Excel file not found at ${excelPath}, skipping initialization`)
      console.warn(`Status: ${excelResponse.status}, Status Text: ${excelResponse.statusText}`)
      return
    }

    const buffer = await excelResponse.arrayBuffer()
    const workbook = read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]
    const jsonData = utils.sheet_to_json(worksheet)

    if (!jsonData || jsonData.length === 0) {
      console.warn('Excel file is empty, skipping initialization')
      return
    }

    const normalizeTextValue = (value: any) => {
      if (typeof value === 'string') {
        return value.trim()
      }
      return value
    }

    const awardeesToInsert = jsonData.map((row: any, index: number) => {
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

      let country = normalizeKey(row, ['country', 'nationality']) || ''
      if (country && typeof country === 'string' && country.includes(' ')) {
        const parts = country.split(' ')
        if (parts.length >= 2 && parts[0].length === 2) {
          country = parts.slice(1).join(' ')
        }
      }

      let year = normalizeKey(row, ['year', 'batch'])
      if (typeof year === 'string') {
        year = parseInt(year)
      }

      const name =
        normalizeTextValue(normalizeKey(row, ['name', 'fullname', 'awardee'])) || `Awardee ${index + 1}`

      const featuredRaw = normalizeKey(row, ['featured', 'isfeatured', 'spotlight', 'homepage'])
      const featured =
        typeof featuredRaw === 'string'
          ? ['true', 'yes', '1', 'featured'].includes(featuredRaw.trim().toLowerCase())
          : Boolean(featuredRaw)

      return {
        id: normalizeTextValue(row.id) || `awardee-${index + 1}`,
        name,
        email: normalizeTextValue(normalizeKey(row, ['email', 'mail', 'e-mail'])) || null,
        country: normalizeTextValue(country) || null,
        cgpa: normalizeTextValue(normalizeKey(row, ['cgpa', 'gpa', 'grade'])) || null,
        course: normalizeTextValue(normalizeKey(row, ['course', 'program', 'department', 'institution'])) || null,
        bio:
          normalizeTextValue(normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30'])) || null,
        year: year ? parseInt(year.toString()) : 2024,
        slug: generateSlug(name),
        featured,
      }
    })

    const { error } = await supabase.from('awardees').insert(awardeesToInsert).select()

    if (error) {
      console.error('Error initializing awardees from Excel:', error)
      throw error
    }

    console.log(`Successfully initialized ${awardeesToInsert.length} awardees from Excel`)
  } catch (error) {
    console.error('Error during Excel initialization:', error)
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function loadStaticAwardees(): Promise<Awardee[]> {
  // Return empty array since we can't read static files in browser environment
  return []
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

  return 2024
}
