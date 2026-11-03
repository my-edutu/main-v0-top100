'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import styles from './confirmation.module.css'

type Details = { status: 'pending' | 'confirmed' | 'declined'; repName: string; channel: 'call' | 'whatsapp'; initiatedAt: string; emailHint: string; challengeId: string | null; expiresAt: string | null }
export default function ContactConfirmation({ token }: { token: string }) {
  const router = useRouter()
  const [details, setDetails] = useState<Details | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthenticated, setUnauthenticated] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const endpoint = `/api/member/contact-confirmation/${encodeURIComponent(token)}`
  const login = `/login?redirect=${encodeURIComponent(`/contact-confirmation/${token}`)}`

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(endpoint, { cache: 'no-store', signal })
      const payload = await response.json()
      if (response.status === 401) { setUnauthenticated(true); setDetails(null); return }
      if (!response.ok) { setDetails(null); setError(payload.message || 'This confirmation link is unavailable.'); return }
      setUnauthenticated(false); setDetails(payload)
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError('Could not load this confirmation. Please try again.')
    } finally { if (!signal?.aborted) setLoading(false) }
  }, [endpoint])
  // This request updates state only after asynchronous network completion.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setInterval(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  async function submit(action: 'request_code' | 'confirm' | 'decline') {
    if (busy || (action === 'request_code' && cooldown > 0)) return
    if (action !== 'request_code' && (!details?.challengeId || !/^\d{6}$/.test(code))) { setError('Enter the six-digit code from your most recent email.'); return }
    setBusy(true); setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action === 'request_code' ? { action } : { action, challengeId: details!.challengeId, code }),
      })
      const payload = await response.json()
      if (response.status === 401) { setUnauthenticated(true); setDetails(null); return }
      if (!response.ok) { setError(payload.message || 'Your response could not be recorded.'); await load(); return }
      if (action === 'request_code') {
        setCode(''); setCooldown(payload.resendAfter ?? 60)
        setDetails(current => current ? { ...current, challengeId: payload.challengeId, expiresAt: payload.expiresAt, emailHint: payload.emailHint } : current)
      } else {
        setDetails(current => current ? { ...current, status: payload.status, challengeId: null } : current)
        setCode('')
      }
    } catch { setError('The request could not be completed. Check your email before requesting another code.'); await load() }
    finally { setBusy(false) }
  }

  async function switchAccount() {
    if (busy) return
    setBusy(true)
    try {
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
      router.replace(login)
      router.refresh()
    } catch { setError('Could not sign out. Please try again.'); setBusy(false) }
  }

  return <main className={styles.page}>
    <Link href="/" className={styles.brand}>Top100 Africa Future Leaders</Link>
    <section className={styles.panel} aria-labelledby="contact-confirmation-title" aria-busy={loading || busy}>
      <h1 id="contact-confirmation-title">Confirm your contact response</h1>
      {loading ? <p role="status" className={styles.muted}>Loading your confirmation…</p> : unauthenticated ? <>
        <p>Sign in to your awardee account to confirm whether a Top100 rep contacted you.</p>
        <Link className={`${styles.button} ${styles.primary}`} href={login}>Sign in to continue</Link>
        <p className={styles.footer}>Need an account? <Link href="/signup">Create your awardee profile</Link>, then reopen this confirmation link.</p>
      </> : details ? <>
        <div className={styles.identity}><strong>{details.repName}</strong><p>Contact by {details.channel === 'call' ? 'phone' : 'WhatsApp'}</p><p className={styles.footer}>Request started {new Date(details.initiatedAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
        {details.status === 'confirmed' ? <p role="status">You confirmed that this rep contacted you. Your response is recorded.</p> : details.status === 'declined' ? <p role="status">You said this rep did not contact you. Your response is recorded.</p> : <>
          <p>Did this person contact you about your award after this request started? Submit your own answer using a code sent to {details.emailHint}.</p>
          <p className={styles.footer}>Keep the code private. Never share it with a rep. Your answer helps us keep an accurate support record.</p>
          <button className={`${styles.button} ${styles.primary}`} disabled={busy || cooldown > 0} onClick={() => void submit('request_code')}>{busy ? 'Please wait…' : cooldown > 0 ? `Request another code in ${cooldown}s` : details.challengeId ? 'Send a new email code' : 'Send my email code'}</button>
          {details.challengeId ? <form className={styles.actions} onSubmit={event => { event.preventDefault(); void submit('confirm') }}>
            <label className={styles.field}>Six-digit code<input value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required aria-describedby="code-help" disabled={busy} /></label>
            <p id="code-help" className={styles.footer}>Use the most recent code. Codes expire after ten minutes.</p>
            <button className={`${styles.button} ${styles.primary}`} disabled={busy || code.length !== 6} type="submit">Yes, this rep contacted me</button>
            <button className={styles.button} disabled={busy || code.length !== 6} type="button" onClick={() => void submit('decline')}>No, I wasn’t contacted</button>
          </form> : null}
        </>}
        <Link className={styles.button} href="/dashboard/me/award">Continue to my award</Link>
      </> : null}
      {error ? <p role="alert" className={styles.error}>{error}</p> : null}
      {!loading && !details && !unauthenticated ? <div className={styles.actions}><Link className={styles.button} href="/dashboard/me/award">Continue to my award</Link><button className={styles.button} disabled={busy} onClick={() => void switchAccount()}>Use a different awardee account</button><button className={styles.button} onClick={() => { setError(''); void load() }}>Try again</button></div> : null}
      <p className={styles.footer}>You can continue to your award without confirming contact. For help, contact <a href="mailto:info@top100afl.com">info@top100afl.com</a>.</p>
    </section>
  </main>
}
