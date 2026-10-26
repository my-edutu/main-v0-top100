import Link from 'next/link'
import { ArrowUpRight, Banknote, Wallet } from 'lucide-react'
import { Card, EmptyState, PageHeader, StatusChip } from '@/components/ui'
import { WithdrawalRequestForm } from '@/components/withdrawal-request-form'
import { requireMember } from '@/lib/auth'
import { getBalance, listWithdrawals } from '@/lib/data'
import { formatDate, formatMinor } from '@/lib/format'

export const metadata = { title: 'Withdrawals' }
export const dynamic = 'force-dynamic'

export default async function WithdrawalsPage() {
  const member = await requireMember()
  if (member.membership.role === 'team_leader') {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Team finance" title="Withdrawals" description="Team leaders can review team awardees and contact activity. Agent commission payouts are requested by each agent." />
        <Card className="p-5"><p className="text-sm leading-6 text-muted">To request a payout, sign in with an active sales agent account. The agent withdrawal form collects the receiving bank name, account name and account number with each request.</p></Card>
      </div>
    )
  }
  const [balance, requests] = await Promise.all([getBalance(member), listWithdrawals(member)])
  const isAdmin = member.membership.role === 'super_admin'
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader eyebrow={isAdmin ? 'Platform finance' : 'Commission payout'} title="Withdrawals" description={isAdmin ? 'Review team payout requests and use the withdrawal form for your own available commission balance.' : 'Request an available commission payout to your bank account and track its review.'} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="p-4 md:p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream"><Wallet className="h-4 w-4 text-muted" /></span>
            <div><h2 className="display text-lg">Request a payout</h2><p className="text-xs text-muted">Bank details are entered securely with each request.</p></div>
          </div>
          <WithdrawalRequestForm balances={[balance]} minMinor={0} maxMinor={0} />
        </Card>
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-4 py-4">
            <div><h2 className="display text-lg">Request history</h2><p className="text-xs text-muted">{isAdmin ? 'Team payout requests' : 'Your submitted payout requests'}</p></div>
            <Banknote className="h-4 w-4 text-muted" />
          </div>
          {requests.rows.length ? (
            <ul>
              {requests.rows.map((row: any) => (
                <li key={row.id} className="border-t border-ink/[0.07] px-4 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="num text-sm font-semibold">{formatMinor(row.amount_minor, row.currency)}</p><p className="mt-1 text-xs text-muted">{isAdmin && row.team_memberships?.full_name ? `${row.team_memberships.full_name} · ` : ''}Requested {formatDate(row.created_at)}</p></div>
                    <StatusChip status={row.status} />
                  </div>
                  {row.admin_note ? <p className="mt-2 text-xs text-muted">{row.admin_note}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 pb-5"><EmptyState title="No payout requests yet" description="Once you have confirmed commission, submit a request and add the receiving bank details." icon={<Banknote className="h-5 w-5" />} /></div>
          )}
        </Card>
      </div>
      <p className="mt-4 text-center text-xs text-muted">Need to update your phone or account name? <Link className="font-semibold text-ember hover:underline" href="/profile">Edit profile <ArrowUpRight className="inline h-3 w-3" /></Link></p>
    </div>
  )
}
