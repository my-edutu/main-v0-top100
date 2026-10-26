'use client'

import { useEffect, useRef, useState } from 'react'
import { Mail, X } from 'lucide-react'
import { EmailComposer } from '@/components/message-composer'

type EmailTemplate = {
  id: string
  name: string
  subject: string | null
  body: string
  channel: 'email'
}

export function AwardeeEmailDialog({
  awardeeId,
  awardeeName,
  email,
  agentName,
  templates,
  smtpReady,
  canSend,
}: {
  awardeeId: string
  awardeeName: string
  email: string | null
  agentName: string
  templates: EmailTemplate[]
  smtpReady: boolean
  canSend: boolean
}) {
  const [open, setOpen] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const disabled = !email || !canSend

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-200 transition hover:bg-sky-100 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none disabled:ring-slate-200"
        aria-label={email ? `Email ${awardeeName}` : `No email address for ${awardeeName}`}
        title={!canSend ? 'Your role cannot send email' : email ? 'Email' : 'No email on file'}
      >
        <Mail className="h-5 w-5" strokeWidth={2.4} />
      </button>
      <dialog
        ref={dialogRef}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false)
        }}
        aria-labelledby={`email-dialog-title-${awardeeId}`}
        className="m-auto max-h-[min(92dvh,900px)] w-[min(640px,calc(100%-2rem))] overflow-y-auto rounded-2xl border border-ink/10 bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/50"
      >
        {open ? (
          <div className="p-4 sm:p-6">
            <header className="mb-5 flex items-start justify-between gap-4 border-b border-ink/[0.08] pb-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-200">
                  <Mail className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id={`email-dialog-title-${awardeeId}`} className="display text-xl">Email awardee</h2>
                  <p className="mt-1 truncate text-sm text-muted">{awardeeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-ink/[0.05] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember"
                aria-label="Close email composer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <EmailComposer
              awardeeId={awardeeId}
              to={email}
              awardeeName={awardeeName}
              agentName={agentName}
              templates={templates}
              smtpReady={smtpReady}
            />
          </div>
        ) : null}
      </dialog>
    </>
  )
}
