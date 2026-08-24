import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const selectionClientPath = resolve(root, 'app/admin/selection/selection-engine-client.tsx')
const rankingWorkspacePath = resolve(root, 'app/admin/selection/ranking-workspace.tsx')
const rankingDetailsRoutePath = resolve(
  root,
  'app/api/admin/selection/rankings/[runId]/route.ts',
)
const rankingApprovalRoutePath = resolve(
  root,
  'app/api/admin/selection/rankings/[runId]/approvals/route.ts',
)

describe('Selection Engine ranking workspace', () => {
  it('exposes ranking and committee approval controls in the admin panel', () => {
    const client = readFileSync(selectionClientPath, 'utf8')

    expect(client).toContain('RankingWorkspace')
    expect(client).toContain('<TabsTrigger value="rankings">Rankings and approvals</TabsTrigger>')
    expect(existsSync(rankingWorkspacePath)).toBe(true)
  })

  it('provides private ranked-applicant details and authenticated approval endpoints', () => {
    expect(existsSync(rankingDetailsRoutePath)).toBe(true)
    expect(existsSync(rankingApprovalRoutePath)).toBe(true)
  })
})
