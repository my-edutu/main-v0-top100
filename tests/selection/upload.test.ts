import { describe, expect, it } from 'vitest'

import {
  buildSelectionEvidencePath,
  hasPdfMagicBytes,
  sanitizeSelectionFileName,
} from '@/lib/selection/upload'

describe('sanitizeSelectionFileName', () => {
  it('removes path traversal, unsafe characters and repeated separators', () => {
    expect(sanitizeSelectionFileName('../../Ada Result (Final)!!.pdf')).toBe('ada-result-final.pdf')
  })

  it('always returns a PDF filename', () => {
    expect(sanitizeSelectionFileName('')).toBe('evidence.pdf')
    expect(sanitizeSelectionFileName('result.PDF')).toBe('result.pdf')
  })
})

describe('buildSelectionEvidencePath', () => {
  it('uses server-controlled ids and a sanitized leaf filename', () => {
    expect(
      buildSelectionEvidencePath({
        cycleId: 'cycle-1',
        jobId: 'job-2',
        applicationId: 'application-3',
        documentId: 'document-4',
        fileName: '../Transcript Final.pdf',
      }),
    ).toBe('cycle-1/job-2/application-3/document-4-transcript-final.pdf')
  })
})

describe('hasPdfMagicBytes', () => {
  it('accepts a PDF signature even when additional bytes follow', () => {
    expect(hasPdfMagicBytes(Buffer.from('%PDF-1.7\nbody'))).toBe(true)
  })

  it('rejects files that only have a PDF extension', () => {
    expect(hasPdfMagicBytes(Buffer.from('not a pdf'))).toBe(false)
  })
})
