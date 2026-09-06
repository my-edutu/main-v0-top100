import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'

describe('readFirstWorksheet', () => {
  it('returns a matrix from the first worksheet in an uploaded workbook', async () => {
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([
      ['Name', 'Email'],
      ['Ada Example', 'ada@example.com'],
    ])
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Awardees')
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

    const module = await import('@/lib/xlsx-reader').catch(() => null)
    expect(module?.readFirstWorksheet).toBeTypeOf('function')
    expect(module!.readFirstWorksheet(buffer)).toEqual([
      ['Name', 'Email'],
      ['Ada Example', 'ada@example.com'],
    ])
  })
})
