import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  ChevronRight,
  Mail,
  MessageCircle,
  Phone,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import {
  Avatar,
  Banner,
  EmptyState,
  LinkButton,
  PageHeader,
  Progress,
  Stat,
  StatusChip,
} from '@/components/ui'
import {
  ActivityChart,
  CountryBars,
  FunnelStep,
  Ring,
} from '@/components/charts'
import {
  formatDate,
  formatMinor,
  OUTCOME_LABELS,
  relativeTime,
  titleCase,
} from '@/lib/format'
import { normalizePhone } from '@/lib/phone'
import { workdayDate } from '@/lib/workday'
import { WorkspaceRefresh } from '@/components/workspace-refresh'
import type { AwardeeDirectoryRow } from '@/lib/data'
import type { AdminDashboard, AgentDashboard, SessionMember } from '@/lib/types'

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date()),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function QueueRow({
  awardee,
  firstContact = false,
}: {
  awardee: AwardeeDirectoryRow
  firstContact?: boolean
}) {
  const overdue = Boolean(
    awardee.next_followup_at && awardee.next_followup_at < workdayDate(),
  )
  const phone = normalizePhone(awardee.phone, awardee.country || 'Nigeria')
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-ink/[0.07] px-4 py-4 first:border-t-0 sm:px-5">
      <Avatar
        name={awardee.name}
        className="h-10 w-10 shrink-0 bg-sand text-ink"
      />
      <div className="min-w-0 flex-1 basis-36">
        <Link
          href={`/awardees/${awardee.id}`}
          className="block text-sm font-medium hover:text-ember"
        >
          {awardee.name}
        </Link>
        <p className="mt-1 break-all text-xs text-muted">
          {awardee.country || 'Country unavailable'} ·{' '}
          {awardee.phone || awardee.email || 'No contact details'}
        </p>
        {!firstContact && awardee.next_followup_at ? (
          <p
            className={`mt-1 text-xs ${overdue ? 'text-red-700' : 'text-muted'}`}
          >
            {overdue ? 'Overdue' : 'Due today'} ·{' '}
            {formatDate(awardee.next_followup_at)}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        {phone.ok ? (
          <>
            <a
              href={`tel:${phone.e164}`}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 text-muted hover:bg-paper"
              aria-label={`Call ${awardee.name}`}
            >
              <Phone className="h-4 w-4" />
            </a>
            <a
              href={`https://wa.me/${phone.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 text-moss hover:bg-moss-soft"
              aria-label={`WhatsApp ${awardee.name}`}
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          </>
        ) : null}
        <Link
          href={`/awardees/${awardee.id}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-ember hover:bg-ember/5"
          aria-label={`Open follow-up for ${awardee.name}`}
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}

export function AgentDashboardView({
  member,
  dashboard,
  queue,
  uncontacted,
}: {
  member: SessionMember
  dashboard: AgentDashboard
  queue: AwardeeDirectoryRow[]
  uncontacted: AwardeeDirectoryRow[]
}) {
  const due = dashboard.due_today + dashboard.overdue
  const metrics = [
    {
      label: 'My awardees',
      value: dashboard.assigned,
      hint: 'Active assignments',
      href: '/awardees',
    },
    {
      label: 'First contact',
      value: dashboard.not_contacted,
      hint: 'Ready to reach out',
      href: '/awardees?contact=not_contacted&payment=unpaid',
    },
    {
      label: 'Follow-ups today',
      value: due,
      hint: `${dashboard.overdue} overdue`,
      href: '/follow-ups',
      urgent: dashboard.overdue > 0,
    },
    {
      label: 'Verified paid',
      value: dashboard.paid,
      hint: `${dashboard.conversion_rate}% conversion`,
      href: '/awardees?payment=paid',
    },
  ]
  return (
    <div className="dashboard-page space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-muted">
            {greeting()}, {member.membership.full_name.split(' ')[0]}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your sales desk
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
            {due
              ? `${due} follow-ups need your attention. Start with overdue awardees.`
              : 'Your scheduled follow-ups are clear. Make your next first contact.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WorkspaceRefresh />
          <LinkButton href="/awardees" variant="ember">
            My awardees <ArrowUpRight className="h-4 w-4" />
          </LinkButton>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="group bg-white p-4 transition hover:bg-cream sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">{metric.label}</p>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted/60 group-hover:text-ember" />
            </div>
            <p
              className={`num mt-3 text-3xl font-medium tracking-tight ${metric.urgent ? 'text-red-700' : 'text-ink'}`}
            >
              {metric.value.toLocaleString()}
            </p>
            <p className="mt-2 text-xs text-muted">{metric.hint}</p>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[0.07] px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-ember">
                  <CalendarClock className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-base font-medium">Needs attention</h2>
                  <p className="mt-1 text-xs text-muted">
                    Due and overdue · earliest follow-up first
                  </p>
                </div>
              </div>
              <Link
                href="/awardees?followup=due&sort=followup"
                className="inline-flex min-h-11 items-center text-sm font-medium text-ember"
              >
                View due today <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            {queue.length ? (
              queue
                .slice(0, 6)
                .map((awardee) => (
                  <QueueRow key={awardee.id} awardee={awardee} />
                ))
            ) : (
              <EmptyState
                title="You're up to date"
                description="No unpaid awardees need a scheduled follow-up today."
                action={
                  <LinkButton
                    href="/awardees?contact=not_contacted&payment=unpaid"
                    size="sm"
                  >
                    Make a first contact
                  </LinkButton>
                }
              />
            )}
          </section>
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.07] px-4 py-4 sm:px-5">
              <div>
                <h2 className="text-base font-medium">
                  Ready for first contact
                </h2>
                <p className="mt-1 text-xs text-muted">
                  Unpaid awardees you haven&apos;t contacted yet
                </p>
              </div>
              <Link
                href="/awardees?contact=not_contacted&payment=unpaid"
                className="inline-flex min-h-11 items-center text-sm font-medium text-ember"
              >
                View all <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            {uncontacted.length ? (
              uncontacted
                .slice(0, 5)
                .map((awardee) => (
                  <QueueRow key={awardee.id} awardee={awardee} firstContact />
                ))
            ) : (
              <EmptyState
                title={
                  dashboard.assigned
                    ? 'First contacts complete'
                    : 'Your worklist is ready for assignments'
                }
                description={
                  dashboard.assigned
                    ? 'Review scheduled follow-ups to keep conversations moving.'
                    : 'Your administrator can assign awardees from Team Operations.'
                }
              />
            )}
          </section>
        </div>
        <aside className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-ink/10 bg-ink p-5 text-cream">
            <div className="flex items-center justify-between">
              <p className="text-sm text-cream/75">Available commission</p>
              <Wallet className="h-5 w-5 text-cream/60" />
            </div>
            <p className="num mt-4 text-3xl font-medium tracking-tight">
              {formatMinor(
                dashboard.balance.withdrawable_minor,
                dashboard.balance.currency,
              )}
            </p>
            <p className="mt-2 text-xs leading-5 text-cream/65">
              Cleared commission available to withdraw.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
              <div>
                <p className="text-xs text-cream/60">Pending</p>
                <p className="num mt-1 text-sm">
                  {formatMinor(
                    dashboard.balance.pending_commission_minor,
                    dashboard.balance.currency,
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-cream/60">Total earned</p>
                <p className="num mt-1 text-sm">
                  {formatMinor(
                    dashboard.balance.total_earned_minor,
                    dashboard.balance.currency,
                  )}
                </p>
              </div>
            </div>
            <Link
              href="/withdrawals"
              className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-medium text-ink hover:bg-orange-50"
            >
              Request withdrawal <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/earnings"
              className="mt-2 flex min-h-11 items-center justify-center text-sm text-cream/80 hover:text-white"
            >
              View earnings history
            </Link>
          </section>
          <section className="card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-medium">Recent activity</h2>
              <Link
                href="/follow-ups"
                className="inline-flex min-h-11 items-center text-xs font-medium text-ember"
              >
                View history
              </Link>
            </div>
            {dashboard.recent_activity.length ? (
              <div className="space-y-5">
                {dashboard.recent_activity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-muted">
                      {activity.channel === 'call' ? (
                        <Phone className="h-3.5 w-3.5" />
                      ) : activity.channel === 'whatsapp' ? (
                        <MessageCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {activity.awardee_name}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {OUTCOME_LABELS[activity.outcome] ??
                          titleCase(activity.outcome)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {relativeTime(activity.contacted_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-muted">
                Record a call, email or WhatsApp outcome to start your activity
                history.
              </p>
            )}
          </section>
          <section className="rounded-2xl border border-orange-200/70 bg-orange-50/70 p-5">
            <h2 className="text-sm font-medium">Keep the next step clear</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Open an awardee after reaching out. Record the outcome and set a
              follow-up date so the next conversation is easy to pick up.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function RankingTable({ ranking }: { ranking: AdminDashboard['ranking'] }) {
  if (!ranking.length) {
    return <EmptyState title="No agents yet" description="Invite agents to start measuring performance." icon={<UserPlus className="h-5 w-5" />} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px]">
        <thead>
          <tr className="border-b border-ink/[0.07]">
            <th className="th">Agent</th>
            <th className="th text-right">Assigned</th>
            <th className="th text-right">Paid</th>
            <th className="th text-right">Conversion</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((agent, index) => (
            <tr key={agent.id} className="table-row">
              <td className="td">
                <div className="flex items-center gap-2.5">
                  <span className="num w-4 text-[10px] text-muted">{String(index + 1).padStart(2, '0')}</span>
                  <Avatar name={agent.full_name} className="h-7 w-7 bg-sand text-ink" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{agent.full_name}</p>
                    <p className="truncate text-[10px] text-muted">{agent.email}</p>
                  </div>
                </div>
              </td>
              <td className="td num text-right">{agent.assigned}</td>
              <td className="td num text-right">{agent.paid}</td>
              <td className="td text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="hidden w-16 sm:block">
                    <Progress value={agent.conversion_rate} />
                  </div>
                  <span className="num text-xs font-semibold">{agent.conversion_rate}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AdminDashboardView({
  member,
  dashboard,
  reconciliation,
}: {
  member: SessionMember
  dashboard: AdminDashboard
  reconciliation?: { missing: number; reconciled: number; missingReversals: number }
}) {
  return (
    <div className="dashboard-page stagger space-y-6">
      <PageHeader
        eyebrow={`${greeting()}, ${member.membership.full_name.split(' ')[0]} · Operations`}
        title="Campaign control room."
        description="Assignments, verified payments, commissions and payouts — one auditable view of the sales campaign."
        actions={
          <LinkButton href="/admin/team-operations" variant="ember">
            <Users className="h-4 w-4" /> Awardee worklist
          </LinkButton>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-cream md:p-7">
          <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-ember/20 blur-[80px]" />
          <div className="relative">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/40">
              Verified award payments
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="num text-4xl font-semibold tracking-[-0.04em] md:text-5xl">{dashboard.paid.toLocaleString()}</p>
              <p className="pb-1.5 text-xs text-cream/45">
                of {dashboard.total_awardees.toLocaleString()} awardees · {dashboard.conversion_rate}% conversion
              </p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-[10px] text-cream/35">Assigned</p>
                <p className="num mt-1 text-sm font-semibold">{dashboard.assigned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-cream/35">Unassigned</p>
                <p className="num mt-1 text-sm font-semibold">{dashboard.unassigned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-cream/35">Pending review</p>
                <p className="num mt-1 text-sm font-semibold">{dashboard.withdrawal_queue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-cream/35">Active agents</p>
                <p className="num mt-1 text-sm font-semibold">{dashboard.active_agents.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href="/admin/withdrawals" variant="soft" size="sm" className="bg-cream/10 text-cream hover:bg-cream/20">
                Review payouts
              </LinkButton>
              <LinkButton href="/admin/payments" variant="soft" size="sm" className="bg-cream/10 text-cream hover:bg-cream/20">
                Reconcile payments
              </LinkButton>
            </div>
          </div>
        </div>
        <div className="card flex items-center gap-5 p-5">
          <Ring value={dashboard.conversion_rate} label="Conversion" sublabel="paid / total" tone="ember" size={118} />
          <div className="min-w-0">
            <p className="label">Funnel</p>
            <div className="mt-3 space-y-3">
              <FunnelStep label="Contacted" value={dashboard.ranking.reduce((sum, row) => sum + row.contacted, 0)} total={dashboard.total_awardees} tone="ink" />
              <FunnelStep label="Paid" value={dashboard.paid} total={dashboard.total_awardees} tone="moss" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total awardees" value={dashboard.total_awardees.toLocaleString()} hint={`${dashboard.assigned.toLocaleString()} assigned`} />
        <Stat label="Verified payments" value={dashboard.paid.toLocaleString()} hint={`${dashboard.unpaid.toLocaleString()} unpaid`} accent="moss" />
        <Stat label="Commissions generated" value={formatMinor(dashboard.commissions_generated_minor)} hint={`${formatMinor(dashboard.pending_commissions_minor)} pending`} accent="ember" />
        <Stat label="Outstanding liability" value={formatMinor(dashboard.outstanding_liability_minor)} hint={`${formatMinor(dashboard.withdrawn_minor)} withdrawn`} />
      </div>

      {reconciliation && (reconciliation.missing > 0 || reconciliation.missingReversals > 0) ? (
        <Banner tone="warning">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Reconciliation needs attention.</span>
            <span>
              {reconciliation.missing} paid order{reconciliation.missing === 1 ? '' : 's'} without a commission
              {reconciliation.missingReversals > 0 ? `, ${reconciliation.missingReversals} refund without a reversal` : ''}.
            </span>
            <Link href="/admin/payments" className="ml-auto font-semibold underline underline-offset-4">
              Open reconciliation
            </Link>
          </div>
        </Banner>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card p-4 lg:col-span-7">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <h2 className="display text-lg">Team activity</h2>
              <p className="mt-0.5 text-[11px] text-muted">Follow-ups logged and commissions earned.</p>
            </div>
            <Link href="/admin/reports" className="text-[11px] font-semibold text-ember hover:underline">
              Reports
            </Link>
          </div>
          <ActivityChart data={dashboard.activity} />
        </section>

        <section className="card overflow-hidden lg:col-span-5">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <h2 className="display text-lg">Agent ranking</h2>
              <p className="mt-0.5 text-[11px] text-muted">By verified conversions.</p>
            </div>
            <Link href="/admin/team" className="text-[11px] font-semibold text-ember hover:underline">
              Manage
            </Link>
          </div>
          <RankingTable ranking={dashboard.ranking} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card p-4 lg:col-span-4">
          <h2 className="display text-lg">Country performance</h2>
          <p className="mt-0.5 text-[11px] text-muted">Nigeria is the priority campaign.</p>
          <div className="mt-4">
            {dashboard.countries.length ? <CountryBars countries={dashboard.countries} /> : <p className="text-xs text-muted">No country data yet.</p>}
          </div>
        </section>
        <section className="card p-4 lg:col-span-4">
          <h2 className="display text-lg">Operations</h2>
          <div className="mt-3 space-y-2">
            {[
              { href: '/admin/awardees?assignment=unassigned', label: 'Unassigned awardees', value: dashboard.unassigned, icon: Users },
              { href: '/admin/payments', label: 'Commissions to reconcile', value: reconciliation?.missing ?? 0, icon: TrendingUp },
              { href: '/admin/withdrawals?status=requested', label: 'Withdrawals awaiting review', value: dashboard.withdrawal_queue, icon: Wallet },
              { href: '/admin/team-operations', label: 'Awardee worklist', value: 'Open', icon: Users },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-xl border border-ink/[0.07] px-3 py-2.5 transition hover:border-ink/15 hover:bg-ink/[0.02]">
                <item.icon className="h-4 w-4 text-ember" />
                <span className="flex-1 text-xs font-medium">{item.label}</span>
                <span className="num text-xs font-semibold">{item.value}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted" />
              </Link>
            ))}
          </div>
        </section>
        <section className="card p-4 lg:col-span-4">
          <h2 className="display text-lg">Financial position</h2>
          <div className="mt-3 space-y-3 text-xs">
            <div className="flex justify-between gap-3 border-b border-ink/[0.07] pb-2.5">
              <span className="text-muted">Confirmed commissions</span>
              <span className="num font-semibold">{formatMinor(dashboard.confirmed_commissions_minor)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-ink/[0.07] pb-2.5">
              <span className="text-muted">Withdrawals paid</span>
              <span className="num font-semibold">{formatMinor(dashboard.withdrawn_minor)}</span>
            </div>
            <div className="flex justify-between gap-3 border-b border-ink/[0.07] pb-2.5">
              <span className="text-muted">Outstanding liability</span>
              <span className="num font-semibold text-ember">{formatMinor(dashboard.outstanding_liability_minor)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted">Pending commissions</span>
              <span className="num font-semibold">{formatMinor(dashboard.pending_commissions_minor)}</span>
            </div>
          </div>
          <p className="mt-4 text-[10px] leading-4 text-muted">
            Balances are derived from the append-only commission ledger, never from an editable agent balance.
          </p>
        </section>
      </div>
    </div>
  )
}

export function LeaderDashboardView({
  member,
  dashboard,
  awardees,
}: {
  member: SessionMember
  dashboard: {
    total_awardees: number
    paid: number
    unpaid: number
    pending_verification: number
    commissions_generated_minor: number
  }
  awardees: AwardeeDirectoryRow[]
}) {
  return (
    <div className="dashboard-page stagger space-y-6">
      <header className="mb-2">
        <h1 className="display text-2xl leading-tight sm:text-3xl">{greeting()}, {titleCase(member.membership.full_name.split(' ')[0])}.</h1>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/awardees" className="block rounded-2xl focus-visible:outline-offset-4" aria-label="View team awardees">
          <Stat className="dashboard-stat h-full transition-colors hover:border-ink/[0.16]" label="Awardees" value={dashboard.total_awardees.toLocaleString()} />
        </Link>
        <Link href="/earnings" className="block rounded-2xl focus-visible:outline-offset-4" aria-label="View team rewards">
          <Stat className="dashboard-stat dashboard-stat-reward h-full transition-colors hover:border-ink/[0.16]" label="Rewards" value={formatMinor(dashboard.commissions_generated_minor)} accent="moss" />
        </Link>
      </div>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <div>
            <h2 className="display text-lg">Awardees</h2>
            <p className="mt-0.5 text-xs text-muted">A few people to contact.</p>
          </div>
          <Link href="/awardees" className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-ember hover:underline">
            View all <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {awardees.length ? (
          <div>
            {awardees.map((awardee) => (
              <Link key={awardee.id} href={`/awardees/${awardee.id}`} className="flex items-center gap-3 border-t border-ink/[0.07] px-4 py-3 transition hover:bg-ink/[0.02] sm:px-5">
                <Avatar name={awardee.name} className="h-9 w-9 bg-sand text-ink" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{awardee.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">{awardee.country || awardee.email || awardee.phone || 'No contact details'}</p>
                </div>
                <StatusChip status={awardee.payment_status} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="No awardees yet" description="Awardees added to this team will appear here." illustration="/illustrations/empty-awardees.svg" />
        )}
        {awardees.length ? (
          <div className="border-t border-ink/[0.07] px-4 py-3 text-center sm:px-5">
            <Link href="/awardees" className="text-xs font-semibold text-ember hover:underline">View all awardees</Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
