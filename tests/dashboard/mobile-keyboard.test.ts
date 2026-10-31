import { expect, it } from 'vitest'
import { hasSoftwareKeyboard } from '@/lib/dashboard/mobile-keyboard'

it('hides navigation only for a focused editor with a shrunken visual viewport', () => {
  expect(hasSoftwareKeyboard(844, 500, 1, true)).toBe(true)
  expect(hasSoftwareKeyboard(844, 810, 1, true)).toBe(false)
  expect(hasSoftwareKeyboard(844, 500, 1, false)).toBe(false)
  expect(hasSoftwareKeyboard(844, 400, 2, true)).toBe(false)
})
