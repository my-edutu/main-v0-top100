export type AssignmentAgent = {
  id: string
  name?: string
  lastAssignedAt?: number | null
  assignedCount: number
}

export type AssignmentCandidate = {
  id: string
  country?: string | null
}

export const MAX_ACTIVE_AWARDEES_PER_AGENT = 100

/**
 * Deterministic fair-distribution planner used by tests and by the admin UI
 * preview. The database RPC is the authority; this mirrors its least-loaded
 * and round-robin behaviour.
 */
export function planFairAssignment(
  candidates: AssignmentCandidate[],
  agents: AssignmentAgent[],
  strategy: 'least_loaded' | 'round_robin' = 'least_loaded',
  capacity = MAX_ACTIVE_AWARDEES_PER_AGENT,
) {
  const work = agents.map((agent) => ({ ...agent }))
  const assignments: Array<{ awardeeId: string; agentId: string }> = []
  const ordered = [...candidates].sort((a, b) => {
    const aNg = /^nigeria$/i.test(a.country ?? '') ? 0 : 1
    const bNg = /^nigeria$/i.test(b.country ?? '') ? 0 : 1
    return aNg - bNg
  })

  for (const candidate of ordered) {
    const available = work.filter((agent) => agent.assignedCount < capacity)
    if (!available.length) break
    available.sort((a, b) => {
      if (a.assignedCount !== b.assignedCount) return a.assignedCount - b.assignedCount
      if (strategy === 'round_robin') {
        const aTime = a.lastAssignedAt ?? 0
        const bTime = b.lastAssignedAt ?? 0
        if (aTime !== bTime) return aTime - bTime
      }
      return agents.findIndex((agent) => agent.id === a.id) - agents.findIndex((agent) => agent.id === b.id)
    })
    const chosen = available[0]
    assignments.push({ awardeeId: candidate.id, agentId: chosen.id })
    chosen.assignedCount += 1
    chosen.lastAssignedAt = Date.now()
  }

  return assignments
}

export function workloadSpread(assignments: Array<{ agentId: string }>, agents: AssignmentAgent[]) {
  const counts = agents.map((agent) => ({
    agentId: agent.id,
    count: assignments.filter((assignment) => assignment.agentId === agent.id).length,
  }))
  const values = counts.map((entry) => entry.count)
  return {
    counts,
    min: values.length ? Math.min(...values) : 0,
    max: values.length ? Math.max(...values) : 0,
    spread: values.length ? Math.max(...values) - Math.min(...values) : 0,
  }
}
