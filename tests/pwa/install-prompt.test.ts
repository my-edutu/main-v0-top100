import { describe, expect, it, vi } from 'vitest'
import type { NativeInstallEvent } from '@/lib/install-prompt'
import { isInstallPromptRoute, requestNativeInstall, registerInstallServiceWorker } from '@/lib/install-prompt'

describe('home screen installation guidance', () => {
  it('includes dashboard pages reached after sign in', () => {
    expect(isInstallPromptRoute('/dashboard')).toBe(true)
    expect(isInstallPromptRoute('/dashboard/me/award/payment')).toBe(true)
    expect(isInstallPromptRoute('/login')).toBe(false)
    expect(isInstallPromptRoute('/dashboard-other')).toBe(false)
  })
  it('opens the native prompt immediately on the click and returns the browser choice', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined)
    const event = { prompt, userChoice: Promise.resolve({ outcome: 'accepted' }) } as NativeInstallEvent
    const result = requestNativeInstall(event)
    expect(prompt).toHaveBeenCalledOnce()
    expect(await result).toEqual({ outcome: 'accepted' })
  })
  it('preserves cancellation and installation errors', async () => {
    expect(await requestNativeInstall({ prompt: async () => {}, userChoice: Promise.resolve({ outcome: 'dismissed' }) } as NativeInstallEvent)).toEqual({ outcome: 'dismissed' })
    await expect(requestNativeInstall({ prompt: async () => { throw new Error('unavailable') } } as NativeInstallEvent)).rejects.toThrow('unavailable')
  })
  it('registers the worker without requesting notification permission', async () => {
    const register = vi.fn().mockResolvedValue({})
    await registerInstallServiceWorker({ serviceWorker: { register } } as unknown as Navigator, true)
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' })
    register.mockClear()
    await registerInstallServiceWorker({ serviceWorker: { register } } as unknown as Navigator, false)
    expect(register).not.toHaveBeenCalled()
  })
})

import { shareTop100, TOP100_SHARE_DATA } from '@/lib/install-prompt'

describe('Top100 share action', () => {
  it('opens the native share sheet immediately with the public URL', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()
    const result = shareTop100({ share, clipboard: { writeText } } as unknown as Navigator)
    expect(share).toHaveBeenCalledWith(TOP100_SHARE_DATA)
    expect(await result).toBe('shared')
    expect(writeText).not.toHaveBeenCalled()
  })
  it('copies the link when native sharing is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    expect(await shareTop100({ clipboard: { writeText } } as unknown as Navigator)).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://www.top100afl.com')
  })
  it('treats closing the share sheet as cancellation without copying', async () => {
    const writeText = vi.fn()
    const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'))
    expect(await shareTop100({ share, clipboard: { writeText } } as unknown as Navigator)).toBe('cancelled')
    expect(writeText).not.toHaveBeenCalled()
  })
})

import { isIOSDevice, homeScreenAction } from '@/lib/install-prompt'

describe('platform-specific home screen CTA', () => {
  it('recognizes iPhones and iPads using desktop user agents', () => {
    expect(isIOSDevice('iPhone', 'iPhone', 1)).toBe(true)
    expect(isIOSDevice('Safari', 'MacIntel', 5)).toBe(true)
    expect(isIOSDevice('Safari', 'MacIntel', 0)).toBe(false)
    expect(isIOSDevice('Android', 'Linux', 5)).toBe(false)
  })
  it('uses Share only on iOS, and native install elsewhere', () => {
    expect(homeScreenAction(true, true, false)).toBe('share')
    expect(homeScreenAction(true, false, false)).toBeNull()
    expect(homeScreenAction(false, true, true)).toBe('install')
    expect(homeScreenAction(false, true, false)).toBeNull()
  })
})

import { triggerHomeScreenAction, HOME_SCREEN_REQUEST_EVENT } from '@/lib/install-prompt'

it('triggers the shared home-screen action in the same click call', () => {
  const target = new EventTarget()
  const listener = vi.fn()
  target.addEventListener(HOME_SCREEN_REQUEST_EVENT, listener)
  triggerHomeScreenAction(target)
  expect(listener).toHaveBeenCalledOnce()
})
