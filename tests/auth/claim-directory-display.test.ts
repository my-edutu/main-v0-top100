import { describe, expect, it } from 'vitest'

import { repairUtf8Mojibake } from '@/lib/auth/claim-directory-display'

describe('repairUtf8Mojibake', () => {
  it('repairs UTF-8 accents that were decoded as Latin-1 in directory text', () => {
    expect(repairUtf8Mojibake('JÃ©rÃ©mie Urombi Muke')).toBe('Jérémie Urombi Muke')
    expect(repairUtf8Mojibake('RÃ©publique DÃ©mocratique du Congo')).toBe('République Démocratique du Congo')
  })

  it('leaves correctly encoded and unrelated text unchanged', () => {
    expect(repairUtf8Mojibake('Mariam Murtala Yusuf')).toBe('Mariam Murtala Yusuf')
    expect(repairUtf8Mojibake('JÃ©rÃ©mie 🙂')).toBe('Jérémie 🙂')
    expect(repairUtf8Mojibake('© and 🙂')).toBe('© and 🙂')
  })
})
