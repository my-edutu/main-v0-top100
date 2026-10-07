export function isInstallPromptRoute(pathname: string | null) {
  return pathname === '/dashboard' || Boolean(pathname?.startsWith('/dashboard/'))
}

export function manualInstallInstructions(userAgent: string, platform: string, maxTouchPoints: number) {
  const ios = /iPhone|iPad|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  if (ios) return 'Open Top100 in Safari, tap Share, then Add to Home Screen.'
  if (/Android/i.test(userAgent)) return 'Open Top100 in Chrome, tap the menu (⋮), then Install app or Add to Home screen.'
  return 'Open Top100 in Chrome or Edge and look for Install in the address bar or browser menu. In Safari on Mac, choose File → Add to Dock.'
}
