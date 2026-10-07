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
