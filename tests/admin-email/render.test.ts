import { expect, it } from 'vitest'
import { renderGeneralEmail } from '@/lib/admin-email/render'
const input = { name: 'Ada Lovelace', year: '2026', fee: '', actionUrl: 'https://top100afl.com/award', stopUrl: 'https://top100afl.com/stop', imageUrl: 'https://top100afl.com/image.png' }
it('renders a personal general email without the physical-award image', () => {
  const output = renderGeneralEmail({ subject: 'Hello {{first_name}}', body: 'Hi {{first_name}},\n\nSee {{action_link}}' }, input)
  expect(output.subject).toBe('Hello Ada'); expect(output.html).toContain('Hi Ada,'); expect(output.html).toContain('href="https://top100afl.com/award"')
  expect(output.html).toContain('Unsubscribe'); expect(output.html).not.toContain('Physical Africa Future Leaders award')
})
it('escapes user-controlled content and validates links', () => {
  const output = renderGeneralEmail({ subject: 'Hi', body: '<script>alert(1)</script>' }, input)
  expect(output.html).not.toContain('<script>'); expect(output.html).toContain('&lt;script&gt;')
  expect(() => renderGeneralEmail({ subject: 'Hi', body: 'Hello' }, { ...input, stopUrl: 'javascript:alert(1)' })).toThrow()
})
