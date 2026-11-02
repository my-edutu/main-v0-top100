/** Pure audience rules shared by admin reads, exports and the delivery worker. */
export const OUTREACH_SEGMENTS = {
  all: 'All eligible awardees', unpaid: 'No confirmed payment', no_profile: 'No profile',
  not_started: 'No award order', recovery: 'Unfinished orders', verification: 'Verify payment first',
  paid: 'Confirmed paid', not_clicked: 'No recorded link visit', clicked: 'Recorded link visit', follow_up: 'Follow-up due',
} as const
export type OutreachSegment = keyof typeof OUTREACH_SEGMENTS
export const OUTREACH_REASONS = ['unknown', 'price', 'timing', 'payment_problem', 'delivery', 'unclear_value', 'already_paid', 'not_interested', 'other'] as const
export type OutreachReason = typeof OUTREACH_REASONS[number]
export type OutreachContact = {
  awardee_id: string; token?: string; suppressed?: boolean; tracking_started_at?: string | null; first_clicked_at?: string | null;
  owner?: string; last_contacted_at?: string | null; next_follow_up_at?: string | null; reason?: OutreachReason; notes?: string;
}
export type OutreachSource = {
  awardees: Array<{ id: string; name: string; email?: string | null; profile_id?: string | null; year?: number | string | null; country?: string | null }>;
  profiles: Array<{ id: string; email?: string | null; full_name?: string | null; phone?: string | null }>;
  orders: Array<{ id: string; awardee_id?: string | null; profile_id?: string | null; email?: string | null; status?: string; awardPaymentVerified: boolean; awardPaymentStatus?: string; paymentStatus?: string }>;
  contacts: OutreachContact[];
  deliveryHeldEmails?: string[];
}
export type OutreachMember = {
  id: string; awardeeIds: string[]; name: string; email: string; phone: string; country: string; years: number[]; profileId: string | null;
  state: 'paid' | 'verification' | 'recovery' | 'not_started'; orderCount: number; suppressed: boolean;
  visit: 'unknown' | 'not_clicked' | 'clicked'; owner: string; lastContactedAt: string | null; nextFollowUpAt: string | null;
  reason: OutreachReason; notes: string; emailable: boolean; deliveryHeld?: boolean;
}
export type OutreachFilter = { year: string; segment: OutreachSegment; search?: string }
export const normalizeOutreachEmail = (value?: string | null) => (value ?? '').trim().toLowerCase()
export const validOutreachEmail = (value: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value)

export function buildOutreachAudience(source: OutreachSource): OutreachMember[] {
  const profiles = new Map(source.profiles.map(p => [p.id, p]))
  const byEmail = new Map<string, typeof source.profiles>()
  for (const p of source.profiles) {
    const email = normalizeOutreachEmail(p.email)
    if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), p])
  }
  const parent = source.awardees.map((_, i) => i)
  const root = (i: number): number => parent[i] === i ? i : (parent[i] = root(parent[i]))
  const identities = new Map<string, number>()
  const resolved = source.awardees.map(a => {
    const matches = byEmail.get(normalizeOutreachEmail(a.email)) ?? []
    return (a.profile_id ? profiles.get(a.profile_id) : null) ?? (matches.length === 1 ? matches[0] : null)
  })
  source.awardees.forEach((a, i) => {
    const keys = [a.profile_id || resolved[i]?.id ? `p:${a.profile_id || resolved[i]?.id}` : '', ...[a.email, resolved[i]?.email].map(e => normalizeOutreachEmail(e)).filter(Boolean).map(e => `e:${e}`)].filter(Boolean)
    for (const key of keys) {
      const previous = identities.get(key)
      if (previous !== undefined) parent[root(i)] = root(previous)
      else identities.set(key, i)
    }
  })
  const groups = new Map<number, number[]>()
  source.awardees.forEach((_, i) => groups.set(root(i), [...(groups.get(root(i)) ?? []), i]))
  const contacts = new Map(source.contacts.map(c => [c.awardee_id, c]))
  const ordersByIdentity = new Map<string, OutreachSource['orders']>()
  for (const o of source.orders) {
    for (const key of [o.awardee_id ? `a:${o.awardee_id}` : '', o.profile_id ? `p:${o.profile_id}` : '', o.email ? `e:${normalizeOutreachEmail(o.email)}` : ''].filter(Boolean)) {
      ordersByIdentity.set(key, [...(ordersByIdentity.get(key) ?? []), o])
    }
  }
  return [...groups.values()].map(indices => {
    const awardees = indices.map(i => source.awardees[i])
    const profile = indices.map(i => resolved[i]).find(Boolean)
    const ids = new Set(awardees.map(a => a.id))
    const emails = new Set([...awardees.map(a => normalizeOutreachEmail(a.email)), ...indices.map(i => normalizeOutreachEmail(resolved[i]?.email))].filter(Boolean))
    const profileIds = new Set([...awardees.map(a => a.profile_id), ...indices.map(i => resolved[i]?.id)].filter(Boolean))
    const matchingOrders = new Map<string, OutreachSource['orders'][number]>()
    for (const key of [...[...ids].map(id => `a:${id}`), ...[...emails].map(e => `e:${e}`), ...[...profileIds].map(p => `p:${p}`)]) {
      for (const o of ordersByIdentity.get(key) ?? []) matchingOrders.set(o.id, o)
    }
    const orders = [...matchingOrders.values()]
    const records = [...ids].flatMap(id => contacts.get(id) ? [contacts.get(id)!] : [])
    const record = records.find(c => c.notes || c.owner || c.reason && c.reason !== 'unknown') ?? records[0]
    const latestContact = records.map(c => c.last_contacted_at).filter((date): date is string => Boolean(date && Number.isFinite(Date.parse(date)))).sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null
    const paid = orders.some(o => o.awardPaymentVerified)
    const review = records.some(c => c.reason === 'already_paid') || orders.some(o =>
      ['paid', 'pending', 'refunded'].includes(o.awardPaymentStatus ?? '') || ['creating', 'open', 'pending', 'processing', 'underpaid', 'overpaid', 'duplicate_succeeded', 'exception', 'succeeded'].includes(o.paymentStatus ?? '') || o.status === 'paid')
    const email = normalizeOutreachEmail(profile?.email) || [...emails][0] || ''
    return {
      id: awardees[0].id, awardeeIds: [...ids], name: profile?.full_name || awardees[0].name || 'Awardee', email,
      phone: profile?.phone ?? '', country: awardees.find(a => a.country)?.country ?? '',
      years: [...new Set(awardees.map(a => Number(a.year)).filter(y => Number.isInteger(y) && y >= 2023))].sort(),
      profileId: profile?.id ?? null, state: paid ? 'paid' : review ? 'verification' : orders.length ? 'recovery' : 'not_started',
      orderCount: orders.length, suppressed: records.some(c => c.suppressed || c.reason === 'not_interested'),
      visit: records.some(c => c.first_clicked_at) ? 'clicked' : records.some(c => c.tracking_started_at) ? 'not_clicked' : 'unknown',
      owner: record?.owner ?? '', lastContactedAt: latestContact, nextFollowUpAt: record?.next_follow_up_at ?? null,
      reason: record?.reason ?? 'unknown', notes: record?.notes ?? '', emailable: validOutreachEmail(email),
      deliveryHeld: (source.deliveryHeldEmails ?? []).some(held => emails.has(normalizeOutreachEmail(held))),
    } satisfies OutreachMember
  }).filter(r => r.years.length > 0)
}

export function filterOutreachAudience(rows: OutreachMember[], filter: OutreachFilter, now = new Date()): OutreachMember[] {
  const search = (filter.search ?? '').trim().toLowerCase()
  return rows.filter(r => {
    if (filter.year !== 'all' && !r.years.includes(Number(filter.year))) return false
    if (search && ![r.name, r.email, r.phone, r.country, r.owner].some(v => v.toLowerCase().includes(search))) return false
    switch (filter.segment) {
      case 'unpaid': return r.state !== 'paid'
      case 'no_profile': return !r.profileId && r.state !== 'paid'
      case 'not_started': return r.state === 'not_started'
      case 'recovery': return r.state === 'recovery'
      case 'verification': return r.state === 'verification'
      case 'paid': return r.state === 'paid'
      case 'not_clicked': return r.visit === 'not_clicked' && r.state !== 'paid'
      case 'clicked': return r.visit === 'clicked'
      case 'follow_up': return !r.suppressed && r.state !== 'paid' && Boolean(r.nextFollowUpAt && Date.parse(r.nextFollowUpAt) <= now.getTime())
      default: return true
    }
  })
}

export function outreachCsv(rows: Array<Record<string, string | number>>): string {
  const columns = Object.keys(rows[0] ?? { Email: '', Name: '' })
  const cell = (value: unknown) => {
    let text = String(value ?? '')
    if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  return '\uFEFF' + [columns.map(cell).join(','), ...rows.map(row => columns.map(c => cell(row[c])).join(','))].join('\r\n')
}
