import { createClient } from '@/lib/supabase/server'
import { read, utils } from 'xlsx'
import type { AwardeeDirectoryEntry } from '@/types/profile'

export type Awardee = AwardeeDirectoryEntry & {
  course?: string | null
}

export const normalizeAwardeeEntry = (entry: AwardeeDirectoryEntry): Awardee => ({
  ...entry,
  course: entry.field_of_study ?? entry.current_school ?? null,
})

export async function getAwardees(): Promise<Awardee[]> {
  try {
    const supabase = createClient()

    const { count, error: countError } = await supabase
      .from('awardees')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Error counting awardees:', countError)
    }

    if (!countError && count === 0) {
      await initializeAwardeesFromExcel()
    }

    const { data, error } = await supabase
      .from('awardee_directory')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching awardees:', error)
      throw new Error('Failed to fetch awardees')
    }

    return (data as AwardeeDirectoryEntry[]).map(normalizeAwardeeEntry)
  } catch (error) {
    console.error('Error in getAwardees:', error)
    return []
  }
}

async function initializeAwardeesFromExcel() {
  try {
    const supabase = createClient(true)
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

      const name = normalizeKey(row, ['name', 'fullname', 'awardee']) || `Awardee ${index + 1}`

      return {
        id: row.id || `awardee-${index + 1}`,
        name,
        email: normalizeKey(row, ['email', 'mail', 'e-mail']) || null,
        country: country || null,
        cgpa: normalizeKey(row, ['cgpa', 'gpa', 'grade']) || null,
        course: normalizeKey(row, ['course', 'program', 'department']) || null,
        bio: normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']) || null,
        year: year ? parseInt(year.toString()) : 2024,
        slug: generateSlug(name),
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
