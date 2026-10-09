'use client'
import { useEffect, useState } from 'react'
import { urlBase64ToUint8Array } from '@/lib/push-notification-readiness'

export function DeviceNotificationSettings() {
  const [enabled, setEnabled] = useState(false)
  const [supported, setSupported] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [iosNeedsHomeScreen, setIosNeedsHomeScreen] = useState(false)
  useEffect(() => {
    const available = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
    setIosNeedsHomeScreen(ios && !standalone)
    setSupported(available && !(ios && !standalone))
    if (available) void navigator.serviceWorker.getRegistration().then(async registration => {
      const subscription = await registration?.pushManager.getSubscription()
      if (!subscription) { setEnabled(false); return }
      const response = await fetch('/api/notifications/subscribe?endpoint=' + encodeURIComponent(subscription.endpoint), { cache: 'no-store' })
      const data = response.ok ? await response.json() : null
      setEnabled(data?.subscribed === true)
    }).catch(() => {})
  }, [])
  async function toggle() {
    setBusy(true); setMessage('')
    try {
      if (!supported) return
      // Permission must be requested directly from the user's tap on iOS.
      if (!enabled && await Notification.requestPermission() !== 'granted') {
        setMessage('Allow notifications in your browser or phone settings, then try again.'); return
      }
      await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()
      if (enabled && subscription) {
        const response = await fetch('/api/notifications/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
        if (!response.ok) throw new Error('Could not disable notifications. Try again.')
        await subscription.unsubscribe()
        setEnabled(false)
        return
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!key) throw new Error('Phone notifications are not available yet.')
      subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })
      const response = await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ subscription: subscription.toJSON(), userAgent: navigator.userAgent }) })
      if (!response.ok) {
        if (!enabled) await subscription.unsubscribe()
        const data = await response.json().catch(() => null)
        throw new Error(data?.error ?? 'Could not enable notifications. Sign in and try again.')
      }
      setEnabled(true)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Try again shortly.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-xl border border-orange-100 bg-white p-4">
    <h2 className="font-semibold">Notifications on this device</h2>
    <p className="mt-1 text-sm text-slate-600">Your choice. You can turn these off anytime; your in-app inbox will still work.</p>
    <p className="mt-1 text-sm text-slate-600">{iosNeedsHomeScreen ? 'On iPhone or iPad, web notifications work from a Home Screen app on iOS/iPadOS 16.4 or later. In Safari, tap Share → Add to Home Screen, open the new Top100 icon, then enable notifications here.' : supported ? 'Get Top100 updates even when the app is closed.' : 'Notifications require a supported browser and HTTPS.'}</p>
    {supported && <button type="button" disabled={busy} onClick={toggle} className="mt-3 rounded-full bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Please wait…' : enabled ? 'Turn off notifications' : 'Enable notifications'}</button>}
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}
  </section>
}
