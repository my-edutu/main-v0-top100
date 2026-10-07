export function isInstallPromptRoute(pathname: string | null) {
  return pathname === '/dashboard' || Boolean(pathname?.startsWith('/dashboard/'))
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
