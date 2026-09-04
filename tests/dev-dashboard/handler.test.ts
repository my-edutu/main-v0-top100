import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEV_DASHBOARD_COOKIE, DEV_DASHBOARD_COOKIE_VALUE } from '@/lib/dev-dashboard/auth'
import { handleDemoMemberRequest } from '@/lib/dev-dashboard/handler'
import { createDemoDashboardStore, type DemoDashboardStore } from '@/lib/dev-dashboard/store'

function demoRequest(method: string, pathname: string, body?: unknown, authenticated = true) {
  const headers = new Headers({ host: 'localhost:3000' })
  if (authenticated) {
    headers.set('cookie', `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}`)
  }
  if (body !== undefined) headers.set('content-type', 'application/json')

  return new NextRequest(`http://localhost:3000/api/member/${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

async function call(
  store: DemoDashboardStore,
  method: string,
  pathname: string,
  body?: unknown,
  authenticated = true,
) {
  const request = demoRequest(method, pathname, body, authenticated)
  const pathSegments = request.nextUrl.pathname
    .replace(/^\/api\/member\/?/, '')
    .split('/')
    .filter(Boolean)
  const response = await handleDemoMemberRequest(request, pathSegments, store, 'development')
  return { response, data: await response.json() }
}

describe('interactive local dashboard demo API', () => {
  let store: DemoDashboardStore

  beforeEach(() => {
    store = createDemoDashboardStore()
  })

  it('rejects requests without the local demo session', async () => {
    const { response, data } = await call(store, 'GET', 'me', undefined, false)
    expect(response.status).toBe(401)
    expect(data.message).toBe('Authentication required.')
  })

  it('loads and persists profile edits', async () => {
    const initial = await call(store, 'GET', 'me')
    expect(initial.data.member.name).toBe('Amara Okafor')

    const updated = await call(store, 'PATCH', 'me', {
      headline: 'Building inclusive climate technology',
      recruiterVisible: false,
    })
    expect(updated.response.status).toBe(200)
    expect(updated.data.member.headline).toBe('Building inclusive climate technology')
    expect(updated.data.member.recruiterVisible).toBe(false)

    const reloaded = await call(store, 'GET', 'me')
    expect(reloaded.data.member.headline).toBe('Building inclusive climate technology')
  })

  it('creates, updates, and deletes member posts', async () => {
    const created = await call(store, 'POST', 'posts', {
      title: 'Notes from the demo workspace',
      body: 'This is a long enough demo post body to exercise the interactive editor.',
      status: 'draft',
      tags: ['Leadership'],
    })
    expect(created.response.status).toBe(201)
    expect(created.data.post.title).toBe('Notes from the demo workspace')

    const postId = created.data.post.id as string
    const updated = await call(store, 'PATCH', `posts/${postId}`, {
      title: 'Updated notes from the demo workspace',
      status: 'published',
    })
    expect(updated.data.post.status).toBe('published')
    expect(updated.data.post.publishedAt).toEqual(expect.any(String))

    const removed = await call(store, 'DELETE', `posts/${postId}`)
    expect(removed.response.status).toBe(200)
    const list = await call(store, 'GET', 'posts')
    expect(list.data.posts.some((post: { id: string }) => post.id === postId)).toBe(false)
  })

  it('sends direct messages and returns them on the next read', async () => {
    const list = await call(store, 'GET', 'conversations')
    const conversationId = list.data.conversations[0].id as string

    const sent = await call(store, 'POST', `conversations/${conversationId}`, {
      body: 'Hello from the local dashboard demo.',
    })
    expect(sent.response.status).toBe(201)
    expect(sent.data.message.mine).toBe(true)

    const detail = await call(store, 'GET', `conversations/${conversationId}`)
    expect(detail.data.messages.at(-1).body).toBe('Hello from the local dashboard demo.')
  })

  it('marks notifications read and stores a feature submission', async () => {
    const marked = await call(store, 'PATCH', 'notifications', { all: true })
    expect(marked.data.ok).toBe(true)

    const feature = await call(store, 'POST', 'features', {
      memberId: 'demo-member-1',
      memberName: 'Amara Okafor',
      title: 'Climate founders to watch',
      category: 'story',
      summary: 'A local-only feature submission for dashboard testing.',
      contactEmail: 'demo@top100.local',
    })
    expect(feature.response.status).toBe(201)

    const me = await call(store, 'GET', 'me')
    expect(me.data.notifications.every((notification: { readBy: string[] }) => notification.readBy.length === 1)).toBe(true)
    expect(me.data.featureSubmissions.at(-1).title).toBe('Climate founders to watch')
  })

  it('creates groups, joins groups, and posts group messages', async () => {
    const created = await call(store, 'POST', 'groups', {
      name: 'Demo Builders Circle',
      description: 'Testing group interactions locally.',
      topic: 'Product',
      visibility: 'open',
    })
    expect(created.response.status).toBe(201)
    expect(created.data.group.membership.role).toBe('owner')

    const groups = await call(store, 'GET', 'groups')
    const discover = groups.data.groups.find((group: { membership: unknown }) => group.membership === null)
    const joined = await call(store, 'POST', `groups/${discover.id}/membership`)
    expect(joined.data.status).toBe('active')

    const posted = await call(store, 'POST', `groups/${discover.id}/messages`, {
      body: 'Glad to join this demo group.',
    })
    expect(posted.data.message.mine).toBe(true)
    const detail = await call(store, 'GET', `groups/${discover.id}`)
    expect(detail.data.messages.at(-1).body).toBe('Glad to join this demo group.')
  })

  it('persists opportunity bookmarks and invitation RSVPs', async () => {
    const opportunities = await call(store, 'GET', 'opportunities')
    const opportunityId = opportunities.data.opportunities[0].id as string
    const saved = await call(store, 'POST', `opportunities/${opportunityId}`)
    expect(saved.data.isSaved).toBe(true)
    const savedOnly = await call(store, 'GET', 'opportunities?saved=1')
    expect(savedOnly.data.opportunities.map((item: { id: string }) => item.id)).toContain(opportunityId)

    const invitations = await call(store, 'GET', 'event-invitations')
    const invitationId = invitations.data.invitations[0].id as string
    const rsvp = await call(store, 'PATCH', `event-invitations/${invitationId}`, { rsvp: 'attending' })
    expect(rsvp.data.invitation.rsvp).toBe('attending')
    expect(rsvp.data.invitation.rsvpAt).toEqual(expect.any(String))
  })

  it('simulates award quoting without an external provider', async () => {
    const quote = await call(store, 'POST', 'award/quote', {
      recipientName: 'Amara Okafor',
      phone: '+2348000000000',
      email: 'demo@top100.local',
      addressLine1: '1 Demo Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
    })
    expect(quote.data.order.shippingAmountKobo).toBe(750000)
    expect(quote.data.order.totalAmountKobo).toBe(3250000)

    const awaitingClaim = await call(store, 'GET', 'award')
    expect(awaitingClaim.data.needsClaim).toBe(true)

    const checkout = await call(store, 'POST', 'award/checkout')
    expect(checkout.data.authorizationUrl).toBe('/dashboard/me/award?payment=done&demo=1')

    const completed = await call(store, 'GET', 'award')
    expect(completed.data.order.status).toBe('paid')
    expect(completed.data.order.paidAt).toEqual(expect.any(String))
  })

  it('creates two portfolio cover options and preserves the original member avatar state', async () => {
    const form = new FormData()
    form.set('portrait', new File([Buffer.from('portrait')], 'portrait.jpg', { type: 'image/jpeg' }))
    form.set('tailoring', 'female')
    form.set('consent', 'true')
    form.set('fields', JSON.stringify({ name: 'Amara Okafor', school: 'University of Lagos', cgpa: '4.8 / 5.0' }))
    const request = new NextRequest('http://localhost:3000/api/member/portfolio-cover/generations', { method: 'POST', headers: { host: 'localhost:3000', cookie: `${DEV_DASHBOARD_COOKIE}=${DEV_DASHBOARD_COOKIE_VALUE}` }, body: form })
    const path = ['portfolio-cover', 'generations']
    const created = await handleDemoMemberRequest(request, path, store, 'development')
    const createdData = await created.json()
    expect(created.status).toBe(202)
    expect(Object.keys(createdData.generation.options)).toHaveLength(2)
    const id = createdData.generation.id as string
    const selectedRequest = demoRequest('POST', `portfolio-cover/generations/${id}/select`, { variant: 'leadership-ivory' })
    const selected = await handleDemoMemberRequest(selectedRequest, [...path, id, 'select'], store, 'development')
    expect((await selected.json()).generation.status).toBe('selected')
    expect(store.profile.avatarInitials).toBe('AO')
  })

  it('makes unsupported demo operations visible', async () => {
    const { response, data } = await call(store, 'GET', 'does-not-exist')
    expect(response.status).toBe(501)
    expect(data.message).toContain('not implemented')
  })
})
