'use client'

import { useRef, useState } from 'react'
import { Check, Copy, ExternalLink, Loader2, MessageCircle, Phone, TriangleAlert } from 'lucide-react'
import { Banner, Button } from '@/components/ui'
import { cn } from '@/lib/cn'

type ContactChannel = 'call' | 'whatsapp'

type ContactAttemptResponse = {
  attempt?: {
    id?: unknown
    token?: unknown
    channel?: unknown
    phone?: unknown
    status?: unknown
    initiated_at?: unknown
  }
  confirmationUrl?: unknown
  destination?: unknown
}

function errorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object' && 'error' in payload) {
    const error = (payload as { error?: unknown }).error
    if (typeof error === 'string' && error.trim()) return error
  }
  return fallback
}

function safeCallDestination(destination: unknown) {
  if (typeof destination !== 'string' || !/^tel:\+[1-9]\d{7,14}$/.test(destination)) {
    throw new Error('The phone destination was not available from the server.')
  }
  return destination
}

function safeWhatsAppDestination(destination: unknown) {
  if (typeof destination !== 'string') {
    throw new Error('The WhatsApp destination was not available from the server.')
  }
  const url = new URL(destination)
  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'wa.me' || !/^\d{8,15}$/.test(url.pathname.slice(1))) {
    throw new Error('The WhatsApp destination was not available from the server.')
  }
  url.search = ''
  return url
}

function whatsappUrl(destination: unknown, message: string, confirmationUrl: string) {
  const url = safeWhatsAppDestination(destination)
  const parts = [message.trim(), `Optional contact confirmation: ${confirmationUrl}`].filter(Boolean)
  url.searchParams.set('text', parts.join('\n\n'))
  return url.toString()
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    return
  } catch {
    // Clipboard permissions are commonly denied in an embedded browser. Use
    // the short-lived textarea fallback without treating it as a failed
    // contact attempt.
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Copy was blocked. Select the link and copy it manually.')
}

export function TrackedContactButton({
  awardeeId,
  awardeeName,
  channel,
  message = '',
  hasPhone = true,
  iconOnly = false,
  className,
  disabled = false,
}: {
  awardeeId: string
  awardeeName: string
  channel: ContactChannel
  message?: string
  hasPhone?: boolean
  iconOnly?: boolean
  className?: string
  disabled?: boolean
}) {
  const requestIdRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    confirmationUrl: string
    destination: string
    status: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  const label = channel === 'call' ? 'Call' : 'WhatsApp'
  const Icon = channel === 'call' ? Phone : MessageCircle
  const openLabel = channel === 'call' ? `Call ${awardeeName}` : `Open WhatsApp for ${awardeeName}`

  async function startAttempt() {
    if (loading || disabled || !hasPhone) return

    setError(null)
    setCopyError(null)
    setCopied(false)
    setPopupBlocked(false)

    // A blank tab is opened synchronously from the user gesture so the
    // eventual prefilled compose URL is not lost to popup blocking while the
    // server records the attempt.
    let popup: Window | null = null
    if (channel === 'whatsapp') {
      try {
        popup = window.open('about:blank', '_blank')
        if (popup) popup.opener = null
        if (!popup) setPopupBlocked(true)
      } catch {
        setPopupBlocked(true)
      }
    }

    if (!requestIdRef.current) requestIdRef.current = crypto.randomUUID()
    setLoading(true)

    try {
      const response = await fetch('/api/contact-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          awardeeId,
          channel,
          requestId: requestIdRef.current,
        }),
      })
      const payload = (await response.json().catch(() => null)) as ContactAttemptResponse | { error?: unknown } | null
      if (!response.ok) throw new Error(errorMessage(payload, `Could not start ${label.toLowerCase()}`))

      const successPayload = payload as ContactAttemptResponse | null

      const confirmationUrl = successPayload && typeof successPayload.confirmationUrl === 'string'
        ? successPayload.confirmationUrl
        : ''
      if (!confirmationUrl || !/^https:\/\/(?:www\.)?top100afl\.com\//i.test(confirmationUrl)) {
        throw new Error('The confirmation link was not available from the server.')
      }

      const destination = channel === 'call'
        ? safeCallDestination(successPayload?.destination)
        : safeWhatsAppDestination(successPayload?.destination).toString()
      const status = successPayload?.attempt && typeof successPayload.attempt.status === 'string'
        ? successPayload.attempt.status
        : 'initiated'

      setResult({ confirmationUrl, destination, status })
      requestIdRef.current = null

      if (channel === 'whatsapp') {
        const composeUrl = whatsappUrl(destination, message, confirmationUrl)
        if (popup && !popup.closed) {
          popup.location.href = composeUrl
        } else {
          setPopupBlocked(true)
        }
      } else {
        // Let the confirmation panel commit first so it remains visible when
        // a desktop browser declines to handle the tel: URI.
        window.setTimeout(() => window.location.assign(destination), 0)
      }
    } catch (caught) {
      if (popup && !popup.closed) popup.close()
      setError(caught instanceof Error ? caught.message : `Could not start ${label.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  async function copyConfirmation() {
    if (!result) return
    setCopyError(null)
    try {
      await copyText(result.confirmationUrl)
      setCopied(true)
    } catch (caught) {
      setCopyError(caught instanceof Error ? caught.message : 'Copy was blocked.')
    }
  }

  const retryHref = result
    ? channel === 'whatsapp'
      ? whatsappUrl(result.destination, message, result.confirmationUrl)
      : result.destination
    : undefined

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={startAttempt}
        disabled={disabled || loading || !hasPhone}
        className={cn(
          iconOnly
            ? 'flex h-11 w-11 items-center justify-center rounded-xl border border-ink/10 text-muted transition hover:bg-paper'
            : 'btn btn-ghost',
          channel === 'whatsapp' && iconOnly && 'text-moss hover:bg-moss-soft',
          !hasPhone && 'cursor-not-allowed opacity-50',
          className,
        )}
        aria-label={openLabel}
        title={!hasPhone ? `No phone number for ${awardeeName}` : openLabel}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
        {iconOnly ? <span className="sr-only">{loading ? 'Starting…' : label}</span> : loading ? 'Starting…' : label}
      </button>

      {error ? (
        <Banner tone="error" className="mt-2 text-xs">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Banner>
      ) : null}

      {result ? (
        <div className="mt-2 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-ink/[0.09] bg-cream p-3 text-left shadow-sm">
          <p className="text-xs font-semibold text-ink">Attempt tracked</p>
          <p className="mt-1 text-[11px] leading-4 text-muted">
            Opening {channel === 'call' ? 'the dialler' : 'WhatsApp'} does not confirm contact, delivery, payment, or commission.
            Share the link below after the conversation through your existing approved channels; the awardee must sign in and complete a fresh email OTP before payment.
          </p>
          <label className="mt-3 block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted" htmlFor={`contact-link-${awardeeId}-${channel}`}>
            Awardee confirmation link
          </label>
          <div className="mt-1.5 flex min-w-0 gap-1.5">
            <input
              id={`contact-link-${awardeeId}-${channel}`}
              className="input !h-10 min-w-0 flex-1 truncate bg-ink/[0.03] text-[11px]"
              value={result.confirmationUrl}
              readOnly
              aria-label="Awardee confirmation link"
            />
            <Button type="button" variant="soft" size="sm" onClick={copyConfirmation} className="shrink-0 px-2.5" aria-label="Copy awardee confirmation link">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">{copied ? 'Copied' : 'Copy link'}</span>
            </Button>
          </div>
          {copyError ? <p className="mt-1 text-[10px] text-red-700">{copyError}</p> : null}
          {popupBlocked ? (
            <Banner tone="warning" className="mt-2 px-3 py-2 text-[11px] leading-4">
              Your browser blocked the new WhatsApp tab. Use the link below to continue; no message was sent automatically.
            </Banner>
          ) : null}
          {retryHref ? (
            <a
              href={retryHref}
              target={channel === 'whatsapp' ? '_blank' : undefined}
              rel={channel === 'whatsapp' ? 'noreferrer' : undefined}
              className="mt-2 inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-ember underline-offset-4 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {channel === 'call' ? 'Open phone again' : 'Open WhatsApp again'}
            </a>
          ) : null}
          <p className="mt-2 text-[10px] text-muted">Status: {result.status.replaceAll('_', ' ')}</p>
        </div>
      ) : null}
    </div>
  )
}
