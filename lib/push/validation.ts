export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false
  try {
    const u = new URL(endpoint)
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') &&
      (u.hostname === 'fcm.googleapis.com' ||
       u.hostname === 'updates.push.services.mozilla.com' ||
       u.hostname.endsWith('.push.apple.com') ||
       u.hostname.endsWith('.notify.windows.com'))
  } catch { return false }
}
export function isValidSubscription(value: any): boolean {
  return isAllowedPushEndpoint(value?.endpoint) &&
    /^[A-Za-z0-9_-]{87}$/.test(value?.keys?.p256dh ?? '') &&
    /^[A-Za-z0-9_-]{22}$/.test(value?.keys?.auth ?? '')
}
export function notificationPath(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
    ? value : '/dashboard/notifications'
}
