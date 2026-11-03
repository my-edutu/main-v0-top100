import { expect, it, vi } from 'vitest'
import { closeContactPopup, createContactRequestId, launchWhatsApp, prepareContactPopup } from '@/lib/contact-launch'

const url = 'https://wa.me/15550100000?text=Hello%20test'
const popup = () => ({ closed: false, opener: {} as unknown, location: { href: 'about:blank' }, close: vi.fn() })

it('continues in the same tab when the browser blocks the new WhatsApp tab', () => {
  const assign = vi.fn()
  expect(launchWhatsApp(url, null, { location: { assign } })).toBe('same-tab')
  expect(assign).toHaveBeenCalledWith(url)
})
it('navigates an available popup without redirecting the workspace', () => {
  const tab = popup(), assign = vi.fn()
  expect(launchWhatsApp(url, tab, { location: { assign } })).toBe('new-tab')
  expect(tab.location.href).toBe(url)
  expect(assign).not.toHaveBeenCalled()
})
it('recovers from a closed tab or an inaccessible window handle', () => {
  const assign = vi.fn(), closed = popup(), inaccessible = popup()
  closed.closed = true
  Object.defineProperty(inaccessible, 'location', { get() { throw new Error('Access denied') } })
  for (const tab of [closed, inaccessible]) expect(launchWhatsApp(url, tab, { location: { assign } })).toBe('same-tab')
  expect(assign).toHaveBeenCalledTimes(2)
})
it('never launches an unsafe or unexpected WhatsApp destination', () => {
  const assign = vi.fn(), tab = popup()
  for (const target of ['javascript:alert(1)', 'https://evil.example/15550100000', 'https://wa.me:444/15550100000', 'https://user@wa.me/15550100000']) {
    expect(() => launchWhatsApp(target, tab, { location: { assign } })).toThrow()
  }
  expect(assign).not.toHaveBeenCalled()
  expect(tab.location.href).toBe('about:blank')
})
it('opens the placeholder from the click and removes opener access', () => {
  const tab = popup(), open = vi.fn(() => tab)
  expect(prepareContactPopup({ open })).toBe(tab)
  expect(open).toHaveBeenCalledWith('about:blank', '_blank')
  expect(tab.opener).toBeNull()
})
it('treats popup creation and cleanup failures as recoverable browser limitations', () => {
  expect(prepareContactPopup({ open: () => { throw new Error('Blocked') } })).toBeNull()
  const tab = popup()
  Object.defineProperty(tab, 'closed', { get() { throw new Error('Access denied') } })
  expect(() => closeContactPopup(tab)).not.toThrow()
})
it('uses secure random bytes when randomUUID is unavailable on older browsers', () => {
  const getRandomValues = vi.fn((array: Uint8Array) => array.fill(9))
  expect(createContactRequestId({ getRandomValues })).toBe('09090909-0909-4909-8909-090909090909')
  expect(getRandomValues).toHaveBeenCalledTimes(1)
})
it('uses native randomUUID when available', () => {
  const randomUUID = vi.fn(() => '11111111-1111-4111-8111-111111111111'), getRandomValues = vi.fn()
  expect(createContactRequestId({ randomUUID, getRandomValues })).toBe('11111111-1111-4111-8111-111111111111')
  expect(getRandomValues).not.toHaveBeenCalled()
})
