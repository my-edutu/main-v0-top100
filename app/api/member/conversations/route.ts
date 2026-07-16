// app/api/member/conversations/route.ts
// The authenticated member's direct-message conversations.
//   GET  -> conversation list (with unread counts + last message preview)
//   POST -> start (or reuse) a conversation with another member and send
//           the first message. Body: { recipientProfileId, body }
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  DM_BODY_MAX,
  DM_SETUP_MESSAGE,
  isMissingDmTables,
  loadProfilesLite,
  mapConversation,
  orderPair,
} from '@/lib/dm-server'

export const runtime = 'nodejs'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const supabase = createAdminClient()

  const { data: conversations, error } = await supabase
    .from('dm_conversations')
    .select('*')
    .or(`member_one.eq.${user.id},member_two.eq.${user.id}`)
    .order('last_message_at', { ascending: false })
    .limit(100)

  if (error) {
    if (isMissingDmTables(error)) {
      return NextResponse.json({ message: DM_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load your conversations.' }, { status: 500 })
  }

  const rows = conversations ?? []
  if (rows.length === 0) {
    return NextResponse.json({ conversations: [], unreadTotal: 0 })
  }

  const conversationIds = rows.map((row) => row.id)
  const otherIds = rows.map((row) => (row.member_one === user.id ? row.member_two : row.member_one))

  const [profiles, unreadRes, lastMessagesRes] = await Promise.all([
    loadProfilesLite(supabase, otherIds),
    supabase
      .from('dm_messages')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .is('read_at', null),
    supabase
      .from('dm_messages')
      .select('conversation_id, body, sender_id, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false })
      .limit(400),
  ])

  const unreadByConversation = new Map<string, number>()
  for (const row of unreadRes.data ?? []) {
    unreadByConversation.set(row.conversation_id, (unreadByConversation.get(row.conversation_id) ?? 0) + 1)
  }

  const lastByConversation = new Map<string, { body: string; senderId: string; createdAt: string }>()
  for (const row of lastMessagesRes.data ?? []) {
    if (!lastByConversation.has(row.conversation_id)) {
      lastByConversation.set(row.conversation_id, {
        body: row.body ?? '',
        senderId: row.sender_id,
        createdAt: row.created_at,
      })
    }
  }

  const list = rows.map((row) => {
    const otherId = row.member_one === user.id ? row.member_two : row.member_one
    return mapConversation(row, user.id, profiles.get(otherId), {
      unreadCount: unreadByConversation.get(row.id) ?? 0,
      lastMessage: lastByConversation.get(row.id) ?? null,
    })
  })

  const unreadTotal = list.reduce((sum, conversation) => sum + conversation.unreadCount, 0)
  return NextResponse.json({ conversations: list, unreadTotal })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const recipientId = String(payload.recipientProfileId ?? '').trim()
  const body = String(payload.body ?? '').trim()

  if (!recipientId) return NextResponse.json({ message: 'Choose a member to message.' }, { status: 400 })
  if (recipientId === user.id) return NextResponse.json({ message: 'You cannot message yourself.' }, { status: 400 })
  if (!body) return NextResponse.json({ message: 'Write a message before sending.' }, { status: 400 })
  if (body.length > DM_BODY_MAX) {
    return NextResponse.json({ message: `Messages are limited to ${DM_BODY_MAX} characters.` }, { status: 400 })
  }

  const supabase = createAdminClient()

  const profiles = await loadProfilesLite(supabase, [user.id, recipientId])
  const sender = profiles.get(user.id)
  const recipient = profiles.get(recipientId)

  if (!sender) return NextResponse.json({ message: 'Profile not found. Contact the admin team.' }, { status: 404 })
  if (!recipient) return NextResponse.json({ message: 'This member is not on the platform yet.' }, { status: 404 })

  if (sender.membership_status === 'suspended' || sender.membership_status === 'rejected') {
    return NextResponse.json({ message: 'Your account cannot send messages right now.' }, { status: 403 })
  }

  const recipientPrefs = (recipient.notification_prefs ?? {}) as Record<string, unknown>
  if (recipientPrefs.allowDirectMessages === false) {
    return NextResponse.json({ message: 'This member is not accepting direct messages.' }, { status: 403 })
  }

  const [memberOne, memberTwo] = orderPair(user.id, recipientId)

  // Reuse the existing conversation for this pair if there is one.
  const { data: existing, error: findError } = await supabase
    .from('dm_conversations')
    .select('id')
    .eq('member_one', memberOne)
    .eq('member_two', memberTwo)
    .maybeSingle()

  if (findError && isMissingDmTables(findError)) {
    return NextResponse.json({ message: DM_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
  }

  let conversationId = existing?.id as string | undefined
  if (!conversationId) {
    const { data: created, error: createError } = await supabase
      .from('dm_conversations')
      .insert({ member_one: memberOne, member_two: memberTwo })
      .select('id')
      .single()

    if (createError || !created) {
      // A concurrent request may have created the pair first — retry the lookup.
      const { data: retry } = await supabase
        .from('dm_conversations')
        .select('id')
        .eq('member_one', memberOne)
        .eq('member_two', memberTwo)
        .maybeSingle()
      conversationId = retry?.id
      if (!conversationId) {
        return NextResponse.json({ message: 'Could not start this conversation.' }, { status: 500 })
      }
    } else {
      conversationId = created.id
    }
  }

  const now = new Date().toISOString()
  const { data: message, error: messageError } = await supabase
    .from('dm_messages')
    .insert({ conversation_id: conversationId, sender_id: user.id, body })
    .select('*')
    .single()

  if (messageError || !message) {
    return NextResponse.json({ message: 'Could not send your message.' }, { status: 500 })
  }

  await supabase.from('dm_conversations').update({ last_message_at: now }).eq('id', conversationId)

  return NextResponse.json({ conversationId }, { status: 201 })
}
