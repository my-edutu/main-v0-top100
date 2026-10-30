import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import {
  Avatar,
  Banner,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  StatusChip,
} from '@/components/ui'
import { ContactPanel } from '@/components/contact-panel'
import { requireMember, isStaff } from '@/lib/auth'
import { getAwardeeDetail } from '@/lib/data'
import { workdayDate } from '@/lib/workday'
import { env, smtpConfigured } from '@/lib/env'
import {
  CHANNEL_LABELS,
  formatDate,
  formatDateTime,
  formatMinor,
  OUTCOME_LABELS,
  PAYMENT_LABELS,
  titleCase,
} from '@/lib/format'

export const metadata = { title: 'Awardee profile' }
export const dynamic = 'force-dynamic'

function relationName(value: unknown): string {
  if (Array.isArray(value)) return (value[0] as { full_name?: string })?.full_name ?? 'Team member'
  return (value as { full_name?: string })?.full_name ?? 'Team member'
}

function sourceLabel(row: any) {
  if (row.entry_type === 'reversal') return 'Commission reversed'
  if (row.entry_type === 'adjustment') return 'Ledger adjustment'
  return 'Verified award payment'
}

export default async function AwardeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ compose?: string; channel?: string }>
}) {
  const member = await requireMember()
  const { id } = await params
  const query = await searchParams
  const data = await getAwardeeDetail(member, id)
  if (!data) notFound()

  const { awardee } = data
  const staff = isStaff(member.membership.role)
  const admin = false
  const platformAdmin = member.membership.role === 'super_admin'
  const canAct = member.membership.role === 'agent' && awardee.agent_id === member.membership.id
  const initialTab = query.compose === 'email' ? 'email' : query.channel === 'whatsapp' ? 'whatsapp' : 'followup'
  const canViewCommission = platformAdmin || member.membership.role === 'agent'
  const visibleCommissions = platformAdmin
    ? data.commissions
    : data.commissions.filter((entry: any) => entry.agent_id === member.membership.id)
  const followupState = awardee.next_followup_at
    ? awardee.next_followup_at < workdayDate()
      ? 'overdue'
      : awardee.next_followup_at === workdayDate()
        ? 'due'
        : 'scheduled'
    : 'none'

  return (
    <div>
      <Link
        href={admin ? '/admin/awardees' : '/awardees'}
        className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-muted hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to awardees
      </Link>

      <PageHeader
        eyebrow={`${awardee.country ?? 'No country'} ${awardee.state ? `· ${awardee.state}` : ''}`}
        title={awardee.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusChip status={awardee.payment_status} label={PAYMENT_LABELS[awardee.payment_status]} dot />
            <StatusChip status={awardee.contact_status} label={awardee.contact_status.replace('_', ' ')} />
            {awardee.next_followup_at ? (
              <StatusChip status={followupState} label={`Follow-up ${formatDate(awardee.next_followup_at)}`} />
            ) : null}
            {awardee.agent_name ? (
              <span className="text-[11px] text-muted">Assigned to {awardee.agent_name}</span>
            ) : (
              <StatusChip status="unpaid" label="Unassigned" />
            )}
          </span>
        }
        actions={
          <>
            {awardee.phone ? (
              <a href={`tel:${awardee.phone}`} className="btn btn-ghost">
                <Phone className="h-4 w-4" /> Call
              </a>
            ) : null}
            {awardee.phone ? (
              <a
                href={`https://wa.me/${awardee.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            ) : null}
            {awardee.email ? (
              <a href={`/awardees/${awardee.id}?compose=email`} className="btn btn-ember">
                <Mail className="h-4 w-4" /> Email
              </a>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="p-4 md:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.05] text-muted">
                  <Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="label">Phone</p>
                  <p className="mt-0.5 text-sm font-medium">{awardee.phone ?? 'Not provided'}</p>
                  {awardee.phone ? <p className="mt-0.5 text-[10px] text-muted">International format, WhatsApp-ready</p> : null}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.05] text-muted">
                  <Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="label">Email</p>
                  <p className="mt-0.5 truncate text-sm font-medium">{awardee.email ?? 'Not provided'}</p>
                  {awardee.email ? <p className="mt-0.5 text-[10px] text-muted">SMTP sending available</p> : null}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.05] text-muted">
                  <MapPin className="h-4 w-4" />
                </div>
                <div>
                  <p className="label">Location</p>
                  <p className="mt-0.5 text-sm font-medium">
                    {[awardee.city, awardee.state, awardee.country].filter(Boolean).join(', ') || 'Not provided'}
                  </p>
                  {awardee.address ? <p className="mt-0.5 text-[10px] text-muted">{awardee.address}</p> : null}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink/[0.05] text-muted">
                  <UserRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="label">Campaign identity</p>
                  <p className="mt-0.5 font-mono text-[11px]">{awardee.external_key ?? awardee.id.slice(0, 8)}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Added {formatDate(awardee.created_at)}
                    {awardee.public_awardee_id ? ' · linked to public awardee' : ''}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <h2 className="display text-lg">Follow-up history</h2>
                <p className="mt-0.5 text-[11px] text-muted">Every recorded contact, newest first.</p>
              </div>
              <span className="num text-[11px] text-muted">{data.followups.length}</span>
            </div>
            {data.followups.length ? (
              <div className="max-h-[560px] overflow-y-auto">
                {data.followups.map((followup: any) => (
                  <div key={followup.id} className="flex gap-3 border-t border-ink/[0.07] px-4 py-3.5">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink/[0.05] text-ink/70">
                      {followup.channel === 'call' ? (
                        <Phone className="h-3.5 w-3.5" />
                      ) : followup.channel === 'whatsapp' ? (
                        <MessageCircle className="h-3.5 w-3.5" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold">
                          {CHANNEL_LABELS[followup.channel] ?? titleCase(followup.channel)} ·{' '}
                          {OUTCOME_LABELS[followup.outcome] ?? titleCase(followup.outcome)}
                        </p>
                        {followup.responded ? <StatusChip status="responded" label="Responded" /> : null}
                        {followup.payment_expected ? <StatusChip status="interested" label="Payment expected" /> : null}
                      </div>
                      {followup.notes ? <p className="mt-1 whitespace-pre-line text-xs leading-5 text-ink/75">{followup.notes}</p> : null}
                      <p className="mt-1 text-[10px] text-muted">
                        {formatDateTime(followup.contacted_at)} · {relationName(followup.team_memberships)}
                        {followup.next_followup_at ? ` · next ${formatDate(followup.next_followup_at)}` : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No contact recorded"
                description="Use the follow-up form to record the first call, WhatsApp or email outcome."
                icon={<Clock3 className="h-5 w-5" />}
              />
            )}
          </Card>

          {data.emails.length ? (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <h2 className="display text-lg">Email attempts</h2>
                  <p className="mt-0.5 text-[11px] text-muted">Provider-confirmed sends and failures.</p>
                </div>
                <Mail className="h-4 w-4 text-muted" />
              </div>
              <div>
                {data.emails.map((email: any) => (
                  <div key={email.id} className="flex items-start gap-3 border-t border-ink/[0.07] px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{email.subject}</p>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {formatDateTime(email.sent_at ?? email.attempted_at)} · {email.to_email}
                        {email.provider_message_id ? ` · ${email.provider_message_id}` : ''}
                      </p>
                      {email.error ? <p className="mt-1 text-[10px] text-red-700">{email.error}</p> : null}
                    </div>
                    <StatusChip status={email.status} />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {staff && data.assignments.length ? (
            <Card className="overflow-hidden">
              <div className="px-4 py-3.5">
                <h2 className="display text-lg">Assignment history</h2>
                <p className="mt-0.5 text-[11px] text-muted">Ownership changes are permanent and auditable.</p>
              </div>
              <div>
                {data.assignments.map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center gap-3 border-t border-ink/[0.07] px-4 py-3">
                    <Avatar name={relationName(assignment.team_memberships)} className="h-8 w-8 bg-sand text-ink" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{relationName(assignment.team_memberships)}</p>
                      <p className="text-[10px] text-muted">
                        {formatDate(assignment.assigned_at)} → {assignment.ended_at ? formatDate(assignment.ended_at) : 'present'}
                        {assignment.end_reason ? ` · ${assignment.end_reason}` : ''}
                      </p>
                    </div>
                    <StatusChip status={assignment.status === 'active' ? 'active' : assignment.status} />
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div className="lg:sticky lg:top-20 lg:space-y-4">
            <ContactPanel
              awardeeId={awardee.id}
              awardeeName={awardee.name}
              email={awardee.email}
              phone={awardee.phone}
              agentName={member.membership.full_name}
              templates={data.templates as any}
              smtpReady={smtpConfigured()}
              initialTab={initialTab as any}
              canAct={canAct || admin}
            />

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="display text-lg">Payment</h2>
                <StatusChip status={awardee.payment_status} label={PAYMENT_LABELS[awardee.payment_status]} dot />
              </div>
              {awardee.payment_status === 'paid' ? (
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Verified amount</span>
                    <span className="num font-semibold">
                      {formatMinor(awardee.payment_amount_minor ?? 0, awardee.payment_currency ?? 'NGN')}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Paid at</span>
                    <span>{formatDate(awardee.paid_at)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted">Source</span>
                    <span className="font-mono text-[10px]">{awardee.payment_source_id?.slice(0, 12) ?? 'verified'}</span>
                  </div>
                  <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-moss-soft px-2.5 py-2 text-[10px] leading-4 text-moss">
                    <BadgeCheck className="mt-0.5 h-3 w-3 shrink-0" />
                    This status is derived from a verified Top100 AFL payment record, not a manual edit.
                  </div>
                </div>
              ) : awardee.payment_status === 'refunded' ? (
                <p className="mt-2 text-xs leading-5 text-muted">
                  A refund or reversal was recorded. Any commission was reversed in the ledger.
                  {awardee.payment_note ? ` ${awardee.payment_note}` : ''}
                </p>
              ) : (
                <p className="mt-2 text-xs leading-5 text-muted">
                  {awardee.payment_status === 'pending'
                    ? 'A payment has been initiated and is awaiting verified confirmation.'
                    : 'No verified award payment yet. Never mark paid from a conversation alone.'}
                </p>
              )}
            </Card>

            {canViewCommission && visibleCommissions.length ? (
              <Card className="p-4">
                <h2 className="display text-lg">Commission ledger</h2>
                <div className="mt-3 space-y-2.5">
                  {visibleCommissions.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-medium">{sourceLabel(entry)}</p>
                        <p className="text-[10px] text-muted">{formatDate(entry.earned_at)} · {entry.status}</p>
                      </div>
                      <p className={`num text-xs font-semibold ${entry.amount_minor < 0 ? 'text-red-700' : 'text-moss'}`}>
                        {entry.amount_minor < 0 ? '−' : '+'}
                        {formatMinor(Math.abs(entry.amount_minor), entry.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {platformAdmin ? (
              <Card className="p-4">
                <h2 className="text-base font-medium">Assignment management</h2>
                <p className="mt-2 text-sm leading-6 text-muted">Change ownership and review rep capacity in the central Admin Panel.</p>
                <LinkButton href={`${process.env.NEXT_PUBLIC_TOP100_ADMIN_URL || 'https://top100afl.com'}/admin/team-operations/worklist`} className="mt-3">Open team worklist</LinkButton>
              </Card>
            ) : null}

            <div className="rounded-xl border border-ink/[0.08] bg-cream/60 px-3 py-2.5 text-[10px] leading-4 text-muted">
              <span className="flex items-start gap-1.5">
                <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                Personal and payout data is restricted. Access to this profile is logged for administrators.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
