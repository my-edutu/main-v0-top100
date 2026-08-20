import { describe, expect, it } from 'vitest'

import {
  findAuditRegressions,
  type NpmAuditReport,
} from '../../scripts/check-audit-regressions'

const knownPrismaAudit: NpmAuditReport = {
  vulnerabilities: {
    'deepmerge-ts': {
      severity: 'high',
      via: [
        {
          source: 1108342,
          name: 'deepmerge-ts',
          dependency: 'deepmerge-ts',
          title: 'DeepmergeTS has stack exhaustion when merging recursive object graphs',
          url: 'https://github.com/advisories/GHSA-ggr8-5vv4-36mx',
          severity: 'high',
          range: '<8.0.0',
        },
      ],
    },
    '@prisma/config': {
      severity: 'high',
      via: ['deepmerge-ts'],
    },
    prisma: {
      severity: 'high',
      via: ['@prisma/config'],
    },
  },
}

describe('dependency audit regression gate', () => {
  it('allows only the exact known Prisma/deepmerge advisory chain', () => {
    expect(findAuditRegressions(knownPrismaAudit)).toEqual([])
  })

  it('blocks any additional high or critical vulnerability', () => {
    const report: NpmAuditReport = {
      vulnerabilities: {
        ...knownPrismaAudit.vulnerabilities,
        'runtime-package': {
          severity: 'critical',
          via: [
            {
              source: 999999,
              name: 'runtime-package',
              dependency: 'runtime-package',
              title: 'New critical issue',
              url: 'https://github.com/advisories/GHSA-new-regression',
              severity: 'critical',
              range: '<2.0.0',
            },
          ],
        },
      },
    }

    expect(findAuditRegressions(report)).toEqual(['runtime-package'])
  })

  it('blocks the baseline package names when the underlying advisory changes', () => {
    const report: NpmAuditReport = JSON.parse(JSON.stringify(knownPrismaAudit))
    const direct = report.vulnerabilities?.['deepmerge-ts']?.via?.[0]
    if (typeof direct === 'object' && direct) {
      direct.url = 'https://github.com/advisories/GHSA-different-advisory'
    }

    expect(findAuditRegressions(report)).toContain('deepmerge-ts')
  })

  it('ignores low and moderate findings for the high-severity gate', () => {
    const report: NpmAuditReport = {
      vulnerabilities: {
        'moderate-package': {
          severity: 'moderate',
          via: [],
        },
      },
    }

    expect(findAuditRegressions(report)).toEqual([])
  })
})
