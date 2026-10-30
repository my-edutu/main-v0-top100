import { randomUUID } from 'node:crypto'
import Link from 'next/link'
import { Filter, MessageCircle, Phone, Search, Shuffle } from 'lucide-react'
import { Avatar, EmptyState, PageHeader, Pagination, StatusChip } from '@/components/ui'
import { AwardeeEmailDialog } from '@/components/awardee-email-dialog'
import {
  toAwardeeFilters,
  type AwardeeSearchParams,
} from '@/lib/awardee-filters'
import { normalizePhone } from '@/lib/phone'
import { isStaff } from '@/lib/auth'
import { smtpConfigured } from '@/lib/env'
import {
  getAgentOptions,
  getCountries,
  getTemplates,
  listAwardees,
  type AwardeeDirectoryRow,
} from '@/lib/data'
import type { SessionMember } from '@/lib/types'

export type { AwardeeSearchParams } from '@/lib/awardee-filters'

function Actions({
  row,
  emailTemplates,
  smtpReady,
  canSendEmail,
  agentName,
}: {
  row: AwardeeDirectoryRow
  emailTemplates: Array<{
    id: string
    name: string
    subject: string | null
    body: string
    channel: 'email'
  }>
  smtpReady: boolean
  canSendEmail: boolean
  agentName: string
}) {
  const normalized = normalizePhone(row.phone, row.country || 'Nigeria')
  const phone = normalized.ok ? normalized.whatsapp : null
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
        <span
          role="img"
          aria-label={`No phone number for ${row.name}`}
          title="No phone number on file"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200"
        >
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
        <span
          role="img"
          aria-label={`No phone number for ${row.name}`}
          title="No phone number on file"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-300 ring-1 ring-slate-200"
        >
          <MessageCircle className="h-5 w-5" />
        </span>
      )}
      <AwardeeEmailDialog
        awardeeId={row.id}
        awardeeName={row.name}
        email={row.email}
        agentName={agentName}
        templates={emailTemplates}
        smtpReady={smtpReady}
        canSend={canSendEmail}
      />
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
    <form
      method="get"
      action={basePath}
      className="card relative z-10 mb-4 p-3 md:p-4"
    >
      {params.shuffle ? (
        <input type="hidden" name="shuffle" value={params.shuffle} />
      ) : null}
      <div className="flex flex-wrap items-center gap-2.5">
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
        <select
          name="sort"
          aria-label="Sort awardees"
          defaultValue={params.sort ?? 'name'}
          className="select !w-auto max-w-full"
        >
          <option value="name">Name A–Z</option>
          <option value="followup">Follow-up date</option>
          <option value="newest">Newest first</option>
          <option value="last_contact">Recent contact</option>
          <option value="shuffle">Random order</option>
        </select>
        <button type="submit" className="btn btn-primary min-h-11">
          Search
        </button>
        <details className="group relative shrink-0">
          <summary
            aria-label={
              activeFilters
                ? `Open filters, ${activeFilters} active`
                : 'Open filters'
            }
            className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-ink/10 bg-paper px-3 text-sm font-medium text-ink transition hover:bg-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember [&::-webkit-details-marker]:hidden"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
            {activeFilters ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
                {activeFilters}
              </span>
            ) : null}
          </summary>
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 max-h-[min(75dvh,32rem)] w-[min(420px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Filter awardees</p>
              <span className="text-[11px] text-muted">
                {activeFilters ? `${activeFilters} active` : 'All records'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="select min-w-0 text-xs"
                name="payment"
                defaultValue={params.payment ?? ''}
                aria-label="Payment status"
              >
                <option value="">All payments</option>
                <option value="paid">Paid & verified</option>
                <option value="unpaid">Unpaid</option>
                <option value="pending">Pending verification</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                className="select min-w-0 text-xs"
                name="contact"
                defaultValue={params.contact ?? ''}
                aria-label="Contact status"
              >
                <option value="">All contact states</option>
                <option value="not_contacted">Not contacted</option>
                <option value="contacted">Contacted</option>
                <option value="responded">Responded</option>
              </select>
              <select
                className="select min-w-0 text-xs"
                name="followup"
                defaultValue={params.followup ?? ''}
                aria-label="Follow-up state"
              >
                <option value="">Any follow-up</option>
                <option value="due">Due today</option>
                <option value="overdue">Overdue</option>
                <option value="scheduled">Scheduled</option>
              </select>
              <select
                className="select min-w-0 text-xs"
                name="country"
                defaultValue={params.country ?? ''}
                aria-label="Country"
              >
                <option value="">All countries</option>
                {countries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              {staff ? (
                <select
                  className="select min-w-0 text-xs"
                  name="agent"
                  defaultValue={params.agent ?? ''}
                  aria-label="Agent"
                >
                  <option value="">All agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name}
                    </option>
                  ))}
                </select>
              ) : null}
              {staff ? (
                <select
                  className="select min-w-0 text-xs"
                  name="assignment"
                  defaultValue={params.assignment ?? ''}
                  aria-label="Assignment"
                >
                  <option value="">Any assignment</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={basePath}
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl px-3 text-xs font-medium text-muted hover:bg-ink/[0.04] hover:text-ink"
              >
                Reset
              </Link>
              <button className="btn btn-primary min-h-11 flex-1" type="submit">
                <Filter className="h-4 w-4" /> Apply filters
              </button>
            </div>
          </div>
        </details>
      </div>
    </form>
  )
}

function RecordProgress({ row }: { row: AwardeeDirectoryRow }) {
  const verified =
    row.payment_status === 'paid' &&
    Boolean(row.payment_source_id && row.payment_verified_at)
  return (
    <div className="space-y-1.5">
      <StatusChip
        status={
          verified
            ? 'paid'
            : row.payment_status === 'paid'
              ? 'pending'
              : row.payment_status
        }
        label={
          verified
            ? 'Verified paid'
            : row.payment_status === 'paid'
              ? 'Verification needed'
              : undefined
        }
      />
      <p className="text-xs text-muted">
        {row.contact_status.replaceAll('_', ' ')}
      </p>
      {row.next_followup_at ? (
        <p className="text-xs text-muted">Follow-up {row.next_followup_at}</p>
      ) : null}
    </div>
  )
}

function AwardeeCard({
  row,
  emailTemplates,
  smtpReady,
  canSendEmail,
  agentName,
}: {
  row: AwardeeDirectoryRow
  emailTemplates: Array<{
    id: string
    name: string
    subject: string | null
    body: string
    channel: 'email'
  }>
  smtpReady: boolean
  canSendEmail: boolean
  agentName: string
}) {
  return (
    <article className="space-y-4 border-t border-ink/[0.07] p-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar
            name={row.name}
            className="h-10 w-10 shrink-0 bg-sand text-ink"
          />
          <div className="min-w-0">
            <Link
              href={`/awardees/${row.id}`}
              className="text-sm font-medium hover:text-ember"
            >
              {row.name}
            </Link>
            <p className="mt-1 text-xs text-muted">
              {row.country || 'Country unavailable'}
            </p>
          </div>
        </div>
        <RecordProgress row={row} />
      </div>
      <p className="break-all text-xs leading-5 text-muted">
        {row.phone || 'No phone'}
        {row.email ? ` · ${row.email}` : ''}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/awardees/${row.id}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-ember"
        >
          Open follow-up →
        </Link>
        <Actions
          row={row}
          emailTemplates={emailTemplates}
          smtpReady={smtpReady}
          canSendEmail={canSendEmail}
          agentName={agentName}
        />
      </div>
    </article>
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
  const filters = toAwardeeFilters(params, shuffleSeed)
  const staff = isStaff(member.membership.role)
  const [result, countries, agents, templates] = await Promise.all([
    listAwardees(member, filters),
    getCountries(member),
    staff ? getAgentOptions(member) : Promise.resolve([]),
    getTemplates(member),
  ])
  const emailTemplates = templates
    .filter((template) => template.is_active && template.channel === 'email')
    .map((template) => ({
      id: template.id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      channel: 'email' as const,
    }))
  const smtpReady = smtpConfigured()
  const canSendEmail = member.membership.role !== 'team_leader'

  const query = (page: number) => {
    const values = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== 'page') values.set(key, value)
    }
    if (filters.sort === 'shuffle') values.set('shuffle', filters.shuffleSeed!)
    values.set('page', String(page))
    return `${basePath}?${values.toString()}`
  }

  const reshuffle = new URLSearchParams()
  for (const [key, value] of Object.entries(params))
    if (value && key !== 'page') reshuffle.set(key, value)
  reshuffle.set('sort', 'shuffle')
  reshuffle.set('shuffle', randomUUID())

  return (
    <div className="awardees-page">
      <PageHeader
        eyebrow={
          admin ? 'Administration' : staff ? undefined : 'Daily workspace'
        }
        title={admin ? 'Awardee directory' : staff ? 'Awardees' : 'My awardees'}
        description={
          admin
            ? 'Manage awardee records and team assignments.'
            : staff
              ? 'Find awardees, contact them, and follow up on payments.'
              : 'Contact your awardees and follow up on payments.'
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <p>
          <span className="font-medium text-ink">
            {result.total.toLocaleString()}
          </span>{' '}
          matching awardees · {staff ? 'Team worklist' : 'Assigned to you'}
        </p>
        <Link
          href={`${basePath}?${reshuffle}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-ember"
        >
          <Shuffle className="h-4 w-4" />
          Mix list order
        </Link>
      </div>
      <FilterBar
        member={member}
        params={params}
        countries={countries}
        agents={agents}
        basePath={basePath}
      />

      <div className="card overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="bg-ink/[0.015]">
                <th className="th">Awardee</th>
                <th className="th">Progress</th>
                {staff ? <th className="th">Sales rep</th> : null}
                <th className="th text-right">Contact</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={row.id} className="table-row">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={row.name}
                        className="h-11 w-11 bg-sand text-ink"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/awardees/${row.id}`}
                          className="block text-sm font-medium hover:text-ember"
                        >
                          {row.name}
                        </Link>
                        <p className="mt-1 text-xs text-muted">
                          {row.country || 'Country unavailable'}
                        </p>
                        <p className="mt-1 break-all text-xs text-muted">
                          {row.phone || row.email || 'No contact details'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <RecordProgress row={row} />
                  </td>
                  {staff ? (
                    <td className="td">
                      <span className="text-xs text-muted">
                        {row.agent_name || 'Unassigned'}
                      </span>
                    </td>
                  ) : null}
                  <td className="td">
                    <Actions
                      row={row}
                      emailTemplates={emailTemplates}
                      smtpReady={smtpReady}
                      canSendEmail={canSendEmail}
                      agentName={member.membership.full_name}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden">
          {result.rows.map((row) => (
            <AwardeeCard
              key={row.id}
              row={row}
              emailTemplates={emailTemplates}
              smtpReady={smtpReady}
              canSendEmail={canSendEmail}
              agentName={member.membership.full_name}
            />
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
