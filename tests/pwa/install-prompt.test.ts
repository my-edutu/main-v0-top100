import { describe, expect, it } from 'vitest'
import { isInstallPromptRoute, manualInstallInstructions } from '@/lib/install-prompt'

describe('home screen installation guidance', () => {
  it('includes dashboard pages reached after sign in', () => {
    expect(isInstallPromptRoute('/dashboard')).toBe(true)
    expect(isInstallPromptRoute('/dashboard/me/award/payment')).toBe(true)
    expect(isInstallPromptRoute('/login')).toBe(false)
    expect(isInstallPromptRoute('/dashboard-other')).toBe(false)
  })
  it('offers manual instructions without a native install event', () => {
    expect(manualInstallInstructions('iPhone', 'iPhone', 1)).toContain('tap Share')
    expect(manualInstallInstructions('Safari', 'MacIntel', 5)).toContain('tap Share')
    expect(manualInstallInstructions('Android', 'Linux', 1)).toContain('Install app')
    expect(manualInstallInstructions('Desktop', 'MacIntel', 0)).toContain('Add to Dock')
  })
})
