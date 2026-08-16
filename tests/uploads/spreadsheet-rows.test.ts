import { describe, expect, it } from 'vitest'

import { sheetRowsToRecords } from '@/lib/spreadsheet-rows'

describe('sheetRowsToRecords', () => {
  it('maps the first row to headers and ignores empty data rows', () => {
    const records = sheetRowsToRecords([
      ['Name', 'Country', 'Year'],
      ['Ada', 'Nigeria', 2026],
      [null, null, null],
      ['Ama', 'Ghana', 2025],
    ])

    expect(records).toEqual([
      { Name: 'Ada', Country: 'Nigeria', Year: 2026 },
      { Name: 'Ama', Country: 'Ghana', Year: 2025 },
    ])
  })

  it('ignores blank and duplicate headers instead of creating ambiguous keys', () => {
    const records = sheetRowsToRecords([
      ['Name', '', 'Name', 'Email'],
      ['Ada', 'ignored', 'duplicate', 'ada@example.com'],
    ])

    expect(records).toEqual([
      { Name: 'Ada', Email: 'ada@example.com' },
    ])
  })

  it('returns no records when there is no data row', () => {
    expect(sheetRowsToRecords([['Name']])).toEqual([])
    expect(sheetRowsToRecords([])).toEqual([])
  })
})
