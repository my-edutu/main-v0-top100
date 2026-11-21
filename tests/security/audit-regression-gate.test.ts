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
  it('blocks the former Prisma baseline now that the packages are removed', () => {
    expect(findAuditRegressions(knownPrismaAudit)).toEqual(['@prisma/config', 'deepmerge-ts', 'prisma'])
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

    expect(findAuditRegressions(report)).toContain('runtime-package')
  })

  it('rejects a missing report instead of treating it as clean', () => {
    expect(() => findAuditRegressions({})).toThrow('vulnerabilities map')
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
