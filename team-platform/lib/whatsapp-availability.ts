import { normalizePhone } from '@/lib/phone'

export type WhatsAppUnavailableReport = { phone: string; reportedAt: string }

export function whatsappUnavailableReport(row: { phone: string | null; country?: string | null; metadata?: unknown }): WhatsAppUnavailableReport | null {
  const phone = normalizePhone(row.phone, row.country || 'Nigeria')
  if (!phone.ok || !row.metadata || typeof row.metadata !== 'object') return null
  const report = (row.metadata as Record<string, unknown>).whatsapp_unavailable_report
  if (!report || typeof report !== 'object') return null
  const value = report as Record<string, unknown>
  if (value.source !== 'rep_reported' || value.phone !== phone.e164 || typeof value.reported_at !== 'string' || Number.isNaN(Date.parse(value.reported_at))) return null
  return { phone: phone.e164, reportedAt: value.reported_at }
}
