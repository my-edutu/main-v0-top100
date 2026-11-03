export type ContactPopup = {
  closed: boolean
  opener: unknown
  location: { href: string }
  close(): void
}

type RequestCrypto = {
  randomUUID?: () => string
  getRandomValues(array: Uint8Array): Uint8Array
}

/** Older mobile browsers support getRandomValues but may not expose randomUUID. */
export function createContactRequestId(source: RequestCrypto): string {
  if (typeof source.randomUUID === 'function') return source.randomUUID()
  const bytes = source.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function closeContactPopup(popup: ContactPopup | null) {
  try { if (popup && !popup.closed) popup.close() } catch {
    // An inaccessible/closed browser window must not hide the contact API error.
  }
}

export function prepareContactPopup(browser: { open(url: string, target: string): ContactPopup | null }): ContactPopup | null {
  let popup: ContactPopup | null = null
  try {
    popup = browser.open('about:blank', '_blank')
    if (popup) popup.opener = null
    return popup
  } catch {
    closeContactPopup(popup)
    return null
  }
}

export function safeWhatsAppDestination(destination: unknown): URL {
  if (typeof destination !== 'string') throw new Error('The WhatsApp destination was not available from the server.')
  const url = new URL(destination)
  if (url.protocol !== 'https:' || url.hostname !== 'wa.me' || url.port || url.username || url.password || !/^[1-9]\d{7,14}$/.test(url.pathname.slice(1))) {
    throw new Error('The WhatsApp destination was not available from the server.')
  }
  url.search = ''
  url.hash = ''
  return url
}

/** Call only after the server has successfully recorded the contact attempt. */
export function launchWhatsApp(destination: string, popup: ContactPopup | null, browser: { location: { assign(url: string): void } }): 'new-tab' | 'same-tab' {
  safeWhatsAppDestination(destination)
  try {
    if (popup && !popup.closed) {
      popup.location.href = destination
      return 'new-tab'
    }
  } catch {
    // Mobile/embedded browsers can block access to an otherwise valid popup.
    closeContactPopup(popup)
  }
  browser.location.assign(destination)
  return 'same-tab'
}
