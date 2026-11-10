import { createHash } from 'node:crypto'
import { filterOutreachAudience, type OutreachMember, type OutreachFilter } from '@/lib/awards/outreach'
import { templateEligible, type OutreachTemplate } from '@/lib/awards/outreach-templates'
export type EmailTemplate = OutreachTemplate | 'general'
export function emailTemplateEligible(member: OutreachMember, template: EmailTemplate, now = Date.now()): boolean {
  if (template !== 'general') return templateEligible(member, template, now)
  if (member.suppressed || member.deliveryHeld || !member.emailable) return false
  return !member.lastContactedAt || Date.parse(member.lastContactedAt) <= now - 3 * 86400000
}

export function selectEmailAudience(members: OutreachMember[], filter: OutreachFilter, template: EmailTemplate, limit: number) {
  const matched = filterOutreachAudience(members, filter)
  const eligible = matched.filter(m => emailTemplateEligible(m, template) && Boolean(m.name.trim()) && m.name.trim() !== 'Awardee')
  const selected = [...eligible].sort((a, b) => (Date.parse(a.lastContactedAt ?? '') || 0) - (Date.parse(b.lastContactedAt ?? '') || 0)).slice(0, limit)
  const audienceKey = createHash('sha256').update(selected.map(m => `${m.id}:${m.email}`).sort().join('\n')).digest('hex')
  return { matched: matched.length, eligible: eligible.length, selected, audienceKey }
}
