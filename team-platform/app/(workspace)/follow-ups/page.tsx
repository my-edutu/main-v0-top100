import Link from 'next/link'
import { CalendarClock, Mail, MessageCircle, Phone, PhoneCall } from 'lucide-react'
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  PageHeader,
  StatusChip,
} from '@/components/ui'
import { requireMember, isStaff } from '@/lib/auth'
import { getAgentOptions, getFollowupQueue, listFollowups } from '@/lib/data'
import { workdayDate } from '@/lib/workday'
import { CHANNEL_LABELS, formatDate, formatDateTime, OUTCOME_LABELS } from '@/lib/format'

export const metadata = { title: 'Follow-ups' }
export const dynamic = 'force-dynamic'

function name(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { full_name?: string })?.full_name ?? 'Team member'
  return (value as { full_name?: string })?.full_name ?? 'Team member'
}

function avatarName(value: unknown) {
  if (Array.isArray(value)) return (value[0] as { name?: string })?.name ?? 'Awardee'
  return (value as { name?: string })?.name ?? 'Awardee'
}

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; outcome?: string; agent?: string }>
}) {
  const member = await requireMember()
  const query = await searchParams
  const staff = isStaff(member.membership.role)
  const [activity, queue, agents] = await Promise.all([
    listFollowups(member, {
      channel: query.channel,
      outcome: query.outcome,
      agentId: query.agent,
      limit: 200,
    }),
    getFollowupQueue(member),
    staff ? getAgentOptions(member) : Promise.resolve([]),
  ])

  const today = workdayDate()

  return (
    <div>
      <PageHeader
        eyebrow={staff ? 'Team activity' : 'Daily workspace'}
        title="Follow-ups"
        description="The due queue and the complete contact trail. Every entry is tied to the agent who recorded it."
        actions={
          <Link href="/awardees" className="btn btn-ember">
            <PhoneCall className="h-4 w-4" /> Open awardee book
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink/[0.07] px-4 py-3.5">
              <div>
                <h2 className="display text-lg">Due now</h2>
                <p className="text-[11px] text-muted">Scheduled today or earlier.</p>
              </div>
              <span className="num text-sm font-semibold text-ember">{queue.length}</span>
            </div>
            {queue.length ? (
              <div className="max-h-[620px] overflow-y-auto">
                {queue.map((row) => (
                  <Link
                    key={row.id}
                    href={`/awardees/${row.id}#record`}
                    className="flex items-center gap-3 border-t border-ink/[0.07] px-4 py-3 transition hover:bg-ink/[0.02] first:border-t-0"
                  >
                    <Avatar name={row.name} className="h-8 w-8 bg-sand text-ink" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{row.name}</p>
                      <p className="text-[10px] text-muted">
                        {row.next_followup_at ? formatDate(row.next_followup_at) : 'No date'} ·{' '}
                        {row.phone ?? 'no phone'}
                      </p>
                    </div>
                    <StatusChip status={(row.next_followup_at ?? '') < today ? 'overdue' : 'due'} />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="Nothing due" description="The queue is clear. You can still log proactive contacts from any awardee." icon={<CalendarClock className="h-5 w-5" />} />
            )}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-8">
          <Card className="p-4">
            <form className="grid gap-2 sm:grid-cols-4" method="get">
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Channel</span>
                <select className="select !h-9 text-xs" name="channel" defaultValue={query.channel ?? ''}>
                  <option value="">All channels</option>
                  {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Outcome</span>
                <select className="select !h-9 text-xs" name="outcome" defaultValue={query.outcome ?? ''}>
                  <option value="">All outcomes</option>
                  {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              {staff ? (
                <label className="block">
                  <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Agent</span>
                  <select className="select !h-9 text-xs" name="agent" defaultValue={query.agent ?? ''}>
                    <option value="">Everyone</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.full_name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button className="btn btn-primary mt-auto h-9 text-xs" type="submit">Apply filters</button>
            </form>
          </Card>

          {member.membership.role === 'team_leader' ? (
            <Banner tone="info">Leaders have a read-only view of follow-up activity. Only assigned agents and administrators can record outcomes.</Banner>
          ) : null}

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <h2 className="display text-lg">Activity log</h2>
                <p className="text-[11px] text-muted">{activity.total.toLocaleString()} recorded contacts · newest first</p>
              </div>
              <PhoneCall className="h-4 w-4 text-muted" />
            </div>
            {activity.rows.length ? (
              <div className="max-h-[760px] overflow-y-auto">
                {activity.rows.map((row: any) => (
                  <div key={row.id} className="flex gap-3 border-t border-ink/[0.07] px-4 py-3.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-ink/70">
                      {row.channel === 'call' ? <Phone className="h-3.5 w-3.5" /> : row.channel === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/awardees/${row.awardee_id}`} className="text-xs font-semibold hover:text-ember">
                          {avatarName(row.team_awardees)}
                        </Link>
                        <span className="text-[10px] text-muted">
                          {CHANNEL_LABELS[row.channel] ?? row.channel} · {OUTCOME_LABELS[row.outcome] ?? row.outcome}
                        </span>
                        {row.responded ? <StatusChip status="responded" label="Responded" /> : null}
                        {row.payment_expected ? <StatusChip status="interested" label="Payment expected" /> : null}
                      </div>
                      {row.notes ? <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/75">{row.notes}</p> : null}
                      <p className="mt-1 text-[10px] text-muted">
                        {formatDateTime(row.contacted_at)} · {name(row.team_memberships)}
                        {row.next_followup_at ? ` · next ${formatDate(row.next_followup_at)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No follow-up activity"
                description="Record a call, WhatsApp message or email outcome from an awardee profile."
                icon={<PhoneCall className="h-5 w-5" />}
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
