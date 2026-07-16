// app/api/member/conversations/[id]/route.ts
// One direct-message thread, scoped to its participants.
//   GET  -> thread messages (marks incoming messages as read)
//   POST -> send a message in this thread. Body: { body }
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  DM_BODY_MAX,
  DM_SETUP_MESSAGE,
  isMissingDmTables,
  loadProfilesLite,
  mapConversation,
  mapMessage,
} from '@/lib/dm-server'

export const runtime = 'nodejs'

async function loadConversationForUser(supabase: ReturnType<typeof createAdminClient>, id: string, userId: string) {
  const { data, error } = await supabase.from('dm_conversations').select('*').eq('id', id).maybeSingle()
  if (error) return { error }
  if (!data || (data.member_one !== userId && data.member_two !== userId)) return { error: null, conversation: null }
  return { error: null, conversation: data }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  const { error, conversation } = await loadConversationForUser(supabase, id, user.id)
  if (error) {
    if (isMissingDmTables(error)) {
      return NextResponse.json({ message: DM_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load this conversation.' }, { status: 500 })
  }
  if (!conversation) return NextResponse.json({ message: 'Conversation not found.' }, { status: 404 })

  const otherId = conversation.member_one === user.id ? conversation.member_two : conversation.member_one

  const [profiles, messagesRes] = await Promise.all([
    loadProfilesLite(supabase, [otherId]),
    supabase
      .from('dm_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(500),
  ])

  if (messagesRes.error) {
    return NextResponse.json({ message: 'Could not load messages.' }, { status: 500 })
  }

  // Opening a thread marks everything the other member sent as read.
  await supabase
    .from('dm_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', id)
    .neq('sender_id', user.id)
    .is('read_at', null)

  return NextResponse.json({
    conversation: mapConversation(conversation, user.id, profiles.get(otherId), {
      unreadCount: 0,
      lastMessage: null,
    }),
    messages: (messagesRes.data ?? []).map((row) => mapMessage(row, user.id)),
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ message: 'Authentication required.' }, { status: 401 })

  const { id } = await params

  let payload: Record<string, unknown> = {}
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const body = String(payload.body ?? '').trim()
  if (!body) return NextResponse.json({ message: 'Write a message before sending.' }, { status: 400 })
  if (body.length > DM_BODY_MAX) {
    return NextResponse.json({ message: `Messages are limited to ${DM_BODY_MAX} characters.` }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error, conversation } = await loadConversationForUser(supabase, id, user.id)
  if (error) {
    if (isMissingDmTables(error)) {
      return NextResponse.json({ message: DM_SETUP_MESSAGE, setupRequired: true }, { status: 503 })
    }
    return NextResponse.json({ message: 'Could not load this conversation.' }, { status: 500 })
  }
  if (!conversation) return NextResponse.json({ message: 'Conversation not found.' }, { status: 404 })

  const profiles = await loadProfilesLite(supabase, [user.id])
  const sender = profiles.get(user.id)
  if (sender?.membership_status === 'suspended' || sender?.membership_status === 'rejected') {
    return NextResponse.json({ message: 'Your account cannot send messages right now.' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const { data: message, error: messageError } = await supabase
    .from('dm_messages')
    .insert({ conversation_id: id, sender_id: user.id, body })
    .select('*')
    .single()

  if (messageError || !message) {
    return NextResponse.json({ message: 'Could not send your message.' }, { status: 500 })
  }

  await supabase.from('dm_conversations').update({ last_message_at: now }).eq('id', id)

  return NextResponse.json({ message: mapMessage(message, user.id) }, { status: 201 })
}
