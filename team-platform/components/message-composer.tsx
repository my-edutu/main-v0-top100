'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2, Mail, Send, TriangleAlert } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'
import { renderTemplate, firstName } from '@/lib/templates'

type Template = {
  id: string
  name: string
  subject: string | null
  body: string
  channel: 'email' | 'whatsapp'
}

export function EmailComposer({
  awardeeId,
  to,
  awardeeName,
  agentName,
  templates,
  smtpReady,
}: {
  awardeeId: string
  to: string | null
  awardeeName: string
  agentName: string
  templates: Template[]
  smtpReady: boolean
}) {
  const router = useRouter()
  const emailTemplates = templates.filter((template) => template.channel === 'email')
  const vars = useMemo(
    () => ({
      first_name: firstName(awardeeName),
      name: awardeeName,
      agent_name: agentName,
      organisation: 'Top100 Africa Future Leaders',
      award_name: 'Top100 Africa Future Leaders Award',
      payment_link: '[secure payment link]',
    }),
    [awardeeName, agentName],
  )
  const [templateId, setTemplateId] = useState(emailTemplates[0]?.id ?? '')
  const initial = emailTemplates[0]
  const [subject, setSubject] = useState(initial?.subject ? renderTemplate(initial.subject, vars) : 'Your Top100 Africa Future Leaders award')
  const [body, setBody] = useState(initial ? renderTemplate(initial.body, vars) : '')
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function chooseTemplate(id: string) {
    setTemplateId(id)
    const template = emailTemplates.find((item) => item.id === id)
    if (!template) return
    setSubject(template.subject ? renderTemplate(template.subject, vars) : subject)
    setBody(renderTemplate(template.body, vars))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ awardeeId, templateId: templateId || null, subject, body, idempotencyKey }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Email could not be sent')
      setSuccess(`Email sent. Provider ID: ${payload.messageId ?? payload.logId}`)
      setIdempotencyKey(crypto.randomUUID())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Email could not be sent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3.5" id="email">
      {!smtpReady ? (
        <Banner tone="warning">
          <span className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            SMTP is not configured on this deployment. Sending is disabled; no email will be falsely marked
            as sent.
          </span>
        </Banner>
      ) : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <Field label="Template">
        <select className="select !h-10" value={templateId} onChange={(event) => chooseTemplate(event.target.value)}>
          <option value="">Custom message</option>
          {emailTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="To">
        <input className="input !h-10 bg-ink/[0.03]" value={to ?? 'No email on file'} readOnly />
      </Field>
      <Field label="Subject">
        <input className="input !h-10" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} required />
      </Field>
      <Field label="Message" hint="Sent in Top100’s branded email layout. Edit the message before sending; unknown {{tokens}} are left untouched.">
        <textarea
          className="textarea min-h-[190px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={20000}
          required
        />
      </Field>
      <Button type="submit" className="w-full" variant="primary" disabled={!to || !smtpReady || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {loading ? 'Sending…' : 'Send via SMTP'}
      </Button>
      <p className="flex items-start gap-1.5 text-[10px] leading-4 text-muted">
        <Mail className="mt-0.5 h-3 w-3 shrink-0" />
        Every attempt, provider response and failure is logged. Double sends are blocked by an idempotency key.
      </p>
    </form>
  )
}

export function WhatsAppComposer({
  phone,
  awardeeName,
  agentName,
  templates,
}: {
  phone: string | null
  awardeeName: string
  agentName: string
  templates: Template[]
}) {
  const whatsappTemplates = templates.filter((template) => template.channel === 'whatsapp')
  const vars = useMemo(
    () => ({
      first_name: firstName(awardeeName),
      name: awardeeName,
      agent_name: agentName,
      organisation: 'Top100 Africa Future Leaders',
      award_name: 'Top100 Africa Future Leaders Award',
      payment_link: '[secure payment link]',
    }),
    [awardeeName, agentName],
  )
  const [templateId, setTemplateId] = useState(whatsappTemplates[0]?.id ?? '')
  const [body, setBody] = useState(
    whatsappTemplates[0] ? renderTemplate(whatsappTemplates[0].body, vars) : '',
  )
  const [copied, setCopied] = useState(false)

  if (!phone) {
    return <p className="text-xs leading-5 text-muted">No valid phone number on file. Add one before using WhatsApp.</p>
  }

  const href = `https://wa.me/${phone.replace(/\D/g, '')}${body ? `?text=${encodeURIComponent(body)}` : ''}`

  return (
    <div className="space-y-3.5" id="whatsapp">
      <Field label="Approved template">
        <select
          className="select !h-10"
          value={templateId}
          onChange={(event) => {
            setTemplateId(event.target.value)
            const template = whatsappTemplates.find((item) => item.id === event.target.value)
            if (template) setBody(renderTemplate(template.body, vars))
          }}
        >
          <option value="">Blank message</option>
          {whatsappTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Message preview">
        <textarea
          className="textarea min-h-[150px]"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={4000}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary w-full"
          onClick={() => setCopied(false)}
        >
          Open WhatsApp
        </a>
        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(body)
            setCopied(true)
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="rounded-xl bg-amber-50 px-3 py-2 text-[10px] leading-4 text-amber-900">
        Opening WhatsApp is not proof of delivery. After the conversation, record the real outcome in the follow-up
        form. Automated WhatsApp sending is not enabled in this phase.
      </p>
    </div>
  )
}
