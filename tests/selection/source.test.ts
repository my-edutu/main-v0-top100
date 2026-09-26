import { describe, expect, it } from 'vitest'

import {
  parseGoogleFormId,
  parseGoogleSpreadsheetId,
  validateSelectionPdfUpload,
} from '@/lib/selection/source'

describe('parseGoogleFormId', () => {
  it('accepts owner and public Google Form URLs', () => {
    expect(parseGoogleFormId('https://docs.google.com/forms/d/1OwnerFormId/edit')).toBe('1OwnerFormId')
    expect(
      parseGoogleFormId('https://docs.google.com/forms/d/e/1FAIpQLPublicResponderId/viewform'),
    ).toBe('1FAIpQLPublicResponderId')
  })

  it('rejects unrelated URLs and blank values', () => {
    expect(() => parseGoogleFormId('https://example.com/form')).toThrow('Google Form')
    expect(() => parseGoogleFormId('')).toThrow('Google Form')
  })
})

describe('parseGoogleSpreadsheetId', () => {
  it('extracts a stable spreadsheet id from a Sheets URL', () => {
    expect(
      parseGoogleSpreadsheetId('https://docs.google.com/spreadsheets/d/1SpreadsheetId/edit#gid=0'),
    ).toBe('1SpreadsheetId')
  })

  it('rejects non-Google spreadsheet URLs', () => {
    expect(() => parseGoogleSpreadsheetId('https://example.com/sheet.xlsx')).toThrow('Google Sheet')
  })
})

describe('validateSelectionPdfUpload', () => {
  it('accepts a non-empty PDF up to the configured limit', () => {
    expect(
      validateSelectionPdfUpload({ name: 'transcript.pdf', type: 'application/pdf', size: 2_000_000 }),
    ).toEqual({ extension: 'pdf', normalizedMimeType: 'application/pdf' })
  })

  it('rejects disguised, empty and oversized evidence files', () => {
    expect(() =>
      validateSelectionPdfUpload({ name: 'result.jpg', type: 'image/jpeg', size: 500_000 }),
    ).toThrow('PDF')
    expect(() =>
      validateSelectionPdfUpload({ name: 'empty.pdf', type: 'application/pdf', size: 0 }),
    ).toThrow('empty')
    expect(() =>
      validateSelectionPdfUpload({ name: 'huge.pdf', type: 'application/pdf', size: 26 * 1024 * 1024 }),
    ).toThrow('25MB')
  })
})
