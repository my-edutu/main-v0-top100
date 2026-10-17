import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BotWorkspace } from '@/app/admin/afl-bot/workspace'

describe('AFL bot workspace before a private connection is ready', () => {
  it('shows clear initial status and disables mutations while checking the connection', () => {
    const markup = renderToStaticMarkup(<BotWorkspace />)
    expect(markup).toContain('Checking bot connection')
    expect(markup).toContain('Only published member entries can answer member questions.')
    expect(markup).toContain('Admins only')
    expect(markup).toContain('Save knowledge draft')
    expect(markup).not.toContain('Send announcement now')
    expect(markup).not.toContain('AFL_BOT_ADMIN_TOKEN')
    expect(markup.match(/<button[^>]*disabled=""[^>]*>/g)?.length).toBeGreaterThan(2)
  })
})
