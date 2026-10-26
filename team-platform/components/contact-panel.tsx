'use client'

import { useState } from 'react'
import { Mail, MessageCircle, PhoneCall } from 'lucide-react'
import { FollowUpForm } from '@/components/followup-form'
import { EmailComposer, WhatsAppComposer } from '@/components/message-composer'
import { cn } from '@/lib/cn'

type Template = {
  id: string
  name: string
  subject: string | null
  body: string
  channel: 'email' | 'whatsapp'
}

type Tab = 'followup' | 'email' | 'whatsapp'

export function ContactPanel({
  awardeeId,
  awardeeName,
  email,
  phone,
  agentName,
  templates,
  smtpReady,
  initialTab = 'followup',
  canAct = true,
}: {
  awardeeId: string
  awardeeName: string
  email: string | null
  phone: string | null
  agentName: string
  templates: Template[]
  smtpReady: boolean
  initialTab?: Tab
  canAct?: boolean
}) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const tabs: Array<{ id: Tab; label: string; icon: typeof PhoneCall }> = [
    { id: 'followup', label: 'Follow-up', icon: PhoneCall },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  ]

  if (!canAct) {
    return (
      <div className="card p-4">
        <h2 className="display text-lg">Read-only view</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          Team leaders can review activity but cannot record follow-ups on an agent&apos;s behalf.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-3 border-b border-ink/[0.07] bg-ink/[0.015] p-1.5">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-xl py-2 text-[11px] font-semibold transition',
              tab === item.id ? 'bg-cream text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
            aria-pressed={tab === item.id}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'followup' ? <FollowUpForm awardeeId={awardeeId} /> : null}
        {tab === 'email' ? (
          <EmailComposer
            awardeeId={awardeeId}
            to={email}
            awardeeName={awardeeName}
            agentName={agentName}
            templates={templates}
            smtpReady={smtpReady}
          />
        ) : null}
        {tab === 'whatsapp' ? (
          <WhatsAppComposer
            phone={phone}
            awardeeName={awardeeName}
            agentName={agentName}
            templates={templates}
          />
        ) : null}
      </div>
    </div>
  )
}
