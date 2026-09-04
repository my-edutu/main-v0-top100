import { readSheet } from 'read-excel-file/universal'

import { sheetRowsToRecords } from '@/lib/spreadsheet-rows'

export async function readAwardeesFromExcel(filePath: string) {
  try {
    const response = await fetch(filePath)
    if (!response.ok) {
      throw new Error(`Failed to fetch spreadsheet: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const sheetRows = await readSheet(buffer)
    const jsonData = sheetRowsToRecords(sheetRows)

    return processAwardeesData(jsonData)
  } catch (error) {
    console.error('Error reading Excel file:', error)
    throw error
  }
}

export function processAwardeesData(rawData: Array<Record<string, unknown>>) {
  return rawData.map((row, index) => {
    const normalizeKey = (obj: Record<string, unknown>, keyVariants: string[]): unknown => {
      for (const variant of keyVariants) {
        const foundKey = Object.keys(obj).find(k =>
          k.toLowerCase().replace(/\s+/g, '').includes(variant.toLowerCase().replace(/\s+/g, ''))
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

    let country = normalizeKey(row, ['country', 'nationality']) || ''
    if (country && typeof country === 'string' && country.includes(' ')) {
      const parts = country.split(' ')
      if (parts.length >= 2 && parts[0].length === 2) {
        country = parts.slice(1).join(' ')
      }
    }

    let year = normalizeKey(row, ['year', 'batch'])
    if (typeof year === 'string') {
      const parsedYear = parseInt(year, 10)
      year = Number.isFinite(parsedYear) ? parsedYear : null
    }

    const rawName = normalizeKey(row, ['name', 'fullname', 'awardee'])
    const name = rawName ? String(rawName) : `Awardee ${index + 1}`
    const rawId = row.id

    return {
      id: rawId ? String(rawId) : `awardee-${index + 1}`,
      name,
      email: normalizeKey(row, ['email', 'mail', 'e-mail']) || null,
      country: country ? String(country) : null,
      cgpa: normalizeKey(row, ['cgpa', 'gpa', 'grade']) || null,
      course: normalizeKey(row, ['course', 'program', 'department']) || null,
      bio: normalizeKey(row, ['bio', 'description', 'about', 'leadership', 'bio30']) || null,
      year: typeof year === 'number' && Number.isFinite(year) ? year : 2024,
      slug: generateSlug(name)
    }
  })
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

interface AwardeeStatsInput {
  country?: string | null
  course?: string | null
  year?: number | null
}

export function getAwardeesStats(awardees: AwardeeStatsInput[]) {
  if (!awardees || awardees.length === 0) {
    return {
      totalAwardees: 0,
      totalCountries: 0,
      totalCourses: 0,
      currentYearAwardees: 0,
      recentAwardees: 0,
      topCountries: [],
      topCourses: []
    }
  }

  const currentYear = new Date().getFullYear()

  const totalAwardees = awardees.length
  const totalCountries = [...new Set(awardees.map(a => a.country).filter(Boolean))].length
  const totalCourses = [...new Set(awardees.map(a => a.course).filter(Boolean))].length
  const currentYearAwardees = awardees.filter(a => a.year === currentYear).length
  const recentAwardees = awardees.filter(a =>
    a.year === currentYear ||
    (a.year === currentYear - 1 && new Date().getMonth() < 3)
  ).length

  const countryMap = new Map<string, number>()
  awardees.forEach((awardee) => {
    if (awardee.country) {
      countryMap.set(awardee.country, (countryMap.get(awardee.country) || 0) + 1)
    }
  })
  const topCountries = Array.from(countryMap, ([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const courseMap = new Map<string, number>()
  awardees.forEach((awardee) => {
    if (awardee.course) {
      courseMap.set(awardee.course, (courseMap.get(awardee.course) || 0) + 1)
    }
  })
  const topCourses = Array.from(courseMap, ([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalAwardees,
    totalCountries,
    totalCourses,
    currentYearAwardees,
    recentAwardees,
    topCountries,
    topCourses
  }
}
