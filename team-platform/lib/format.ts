export function formatMinor(minor: number | null | undefined, currency = 'NGN') {
  const value = Number(minor ?? 0) / 100
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: value % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString('en-NG')}`
  }
}

export function formatCompact(minor: number | null | undefined, currency = 'NGN') {
  const value = Number(minor ?? 0) / 100
  if (Math.abs(value) >= 1_000_000) {
    return `${currency === 'NGN' ? '₦' : '$'}${(value / 1_000_000).toFixed(1)}m`
  }
  if (Math.abs(value) >= 10_000) {
    return `${currency === 'NGN' ? '₦' : '$'}${Math.round(value / 1000)}k`
  }
  return formatMinor(minor, currency)
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function relativeTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export const CHANNEL_LABELS: Record<string, string> = {
  call: 'Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
}

export const OUTCOME_LABELS: Record<string, string> = {
  no_answer: 'No answer',
  number_unavailable: 'Number unavailable',
  message_sent: 'Message sent',
  awaiting_response: 'Awaiting response',
  interested: 'Interested — intends to pay',
  payment_reported: 'Payment reported by awardee',
  payment_verified: 'Payment verified',
  not_interested: 'Not interested',
  followup_scheduled: 'Follow-up scheduled',
  email_sent: 'Email sent',
  email_failed: 'Email failed',
  other: 'Other',
}

export const PAYMENT_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  pending: 'Pending verification',
  paid: 'Paid & verified',
  refunded: 'Refunded',
}

export const WITHDRAWAL_LABELS: Record<string, string> = {
  requested: 'Requested',
  under_review: 'Under review',
  approved: 'Approved',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
}
