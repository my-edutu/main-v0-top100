export async function disableDevicePush() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  // Remove browser delivery even if server cleanup is temporarily unavailable.
  try {
    await fetch('/api/notifications/subscribe', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
  } finally { await subscription.unsubscribe() }
}
