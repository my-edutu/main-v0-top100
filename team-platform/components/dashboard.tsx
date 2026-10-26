import Link from 'next/link'
import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Mail,
  MessageCircle,
  Phone,
  Target,
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
  Money,
  PageHeader,
  Progress,
  Stat,
  StatusChip,
} from '@/components/ui'
import { ActivityChart, CountryBars, FunnelStep, Ring } from '@/components/charts'
import { formatDate, formatMinor, OUTCOME_LABELS, relativeTime, titleCase } from '@/lib/format'
import type { AwardeeDirectoryRow } from '@/lib/data'
import type { AdminDashboard, AgentDashboard, Balance, SessionMember } from '@/lib/types'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function whatsappHref(phone: string | null) {
  if (!phone) return null
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

function QueueRow({ awardee }: { awardee: AwardeeDirectoryRow }) {
  const overdue = awardee.next_followup_at
    ? new Date(`${awardee.next_followup_at}T23:59:59`) < new Date()
    : false
  return (
    <div className="flex items-center gap-3 border-t border-ink/[0.07] px-4 py-3 first:border-t-0">
      <Avatar name={awardee.name} className="h-8 w-8 bg-sand text-ink" />
      <div className="min-w-0 flex-1">
        <Link href={`/awardees/${awardee.id}`} className="block truncate text-[13px] font-semibold hover:text-ember">
          {awardee.name}
        </Link>
        <p className="mt-0.5 truncate text-[11px] text-muted">
          {awardee.phone ?? awardee.email ?? 'No contact details'}
          {awardee.next_followup_at ? ` · due ${formatDate(awardee.next_followup_at)}` : ''}
        </p>
      </div>
      <StatusChip status={overdue ? 'overdue' : 'due'} label={overdue ? 'Overdue' : 'Due'} />
      <div className="flex items-center gap-1">
        {awardee.phone ? (
          <a
            href={`tel:${awardee.phone}`}
            className="rounded-lg p-2 text-muted transition hover:bg-ink/5 hover:text-ink"
            aria-label={`Call ${awardee.name}`}
          >
            <Phone className="h-3.5 w-3.5" />
          </a>
        ) : null}
        {whatsappHref(awardee.phone) ? (
          <a
            href={whatsappHref(awardee.phone)!}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-muted transition hover:bg-moss-soft hover:text-moss"
            aria-label={`WhatsApp ${awardee.name}`}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  )
}

function BalanceHero({ balance, name }: { balance: Balance; name: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink p-5 text-cream md:p-7">
      <div className="absolute -right-24 -top-28 h-64 w-64 rounded-full bg-ember/20 blur-[80px]" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cream/40">
              Available commission
            </p>
            <p className="num mt-2 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
              {formatMinor(balance.withdrawable_minor, balance.currency)}
            </p>
            <p className="mt-2 text-[11px] text-cream/45">
              {name.split(' ')[0]}, this is cleared and ready to request.
            </p>
          </div>
          <Link
            href="/withdrawals"
            className="hidden rounded-full bg-cream px-4 py-2 text-[11px] font-semibold text-ink transition hover:bg-ember hover:text-white sm:inline-flex"
          >
            Request withdrawal
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-[11px]">
          <div>
            <p className="text-cream/35">Pending</p>
            <p className="num mt-1 font-semibold">{formatMinor(balance.pending_commission_minor, balance.currency)}</p>
          </div>
          <div>
            <p className="text-cream/35">Withdrawn</p>
            <p className="num mt-1 font-semibold">{formatMinor(balance.withdrawn_minor, balance.currency)}</p>
          </div>
          <div>
            <p className="text-cream/35">Total earned</p>
            <p className="num mt-1 font-semibold">{formatMinor(balance.total_earned_minor, balance.currency)}</p>
          </div>
        </div>
        <Link
          href="/withdrawals"
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-cream py-2.5 text-[11px] font-semibold text-ink sm:hidden"
        >
          Request withdrawal
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
  const conversion = dashboard.conversion_rate
  const queueRows = queue.slice(0, 5)
  return (
    <div className="dashboard-page stagger space-y-6">
      <PageHeader
        eyebrow={`${greeting()}, ${member.membership.full_name.split(' ')[0]}`}
        title="Your follow-up desk."
        description={
          <>
            {dashboard.due_today + dashboard.overdue > 0 ? (
              <span className="font-medium text-ink">
                {dashboard.due_today + dashboard.overdue} follow-up
                {dashboard.due_today + dashboard.overdue === 1 ? '' : 's'} need attention today.
              </span>
            ) : (
              'You are up to date on scheduled follow-ups.'
            )}{' '}
            Work your queue, record the outcome, keep the ledger clean.
          </>
        }
        actions={
          <>
            <LinkButton href="/awardees?contact=not_contacted" variant="ghost">
              <Users className="h-4 w-4" /> Not contacted
            </LinkButton>
            <LinkButton href="/awardees" variant="ember">
              My awardees <ArrowUpRight className="h-4 w-4" />
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <BalanceHero balance={dashboard.balance} name={member.membership.full_name} />
        <div className="card flex items-center gap-5 p-5 md:p-6">
          <Ring value={conversion} label="Conversion" sublabel="paid / assigned" tone="ember" size={124} />
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="label">Conversion</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                {dashboard.paid} verified payment{dashboard.paid === 1 ? '' : 's'} from {dashboard.assigned} assigned awardees.
              </p>
            </div>
            <Progress value={conversion} />
            <div className="flex items-center gap-2 text-[11px] text-muted">
              <Target className="h-3.5 w-3.5 text-ember" />
              Quality beats volume. No payment, no commission.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Assigned" value={dashboard.assigned} hint={`${dashboard.contacted} contacted`} />
        <Stat label="Not contacted" value={dashboard.not_contacted} hint="Ready for first touch" accent="ember" />
        <Stat label="Paid & verified" value={dashboard.paid} hint={`${dashboard.unpaid} still unpaid`} accent="moss" />
        <Stat
          label="Due / overdue"
          value={`${dashboard.due_today} / ${dashboard.overdue}`}
          hint={`${dashboard.pending_verification} pending verification`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card overflow-hidden lg:col-span-7">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div>
              <h2 className="display text-lg">Follow-up queue</h2>
              <p className="mt-0.5 text-[11px] text-muted">Overdue and due today, oldest first.</p>
            </div>
            <Link href="/follow-ups" className="text-[11px] font-semibold text-ember hover:underline">
              View all
            </Link>
          </div>
          {queueRows.length ? (
            <div>
              {queueRows.map((awardee) => (
                <QueueRow key={awardee.id} awardee={awardee} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Queue is clear"
              description="Nothing needs a follow-up today. Choose an awardee to contact next."
              action={<LinkButton href="/awardees?contact=not_contacted" size="sm">Find someone to call</LinkButton>}
              illustration="/illustrations/empty-follow-ups.svg"
            />
          )}
        </section>

        <section className="card p-4 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="display text-lg">Recent activity</h2>
              <p className="mt-0.5 text-[11px] text-muted">Your last recorded outcomes.</p>
            </div>
            <Link href="/follow-ups" className="text-[11px] font-semibold text-ember hover:underline">
              History
            </Link>
          </div>
          {dashboard.recent_activity.length ? (
            <div className="space-y-3">
              {dashboard.recent_activity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex gap-3">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-muted">
                    {activity.channel === 'call' ? (
                      <Phone className="h-3 w-3" />
                    ) : activity.channel === 'whatsapp' ? (
                      <MessageCircle className="h-3 w-3" />
                    ) : (
                      <Mail className="h-3 w-3" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">
                      {activity.awardee_name}
                      <span className="ml-1.5 font-normal text-muted">
                        · {OUTCOME_LABELS[activity.outcome] ?? titleCase(activity.outcome)}
                      </span>
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-muted">
                      {activity.notes || `${titleCase(activity.channel)} recorded`}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted">{relativeTime(activity.contacted_at)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No activity yet" description="Your contact notes will appear here." illustration="/illustrations/empty-activity.svg" />
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="card overflow-hidden lg:col-span-5">
          <div className="flex items-center justify-between px-4 py-3.5">
            <h2 className="display text-lg">Commission ledger</h2>
            <Link href="/earnings" className="text-[11px] font-semibold text-ember hover:underline">
              Earnings
            </Link>
          </div>
          {dashboard.recent_commissions.length ? (
            <div>
              {dashboard.recent_commissions.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 border-t border-ink/[0.07] px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-moss-soft text-moss">
                    <CircleDollarSign className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{entry.awardee_name}</p>
                    <p className="text-[10px] text-muted">
                      {entry.entry_type === 'reversal' ? 'Reversal' : 'Verified payment'} · {formatDate(entry.earned_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`num text-xs font-semibold ${entry.amount_minor < 0 ? 'text-red-700' : 'text-moss'}`}>
                      {entry.amount_minor < 0 ? '−' : '+'}
                      {formatMinor(Math.abs(entry.amount_minor), entry.currency)}
                    </p>
                    <StatusChip status={entry.status} className="mt-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No rewards yet" description="Commission appears here after an award payment is verified." illustration="/illustrations/empty-rewards.svg" />
          )}
        </section>

        <section className="card p-4 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-lg">Withdrawals</h2>
            <Link href="/withdrawals" className="text-[11px] font-semibold text-ember hover:underline">
              Manage
            </Link>
          </div>
          {dashboard.recent_withdrawals.length ? (
            <div className="space-y-3">
              {dashboard.recent_withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="flex items-center justify-between gap-2">
                  <div>
                    <p className="num text-xs font-semibold">
                      {formatMinor(withdrawal.amount_minor, withdrawal.currency)}
                    </p>
                    <p className="text-[10px] text-muted">{formatDate(withdrawal.created_at)}</p>
                  </div>
                  <StatusChip status={withdrawal.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No withdrawals yet" description="Your withdrawal requests will appear here." illustration="/illustrations/empty-wallet.svg" />
          )}
        </section>

        <section className="card p-4 lg:col-span-3">
          <h2 className="display text-lg">Start here</h2>
          <p className="mt-1 text-[11px] leading-5 text-muted">First contact makes the difference.</p>
          {uncontacted.length ? (
            <div className="mt-4 space-y-3">
              {uncontacted.slice(0, 4).map((awardee) => (
                <div key={awardee.id} className="flex items-center gap-2">
                  <Avatar name={awardee.name} className="h-7 w-7 bg-sand text-ink" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/awardees/${awardee.id}`} className="block truncate text-[11px] font-medium hover:text-ember">
                      {awardee.name}
                    </Link>
                    <p className="truncate text-[10px] text-muted">{awardee.country ?? 'No country'}</p>
                  </div>
                  {awardee.phone ? (
                    <a href={`tel:${awardee.phone}`} className="rounded-lg p-1.5 text-muted hover:bg-ink/5" aria-label={`Call ${awardee.name}`}>
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-[11px] text-muted">Everyone has been contacted. Keep follow-ups warm.</p>
          )}
          <Link href="/awardees" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-ember">
            Open my awardees <ChevronRight className="h-3 w-3" />
          </Link>
        </section>
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
