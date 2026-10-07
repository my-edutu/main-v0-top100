'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { isInstallPromptRoute, shareTop100, registerInstallServiceWorker } from '@/lib/install-prompt'

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'

const DISMISSED_KEY = 'top100-share-dismissed-until'

export function AddToHomePrompt() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [supportsShare, setSupportsShare] = useState(false)
  const [shareStatus, setShareStatus] = useState('')
  const dismissedThisVisit = useRef(false)
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [ready, setReady] = useState(false)
  const [installError, setInstallError] = useState('')

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const isInstalled = () => standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    const initialize = window.setTimeout(() => {
      setInstalled(isInstalled())
      setSupportsShare(typeof navigator.share === 'function')
      setReady(true)
    }, 0)
    const onInstalled = () => { setInstalled(true); setVisible(false) }
    const onDisplayChange = () => setInstalled(isInstalled())
    window.addEventListener('appinstalled', onInstalled)
    standalone.addEventListener('change', onDisplayChange)
    // Register independently of notification permission; installation needs no push opt-in.
    void registerInstallServiceWorker(navigator, window.isSecureContext).catch(() => {
      // The browser decides whether installation is available.
    })
    return () => {
      window.clearTimeout(initialize)
      window.removeEventListener('appinstalled', onInstalled)
      standalone.removeEventListener('change', onDisplayChange)
    }
  }, [])

  useEffect(() => {
    if (!isInstallPromptRoute(pathname)) return
    if (!ready || installed || dismissedThisVisit.current) return
    try { if (Number(localStorage.getItem(DISMISSED_KEY)) > Date.now()) return } catch { /* Storage may be disabled. */ }
    let timer: number | undefined
    const checkAvailability = () => {
      const modal = Array.from(document.querySelectorAll('[role="dialog"]:not([data-top100-install]), dialog[open]')).some(element => element.getClientRects().length > 0)
      const unavailable = modal || document.visibilityState !== 'visible'
      setBlocked(unavailable)
      if (unavailable) {
        window.clearTimeout(timer)
        timer = undefined
      } else if (!timer && !dismissedThisVisit.current) {
        timer = window.setTimeout(() => setVisible(true), 8000)
      }
    }
    const observer = new MutationObserver(checkAvailability)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'role', 'hidden'] })
    document.addEventListener('visibilitychange', checkAvailability)
    const initialize = window.setTimeout(checkAvailability, 0)
    return () => {
      window.clearTimeout(initialize)
      window.clearTimeout(timer)
      observer.disconnect()
      document.removeEventListener('visibilitychange', checkAvailability)
    }
  }, [pathname, installed, ready])

  function dismiss() {
    dismissedThisVisit.current = true
    setVisible(false)
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000)) } catch { /* Dismiss still works for this visit. */ }
  }

  async function share() {
    if (busy) return
    setBusy(true)
    setInstallError('')
    setShareStatus('')
    try {
      const outcome = await shareTop100(navigator)
      if (outcome === 'shared') dismiss()
      if (outcome === 'copied') setShareStatus('Link copied. Paste it wherever you want to share Top100.')
    } catch {
      setInstallError('Sharing could not open. Please try again.')
    } finally { setBusy(false) }
  }

  if (!visible || installed || !ready || blocked || !isInstallPromptRoute(pathname)) return null

  return (
    <Dialog open onOpenChange={open => { if (!open) dismiss() }}>
    <DialogContent data-top100-install="true" overlayClassName="z-[80] bg-black/65 backdrop-blur-md" className="z-[81] w-[calc(100%-2.5rem)] max-w-sm max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.5rem)] overflow-y-auto gap-0 rounded-3xl border-white/20 bg-white p-6 text-neutral-900 shadow-2xl sm:rounded-3xl">
      <div className="flex flex-col items-center gap-4 pt-3 text-center">
        {/* A local install icon needs no image optimizer request. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/top100-africa-192.png" alt="" width={80} height={80} className="rounded-2xl shadow-md" />
        <div><DialogTitle className="text-2xl font-bold tracking-tight">Share Top100</DialogTitle><DialogDescription className="mt-2 text-sm text-neutral-600">Send Top100 to friends and your community.</DialogDescription></div>
      </div>
      {installError ? <p role="alert" className="mt-4 rounded-xl bg-orange-50 p-3 text-sm leading-6">{installError}</p> : null}
      {shareStatus ? <p role="status" className="mt-4 text-sm text-neutral-600">{shareStatus}</p> : null}
      <div className="mt-3 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={share} className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-60">{busy ? 'Opening…' : supportsShare ? 'Share' : 'Copy link'}</button>
        <button type="button" onClick={dismiss} className="min-h-11 px-2 text-sm text-neutral-600">Not now</button>
      </div>
    </DialogContent>
    </Dialog>
  )
}
