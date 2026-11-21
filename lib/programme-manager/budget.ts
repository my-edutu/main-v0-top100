export type EssentialCost = { essential: boolean; quoted: number | null; in_kind: number }

/** Amounts are integer kobo. Estimates and unreceived pledges never count as funding. */
export function deliveryReadiness(costs: EssentialCost[], cashReceived: number) {
  const essential = costs.filter((cost) => cost.essential)
  if (!essential.length || essential.some((cost) => cost.quoted === null)) return { ready: false, shortfall: null }
  const needed = essential.reduce((sum, cost) => sum + Math.max(0, cost.quoted! - cost.in_kind), 0)
  const shortfall = Math.max(0, needed - cashReceived)
  return { ready: shortfall === 0, shortfall }
}
