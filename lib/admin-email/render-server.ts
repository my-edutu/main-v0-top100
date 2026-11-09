import { outreachLinks, renderOutreach } from '@/lib/awards/outreach-server'
import type { OutreachMember } from '@/lib/awards/outreach'
import type { OutreachDraft } from '@/lib/awards/outreach-templates'
import type { EmailTemplate } from './audience'
import { renderGeneralEmail } from './render'
export function renderAdminEmail(draft: OutreachDraft, member: OutreachMember, token: string, template: EmailTemplate) {
  return template === 'general' ? renderGeneralEmail(draft, outreachLinks(member, token)) : renderOutreach(draft, member, token)
}
