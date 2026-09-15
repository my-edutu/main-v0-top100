import { describe, expect, it } from 'vitest'

import { generateSelectionReportPdf } from '@/lib/selection/report/pdf'
import type { SelectionReport } from '@/lib/selection/contracts'

const report: SelectionReport = {
  title: 'Top100 Selection Engine — Batch 1 Report',
  generatedAt: '2026-08-24T12:00:00.000Z',
  cycleName: 'Top100 Africa Future Leaders 2026',
  sourceLabel: 'Google Form responses',
  summary: {
    totalApplications: 245,
    processedApplications: 100,
    qualified: 62,
    notQualified: 24,
    needsReview: 14,
    batchNumber: 1,
    totalBatches: 3,
  },
  applications: [
    {
      applicationId: 'application-1',
      fullName: 'Ada Example',
      country: 'Nigeria',
      verdict: 'qualified',
      totalScore: 82,
      publicReasons: ['The application met the published eligibility and merit requirements.'],
    },
    {
      applicationId: 'application-2',
      fullName: 'Kojo (Test) \\ Applicant',
      country: 'Ghana',
      verdict: 'not_qualified',
      totalScore: 54,
      publicReasons: [
        'The application met the academic eligibility requirement but did not reach the overall merit score required for this selection cycle.',
      ],
    },
  ],
}

describe('generateSelectionReportPdf', () => {
  it('returns a standards-shaped PDF document with the report content', () => {
    const pdf = generateSelectionReportPdf(report)
    const text = Buffer.from(pdf).toString('latin1')

    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('Top100 Selection Engine')
    expect(text).toContain('Ada Example')
    expect(text).toContain('Batch 1 of 3')
    expect(text).toContain('%%EOF')
  })

  it('escapes PDF control characters in applicant names', () => {
    const text = Buffer.from(generateSelectionReportPdf(report)).toString('latin1')

    expect(text).toContain('Kojo \\(Test\\) \\\\ Applicant')
  })

  it('creates additional pages for long reports instead of truncating applications', () => {
    const longReport: SelectionReport = {
      ...report,
      applications: Array.from({ length: 130 }, (_, index) => ({
        applicationId: `application-${index + 1}`,
        fullName: `Applicant ${index + 1}`,
        country: index % 2 === 0 ? 'Nigeria' : 'Ghana',
        verdict: index % 3 === 0 ? 'needs_review' : 'qualified',
        totalScore: 70 + (index % 20),
        publicReasons: ['A detailed reason that must remain present in the generated report.'],
      })),
    }

    const text = Buffer.from(generateSelectionReportPdf(longReport)).toString('latin1')

    expect(text).toContain('Applicant 1')
    expect(text).toContain('Applicant 130')
    expect((text.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1)
  })
})
