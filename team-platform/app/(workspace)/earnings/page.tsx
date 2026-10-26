import Link from 'next/link'
import { ArrowLeft, ArrowRight, ArrowUpRight, BadgeCent, Banknote, ChevronDown, Clock3, Wallet } from 'lucide-react'
import { Card, EmptyState, PageHeader, StatusChip } from '@/components/ui'
import { requireMember, isStaff } from '@/lib/auth'
import { getBalance, getCommissionEntries, getEarnings, listWithdrawals } from '@/lib/data'
import { formatDate, formatDateTime, formatMinor, titleCase } from '@/lib/format'

export const metadata = { title: 'Earnings' }
export const dynamic = 'force-dynamic'

function relationField(value: unknown, field: 'name' | 'full_name') {
  if (Array.isArray(value)) return (value[0] as Record<string, string> | undefined)?.[field] ?? ''
  return (value as Record<string, string> | null)?.[field] ?? ''
}

export default async function EarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const member = await requireMember()
  const { page: pageParam } = await searchParams
  const page = Math.max(Number.parseInt(pageParam ?? '1', 10) || 1, 1)
  const staff = isStaff(member.membership.role)
  const [ledger, personal, staffBalance, usd, withdrawals] = await Promise.all([
    staff ? Promise.resolve({ rows: [], total: 0, page, pageSize: 50, pages: 1 }) : getCommissionEntries(member, { page, pageSize: 50 }),
    staff ? Promise.resolve(null) : getEarnings(member),
    staff ? getBalance(member) : Promise.resolve(null),
    staff ? Promise.resolve(null) : getBalance(member, 'USD'),
    staff ? listWithdrawals(member) : Promise.resolve(null),
  ])
  const balance = personal?.balance ?? staffBalance
  const pendingOnPage = ledger.rows.filter((entry: any) => entry.status === 'pending').length
  const requestRows = withdrawals?.rows ?? personal?.withdrawals ?? []

  return (
    <div>
      <PageHeader
        title="Earnings"
      />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-4 bg-moss-soft/55 p-5">
        <div>
          <p className="label">Available to withdraw</p>
          <p className="num mt-2 text-3xl font-semibold tracking-[-0.03em] text-moss md:text-4xl">
            {formatMinor(balance?.withdrawable_minor ?? 0, 'NGN')}
          </p>
          <p className="mt-1 text-xs text-muted">Confirmed rewards, less amounts reserved by open requests.</p>
          {usd?.withdrawable_minor ? <p className="mt-1 text-xs font-medium text-moss">{formatMinor(usd.withdrawable_minor, 'USD')} also available in USD</p> : null}
        </div>
        <Link href="/withdrawals" className="btn btn-ember">
          <Wallet className="h-4 w-4" /> Withdraw
        </Link>
      </Card>

      {pendingOnPage > 0 ? (
        <p className="mt-3 rounded-xl border border-ink/[0.08] bg-white/50 px-3 py-2 text-xs text-muted">
          {pendingOnPage} pending commission {pendingOnPage === 1 ? 'entry is' : 'entries are'} shown on this page.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-12">
        {!staff ? <Card className="overflow-hidden lg:col-span-8">
          <div className="flex items-center justify-between px-4 py-3.5">
            <div>
              <h2 className="display text-lg">Commission ledger</h2>
              <p className="text-[11px] text-muted">{ledger.total.toLocaleString()} entries · append-only, with reversals shown as negative entries.</p>
            </div>
            <BadgeCent className="h-4 w-4 text-muted" />
          </div>
          {ledger.rows.length ? <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-xs">
                <thead>
                  <tr className="bg-ink/[0.02]">
                    {staff ? <th className="th">Agent</th> : null}
                    <th className="th">Awardee</th>
                    <th className="th">Entry</th>
                    <th className="th">Status</th>
                    <th className="th">Earned</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.rows.map((entry: any) => (
                    <tr key={entry.id} className="border-t border-ink/[0.06]">
                      {staff ? <td className="td">{relationField(entry.team_memberships, 'full_name') || 'Team member'}</td> : null}
                      <td className="td">
                        <Link href={`/awardees/${entry.awardee_id}`} className="font-medium hover:text-ember">
                          {relationField(entry.team_awardees, 'name') || 'Awardee'}
                        </Link>
                        <p className="text-[10px] text-muted">{titleCase(entry.payment_type ?? '')}</p>
                      </td>
                      <td className="td"><StatusChip status={entry.entry_type} /></td>
                      <td className="td"><StatusChip status={entry.status} /></td>
                      <td className="td text-muted">{formatDate(entry.earned_at)}</td>
                      <td className={`td text-right font-semibold ${entry.amount_minor < 0 ? 'text-red-700' : 'text-moss'}`}>
                        {entry.amount_minor < 0 ? '−' : '+'}{formatMinor(Math.abs(entry.amount_minor), entry.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-ink/[0.07] px-4 py-3 text-xs">
              <span className="text-muted">Page {ledger.page} of {ledger.pages}</span>
              <div className="flex gap-2">
                {ledger.page > 1 ? <Link className="btn btn-quiet px-3 py-2" href={`/earnings?page=${ledger.page - 1}`}><ArrowLeft className="h-3.5 w-3.5" /> Previous</Link> : null}
                {ledger.page < ledger.pages ? <Link className="btn btn-quiet px-3 py-2" href={`/earnings?page=${ledger.page + 1}`}>Next <ArrowRight className="h-3.5 w-3.5" /></Link> : null}
              </div>
            </div>
          </> : (
            <EmptyState title="No commissions yet" description={staff ? 'Commission entries will appear here as award payments are verified.' : 'A commission appears after a verified award payment on one of your assigned awardees.'} icon={<BadgeCent className="h-5 w-5" />} />
          )}
        </Card> : null}

        <div className={`space-y-4 ${staff ? 'lg:col-span-12' : 'lg:col-span-4'}`}>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <h2 className="display text-lg">Withdrawals</h2>
                <p className="text-[11px] text-muted">{staff ? 'Recent team payout requests.' : 'Your recent payout requests.'}</p>
              </div>
              <Banknote className="h-4 w-4 text-muted" />
            </div>
            {requestRows.length ? (
              <div>
                {requestRows.slice(0, 8).map((request: any) => (
                  <div key={request.id} className="border-t border-ink/[0.07] px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="num text-xs font-semibold">{formatMinor(request.amount_minor, request.currency)}</p>
                      <StatusChip status={request.status} />
                    </div>
                    <p className="mt-1 text-[10px] text-muted">
                      {staff && request.team_memberships?.full_name ? `${request.team_memberships.full_name} · ` : ''}
                      {formatDateTime(request.created_at)}
                      {request.team_withdrawal_payouts?.[0]?.transaction_reference ? ` · ${request.team_withdrawal_payouts[0].transaction_reference}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No requests" description="Withdrawal requests will appear here when submitted." icon={<Clock3 className="h-5 w-5" />} />
            )}
            <div className="border-t border-ink/[0.07] px-4 py-3">
              <Link href="/withdrawals" className="inline-flex items-center gap-1 text-[11px] font-semibold text-ember">Manage withdrawals <ArrowUpRight className="h-3 w-3" /></Link>
            </div>
          </Card>

          <details className="card group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="display text-lg">How commissions work</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 border-t border-ink/[0.07] pt-3">
              <ul className="space-y-2 text-[11px] leading-5 text-muted">
                <li>Verified award payments create commission entries.</li>
                <li>The agent assigned when payment is verified receives the commission.</li>
                <li>Refunds create linked reversal entries; ledger history is retained.</li>
                <li>Only confirmed available commission can be withdrawn.</li>
              </ul>
              {!staff && personal?.rules.length ? (
                <div className="mt-3 space-y-1.5 border-t border-ink/[0.07] pt-3">
                  {personal.rules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center justify-between gap-2 text-[10px]">
                      <span className="truncate text-muted">{rule.name}</span>
                      <span className="num font-semibold">{formatMinor(rule.commission_amount_minor, rule.commission_currency)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
