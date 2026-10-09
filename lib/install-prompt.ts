export function isInstallPromptRoute(pathname: string | null) {
  return pathname === '/' || pathname === '/dashboard' || Boolean(pathname?.startsWith('/dashboard/'))
}

export interface NativeInstallEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Call directly from a click handler to retain the browser's user activation. */
export async function requestNativeInstall(event: NativeInstallEvent) {
  await event.prompt()
  return event.userChoice
}

export async function registerInstallServiceWorker(
  browser: Pick<Navigator, 'serviceWorker'>,
  secureContext: boolean,
) {
  if (!secureContext || !('serviceWorker' in browser)) return
  return browser.serviceWorker.register('/sw.js', { scope: '/' })
}


export const TOP100_SHARE_DATA = {
  title: 'Top100 Africa Future Leaders',
  url: 'https://www.top100afl.com',
}

/** Invoke from the click itself, before any unrelated asynchronous work. */
export async function shareTop100(browser: Pick<Navigator, 'share' | 'clipboard'>) {
  try {
    if (typeof browser.share === 'function') {
      await browser.share(TOP100_SHARE_DATA)
      return 'shared' as const
    }
    await browser.clipboard.writeText(TOP100_SHARE_DATA.url)
    return 'copied' as const
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled' as const
    throw error
  }
}


export function isIOSDevice(userAgent: string, platform: string, maxTouchPoints: number) {
  return /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

export function homeScreenAction(ios: boolean, supportsShare: boolean, hasInstallEvent: boolean) {
  if (ios) return supportsShare ? 'share' as const : 'instructions' as const
  return hasInstallEvent ? 'install' as const : 'instructions' as const
}

export function homeScreenRequestBehavior(installed: boolean, action: 'share' | 'install' | 'instructions' | null) {
  if (installed) return 'ignore' as const
  if (action === 'share' || action === 'install') return 'activate' as const
  return 'show-guidance' as const
}


export const HOME_SCREEN_REQUEST_EVENT = 'top100:request-home-screen'

/** Synchronous dispatch preserves the task button's user activation. */
export function triggerHomeScreenAction(target: Pick<Window, 'dispatchEvent'> = window) {
  target.dispatchEvent(new Event(HOME_SCREEN_REQUEST_EVENT))
}

/** Keep the completed Explore more tile connected to the install guidance. */
export function activateHomeScreenExploreTile(target: Pick<Window, 'dispatchEvent'> = window) {
  triggerHomeScreenAction(target)
}
