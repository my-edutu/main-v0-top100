import { AdminDashboardView, LeaderDashboardView } from '@/components/dashboard'
import { requireStaff } from '@/lib/auth'
import { getAdminDashboard, getLeaderDashboard, getPaymentReconciliation, getRandomAwardees } from '@/lib/data'

export const metadata = { title: 'Admin overview' }
export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const member = await requireStaff()

  if (member.membership.role === 'team_leader') {
    const [dashboard, awardees] = await Promise.all([
      getLeaderDashboard(member),
      getRandomAwardees(member, 5),
    ])
    return <LeaderDashboardView member={member} dashboard={dashboard} awardees={awardees} />
  }

  const [dashboard, reconciliation] = await Promise.all([
    getAdminDashboard(member),
    getPaymentReconciliation(member),
  ])

  return (
    <AdminDashboardView
      member={member}
      dashboard={dashboard}
      reconciliation={{
        missing: reconciliation.missing,
        reconciled: reconciliation.reconciled,
        missingReversals: reconciliation.missingReversals,
      }}
    />
  )
}
