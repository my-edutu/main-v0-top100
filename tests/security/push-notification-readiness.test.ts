import { describe, expect, it } from 'vitest'

import {
  isPushPromptAvailable,
  urlBase64ToUint8Array,
} from '@/lib/push-notification-readiness'

const readyInput = {
  supportsNotifications: true,
  supportsServiceWorker: true,
  supportsPushManager: true,
  permission: 'default' as NotificationPermission,
  vapidPublicKey: 'AQID',
  alreadyPrompted: false,
}

describe('push notification readiness', () => {
  it('does not offer push when any delivery prerequisite is missing', () => {
    expect(isPushPromptAvailable({ ...readyInput, supportsNotifications: false })).toBe(false)
    expect(isPushPromptAvailable({ ...readyInput, supportsServiceWorker: false })).toBe(false)
    expect(isPushPromptAvailable({ ...readyInput, supportsPushManager: false })).toBe(false)
    expect(isPushPromptAvailable({ ...readyInput, vapidPublicKey: '' })).toBe(false)
    expect(isPushPromptAvailable({ ...readyInput, permission: 'denied' })).toBe(false)
    expect(isPushPromptAvailable({ ...readyInput, permission: 'granted' })).toBe(false)
    expect(isPushPromptAvailable({ ...readyInput, alreadyPrompted: true })).toBe(false)
  })

  it('offers push only when the browser and application can create a real subscription', () => {
    expect(isPushPromptAvailable(readyInput)).toBe(true)
  })

  it('converts a URL-safe VAPID key into the bytes required by PushManager', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID-_8'))).toEqual([1, 2, 3, 251, 255])
  })
})
