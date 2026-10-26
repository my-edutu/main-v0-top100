'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Banner, Button, Field } from '@/components/ui'

type Template = {
  id: string
  channel: 'whatsapp' | 'email'
  name: string
  subject: string | null
  body: string
  is_active: boolean
}

export function TemplateEditor({ template }: { template?: Template }) {
  const router = useRouter()
  const [channel, setChannel] = useState<'whatsapp' | 'email'>(template?.channel ?? 'whatsapp')
  const [name, setName] = useState(template?.name ?? '')
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const [active, setActive] = useState(template?.is_active ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await fetch('/api/admin/templates', {
        method: template ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(template ? { id: template.id } : {}),
          channel,
          name,
          subject: channel === 'email' ? subject || null : null,
          body,
          isActive: active,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Could not save the template')
      setSuccess('Template saved.')
      if (!template) {
        setName('')
        setSubject('')
        setBody('')
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the template')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {error ? <Banner tone="error">{error}</Banner> : null}
      {success ? <Banner tone="success">{success}</Banner> : null}
      <div className="grid grid-cols-2 gap-2">
        <Field label="Channel">
          <select className="select !h-10" value={channel} onChange={(event) => setChannel(event.target.value as 'whatsapp' | 'email')}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
          </select>
        </Field>
        <Field label="Template name">
          <input className="input !h-10" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
        </Field>
      </div>
      {channel === 'email' ? (
        <Field label="Subject">
          <input className="input !h-10" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={200} />
        </Field>
      ) : null}
      <Field
        label="Message body"
        hint="Tokens: {{first_name}}, {{name}}, {{agent_name}}, {{organisation}}, {{award_name}}, {{payment_link}}. Unknown tokens are left untouched."
      >
        <textarea className="textarea min-h-[150px]" value={body} onChange={(event) => setBody(event.target.value)} required minLength={10} maxLength={20000} />
      </Field>
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-[11px]">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-[#DE4B1F]" />
          Active
        </label>
        <Button type="submit" variant={template ? 'ghost' : 'ember'} size={template ? 'sm' : 'md'} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {template ? 'Save template' : 'Create template'}
        </Button>
      </div>
    </form>
  )
}
