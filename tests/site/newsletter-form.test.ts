import { describe, expect, it } from 'vitest'
import { shouldShowNewsletterConsent } from '@/app/components/NewsletterForm'

describe('newsletter consent reveal', () => {
  it('waits until the visitor has typed an email', () => {
    expect(shouldShowNewsletterConsent('')).toBe(false)
    expect(shouldShowNewsletterConsent('   ')).toBe(false)
    expect(shouldShowNewsletterConsent('person@example.com')).toBe(true)
  })
})
