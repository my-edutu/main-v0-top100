export function shouldShowDashboardCelebration(
  dashboardLoginCount: number,
  dismissed: boolean,
) {
  return dashboardLoginCount === 1 && !dismissed
}

export function dashboardCelebrationStorageKey(memberId: string) {
  return `afl:dashboard-celebration-dismissed:${memberId}`
}
