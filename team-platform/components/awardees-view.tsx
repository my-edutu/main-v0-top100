import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import {
  Filter,
  Mail,
  MessageCircle,
  Phone,
  Search,
} from 'lucide-react'
import { Avatar, EmptyState, PageHeader, Pagination } from '@/components/ui'
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
  shuffle?: string
}

function toFilters(params: AwardeeSearchParams, shuffleSeed: string): AwardeeFilters {
  return {
    search: params.search,
    paymentStatus: params.payment ? params.payment.split(',') : undefined,
    contactStatus: params.contact,
    country: params.country,
    agentId: params.agent,
    assignment: (params.assignment as AwardeeFilters['assignment']) ?? '',
    followUp: (params.followup as AwardeeFilters['followUp']) ?? '',
    sort: 'shuffle',
    shuffleSeed,
    page: Math.max(Number(params.page ?? 1) || 1, 1),
    pageSize: 25,
  }
}

function internationalPhone(phone: string | null, country: string | null) {
  if (!phone) return null
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null

  let international = digits
  if (trimmed.startsWith('+')) {
    international = digits
  } else if (digits.startsWith('00')) {
    international = digits.slice(2)
  } else if (country?.toLowerCase() === 'nigeria') {
    if (digits.startsWith('234')) international = digits
    else if (digits.startsWith('0')) international = `234${digits.slice(1)}`
    else if (/^[789]\d{9}$/.test(digits)) international = `234${digits}`
  }

  return international.length >= 8 && international.length <= 15 ? international : null
}

function Actions({ row }: { row: AwardeeDirectoryRow }) {
  const phone = internationalPhone(row.phone, row.country)
  const whatsapp = phone ? `https://wa.me/${phone}` : null
  return (
    <div className="flex items-center justify-end gap-2">
      {phone ? (
        <a
          href={`tel:+${phone}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          aria-label={`Call ${row.name}`}
          title="Call"
        >
          <Phone className="h-5 w-5" strokeWidth={2.4} />
        </a>
      ) : (
        <span role="img" aria-label={`No phone number for ${row.name}`} title="No phone number on file" className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200">
          <Phone className="h-5 w-5" />
        </span>
      )}
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-green-700 shadow-sm ring-1 ring-green-200 transition hover:bg-green-100 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
          aria-label={`WhatsApp ${row.name}`}
          title="WhatsApp"
        >
          <MessageCircle className="h-5 w-5" strokeWidth={2.4} />
        </a>
      ) : (
        <span role="img" aria-label={`No phone number for ${row.name}`} title="No phone number on file" className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200">
          <MessageCircle className="h-5 w-5" />
        </span>
      )}
      {row.email ? (
        <Link
          href={`/awardees/${row.id}?compose=email`}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          aria-label={`Email ${row.name}`}
          title="Email"
        >
          <Mail className="h-5 w-5" strokeWidth={2.4} />
        </Link>
      ) : (
        <span role="img" aria-label={`No email address for ${row.name}`} title="No email on file" className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200">
          <Mail className="h-5 w-5" />
        </span>
      )}
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
            placeholder="Search awardees"
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
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Link href={basePath} className="flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/[0.04] hover:text-ink">Reset</Link>
              <button className="btn btn-primary min-h-11 flex-1" type="submit"><Filter className="h-4 w-4" /> Apply filters</button>
            </div>
          </div>
        </details>
      </div>
    </form>
  )
}

function AwardeeCard({ row }: { row: AwardeeDirectoryRow }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ink/[0.07] px-4 py-3 first:border-t-0">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={row.name} className="h-11 w-11 shrink-0 bg-sand text-ink" />
        <Link href={`/awardees/${row.id}`} className="min-w-0 truncate text-sm font-semibold text-ink hover:text-ember">
          {row.name}
        </Link>
      </div>
      <Actions row={row} />
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
  const shuffleSeed = params.shuffle ?? randomUUID()
  const filters = toFilters(params, shuffleSeed)
  const staff = isStaff(member.membership.role)
  const [result, countries, agents] = await Promise.all([
    listAwardees(member, filters),
    getCountries(member),
    staff ? getAgentOptions(member) : Promise.resolve([]),
  ])

  const query = (page: number) => {
    const values = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page' && key !== 'sort') values.set(key, value)
    }
    values.set('shuffle', shuffleSeed)
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
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="bg-ink/[0.015]">
                <th className="th">Awardee</th>
                <th className="th text-right">Contact</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="table-row">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} className="h-11 w-11 bg-sand text-ink" />
                      <Link href={`/awardees/${row.id}`} className="block truncate text-sm font-semibold hover:text-ember">{row.name}</Link>
                    </div>
                  </td>
                  <td className="td">
                    <Actions row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          {result.rows.map((row) => (
            <AwardeeCard key={row.id} row={row} />
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
