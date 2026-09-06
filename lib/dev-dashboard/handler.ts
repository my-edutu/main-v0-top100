import type { NextRequest } from 'next/server'

import { hasValidDemoSession } from '@/lib/dev-dashboard/auth'
import {
  DEMO_MEMBER_ID,
  getDemoDashboardStore,
  type DemoDashboardStore,
} from '@/lib/dev-dashboard/store'
import { nextAvailableSlug, slugifyGroupName } from '@/lib/groups/types'
import { slugifyTitle } from '@/lib/member-posts/types'
import { awardReturnPath } from '@/lib/awards/return-url'
import { needsClaim } from '@/lib/awards/status'
import { validateOnboarding } from '@/lib/dashboard/onboarding'
import type { PortfolioCoverFields, PortfolioCoverGeneration, PortfolioVariant } from '@/lib/portfolio-cover/types'

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status })
}

async function readBody(request: Request): Promise<Record<string, any> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null
  } catch {
    return null
  }
}

function nextId(store: DemoDashboardStore, prefix: string): string {
  store.sequence += 1
  return `${prefix}-${store.sequence}`
}

function requestUrl(request: NextRequest): URL {
  return request.nextUrl ?? new URL(request.url)
}

function mePayload(store: DemoDashboardStore) {
  return {
    member: store.profile,
    notifications: store.notifications,
    featureSubmissions: store.featureSubmissions,
  }
}

function routeMe(request: NextRequest, store: DemoDashboardStore) {
  if (request.method === 'GET') return json(mePayload(store))
  if (request.method !== 'PATCH') return null

  return readBody(request).then((patch) => {
    if (!patch) return json({ message: 'Invalid request body.' }, 400)

    const editable = [
      'name',
      'headline',
      'bio',
      'location',
      'organization',
      'field',
      'recruiterVisible',
      'emailVisible',
      'showInDirectory',
      'allowDirectMessages',
      'opportunityAlerts',
      'magazineAlerts',
      'messageAlerts',
      'eventReminders',
      'hideEmailFromRecruiters',
      'requireProfileApproval',
      'securityEmails',
    ] as const

    for (const key of editable) {
      if (patch[key] !== undefined) (store.profile as any)[key] = patch[key]
    }
    return json({ member: store.profile })
  })
}

async function routePosts(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path.length === 1 && request.method === 'GET') return json({ posts: store.posts })

  if (path.length === 1 && request.method === 'POST') {
    const body = await readBody(request)
    const title = String(body?.title ?? '').trim()
    const content = String(body?.body ?? '').trim()
    if (title.length < 3 || content.length < 20) {
      return json({ message: 'Add a title and a longer post before saving.' }, 400)
    }
    const now = new Date().toISOString()
    const status = body?.status === 'published' ? 'published' : 'draft'
    const post = {
      id: nextId(store, 'demo-post'),
      slug: slugifyTitle(title),
      title,
      excerpt: body?.excerpt ? String(body.excerpt) : null,
      body: content,
      coverUrl: body?.coverUrl ? String(body.coverUrl) : null,
      tags: Array.isArray(body?.tags) ? body.tags.map(String).slice(0, 6) : [],
      status,
      moderationNote: null,
      publishedAt: status === 'published' ? now : null,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    } as const
    store.posts.unshift(post)
    return json({ post }, 201)
  }

  const postId = path[1]
  const index = store.posts.findIndex((post) => post.id === postId)
  if (path.length !== 2 || index < 0) return json({ message: 'Post not found.' }, 404)

  if (request.method === 'DELETE') {
    store.posts.splice(index, 1)
    return json({ ok: true })
  }

  if (request.method === 'PATCH') {
    const patch = await readBody(request)
    if (!patch) return json({ message: 'Invalid request body.' }, 400)
    const current = store.posts[index]
    const now = new Date().toISOString()
    const nextStatus = patch.status === 'published' ? 'published' : patch.status === 'draft' ? 'draft' : current.status
    const updated = {
      ...current,
      ...(typeof patch.title === 'string' ? { title: patch.title.trim() } : {}),
      ...(typeof patch.body === 'string' ? { body: patch.body.trim() } : {}),
      ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt ? String(patch.excerpt) : null } : {}),
      ...(patch.coverUrl !== undefined ? { coverUrl: patch.coverUrl ? String(patch.coverUrl) : null } : {}),
      ...(Array.isArray(patch.tags) ? { tags: patch.tags.map(String).slice(0, 6) } : {}),
      status: nextStatus,
      publishedAt: current.publishedAt ?? (nextStatus === 'published' ? now : null),
      updatedAt: now,
    }
    store.posts[index] = updated
    return json({ post: updated })
  }

  return null
}

async function routeConversations(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path.length === 1 && request.method === 'GET') {
    const conversations = store.conversations.map((item) => item.summary)
    const unreadTotal = conversations.reduce((total, item) => total + item.unreadCount, 0)
    return json({ conversations, unreadTotal })
  }

  if (path.length === 1 && request.method === 'POST') {
    const body = await readBody(request)
    const text = String(body?.body ?? '').trim()
    if (!text) return json({ message: 'Write a message before sending.' }, 400)
    const conversationId = nextId(store, 'demo-conversation')
    const createdAt = new Date().toISOString()
    store.conversations.unshift({
      summary: {
        id: conversationId,
        otherMember: {
          id: String(body?.recipientProfileId ?? 'demo-member-2'),
          name: 'Demo Awardee',
          headline: 'Top100 Africa awardee',
          slug: null,
          avatarUrl: null,
          initials: 'DA',
        },
        lastMessage: { body: text, mine: true, createdAt },
        unreadCount: 0,
        lastMessageAt: createdAt,
      },
      messages: [
        {
          id: nextId(store, 'demo-message'),
          conversationId,
          senderId: DEMO_MEMBER_ID,
          mine: true,
          body: text,
          createdAt,
          readAt: createdAt,
        },
      ],
    })
    return json({ conversationId }, 201)
  }

  const conversation = store.conversations.find((item) => item.summary.id === path[1])
  if (!conversation) return json({ message: 'Conversation not found.' }, 404)

  if (path.length === 2 && request.method === 'GET') {
    conversation.summary.unreadCount = 0
    for (const message of conversation.messages) {
      if (!message.mine && !message.readAt) message.readAt = new Date().toISOString()
    }
    return json({ conversation: conversation.summary, messages: conversation.messages })
  }

  if (path.length === 2 && request.method === 'POST') {
    const body = await readBody(request)
    const text = String(body?.body ?? '').trim()
    if (!text) return json({ message: 'Write a message before sending.' }, 400)
    const createdAt = new Date().toISOString()
    const message = {
      id: nextId(store, 'demo-message'),
      conversationId: conversation.summary.id,
      senderId: DEMO_MEMBER_ID,
      mine: true,
      body: text,
      createdAt,
      readAt: createdAt,
    }
    conversation.messages.push(message)
    conversation.summary.lastMessage = { body: text, mine: true, createdAt }
    conversation.summary.lastMessageAt = createdAt
    return json({ message }, 201)
  }

  return null
}

async function routeGroups(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path.length === 1 && request.method === 'GET') {
    return json({ groups: store.groups.map((item) => item.summary) })
  }

  if (path.length === 1 && request.method === 'POST') {
    const body = await readBody(request)
    const name = String(body?.name ?? '').trim()
    if (name.length < 3) return json({ message: 'Give the group a name of at least 3 characters' }, 400)
    const group = {
      id: nextId(store, 'demo-group'),
      slug: nextAvailableSlug(
        slugifyGroupName(name),
        store.groups.map((item) => item.summary.slug),
      ),
      name,
      description: String(body?.description ?? '').trim(),
      topic: String(body?.topic ?? '').trim(),
      coverUrl: null,
      visibility: body?.visibility === 'private' || body?.visibility === 'request' ? body.visibility : 'open',
      isArchived: false,
      memberCount: 1,
      createdAt: new Date().toISOString(),
      membership: { role: 'owner', status: 'active', unreadCount: 0 },
    } as const
    store.groups.unshift({ summary: group, messages: [], pendingMembers: [] })
    return json({ group }, 201)
  }

  const group = store.groups.find((item) => item.summary.id === path[1])
  if (!group) return json({ message: 'This group no longer exists.' }, 404)

  if (path.length === 2 && request.method === 'GET') {
    if (group.summary.membership) group.summary.membership.unreadCount = 0
    return json({ group: group.summary, messages: group.messages, pendingMembers: group.pendingMembers })
  }

  if (path[2] === 'messages') {
    if (request.method === 'GET') return json({ messages: group.messages, hasMore: false })
    if (request.method === 'POST') {
      const body = await readBody(request)
      const text = String(body?.body ?? '').trim()
      if (!text) return json({ message: 'Write something before sending' }, 400)
      const message = {
        id: nextId(store, 'demo-group-message'),
        groupId: group.summary.id,
        authorId: DEMO_MEMBER_ID,
        authorName: store.profile.name,
        authorInitials: store.profile.avatarInitials,
        mine: true,
        body: text,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      }
      group.messages.push(message)
      return json({ message }, 201)
    }
    if (request.method === 'DELETE') {
      const id = requestUrl(request).searchParams.get('messageId')
      const index = group.messages.findIndex((item) => item.id === id)
      if (index < 0) return json({ message: 'That message no longer exists.' }, 404)
      group.messages.splice(index, 1)
      return json({ ok: true })
    }
  }

  if (path[2] === 'membership') {
    if (request.method === 'POST') {
      const alreadyMember = Boolean(group.summary.membership)
      if (!group.summary.membership) {
        group.summary.membership = { role: 'member', status: 'active', unreadCount: 0 }
        group.summary.memberCount += 1
      }
      return json({ status: group.summary.membership.status, alreadyMember })
    }
    if (request.method === 'DELETE') {
      if (group.summary.membership?.role === 'owner') {
        return json({ message: 'You are the only owner of this group.' }, 409)
      }
      if (group.summary.membership) group.summary.memberCount = Math.max(0, group.summary.memberCount - 1)
      group.summary.membership = null
      return json({ ok: true })
    }
    if (request.method === 'PATCH') return json({ ok: true })
  }

  return null
}

async function routeOpportunities(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path.length === 1 && request.method === 'GET') {
    const params = requestUrl(request).searchParams
    const type = params.get('type')?.toLowerCase()
    const query = params.get('q')?.trim().toLowerCase()
    const savedOnly = params.get('saved') === '1'
    const opportunities = store.opportunities.filter((item) => {
      if (type && item.type.toLowerCase() !== type) return false
      if (savedOnly && !item.isSaved) return false
      if (query) {
        const haystack = `${item.title} ${item.organization ?? ''} ${item.summary ?? ''}`.toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
    return json({ opportunities, tiers: ['public', 'members', 'approved'] })
  }

  const opportunity = store.opportunities.find((item) => item.id === path[1])
  if (!opportunity) return json({ message: 'Opportunity not found.' }, 404)
  if (request.method === 'POST') opportunity.isSaved = true
  else if (request.method === 'DELETE') opportunity.isSaved = false
  else return null
  return json({ isSaved: opportunity.isSaved })
}

async function routeInvitations(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path.length === 1 && request.method === 'GET') {
    return json({
      invitations: store.invitations,
      pendingCount: store.invitations.filter((item) => item.rsvp === 'pending').length,
    })
  }
  const invitation = store.invitations.find((item) => item.id === path[1])
  if (!invitation) return json({ message: 'Invitation not found.' }, 404)
  if (request.method === 'POST') {
    invitation.seenAt = invitation.seenAt ?? new Date().toISOString()
    return json({ invitation })
  }
  if (request.method === 'PATCH') {
    const body = await readBody(request)
    if (!['attending', 'declined', 'maybe'].includes(body?.rsvp)) {
      return json({ message: 'Choose a valid RSVP.' }, 400)
    }
    invitation.rsvp = body?.rsvp
    invitation.rsvpAt = new Date().toISOString()
    return json({ invitation })
  }
  return null
}

async function routeAward(request: NextRequest, path: string[], store: DemoDashboardStore) {
  const awardPriceKobo = 2_500_000
  if (path.length === 1 && request.method === 'GET') {
    return json({
      order: store.awardOrder,
      awardPriceKobo,
      needsClaim: needsClaim(store.awardOrder?.status ?? null),
    })
  }
  if (path[1] === 'quote' && request.method === 'POST') {
    const body = await readBody(request)
    if (!body) return json({ message: 'Invalid request body.' }, 400)
    const now = new Date().toISOString()
    store.awardOrder = {
      id: 'demo-award-order-1',
      status: 'quoted',
      recipientName: String(body.recipientName ?? store.profile.name),
      phone: String(body.phone ?? ''),
      email: String(body.email ?? store.profile.email),
      addressLine1: String(body.addressLine1 ?? ''),
      addressLine2: String(body.addressLine2 ?? ''),
      city: String(body.city ?? ''),
      state: String(body.state ?? ''),
      country: String(body.country ?? ''),
      postalCode: String(body.postalCode ?? ''),
      awardAmountKobo: awardPriceKobo,
      shippingAmountKobo: 750_000,
      totalAmountKobo: 3_250_000,
      currency: 'NGN',
      quoteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      waybill: null,
      trackingUrl: null,
      deliveryStatus: null,
      paidAt: null,
      createdAt: now,
    }
    return json({ order: store.awardOrder, message: 'Local demo shipping quote generated.' })
  }
  if (path[1] === 'checkout' && request.method === 'POST') {
    if (!store.awardOrder) return json({ message: 'Add delivery details first.' }, 400)
    const paidAt = new Date().toISOString()
    store.awardOrder.status = 'paid'
    store.awardOrder.paidAt = paidAt
    return json({
      authorizationUrl: awardReturnPath({ paymentDone: true, demo: true }),
      reference: 'LOCAL-DEMO-PAYMENT',
    })
  }
  if (path[1] === 'track' && request.method === 'GET') {
    if (!store.awardOrder) return json({ message: 'Award order not found.' }, 404)
    return json({ order: store.awardOrder })
  }
  return null
}

function demoCoverData(label: string, name: string, fields: PortfolioCoverFields) {
  const safe = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
  const facts = [fields.school, fields.cgpa, fields.degreeClass, fields.fieldOfStudy, fields.country, fields.cohort].filter(Boolean).map((value, index) => `<text x="80" y="${700 + index * 32}" fill="#f5d76e" font-family="Arial" font-size="23">${safe(String(value))}</text>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#3a3d43"/><stop offset=".7" stop-color="#111315"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="400" cy="430" r="190" fill="#b98b72"/><path d="M160 100h480v80H160z" fill="#f3c623" opacity=".9"/><text x="60" y="130" font-family="Georgia" font-weight="bold" font-size="75" fill="white">TOP100</text><text x="60" y="215" font-family="Arial" font-size="18" letter-spacing="5" fill="#f5d76e">AFRICA FUTURE LEADERS</text><path d="M160 610h480v310H160z" fill="#24272b"/><text x="60" y="730" font-family="Georgia" font-weight="bold" font-size="46" fill="white">${safe(label)}</text><text x="60" y="790" font-family="Arial" font-weight="bold" font-size="28" fill="white">${safe(name)}</text><text x="60" y="860" font-family="Arial" font-size="19" fill="#f5d76e">${facts ? safe(String(fields.school ?? 'Top100 Future Leader')) : 'TOP100 FUTURE LEADER'}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function routePortfolioCover(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path[1] !== 'generations') return null
  if (path.length === 3 && path[2] === 'current' && request.method === 'GET') return json({ enabled: true, generation: store.portfolioCover })
  if (path.length === 2 && request.method === 'POST') {
    if (store.portfolioCover && ['queued', 'processing', 'ready', 'selected'].includes(store.portfolioCover.status)) return json({ message: 'You already have a portfolio cover set.' }, 409)
    const form = await request.formData()
    const file = form.get('portrait')
    if (!(file instanceof File)) return json({ message: 'A portrait photo is required.' }, 400)
    const tailoring = form.get('tailoring') === 'female' ? 'female' : form.get('tailoring') === 'male' ? 'male' : null
    if (!tailoring || form.get('consent') !== 'true') return json({ message: 'Choose Male or Female and accept consent.' }, 400)
    let fields: PortfolioCoverFields = {}
    try { fields = JSON.parse(String(form.get('fields') ?? '{}')) as PortfolioCoverFields } catch { return json({ message: 'Invalid details.' }, 400) }
    const id = nextId(store, 'demo-cover')
    const now = new Date().toISOString()
    const generation: PortfolioCoverGeneration = { id, memberId: DEMO_MEMBER_ID, status: 'ready', tailoring, fields, attempt: 1, options: { 'executive-charcoal': demoCoverData('EXECUTIVE CHARCOAL', String(fields.name ?? store.profile.name), fields), 'leadership-ivory': demoCoverData('LEADERSHIP IVORY', String(fields.name ?? store.profile.name), fields) }, createdAt: now, updatedAt: now }
    store.portfolioCover = generation
    return json({ generation }, 202)
  }
  const id = path[2]
  if (!store.portfolioCover || store.portfolioCover.id !== id) return json({ message: 'Cover set not found.' }, 404)
  if (path[3] === 'select' && request.method === 'POST') {
    const body = await readBody(request)
    const variant = body?.variant as PortfolioVariant
    if (!['executive-charcoal', 'leadership-ivory'].includes(variant)) return json({ message: 'Choose one of the two covers.' }, 400)
    store.portfolioCover = { ...store.portfolioCover, status: 'selected', selectedVariant: variant, selectedUrl: store.portfolioCover.options[variant], updatedAt: new Date().toISOString() }
    return json({ generation: store.portfolioCover })
  }
  if (path[3] === 'reject' && request.method === 'POST') {
    store.portfolioCover = { ...store.portfolioCover, status: 'rejected', updatedAt: new Date().toISOString() }
    return json({ generation: store.portfolioCover })
  }
  return json({ message: 'Local portfolio cover demo route not implemented.' }, 501)
}

export async function handleDemoMemberRequest(
  request: NextRequest,
  path: string[],
  store = getDemoDashboardStore(),
  environment = process.env.NODE_ENV,
): Promise<Response> {
  if (!hasValidDemoSession(request, environment)) {
    return json({ message: 'Authentication required.' }, 401)
  }

  let response: Response | null = null
  switch (path[0]) {
    case 'visits':
      response = json({ count: 1 })
      break
    case 'onboarding': {
      if (request.method !== 'POST') break
      const body = await readBody(request)
      if (!body) return json({ message: 'Invalid form.' }, 400)
      if (body.reset === true) {
        store.profile.onboardingCompletedAt = null
        store.profile.onboardingStep = 0
        return json({ member: store.profile })
      }
      if (body.complete) {
        const error = validateOnboarding(body)
        if (error) return json({ message: error }, 400)
      }
      for (const key of ['headline', 'location', 'field', 'bio'] as const) if (typeof body[key] === 'string') store.profile[key] = body[key].trim()
      store.profile.onboardingStep = Number(body.step) || 0
      if (body.complete) store.profile.onboardingCompletedAt = new Date().toISOString()
      response = json({ member: store.profile })
      break
    }
    case 'me':
      response = await routeMe(request, store)
      break
    case 'posts':
      response = await routePosts(request, path, store)
      break
    case 'conversations':
      response = await routeConversations(request, path, store)
      break
    case 'notifications':
      if (request.method === 'PATCH') {
        const body = await readBody(request)
        const ids = body?.all === true ? null : new Set([String(body?.notificationId ?? '')])
        for (const item of store.notifications) {
          if ((!ids || ids.has(item.id)) && !item.readBy.includes(DEMO_MEMBER_ID)) item.readBy.push(DEMO_MEMBER_ID)
        }
        response = json({ ok: true })
      }
      break
    case 'features':
      if (request.method === 'POST') {
        const body = await readBody(request)
        if (!body?.title || !body?.summary) return json({ message: 'Add a title and summary.' }, 400)
        const submission = {
          id: nextId(store, 'demo-feature'),
          memberId: DEMO_MEMBER_ID,
          memberName: store.profile.name,
          title: String(body.title),
          category: ['bio', 'story', 'product', 'project'].includes(body.category) ? body.category : 'story',
          summary: String(body.summary),
          contactEmail: String(body.contactEmail ?? store.profile.email),
          status: 'pending',
          createdAt: new Date().toISOString(),
        } as const
        store.featureSubmissions.push(submission)
        response = json({ submission }, 201)
      }
      break
    case 'groups':
      response = await routeGroups(request, path, store)
      break
    case 'opportunities':
      response = await routeOpportunities(request, path, store)
      break
    case 'event-invitations':
      response = await routeInvitations(request, path, store)
      break
    case 'award':
      response = await routeAward(request, path, store)
      break
    case 'portfolio-cover':
      response = await routePortfolioCover(request, path, store)
      break
  }

  return response ?? json({ message: `Local dashboard demo route not implemented: ${request.method} /${path.join('/')}` }, 501)
}
