import Link from 'next/link'
import {
  CheckCircle2,
  Filter,
  Mail,
  MessageCircle,
  Phone,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Avatar,
  EmptyState,
  PageHeader,
  Pagination,
  StatusChip,
} from '@/components/ui'
import { formatDate, formatMinor, PAYMENT_LABELS } from '@/lib/format'
import { isStaff } from '@/lib/auth'
import {
  getAgentOptions,
  getCountries,
  listAwardees,
  type AwardeeDirectoryRow,
  type AwardeeFilters,
} from '@/lib/data'
import type { SessionMember } from '@/lib/types'

export type AwardeeSearchParams = {
  search?: string
  payment?: string
  contact?: string
  country?: string
  agent?: string
  assignment?: string
  followup?: string
  sort?: string
  page?: string
}

function toFilters(params: AwardeeSearchParams): AwardeeFilters {
  return {
    search: params.search,
    paymentStatus: params.payment ? params.payment.split(',') : undefined,
    contactStatus: params.contact,
    country: params.country,
    agentId: params.agent,
    assignment: (params.assignment as AwardeeFilters['assignment']) ?? '',
    followUp: (params.followup as AwardeeFilters['followUp']) ?? '',
    sort: (params.sort as AwardeeFilters['sort']) ?? 'name',
    page: Math.max(Number(params.page ?? 1) || 1, 1),
    pageSize: 25,
  }
}

function followupState(row: AwardeeDirectoryRow) {
  if (!row.next_followup_at) return 'none'
  const today = new Date().toISOString().slice(0, 10)
  if (row.next_followup_at < today) return 'overdue'
  if (row.next_followup_at === today) return 'due'
  return 'scheduled'
}

function hasPaymentIdentity(row: AwardeeDirectoryRow) {
  return Boolean(row.public_awardee_id || row.profile_id)
}

function whatsapp(phone: string | null) {
  return phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : null
}

function Actions({ row }: { row: AwardeeDirectoryRow }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      {row.phone ? (
        <a
          href={`tel:${row.phone}`}
          className="rounded-lg p-2 text-muted transition hover:bg-ink/5 hover:text-ink"
          aria-label={`Call ${row.name}`}
          title="Call"
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {whatsapp(row.phone) ? (
        <a
          href={whatsapp(row.phone)!}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg p-2 text-muted transition hover:bg-moss-soft hover:text-moss"
          aria-label={`WhatsApp ${row.name}`}
          title="WhatsApp"
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </a>
      ) : null}
      {row.email ? (
        <Link
          href={`/awardees/${row.id}?compose=email`}
          className="rounded-lg p-2 text-muted transition hover:bg-sky-50 hover:text-sky-700"
          aria-label={`Email ${row.name}`}
          title="Email"
        >
          <Mail className="h-3.5 w-3.5" />
        </Link>
      ) : null}
      <Link
        href={`/awardees/${row.id}#record`}
        className="ml-1 rounded-full border border-ink/10 px-2.5 py-1.5 text-[10px] font-semibold transition hover:border-ember/40 hover:text-ember"
      >
        Log
      </Link>
    </div>
  )
}

function FilterBar({
  member,
  params,
  countries,
  agents,
  basePath,
}: {
  member: SessionMember
  params: AwardeeSearchParams
  countries: string[]
  agents: Array<{ id: string; full_name: string; workload: number }>
  basePath: string
}) {
  const staff = isStaff(member.membership.role)
  const activeFilters = [
    params.payment,
    params.contact,
    params.followup,
    params.country,
    params.agent,
    params.assignment,
  ].filter(Boolean).length
  return (
    <form method="get" action={basePath} className="card relative z-10 mb-4 p-3 md:p-4">
      <div className="flex items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            name="search"
            defaultValue={params.search ?? ''}
            placeholder="Search name, email or phone"
            aria-label="Search awardees"
          />
        </div>
        <details className="group relative shrink-0">
          <summary
            aria-label={activeFilters ? `Open filters, ${activeFilters} active` : 'Open filters'}
            className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-ink/10 bg-paper px-3 text-sm font-medium text-ink transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember [&::-webkit-details-marker]:hidden"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters ? <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">{activeFilters}</span> : null}
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 max-h-[min(75dvh,32rem)] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Filter awardees</p>
              <span className="text-[11px] text-muted">{activeFilters ? `${activeFilters} active` : 'All records'}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select className="select min-w-0 text-xs" name="payment" defaultValue={params.payment ?? ''} aria-label="Payment status">
                <option value="">All payments</option>
                <option value="paid">Paid & verified</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending verification</option>
                <option value="refunded">Refunded</option>
              </select>
              <select className="select min-w-0 text-xs" name="contact" defaultValue={params.contact ?? ''} aria-label="Contact status">
                <option value="">All contact states</option>
                <option value="not_contacted">Not contacted</option>
                <option value="contacted">Contacted</option>
                <option value="responded">Responded</option>
              </select>
              <select className="select min-w-0 text-xs" name="followup" defaultValue={params.followup ?? ''} aria-label="Follow-up state">
                <option value="">Any follow-up</option>
                <option value="due">Due today</option>
                <option value="overdue">Overdue</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <select className="select min-w-0 text-xs" name="country" defaultValue={params.country ?? ''} aria-label="Country">
                <option value="">All countries</option>
                {countries.map((country) => <option key={country} value={country}>{country}</option>)}
              </select>
              {staff ? (
                <select className="select min-w-0 text-xs" name="agent" defaultValue={params.agent ?? ''} aria-label="Agent">
                  <option value="">All agents</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}
                </select>
              ) : null}
              {staff ? (
                <select className="select min-w-0 text-xs" name="assignment" defaultValue={params.assignment ?? ''} aria-label="Assignment">
                  <option value="">Any assignment</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              ) : null}
              <select className="select min-w-0 text-xs" name="sort" defaultValue={params.sort ?? 'name'} aria-label="Sort">
                <option value="name">Name A–Z</option>
                <option value="newest">Newest first</option>
                <option value="followup">Next follow-up</option>
                <option value="last_contact">Last contact</option>
              </select>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Link href={basePath} className="flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/[0.04] hover:text-ink">Reset</Link>
              <button className="btn btn-primary min-h-11 flex-1" type="submit"><Filter className="h-4 w-4" /> Apply filters</button>
            </div>
            <p className="mt-2 flex items-center gap-1 px-1 text-[10px] text-muted"><SlidersHorizontal className="h-3 w-3 shrink-0" /> Nigeria first in the assignment engine</p>
          </div>
        </details>
      </div>
    </form>
  )
}

function AwardeeCard({ row, staff }: { row: AwardeeDirectoryRow; staff: boolean }) {
  const followup = followupState(row)
  return (
    <div className="border-t border-ink/[0.07] p-4 first:border-t-0">
      <div className="flex items-start gap-3">
        <Avatar name={row.name} className="h-9 w-9 bg-sand text-ink" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/awardees/${row.id}`} className="truncate text-sm font-semibold hover:text-ember">
              {row.name}
            </Link>
            {row.payment_status === 'paid' && hasPaymentIdentity(row) ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-moss"><CheckCircle2 className="h-4 w-4" /> Verified</span>
            ) : row.payment_status === 'paid' ? <span className="chip bg-amber-50 text-amber-800">Payment link needed</span> : <StatusChip status={row.payment_status} label={PAYMENT_LABELS[row.payment_status]} dot />}
          </div>
          <dl className="mt-1 grid grid-cols-[52px_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-[11px]">
            <dt className="text-muted">Country</dt><dd className="truncate">{row.country ?? 'Not supplied'}</dd>
            <dt className="text-muted">Phone</dt><dd className="truncate">{row.phone ?? 'Not supplied'}</dd>
            <dt className="text-muted">Email</dt><dd className="truncate">{row.email ?? 'Not supplied'}</dd>
          </dl>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            {!hasPaymentIdentity(row) && row.payment_status !== 'paid' ? <span className="chip bg-amber-50 text-amber-800">Payment link needed</span> : null}
            <StatusChip status={row.contact_status} label={row.contact_status.replace('_', ' ')} />
            {row.next_followup_at ? <StatusChip status={followup} label={`${followup} ${formatDate(row.next_followup_at)}`} /> : null}
            {staff ? <span className="text-muted">{row.agent_name ?? 'Unassigned'}</span> : null}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ink/[0.06] pt-2">
        <span className="text-[10px] text-muted">
          Last contact {row.last_contacted_at ? formatDate(row.last_contacted_at) : 'never'}
        </span>
        <Actions row={row} />
      </div>
    </div>
  )
}

export async function AwardeesView({
  member,
  params,
  basePath,
  admin = false,
}: {
  member: SessionMember
  params: AwardeeSearchParams
  basePath: string
  admin?: boolean
}) {
  const filters = toFilters(params)
  const staff = isStaff(member.membership.role)
  const [result, countries, agents] = await Promise.all([
    listAwardees(member, filters),
    getCountries(member),
    staff ? getAgentOptions(member) : Promise.resolve([]),
  ])

  const query = (page: number) => {
    const values = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') values.set(key, value)
    }
    values.set('page', String(page))
    return `${basePath}?${values.toString()}`
  }

  return (
    <div className="awardees-page">
      <PageHeader
        eyebrow={admin ? 'Administration' : staff ? undefined : 'Daily workspace'}
        title={admin ? 'Awardee directory' : staff ? 'Awardees' : 'My awardees'}
        description={
          admin
            ? 'Manage awardee records and team assignments.'
            : staff
              ? 'Find awardees, contact them, and follow up on payments.'
              : 'Contact your awardees and follow up on payments.'
        }
      />

      <FilterBar member={member} params={params} countries={countries} agents={agents} basePath={basePath} />

      <div className="card overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1040px]">
            <thead>
              <tr className="bg-ink/[0.015]">
                <th className="th">Name</th>
                <th className="th">Country</th>
                <th className="th">Phone</th>
                <th className="th">Email</th>
                <th className="th">Payment</th>
                <th className="th">Last contact</th>
                <th className="th">Next follow-up</th>
                {staff ? <th className="th">Agent</th> : null}
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                const followup = followupState(row)
                return (
                  <tr key={row.id} className="table-row">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.name} className="h-8 w-8 bg-sand text-ink" />
                        <div className="min-w-0">
                          <Link href={`/awardees/${row.id}`} className="block truncate text-[13px] font-semibold hover:text-ember">
                            {row.name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="td text-xs">{row.country ?? '—'}</td>
                    <td className="td text-xs">{row.phone ?? '—'}</td>
                    <td className="td text-xs">{row.email ?? '—'}</td>
                    <td className="td">
                      {row.payment_status === 'paid' && hasPaymentIdentity(row) ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-moss"><CheckCircle2 className="h-4 w-4" /> Verified</span>
                      ) : row.payment_status === 'paid' ? <span className="chip bg-amber-50 text-amber-800">Payment link needed</span> : <StatusChip status={row.payment_status} label={PAYMENT_LABELS[row.payment_status]} dot />}
                      {!hasPaymentIdentity(row) && row.payment_status !== 'paid' ? <p className="mt-1 text-[10px] text-amber-800">Payment link needed</p> : null}
                      {row.payment_status === 'paid' && row.payment_amount_minor ? (
                        <p className="mt-1 text-[10px] text-muted">{formatMinor(row.payment_amount_minor, row.payment_currency ?? 'NGN')}</p>
                      ) : null}
                    </td>
                    <td className="td text-xs text-muted">{row.last_contacted_at ? formatDate(row.last_contacted_at) : 'Never'}</td>
                    <td className="td">
                      {row.next_followup_at ? (
                        <div>
                          <StatusChip status={followup} label={followup} />
                          <p className="mt-1 text-[10px] text-muted">{formatDate(row.next_followup_at)}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    {staff ? (
                      <td className="td">
                        <p className="max-w-[120px] truncate text-xs">{row.agent_name ?? 'Unassigned'}</p>
                      </td>
                    ) : null}
                    <td className="td">
                      <Actions row={row} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          {result.rows.map((row) => (
            <AwardeeCard key={row.id} row={row} staff={staff} />
          ))}
        </div>

        {!result.rows.length ? (
          <EmptyState
            title="No awardees match"
            description={
              result.total === 0 && !params.search
                ? 'Newly assigned awardees will appear here.'
                : 'Change a filter or try another name.'
            }
            illustration="/illustrations/empty-awardees.svg"
          />
        ) : null}

        <Pagination page={result.page} pages={result.pages} buildHref={query} />
      </div>

    </div>
  )
}
