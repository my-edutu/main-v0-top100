import { describe, expect, it } from 'vitest'
import { findLintRegressions, parseAddedLineRanges, type LintResult } from '../../scripts/lint-changed-lines'

describe('changed-line lint regression gate', () => {
  it('extracts only added line ranges from zero-context git diffs', () => {
    const diff = [
      'diff --git a/app/example.ts b/app/example.ts',
      '--- a/app/example.ts',
      '+++ b/app/example.ts',
      '@@ -10,2 +10,3 @@',
      '-old',
      '-lines',
      '+new',
      '+changed',
      '+lines',
      '@@ -30,2 +31,0 @@',
      '-deleted',
      '-only',
      '@@ -40,0 +40,2 @@',
      '+added',
      '+later',
    ].join('\n')

    expect(parseAddedLineRanges(diff).get('app/example.ts')).toEqual([
      { start: 10, end: 12 },
      { start: 40, end: 41 },
    ])
  })

  it('blocks findings that overlap added lines while retaining untouched findings as baseline', () => {
    const lintResults: LintResult[] = [
      {
        filePath: '/repo/app/example.ts',
        messages: [
          { line: 11, endLine: 11, column: 3, severity: 1, message: 'new warning', ruleId: 'example/warn' },
          { line: 25, endLine: 25, column: 1, severity: 2, message: 'legacy error', ruleId: 'example/error' },
        ],
      },
    ]
    const ranges = new Map([['app/example.ts', [{ start: 10, end: 12 }]]])

    const result = findLintRegressions(lintResults, ranges, '/repo')

    expect(result.regressions).toHaveLength(1)
    expect(result.regressions[0].message).toBe('new warning')
    expect(result.baselineFindings).toBe(1)
  })

  it('blocks fatal lint failures for files containing changed lines', () => {
    const lintResults: LintResult[] = [
      {
        filePath: '/repo/app/example.ts',
        messages: [
          { line: 0, column: 0, severity: 2, message: 'parser failed', ruleId: null, fatal: true },
        ],
      },
    ]
    const ranges = new Map([['app/example.ts', [{ start: 1, end: 5 }]]])

    expect(findLintRegressions(lintResults, ranges, '/repo').regressions).toHaveLength(1)
  })
})
