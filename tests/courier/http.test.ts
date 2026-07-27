// tests/courier/http.test.ts
// The dotted-path readers are the entire defence against a wrong field-name
// guess turning into a wrong shipping charge, so they are tested directly.
import { afterEach, describe, expect, it } from 'vitest'

import {
  env,
  envFlag,
  envJsonObject,
  envNumber,
  joinUrl,
  pickFirstNumber,
  pickFirstString,
  pickNumber,
  pickString,
  pickValue,
  splitPaths,
} from '@/lib/courier/http'

afterEach(() => {
  delete process.env.GIG_TEST_VALUE
})

describe('pickValue', () => {
  const payload = { Object: { GrandTotal: 3500, MobileShipmentTrackings: [{ Status: 'ENDED' }] } }

  it('reads a nested key', () => {
    expect(pickValue(payload, 'Object.GrandTotal')).toBe(3500)
  })

  it('indexes into an array', () => {
    expect(pickValue(payload, 'Object.MobileShipmentTrackings.0.Status')).toBe('ENDED')
  })

  it('returns undefined for a missing path rather than throwing', () => {
    expect(pickValue(payload, 'Object.Nope.Deeper')).toBeUndefined()
    expect(pickValue(null, 'Object.GrandTotal')).toBeUndefined()
    expect(pickValue(payload, '')).toBeUndefined()
    expect(pickValue(payload, 'Object.MobileShipmentTrackings.9.Status')).toBeUndefined()
  })
})

describe('pickNumber', () => {
  it('reads numbers and numeric strings', () => {
    expect(pickNumber({ a: 12.5 }, 'a')).toBe(12.5)
    expect(pickNumber({ a: '12.5' }, 'a')).toBe(12.5)
    expect(pickNumber({ a: '₦1,250.00' }, 'a')).toBe(1250)
  })

  it('returns null — never 0 — for anything unusable', () => {
    for (const value of [undefined, null, '', '   ', 'abc', {}, [], true, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pickNumber({ a: value }, 'a')).toBeNull()
    }
  })

  it('preserves a real zero as 0, leaving the money rules to the caller', () => {
    expect(pickNumber({ a: 0 }, 'a')).toBe(0)
  })
})

describe('pickString', () => {
  it('trims strings and stringifies numbers', () => {
    expect(pickString({ a: '  AGL1 ' }, 'a')).toBe('AGL1')
    expect(pickString({ a: 1234567890 }, 'a')).toBe('1234567890')
  })

  it('returns null for blank or non-scalar values', () => {
    expect(pickString({ a: '   ' }, 'a')).toBeNull()
    expect(pickString({ a: {} }, 'a')).toBeNull()
    expect(pickString({}, 'a')).toBeNull()
  })
})

describe('pickFirst*', () => {
  it('takes the first path that yields a value and reports which one matched', () => {
    const payload = { Object: { DeliveryPrice: 900 } }
    expect(pickFirstNumber(payload, 'Object.GrandTotal,Object.DeliveryPrice')).toEqual({
      value: 900,
      path: 'Object.DeliveryPrice',
    })
  })

  it('returns null when no path matches', () => {
    expect(pickFirstNumber({}, 'a,b')).toBeNull()
    expect(pickFirstString({}, 'a,b')).toBeNull()
  })

  it('tolerates whitespace and empty entries in the override list', () => {
    expect(splitPaths(' a , , b ')).toEqual(['a', 'b'])
  })
})

describe('joinUrl', () => {
  it('joins without doubling or dropping the slash', () => {
    expect(joinUrl('https://x/api/thirdparty', 'price')).toBe('https://x/api/thirdparty/price')
    expect(joinUrl('https://x/api/thirdparty/', '/price')).toBe('https://x/api/thirdparty/price')
  })

  it('passes an absolute path through', () => {
    expect(joinUrl('https://x/api', 'https://y/price')).toBe('https://y/price')
  })
})

describe('env helpers', () => {
  it('falls back when unset or blank', () => {
    expect(env('GIG_TEST_VALUE', 'fallback')).toBe('fallback')
    process.env.GIG_TEST_VALUE = '   '
    expect(env('GIG_TEST_VALUE', 'fallback')).toBe('fallback')
  })

  it('falls back on a malformed number rather than yielding NaN', () => {
    process.env.GIG_TEST_VALUE = 'twelve'
    expect(envNumber('GIG_TEST_VALUE', 12000)).toBe(12000)
    process.env.GIG_TEST_VALUE = '500'
    expect(envNumber('GIG_TEST_VALUE', 12000)).toBe(500)
  })

  it('reads boolean-ish flags', () => {
    expect(envFlag('GIG_TEST_VALUE', true)).toBe(true)
    process.env.GIG_TEST_VALUE = '0'
    expect(envFlag('GIG_TEST_VALUE', true)).toBe(false)
    process.env.GIG_TEST_VALUE = 'TRUE'
    expect(envFlag('GIG_TEST_VALUE', false)).toBe(true)
  })

  it('ignores JSON that is not an object', () => {
    process.env.GIG_TEST_VALUE = '[1,2]'
    expect(envJsonObject('GIG_TEST_VALUE')).toEqual({})
    process.env.GIG_TEST_VALUE = '{"a":1}'
    expect(envJsonObject('GIG_TEST_VALUE')).toEqual({ a: 1 })
  })
})
