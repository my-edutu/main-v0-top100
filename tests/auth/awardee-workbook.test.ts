import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { extractAwardeeRecords, inspectAwardeeWorkbook, readAwardeeWorkbook, suggestWorkbookMapping } from '@/lib/awardee-workbook'
import { planReviewedImport, type ExistingAwardee } from '@/lib/awardee-import-review'

function workbook() {
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Winner ID', 'Full Name', 'E-mail', 'Country'],
    ['A-1', 'Ada Okoro', 'ADA@example.com', 'Nigeria'],
    ['A-2', 'Alex Okoro', 'alex@example.com', 'Ghana'],
  ]), 'Winners')
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Application ID', 'About', 'Department'],
    ['A-1', 'Leads a research team.', 'Engineering'],
    ['A-2', 'Builds community projects.', 'Education'],
  ]), 'Bios')
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([
    ['Email address', 'LinkedIn'],
    ['ada@example.com', 'https://linkedin.com/in/ada'],
  ]), 'Social')
  return readAwardeeWorkbook(new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' })), 'winners.xlsx')
}

describe('multi-tab winner imports', () => {
  it('joins bios by winner ID and social links by email', () => {
    const book = workbook()
    const mapping = suggestWorkbookMapping(inspectAwardeeWorkbook(book))
    expect(mapping.primarySheet).toBe('Winners')
    const { records, issues } = extractAwardeeRecords(book, mapping)
    expect(issues).toEqual([])
    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      externalId: 'A-1', email: 'ada@example.com', bio: 'Leads a research team.',
      course: 'Engineering', year: 2026, social_links: { linkedin: 'https://linkedin.com/in/ada' },
    })
  })

  it('never overwrites a claimed profile and fills only empty fields on an unclaimed record', () => {
    const { records } = extractAwardeeRecords(workbook(), suggestWorkbookMapping(inspectAwardeeWorkbook(workbook())))
    const base: ExistingAwardee = {
      id: 'id-1', name: 'Ada Okoro', slug: 'ada-okoro', email: 'ada@example.com', profile_id: null,
      metadata: { import_external_id: 'A-1' }, country: 'Kenya', course: null, bio: null,
      year: null, image_url: null, tagline: null, headline: null, cgpa: null, social_links: {},
    }
    const review = planReviewedImport(records, [base, { ...base, id: 'id-2', email: 'alex@example.com', slug: 'alex-okoro', metadata: { import_external_id: 'A-2' }, profile_id: 'user-2' }])
    expect(review.actions).toHaveLength(1)
    expect(review.actions[0].payload).toMatchObject({ bio: 'Leads a research team.', course: 'Engineering' })
    expect(review.actions[0].payload).not.toHaveProperty('country')
    expect(review.issues.some((issue) => issue.message.includes('claimed'))).toBe(true)
  })

  it('does not join a bio to a winner by a shared name', () => {
    const book = workbook()
    const mapping = suggestWorkbookMapping(inspectAwardeeWorkbook(book))
    mapping.sheets.find((sheet) => sheet.sheet === 'Bios')!.fields.externalId = undefined
    const result = extractAwardeeRecords(book, mapping)
    expect(result.records.every((record) => !record.bio)).toBe(true)
    expect(result.issues.some((issue) => issue.message.includes('Map Email or Winner ID'))).toBe(true)
  })

  it('flags a same-name different-email record instead of creating a duplicate profile', () => {
    const { records } = extractAwardeeRecords(workbook(), suggestWorkbookMapping(inspectAwardeeWorkbook(workbook())))
    const existing: ExistingAwardee = {
      id: 'id-1', name: 'Ada Okoro', slug: 'ada-okoro', email: 'ada.old@example.com', profile_id: null,
      metadata: {}, country: 'Nigeria', course: null, bio: null, year: null, image_url: null,
      tagline: null, headline: null, cgpa: null, social_links: {},
    }
    const review = planReviewedImport([records[0]], [existing])
    expect(review.actions).toEqual([])
    expect(review.summary.skipped).toBe(1)
    expect(review.issues[0].message).toContain('same name')
  })
})
