import { describe, it, expect } from 'vitest'
import { isNigeria, nigeriaState, locationSuggestions } from '@/lib/awards/locations'
import { trackingView } from '@/lib/awards/tracking-view'

describe('delivery location resolution', () => {
  it('recognises names, codes and saved state suffixes', () => {
    expect(isNigeria(' NG ')).toBe(true)
    expect(isNigeria('Ghana')).toBe(false)
    expect(nigeriaState('rivers state')?.name).toBe('Rivers')
    expect(nigeriaState('FCT Abuja')?.code).toBe('FC')
    expect(nigeriaState('Abuja')?.code).toBe('FC')
    expect(nigeriaState('not a state')).toBeUndefined()
  })
  it('filters delivery suggestions by the selected state', () => {
    expect(locationSuggestions('Rivers')).toContain('Port Harcourt')
    expect(locationSuggestions('Anambra')).not.toContain('Port Harcourt')
    expect(locationSuggestions('')).toEqual([])
  })
})
describe('tracking status display', () => {
  it('does not represent cancellation or unknown states as payment confirmation', () => {
    expect(trackingView('cancelled')).toMatchObject({ index: -1, title: 'Order cancelled' })
    expect(trackingView('unknown')).toMatchObject({ index: -1, title: 'Order needs attention' })
    expect(trackingView('delivered')).toMatchObject({ index: 3, title: 'Delivered' })
    expect(trackingView('paid')).toMatchObject({ index: 0, title: 'Payment confirmed' })
  })
})
