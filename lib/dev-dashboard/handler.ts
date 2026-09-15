import type { NextRequest } from 'next/server'

import { hasValidDemoSession } from '@/lib/dev-dashboard/auth'
import {
  DEMO_MEMBER_ID,
  DEMO_AWARD_PRICE_OPTIONS,
  getDemoDashboardStore,
  type DemoDashboardStore,
} from '@/lib/dev-dashboard/store'
import { nextAvailableSlug, slugifyGroupName } from '@/lib/groups/types'
import { slugifyTitle } from '@/lib/member-posts/types'
import { awardReturnPath } from '@/lib/awards/return-url'
import { needsClaim } from '@/lib/awards/status'
import { validateOnboarding } from '@/lib/dashboard/onboarding'
import type { PortfolioCoverFields, PortfolioCoverGeneration, PortfolioVariant } from '@/lib/portfolio-cover/types'
import { preparePortrait } from '@/lib/portfolio-cover/image'
import { renderPortfolioCover } from '@/lib/portfolio-cover/render-cover'
import { portfolioCoverConfig } from '@/lib/portfolio-cover/config'
import { createOpenAIImageEditor } from '@/lib/portfolio-cover/providers/openai'
import { CONTRIBUTION_AREAS, contributionSchema } from '@/lib/community-contributions'
import { AVATAR_PRESET, processUpload } from '@/lib/image-processing'
import { uploadMedia } from '@/lib/media/storage'

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

async function routeContributions(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path.length !== 1 || request.method !== 'POST') return null

  let payload: Record<string, unknown> | null = null
  let receiptName = ''
  if (request.headers.get('content-type')?.includes('multipart/form-data')) {
    const formData = await request.formData()
    const receipt = formData.get('receipt')
    receiptName = receipt instanceof File ? receipt.name : ''
    payload = {
      campaign: String(formData.get('campaign') ?? ''),
      kind: String(formData.get('kind') ?? ''),
      area: String(formData.get('area') ?? ''),
      name: String(formData.get('name') ?? ''),
      details: String(formData.get('details') ?? ''),
      amount: String(formData.get('amount') ?? ''),
      currency: String(formData.get('currency') ?? ''),
      consent: String(formData.get('consent') ?? '') === 'true',
    }
  } else {
    payload = await readBody(request)
  }

  const parsed = contributionSchema.safeParse(payload)
  if (!parsed.success) return json({ message: parsed.error.issues[0].message }, 400)
  const data = parsed.data
  const areaLabel = data.campaign === 'give-back' && data.area === 'partnership-team'
    ? 'Partnership proposals'
    : CONTRIBUTION_AREAS.find(option => option.value === data.area)?.label ?? (data.area || 'Not selected')
  const receiptLine = data.kind === 'cash'
    ? receiptName ? `Donation receipt: ${receiptName}` : 'Donation receipt: Not uploaded yet.'
    : ''
  const now = new Date().toISOString()
  // Keep the route usable during dev-server hot reloads that retain a store
  // created before the inbox collection was added.
  store.messages ??= []
  store.messages.unshift({
    id: nextId(store, 'demo-contribution'),
    name: data.name,
    email: store.profile.email,
    subject: `${data.campaign === 'volunteer' ? 'Top100 volunteer' : 'Social impact initiative'} — ${data.kind === 'cash' ? 'Cash donation' : 'Services'}`,
    message: [
      `Member ID: ${DEMO_MEMBER_ID}`,
      `Support: ${data.kind}`,
      `Focus area: ${areaLabel}`,
      ...(data.kind === 'cash' ? [`Donation amount: ${data.currency} ${data.amount}`, receiptLine] : []),
      '',
      data.details,
      '',
      'Member agreed to be contacted about this submission.',
    ].join('\n'),
    type: data.campaign === 'volunteer' ? 'volunteer' : 'partnership',
    status: 'unread',
    created_at: now,
    updated_at: now,
  })
  return json({ saved: true, adminUrl: '/admin/messages' }, 201)
}

async function routeAward(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path[1] === 'payment' && path.length === 2 && request.method === 'GET') {
    const callback = requestUrl(request).searchParams.get('payment') === 'done'
    const payment = store.awardPayment

    // The local checkout is intentionally deterministic: only the explicit
    // callback URL can complete the pending attempt, and it can do so once.
    if (
      callback &&
      payment.status === 'pending' &&
      payment.attempt &&
      !payment.callbackConsumed
    ) {
      const paidAt = new Date().toISOString()
      payment.status = 'paid'
      payment.confirmedPayment = {
        currency: payment.attempt.currency,
        amountMinor: payment.attempt.amountMinor,
        paidAt,
      }
      payment.attempt = null
      payment.callbackConsumed = true
    }

    return json({
      status: payment.status,
      priceOptions: DEMO_AWARD_PRICE_OPTIONS,
      currentAttempt: payment.status === 'paid' ? null : payment.attempt,
      confirmedPayment: payment.confirmedPayment,
      needsPayment: payment.status !== 'paid',
    })
  }

  if (path[1] === 'payment' && path[2] === 'checkout' && path.length === 3 && request.method === 'POST') {
    const body = await readBody(request)
    const keys = body ? Object.keys(body) : []
    const currency = body?.currency
    if (
      !body ||
      keys.some((key) => key !== 'currency') ||
      (currency !== 'NGN' && currency !== 'USD')
    ) {
      return json({ message: 'Choose NGN or USD to continue.' }, 400)
    }

    if (store.awardPayment.status === 'paid') {
      return json({ message: 'Your award payment is already confirmed.' }, 409)
    }

    if (store.awardPayment.status === 'pending' && store.awardPayment.attempt) {
      return json({ message: 'A payment checkout is already being confirmed.' }, 409)
    }

    const selectedOption = DEMO_AWARD_PRICE_OPTIONS.find(
      (option) => option.currency === currency,
    )
    if (!selectedOption) return json({ message: 'Choose NGN or USD to continue.' }, 400)

    const attemptId = nextId(store, 'demo-bachs-attempt')
    store.awardPayment = {
      status: 'pending',
      selectedCurrency: selectedOption.currency,
      attempt: {
        id: attemptId,
        currency: selectedOption.currency,
        amountMinor: selectedOption.amountMinor,
        status: 'open',
        expiresAt: null,
        checkoutUrl: awardReturnPath({ paymentDone: true, demo: true }),
      },
      confirmedPayment: null,
      callbackConsumed: false,
    }

    return json({
      checkoutUrl: awardReturnPath({ paymentDone: true, demo: true }),
      attemptId,
    })
  }

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
    return json({ order: store.awardOrder, message: 'Preview tracking only. No real courier shipment has been created.' })
  }
  return null
}

function demoCoverData(label: string, name: string, fields: PortfolioCoverFields) {
  const safe = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character)
  const facts = [fields.school, fields.cgpa, fields.degreeClass, fields.fieldOfStudy, fields.country, fields.cohort].filter(Boolean).map((value, index) => `<text x="80" y="${700 + index * 32}" fill="#f5d76e" font-family="Arial" font-size="23">${safe(String(value))}</text>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000"><defs><linearGradient id="g" x2="0" y2="1"><stop stop-color="#3a3d43"/><stop offset=".7" stop-color="#111315"/></linearGradient></defs><rect width="800" height="1000" fill="url(#g)"/><circle cx="400" cy="430" r="190" fill="#b98b72"/><path d="M160 100h480v80H160z" fill="#f3c623" opacity=".9"/><text x="60" y="130" font-family="Georgia" font-weight="bold" font-size="75" fill="white">TOP100</text><text x="60" y="215" font-family="Arial" font-size="18" letter-spacing="5" fill="#f5d76e">AFRICA FUTURE LEADERS</text><path d="M160 610h480v310H160z" fill="#24272b"/><text x="60" y="730" font-family="Georgia" font-weight="bold" font-size="46" fill="white">${safe(label)}</text><text x="60" y="790" font-family="Arial" font-weight="bold" font-size="28" fill="white">${safe(name)}</text><text x="60" y="860" font-family="Arial" font-size="19" fill="#f5d76e">${facts ? safe(String(fields.school ?? 'Top100 Future Leader')) : 'TOP100 FUTURE LEADER'}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

async function demoCoverOption(input: {
  label: string
  name: string
  fields: PortfolioCoverFields
  tailoring: 'male' | 'female'
  variant: PortfolioVariant
  portrait: Buffer
}) {
  try {
    const portrait = await preparePortrait(input.portrait)
    const rendered = await renderPortfolioCover({
      portrait,
      memberName: input.name,
      tailoring: input.tailoring,
      variant: input.variant,
      fields: input.fields,
    })
    return `data:image/png;base64,${rendered.toString('base64')}`
  } catch {
    // Keep the local harness usable with intentionally tiny or invalid test fixtures.
    return demoCoverData(input.label, input.name, input.fields)
  }
}

async function realLocalCover(input: {
  name: string
  fields: PortfolioCoverFields
  tailoring: 'male' | 'female'
  portrait: Buffer
}) {
  const preparedPortrait = await preparePortrait(input.portrait)
  const editor = createOpenAIImageEditor({ apiKey: process.env.OPENAI_API_KEY! })
  const edited = await editor.edit({ portrait: preparedPortrait, tailoring: input.tailoring, variant: 'executive-charcoal' })
  const rendered = await renderPortfolioCover({ portrait: edited.image, memberName: input.name, tailoring: input.tailoring, variant: 'executive-charcoal', fields: input.fields })
  return `data:image/png;base64,${Buffer.from(rendered).toString('base64')}`
}

async function routePortfolioCover(request: NextRequest, path: string[], store: DemoDashboardStore) {
  if (path[1] !== 'generations') return null
  if (path.length === 3 && path[2] === 'current' && request.method === 'GET') return json({ enabled: true, generation: store.portfolioCover, usage: { used: store.portfolioCoverAttempts, limit: 2 } })
  if (path.length === 2 && request.method === 'POST') {
    if (store.portfolioCoverAttempts >= 2) return json({ message: 'You have used both cover generations. Top up $2 / ₦2,000 for another attempt, or contact the AFL team to unlock more.' }, 402)
    if (store.portfolioCover && ['queued', 'processing', 'ready', 'selected'].includes(store.portfolioCover.status)) return json({ message: 'You already have a portfolio cover set.' }, 409)
    const form = await request.formData()
    const file = form.get('portrait')
    if (!(file instanceof File)) return json({ message: 'A portrait photo is required.' }, 400)
    const tailoring = form.get('tailoring') === 'female' ? 'female' : form.get('tailoring') === 'male' ? 'male' : null
    if (!tailoring || form.get('consent') !== 'true') return json({ message: 'Choose Male or Female and accept consent.' }, 400)
    let fields: PortfolioCoverFields = {}
    try { fields = JSON.parse(String(form.get('fields') ?? '{}')) as PortfolioCoverFields } catch { return json({ message: 'Invalid details.' }, 400) }
    const portrait = Buffer.from(await file.arrayBuffer())
    const id = nextId(store, 'demo-cover')
    const now = new Date().toISOString()
    const name = String(fields.name ?? store.profile.name)
    const config = portfolioCoverConfig()
    const executiveCharcoal = config.enabled && !config.demo
      ? await realLocalCover({ name, fields, tailoring, portrait })
      : await demoCoverOption({ label: 'TOP100 AFRICA FUTURE LEADER', name, fields, tailoring, variant: 'executive-charcoal', portrait })
    const generation: PortfolioCoverGeneration = { id, memberId: DEMO_MEMBER_ID, status: 'ready', tailoring, fields, attempt: 1, options: { 'executive-charcoal': executiveCharcoal }, createdAt: now, updatedAt: now }
    store.portfolioCover = generation
    store.portfolioCoverAttempts += 1
    return json({ generation }, 202)
  }
  const id = path[2]
  if (!store.portfolioCover || store.portfolioCover.id !== id) return json({ message: 'Cover set not found.' }, 404)
  if (path[3] === 'select' && request.method === 'POST') {
    const body = await readBody(request)
    const variant = body?.variant as PortfolioVariant
    if (variant !== 'executive-charcoal') return json({ message: 'That cover is no longer available.' }, 400)
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
    case 'avatar': {
      if (request.method !== 'POST') break
      const formData = await request.formData()
      const file = formData.get('file')
      if (!(file instanceof File) || file.size === 0) {
        response = json({ error: 'No file provided.' }, 400)
        break
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        response = json({ error: 'Choose a JPG, PNG, or WebP image.' }, 400)
        break
      }
      if (file.size > 5 * 1024 * 1024) {
        response = json({ error: 'File size too large. Maximum size is 5MB.' }, 400)
        break
      }

      const processed = await processUpload(await file.arrayBuffer(), AVATAR_PRESET, file.type)
      // Keep local preview usable even when a storage bucket is not configured.
      // When storage is available, prefer the same persistent media path used
      // by the production avatar endpoint.
      let avatarUrl = `data:${processed.contentType};base64,${processed.data.toString('base64')}`
      try {
        const uploaded = await uploadMedia({
          bucket: process.env.SUPABASE_AVATARS_BUCKET ?? 'avatars',
          path: `users/${DEMO_MEMBER_ID}-${Date.now()}.${processed.extension}`,
          body: processed.data,
          contentType: processed.contentType,
          cacheControl: String(60 * 60 * 24 * 365),
          upsert: false,
        })
        if (uploaded.publicUrl) avatarUrl = uploaded.publicUrl
      } catch (error) {
        console.warn('[demo-avatar] storage unavailable; using local preview avatar', error)
      }
      store.profile.avatarUrl = avatarUrl
      response = json({ url: avatarUrl })
      break
    }
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
    case 'contributions':
      response = await routeContributions(request, path, store)
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
