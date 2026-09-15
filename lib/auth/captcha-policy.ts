export type CaptchaState = 'disabled' | 'missing' | 'ready'

export function getCaptchaState(siteKey: string | undefined, token: string | undefined): CaptchaState {
  if (!siteKey?.trim()) return 'disabled'
  return token?.trim() ? 'ready' : 'missing'
}
