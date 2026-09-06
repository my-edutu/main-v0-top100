export type PushPromptReadiness = {
  supportsNotifications: boolean
  supportsServiceWorker: boolean
  supportsPushManager: boolean
  permission: NotificationPermission
  vapidPublicKey: string | undefined
  alreadyPrompted: boolean
}

export function isPushPromptAvailable(input: PushPromptReadiness): boolean {
  return Boolean(
    input.supportsNotifications &&
      input.supportsServiceWorker &&
      input.supportsPushManager &&
      input.permission === 'default' &&
      input.vapidPublicKey?.trim() &&
      !input.alreadyPrompted,
  )
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const decoded = atob(base64)
  const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0))

  return new Uint8Array(bytes.buffer)
}
