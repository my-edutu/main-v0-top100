'use client'

// Dashboard "Messages" section: real member-to-member direct messages backed
// by /api/member/conversations*. Two-pane inbox on desktop, single-pane
// (list <-> thread) on mobile. Polls for new activity while open.
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, MessageCircle, RefreshCw, Search, Send, Users } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MessageRecipient } from '@/app/dashboard/_lib/message-route'
import {
  ConversationSummary,
  DirectMessage,
  MemberProfile,
  MessagingSetupRequiredError,
  fetchConversation,
  fetchConversations,
  sendMessage,
  startConversation,
} from '@/lib/member-hub'
import { cn } from '@/lib/utils'
import { MemberAvatar } from './_components/member-avatar'

const LIST_POLL_MS = 25_000
const THREAD_POLL_MS = 12_000

function formatMessageTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const sameDay = date.toDateString() === now.toDateString()
  if (sameDay) {
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date)
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date)
}

function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-sm font-semibold text-[#fffaf0]',
        className,
      )}
    >
      {initials}
    </span>
  )
}

function ConversationSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex animate-pulse items-center gap-3 rounded-2xl border border-black/5 bg-white p-3">
          <div className="h-11 w-11 rounded-2xl bg-orange-100/70" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded-full bg-orange-100/70" />
            <div className="h-3 w-2/3 rounded-full bg-orange-50" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SetupRequiredCard({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-orange-300 bg-orange-50/60 p-6 text-center">
      <MessageCircle className="mx-auto h-8 w-8 text-orange-500" strokeWidth={2.2} />
      <h4 className="mt-3 text-lg font-bold text-black">Messaging is almost ready</h4>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/60">{message}</p>
      <p className="mx-auto mt-2 max-w-md text-xs font-medium text-black/45">
        This is a one-time database setup step for the site admin.
      </p>
    </div>
  )
}

export default function MessagesSection({
  member,
  initialConversationId,
  pendingRecipient,
  onUnreadChange,
  onConversationChange,
  apiBase = '/api/member/conversations',
}: {
  member: MemberProfile
  initialConversationId?: string
  pendingRecipient?: MessageRecipient | null
  onUnreadChange: (count: number) => void
  onConversationChange: (id: string | null) => void
  apiBase?: string
}) {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null)
  const [listError, setListError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')
  const [listLoading, setListLoading] = useState(true)

  const [activeId, setActiveId] = useState<string | null>(initialConversationId ?? null)
  const [thread, setThread] = useState<{ conversation: ConversationSummary; messages: DirectMessage[] } | null>(null)
  const [threadLoading, setThreadLoading] = useState(false)
  const [threadError, setThreadError] = useState('')

  const [composeRecipient, setComposeRecipient] = useState<MessageRecipient | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const canSend = member.status !== 'suspended' && member.status !== 'rejected'

  const refreshConversations = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setListLoading(true)
      try {
        const result = await fetchConversations(apiBase)
        setConversations(result.conversations)
        onUnreadChange(result.unreadTotal)
        setListError('')
        setSetupMessage('')
      } catch (error) {
        if (error instanceof MessagingSetupRequiredError) {
          setSetupMessage(error.message)
          setConversations([])
        } else if (!opts.silent) {
          setListError(error instanceof Error ? error.message : 'Could not load your conversations.')
        }
      } finally {
        setListLoading(false)
      }
    },
    [onUnreadChange, apiBase],
  )

  const openThread = useCallback(
    async (conversationId: string, opts: { silent?: boolean } = {}) => {
      if (!opts.silent) {
        setThreadLoading(true)
        setThreadError('')
      }
      try {
        const result = await fetchConversation(conversationId, apiBase)
        // Ignore stale responses after the member switched threads.
        if (activeIdRef.current !== conversationId) return
        setThread(result)
        // Opening marks incoming messages read — sync the badge + list.
        refreshConversations({ silent: true })
      } catch (error) {
        if (activeIdRef.current !== conversationId) return
        if (!opts.silent) {
          setThreadError(error instanceof Error ? error.message : 'Could not load this conversation.')
        }
      } finally {
        if (activeIdRef.current === conversationId && !opts.silent) setThreadLoading(false)
      }
    },
    [refreshConversations, apiBase],
  )

  useEffect(() => {
    refreshConversations()
    const timer = window.setInterval(() => refreshConversations({ silent: true }), LIST_POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshConversations])

  useEffect(() => {
    setActiveId(initialConversationId ?? null)
  }, [initialConversationId])

  useEffect(() => {
    if (!activeId) return
    setThread(null)
    openThread(activeId)
    const timer = window.setInterval(() => openThread(activeId, { silent: true }), THREAD_POLL_MS)
    return () => window.clearInterval(timer)
  }, [activeId, openThread])

  // A "Message" click in the directory lands here with the target member.
  useEffect(() => {
    if (!pendingRecipient) return
    const existing = conversations?.find((conversation) => conversation.otherMember.id === pendingRecipient.profileId)
    if (existing) {
      setComposeRecipient(null)
      setActiveId(existing.id)
      onConversationChange(existing.id)
    } else if (conversations !== null) {
      setActiveId(null)
      setComposeRecipient(pendingRecipient)
    }
  }, [pendingRecipient, conversations, onConversationChange])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [thread?.messages.length, activeId])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending) return

    setSending(true)
    try {
      if (composeRecipient) {
        const conversationId = await startConversation(composeRecipient.profileId, body, apiBase)
        setDraft('')
        setComposeRecipient(null)
        setActiveId(conversationId)
        onConversationChange(conversationId)
        await refreshConversations({ silent: true })
        toast.success(`Message sent to ${composeRecipient.name}.`)
      } else if (activeId) {
        const message = await sendMessage(activeId, body, apiBase)
        setDraft('')
        setThread((current) =>
          current ? { ...current, messages: [...current.messages, message] } : current,
        )
        refreshConversations({ silent: true })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your message.')
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = useMemo(() => {
    if (!conversations) return []
    const term = search.trim().toLowerCase()
    if (!term) return conversations
    return conversations.filter((conversation) =>
      `${conversation.otherMember.name} ${conversation.otherMember.headline}`.toLowerCase().includes(term),
    )
  }, [conversations, search])

  const showThreadPane = Boolean(activeId || composeRecipient)

  const listPane = (
    <div className={cn('flex min-h-0 min-w-0 flex-col', showThreadPane ? 'hidden lg:flex' : 'flex')}>
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" strokeWidth={2.8} />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search conversations..."
          aria-label="Search conversations"
          className="h-11 rounded-full border-black/10 pl-11 text-sm text-black placeholder:text-black/35"
        />
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {listLoading && conversations === null ? (
          <ConversationSkeleton />
        ) : setupMessage ? (
          <SetupRequiredCard message={setupMessage} />
        ) : listError && (conversations?.length ?? 0) === 0 ? (
          <div className="rounded-[24px] border border-orange-100 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-orange-700">{listError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
              onClick={() => refreshConversations()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : (conversations?.length ?? 0) === 0 ? (
          <div className="rounded-[24px] border border-dashed border-orange-200 bg-[#fffaf4] p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
            <h4 className="mt-3 text-lg font-bold text-black">No conversations yet</h4>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-6 text-black/55">
              Find a fellow awardee in the directory and send the first message.
            </p>
            <Button asChild className="mt-4 rounded-full bg-orange-500 px-6 text-white hover:bg-orange-600">
              <Link href="/dashboard/discover/members">Browse directory</Link>
            </Button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-orange-200 bg-[#fffaf4] p-6 text-center text-sm font-semibold text-black/50">
            No conversations match “{search.trim()}”.
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const active = conversation.id === activeId
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  setComposeRecipient(null)
                  setActiveId(conversation.id)
                  onConversationChange(conversation.id)
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
                  active
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-black/5 bg-white hover:border-orange-200 hover:bg-[#fffaf4]',
                )}
              >
                <MemberAvatar src={conversation.otherMember.avatarUrl} initials={conversation.otherMember.initials} size={44} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-bold text-black">{conversation.otherMember.name}</span>
                    <span className="shrink-0 text-[11px] font-semibold text-black/40">
                      {conversation.lastMessage ? formatMessageTime(conversation.lastMessage.createdAt) : ''}
                    </span>
                  </span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        'block truncate text-xs',
                        conversation.unreadCount > 0 ? 'font-bold text-black' : 'font-medium text-black/50',
                      )}
                    >
                      {conversation.lastMessage
                        ? `${conversation.lastMessage.mine ? 'You: ' : ''}${conversation.lastMessage.body}`
                        : conversation.otherMember.headline || 'Start the conversation'}
                    </span>
                    {conversation.unreadCount > 0 ? (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    ) : null}
                  </span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )

  const threadHeader = composeRecipient ? (
    <div className="flex items-center gap-3 border-b border-orange-100 pb-3">
      <button
        type="button"
        aria-label="Back to conversations"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-white text-black/70 hover:border-orange-300 lg:hidden"
        onClick={() => {
          setComposeRecipient(null)
          onConversationChange(null)
        }}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.8} />
      </button>
      <Avatar initials={composeRecipient.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'AF'} />
      <div className="min-w-0">
        <h4 className="truncate text-base font-bold text-black">{composeRecipient.name}</h4>
        <p className="text-xs font-medium text-black/50">New conversation</p>
      </div>
    </div>
  ) : thread ? (
    <div className="flex items-center gap-3 border-b border-orange-100 pb-3">
      <button
        type="button"
        aria-label="Back to conversations"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-100 bg-white text-black/70 hover:border-orange-300 lg:hidden"
        onClick={() => {
          setActiveId(null)
          onConversationChange(null)
        }}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.8} />
      </button>
      <MemberAvatar src={thread.conversation.otherMember.avatarUrl} initials={thread.conversation.otherMember.initials} size={44} />
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-base font-bold text-black">{thread.conversation.otherMember.name}</h4>
        <p className="truncate text-xs font-medium text-black/50">
          {thread.conversation.otherMember.headline || 'Africa Future Leader'}
        </p>
      </div>
      {thread.conversation.otherMember.slug ? (
        <Button
          asChild
          variant="outline"
          className="hidden h-9 rounded-full border-orange-200 bg-white text-xs text-black hover:bg-orange-50 sm:inline-flex"
        >
          <Link href={`/awardees/${thread.conversation.otherMember.slug}`}>View profile</Link>
        </Button>
      ) : null}
    </div>
  ) : null

  const threadPane = (
    <div className={cn('hub-chat-thread min-h-0 min-w-0 flex-col', showThreadPane ? 'flex' : 'hidden lg:flex')}>
      {!showThreadPane ? (
        <div className="grid h-full min-h-[320px] place-items-center rounded-[24px] border border-dashed border-orange-200 bg-[#fffaf4] p-6 text-center">
          <div>
            <MessageCircle className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
            <p className="mt-3 text-sm font-semibold text-black/55">Select a conversation to read and reply.</p>
          </div>
        </div>
      ) : (
        <>
          {threadHeader}

          <div ref={scrollRef} role="log" aria-label="Conversation messages" aria-live="polite" className="hub-chat-history min-h-0 flex-1 space-y-3 overflow-y-auto">
            {composeRecipient ? (
              <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium leading-6 text-black/60">
                Introduce yourself to {composeRecipient.name.split(' ')[0]} — they will see your name and profile.
              </p>
            ) : threadLoading && !thread ? (
              <div className="flex h-full items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
              </div>
            ) : threadError && !thread ? (
              <div className="rounded-2xl border border-orange-100 bg-white p-5 text-center">
                <p className="text-sm font-semibold text-orange-700">{threadError}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
                  onClick={() => activeId && openThread(activeId)}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            ) : thread && thread.messages.length === 0 ? (
              <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium leading-6 text-black/60">
                No messages yet — say hello.
              </p>
            ) : (
              thread?.messages.map((message, index) => (
                <div key={message.id}>
                {(index === 0 || new Date(thread.messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString()) && <div className="hub-chat-date"><time dateTime={message.createdAt}>{new Intl.DateTimeFormat('en', { month:'short', day:'numeric', year:'numeric' }).format(new Date(message.createdAt))}</time></div>}
                <div className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'hub-message-bubble max-w-[88%] rounded-3xl px-4 py-2.5 sm:max-w-[70%]',
                      message.mine
                        ? 'is-outgoing rounded-br-lg'
                        : 'is-incoming rounded-bl-lg',
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm font-normal leading-6 [overflow-wrap:anywhere]">{message.body}</p>
                    <p className={cn('mt-1 text-right text-[10px] font-semibold', message.mine ? 'text-white/70' : 'text-black/35')}>
                      {new Intl.DateTimeFormat('en', { hour:'numeric', minute:'2-digit' }).format(new Date(message.createdAt))}
                    </p>
                  </div>
                </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="hub-chat-composer">
            {!canSend ? (
              <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700">
                Your account cannot send messages right now. Contact the admin team for help.
              </p>
            ) : (
              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault()
                      event.currentTarget.form?.requestSubmit()
                    }
                  }}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  rows={1}
                  maxLength={4000}
                  className="min-h-[48px] flex-1 resize-none rounded-2xl border-neutral-200 px-4 py-3 text-base text-black placeholder:text-black/40"
                />
                <Button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Send message"
                  className="hub-chat-send h-12 w-12 shrink-0 rounded-2xl p-0"
                >
                  {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" strokeWidth={2.4} />}
                </Button>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  )

  return (
    <section className={cn('hub-messages min-w-0 space-y-5', showThreadPane && 'has-open-thread')}>
      <div className="hub-inbox-heading flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight text-black sm:text-3xl">Messages</h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
            Direct conversations with fellow Africa Future Leaders. Find someone new in the directory.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
        >
          <Link href="/dashboard/discover/members">
            <Users className="mr-2 h-4 w-4" strokeWidth={2.6} />
            Find awardees
          </Link>
        </Button>
      </div>

      <div className="hub-chat-frame min-w-0 rounded-2xl border border-neutral-200 bg-white">
        <div className="hub-chat-grid grid min-w-0 grid-cols-[minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)]">
          {listPane}
          {threadPane}
        </div>
      </div>
    </section>
  )
}
