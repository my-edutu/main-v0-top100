import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigation = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock('next/navigation', async (importOriginal) => ({
  ...await importOriginal<typeof import('next/navigation')>(),
  redirect: navigation.redirect,
}))

import {
  requestWhatsAppGroupAssignment,
  WhatsAppGroupAssigned,
  WhatsAppGroupsSection,
} from '@/app/dashboard/discover/groups/whatsapp-groups-section'
import GroupDetailPage from '@/app/dashboard/discover/groups/[id]/page'

const group = {
  key: 'group-2' as const,
  label: 'Group 2',
  inviteUrl: 'https://chat.whatsapp.com/F8p9rErOr6VAYGZbhaske8?mode=gi_t',
}

describe('WhatsApp groups page', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('starts in a loading state without exposing an invite CTA', () => {
    const markup = renderToStaticMarkup(createElement(WhatsAppGroupsSection, { approved: true }))

    expect(markup).toContain('Finding your WhatsApp group')
    expect(markup).not.toContain('Join your WhatsApp group')
    expect(markup).not.toContain('chat.whatsapp.com')
  })

  it('requests the saved assignment without sending browser-selected group data', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ group, created: false }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestWhatsAppGroupAssignment()).resolves.toEqual({ group, created: false })

    expect(fetchMock).toHaveBeenCalledWith('/api/member/whatsapp-group', { method: 'POST' })
  })

  it('uses the stateful local-demo endpoint in the sample dashboard', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ group, created: true }) })
    vi.stubGlobal('fetch', fetchMock)

    await requestWhatsAppGroupAssignment(true)

    expect(fetchMock).toHaveBeenCalledWith('/api/dev-dashboard/whatsapp-group', { method: 'POST' })
  })

  it('allows retry after an assignment API error', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Try again.' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ group, created: true }) })
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestWhatsAppGroupAssignment()).rejects.toThrow('Try again.')
    await expect(requestWhatsAppGroupAssignment()).resolves.toEqual({ group, created: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows the assigned group and opens its invite only from an explicit safe link', () => {
    const markup = renderToStaticMarkup(createElement(WhatsAppGroupAssigned, { group, created: false }))

    expect(markup).toContain('Group 2')
    expect(markup).toContain('role="status"')
    expect(markup).toContain('href="https://chat.whatsapp.com/F8p9rErOr6VAYGZbhaske8?mode=gi_t"')
    expect(markup).toContain('target="_blank"')
    expect(markup).toContain('rel="noopener noreferrer"')
    expect(markup).toContain('Join your WhatsApp group')
    expect(markup).not.toContain('whatsapp-group-card--reveal')
  })

  it('animates only a new reveal and leaves returning members in the saved state', () => {
    const firstReveal = renderToStaticMarkup(createElement(WhatsAppGroupAssigned, { group, created: true }))
    const saved = renderToStaticMarkup(createElement(WhatsAppGroupAssigned, { group, created: false }))

    expect(firstReveal).toContain('whatsapp-group-card--reveal')
    expect(saved).not.toContain('whatsapp-group-card--reveal')
  })

  it('disables the reveal animation for reduced-motion preferences', () => {
    const css = readFileSync(resolve(process.cwd(), 'app/dashboard/dashboard.css'), 'utf8')

    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[^{]*\{[^}]*\.whatsapp-group-card--reveal\s*\{\s*animation:\s*none/s)
  })

  it('renders a locked state for members without approval', () => {
    const markup = renderToStaticMarkup(createElement(WhatsAppGroupsSection, { approved: false }))

    expect(markup).toContain('available to approved members')
    expect(markup).not.toContain('Join your WhatsApp group')
    expect(markup).not.toContain('chat.whatsapp.com')
  })

  it('redirects legacy group detail URLs back to the WhatsApp Groups page', () => {
    GroupDetailPage()

    expect(navigation.redirect).toHaveBeenCalledWith('/dashboard/discover/groups')
  })
})
