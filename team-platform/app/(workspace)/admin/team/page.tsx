import { CheckCircle2, Clock3, UsersRound } from 'lucide-react'
import { Avatar, Card, EmptyState, PageHeader, StatusChip } from '@/components/ui'
import { InviteMemberForm } from '@/components/invite-member-form'
import { MemberControls } from '@/components/member-controls'
import { requireAdmin } from '@/lib/auth'
import { getTeamMembers } from '@/lib/data'
import { formatDate } from '@/lib/format'

export const metadata = { title: 'Teams & agents' }
export const dynamic = 'force-dynamic'

export default async function TeamManagementPage() {
  const member = await requireAdmin()
  const members = await getTeamMembers(member)
  const pending = members.filter((item) => item.status === 'invited')
  const active = members.filter((item) => item.status === 'active')
  const suspended = members.filter((item) => item.status === 'suspended')

  return (
    <div>
      <PageHeader
        eyebrow="TEAM ADMINISTRATION"
        title="Teams & agents"
        description="Manage access to Top100 sales operations. Review pending invitations, approve members, and assign the right team role."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="rounded-xl bg-moss-soft p-2.5 text-moss"><CheckCircle2 className="h-4 w-4" /></span>
          <div><p className="label">Active members</p><p className="num mt-1 text-xl font-semibold">{active.length}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="rounded-xl bg-amber-100 p-2.5 text-amber-800"><Clock3 className="h-4 w-4" /></span>
          <div><p className="label">Awaiting approval</p><p className="num mt-1 text-xl font-semibold">{pending.length}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="rounded-xl bg-ink/[0.06] p-2.5 text-ink"><UsersRound className="h-4 w-4" /></span>
          <div><p className="label">Suspended</p><p className="num mt-1 text-xl font-semibold">{suspended.length}</p></div>
        </Card>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Team access</h2>
            <p className="mt-1 text-xs text-muted">Set a member to Active to approve access. Invited members activate after accepting their Supabase Auth invitation.</p>
          </div>
          {members.length ? (
            <div className="divide-y divide-line">
              {members.map((item) => (
                <div key={item.id} className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={item.full_name} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.full_name}</p>
                      <p className="truncate text-xs text-muted">{item.email}</p>
                      <p className="mt-1 text-[10px] text-muted">{item.joined_at ? `Joined ${formatDate(item.joined_at)}` : 'Not joined yet'}</p>
                      {item.role === 'agent' ? (
                        <p className={`mt-1 text-[11px] font-medium ${item.workload >= 100 ? 'text-amber-800' : 'text-muted'}`}>
                          {item.workload}/100 active awardees
                        </p>
                      ) : null}
                    </div>
                    <StatusChip status={item.status} dot />
                  </div>
                  <div className="lg:pl-4">
                    <MemberControls
                      id={item.id}
                      role={item.role}
                      status={item.status}
                      isSelf={item.id === member.membership.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No team members yet"
              description="Invite the first agent or team leader to begin managing awardee follow-up."
              icon={<UsersRound className="h-5 w-5" />}
            />
          )}
        </Card>

        <Card className="p-5">
          <p className="label mb-1">Add to the team</p>
          <h2 className="display text-xl">Invite a member</h2>
          <p className="mb-4 mt-2 text-xs leading-5 text-muted">Top100 controls membership and role assignment. New invitations appear in Team access for review.</p>
          <InviteMemberForm />
        </Card>
      </div>
    </div>
  )
}
