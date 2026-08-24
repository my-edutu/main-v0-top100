import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const selectionPagePath = resolve(root, 'app/admin/selection/page.tsx')
const selectionWorkspacePath = resolve(root, 'app/admin/selection/selection-workspace.tsx')
const rankingWorkspacePath = resolve(root, 'app/admin/selection/ranking-workspace.tsx')
const rankingDetailsRoutePath = resolve(
  root,
  'app/api/admin/selection/rankings/[runId]/route.ts',
)
const rankingApprovalRoutePath = resolve(
  root,
  'app/api/admin/selection/rankings/[runId]/approvals/route.ts',
)

const readIfPresent = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : '')

describe('Selection Engine ranking workspace', () => {
  it('exposes ranking and committee approval controls in the admin panel', () => {
    const page = readFileSync(selectionPagePath, 'utf8')
    const workspace = readIfPresent(selectionWorkspacePath)
    const ranking = readIfPresent(rankingWorkspacePath)

    expect(page).toContain('SelectionWorkspace')
    expect(workspace).toContain('<TabsTrigger value="rankings">Rankings and approvals</TabsTrigger>')
    expect(workspace).toContain('<RankingWorkspace />')
    expect(ranking).toContain('/api/admin/selection/rankings')
    expect(ranking).toContain('Approve ranking')
    expect(ranking).toContain('Reject and void')
  })

  it('provides private ranked-applicant details and authenticated approval endpoints', () => {
    const detailsRoute = readIfPresent(rankingDetailsRoutePath)
    const approvalRoute = readIfPresent(rankingApprovalRoutePath)

    expect(detailsRoute).toContain('requireAdmin(request)')
    expect(detailsRoute).toContain(".from('selection_ranking_entries')")
    expect(detailsRoute).toContain(".order('overall_rank', { ascending: true })")
    expect(approvalRoute).toContain('requireAdmin(request)')
    expect(approvalRoute).toContain("run.status !== 'frozen'")
    expect(approvalRoute).toContain('approver_id: adminCheck.user.id')
    expect(approvalRoute).toContain("insertError.code === '23505'")
    expect(approvalRoute).toContain("event_type: 'selection_ranking_decision_recorded'")
  })
})
