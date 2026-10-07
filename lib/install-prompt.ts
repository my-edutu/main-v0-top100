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
