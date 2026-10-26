import { AgentDashboardView, LeaderDashboardView } from '@/components/dashboard'
import { requireMember } from '@/lib/auth'
import { getAgentDashboard, getFollowupQueue, getLeaderDashboard, getRandomAwardees, listAwardees } from '@/lib/data'

export const metadata = { title: 'Overview' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const member = await requireMember()

  if (member.membership.role === 'team_leader' || member.membership.role === 'super_admin') {
    const [dashboard, awardees] = await Promise.all([
      getLeaderDashboard(member),
      getRandomAwardees(member, 5),
    ])
    return <LeaderDashboardView member={member} dashboard={dashboard} awardees={awardees} />
  }

  const [dashboard, queue, uncontacted] = await Promise.all([
    getAgentDashboard(member),
    getFollowupQueue(member),
    listAwardees(member, { contactStatus: 'not_contacted', pageSize: 6, sort: 'followup' }),
  ])

  return (
    <AgentDashboardView
      member={member}
      dashboard={dashboard}
      queue={queue}
      uncontacted={uncontacted.rows}
    />
  )
}
