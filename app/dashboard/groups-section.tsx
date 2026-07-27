'use client'

// Dashboard "Groups" section: topic communities awardees join and talk inside,
// backed by /api/member/groups*. Two-pane on desktop, single-pane (list <->
// group) on mobile. Polls the open group's messages while it is on screen.
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldQuestion,
  Trash2,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  GroupsSetupRequiredError,
  createGroup,
  deleteGroupMessage,
  fetchGroup,
  fetchGroupMessages,
  fetchGroups,
  joinGroup,
  leaveGroup,
  postGroupMessage,
  updateGroupMembership,
} from '@/lib/groups/client'
import {
  GROUP_MESSAGE_MAX,
  canModerateGroup,
  type GroupDetail,
  type GroupSummary,
  type GroupVisibility,
} from '@/lib/groups/types'
import type { MemberProfile } from '@/lib/member-hub'
import { cn } from '@/lib/utils'

const MESSAGE_POLL_MS = 15_000
const LIST_POLL_MS = 45_000

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

const VISIBILITY_COPY: Record<GroupVisibility, string> = {
  open: 'Anyone approved can join instantly',
  request: 'Joining needs an owner’s approval',
  private: 'Invitation only — never listed publicly',
}

function GroupListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="flex animate-pulse items-center gap-3 rounded-2xl border border-black/5 bg-white p-3"
        >
          <div className="h-11 w-11 rounded-2xl bg-orange-100/70" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded-full bg-orange-100/70" />
            <div className="h-3 w-1/3 rounded-full bg-orange-50" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SetupRequiredCard({ message }: { message: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-orange-300 bg-orange-50/60 p-6 text-center">
      <Users className="mx-auto h-8 w-8 text-orange-500" strokeWidth={2.2} />
      <h4 className="mt-3 text-lg font-bold text-black">Groups are almost ready</h4>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/60">{message}</p>
      <p className="mx-auto mt-2 max-w-md text-xs font-medium text-black/45">
        This is a one-time database setup step for the site admin.
      </p>
    </div>
  )
}

function GroupBadge({ name }: { name: string }) {
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AF'
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-sm font-semibold text-[#fffaf0]">
      {initials}
    </span>
  )
}

function GroupRow({
  group,
  active,
  onSelect,
}: {
  group: GroupSummary
  active: boolean
  onSelect: () => void
}) {
  const unread = group.membership?.unreadCount ?? 0
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition',
        active
          ? 'border-orange-300 bg-orange-50'
          : 'border-black/5 bg-white hover:border-orange-200 hover:bg-[#fffaf4]',
      )}
    >
      <GroupBadge name={group.name} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-bold text-black">{group.name}</span>
          {unread > 0 ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-bold text-[#fffaf0]">
              {unread}
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          {group.topic ? (
            <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              {group.topic}
            </span>
          ) : null}
          {group.visibility === 'private' ? (
            <span className="flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-semibold text-black/55">
              <Lock className="h-3 w-3" strokeWidth={2.6} />
              Private
            </span>
          ) : null}
          <span className="text-[11px] font-semibold text-black/45">
            {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
          </span>
          {group.membership?.status === 'pending' ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
              Pending
            </span>
          ) : null}
        </span>
      </span>
    </button>
  )
}

export default function GroupsSection({ member }: { member: MemberProfile }) {
  const [groups, setGroups] = useState<GroupSummary[] | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')

  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<GroupDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [tab, setTab] = useState<'chat' | 'requests'>('chat')

  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [joining, setJoining] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const canParticipate = member.status === 'approved'

  const refreshGroups = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setListLoading(true)
    try {
      const next = await fetchGroups()
      setGroups(next)
      setListError('')
      setSetupMessage('')
    } catch (error) {
      if (error instanceof GroupsSetupRequiredError) {
        setSetupMessage(error.message)
        setGroups([])
      } else if (!opts.silent) {
        setListError(error instanceof Error ? error.message : 'Could not load your groups.')
      }
    } finally {
      setListLoading(false)
    }
  }, [])

  const openGroup = useCallback(async (groupId: string, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) {
      setDetailLoading(true)
      setDetailError('')
    }
    try {
      const next = await fetchGroup(groupId)
      // Ignore a response that landed after the member moved on.
      if (activeIdRef.current !== groupId) return
      setDetail(next)
    } catch (error) {
      if (activeIdRef.current !== groupId) return
      if (error instanceof GroupsSetupRequiredError) {
        setSetupMessage(error.message)
      } else if (!opts.silent) {
        setDetailError(error instanceof Error ? error.message : 'Could not load this group.')
      }
    } finally {
      if (activeIdRef.current === groupId && !opts.silent) setDetailLoading(false)
    }
  }, [])

  // Poll just the messages while a group is open — cheaper than re-fetching the
  // whole detail payload, and it is the part that actually changes.
  const pollMessages = useCallback(async (groupId: string) => {
    try {
      const { messages } = await fetchGroupMessages(groupId)
      if (activeIdRef.current !== groupId) return
      setDetail((current) => (current && current.group.id === groupId ? { ...current, messages } : current))
    } catch {
      // A dropped poll costs nothing — the next tick tries again.
    }
  }, [])

  useEffect(() => {
    refreshGroups()
    const timer = window.setInterval(() => refreshGroups({ silent: true }), LIST_POLL_MS)
    return () => window.clearInterval(timer)
  }, [refreshGroups])

  useEffect(() => {
    if (!activeId) return
    setDetail(null)
    setTab('chat')
    openGroup(activeId)
    const timer = window.setInterval(() => pollMessages(activeId), MESSAGE_POLL_MS)
    return () => window.clearInterval(timer)
  }, [activeId, openGroup, pollMessages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [detail?.messages.length, activeId])

  const { mine, discover } = useMemo(() => {
    const all = groups ?? []
    return {
      mine: all.filter((group) => group.membership !== null),
      discover: all.filter((group) => group.membership === null),
    }
  }, [groups])

  const membership = detail?.group.membership ?? null
  const isModerator = canModerateGroup(membership?.role, membership?.status)
  const pendingCount = detail?.pendingMembers.length ?? 0

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || sending || !activeId) return

    setSending(true)
    try {
      const message = await postGroupMessage(activeId, body)
      setDraft('')
      setDetail((current) =>
        current ? { ...current, messages: [...current.messages, message] } : current,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not post your message.')
    } finally {
      setSending(false)
    }
  }

  async function handleJoin(group: GroupSummary) {
    setJoining(true)
    try {
      const result = await joinGroup(group.id)
      toast.success(
        result.status === 'pending'
          ? 'Request sent — an owner will review it.'
          : `You joined ${group.name}.`,
      )
      await refreshGroups({ silent: true })
      setActiveId(group.id)
      await openGroup(group.id, { silent: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not join this group.')
    } finally {
      setJoining(false)
    }
  }

  async function handleLeave(group: GroupSummary) {
    setJoining(true)
    try {
      await leaveGroup(group.id)
      toast.success(`You left ${group.name}.`)
      setActiveId(null)
      setDetail(null)
      await refreshGroups({ silent: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not leave this group.')
    } finally {
      setJoining(false)
    }
  }

  async function handleModerate(profileId: string, status: 'active' | 'removed') {
    if (!activeId) return
    try {
      await updateGroupMembership(activeId, profileId, status)
      toast.success(status === 'active' ? 'Member approved.' : 'Request declined.')
      await openGroup(activeId, { silent: true })
      await refreshGroups({ silent: true })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update that member.')
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!activeId) return
    try {
      await deleteGroupMessage(activeId, messageId)
      setDetail((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((message) =>
                message.id === messageId ? { ...message, isDeleted: true, body: '' } : message,
              ),
            }
          : current,
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove that message.')
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setCreating(true)
    try {
      const group = await createGroup({
        name: String(form.get('name') || ''),
        description: String(form.get('description') || ''),
        topic: String(form.get('topic') || ''),
        visibility: (String(form.get('visibility') || 'open') as GroupVisibility) ?? 'open',
      })
      toast.success(`${group.name} is live.`)
      setCreateOpen(false)
      await refreshGroups({ silent: true })
      setActiveId(group.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create the group.')
    } finally {
      setCreating(false)
    }
  }

  const listPane = (
    <div className={cn('flex min-h-0 flex-col', activeId ? 'hidden lg:flex' : 'flex')}>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        {listLoading && groups === null ? (
          <GroupListSkeleton />
        ) : setupMessage ? (
          <SetupRequiredCard message={setupMessage} />
        ) : listError && (groups?.length ?? 0) === 0 ? (
          <div className="rounded-[24px] border border-orange-100 bg-white p-6 text-center">
            <p className="text-sm font-semibold text-orange-700">{listError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
              onClick={() => refreshGroups()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : (groups?.length ?? 0) === 0 ? (
          <div className="rounded-[24px] border border-dashed border-orange-200 bg-[#fffaf4] p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
            <h4 className="mt-3 text-lg font-bold text-black">No groups yet</h4>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-6 text-black/55">
              Start the first one and invite fellow awardees working on the same thing.
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                Your groups
              </p>
              {mine.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-[#fffaf4] p-4 text-center text-xs font-semibold text-black/50">
                  You have not joined a group yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {mine.map((group) => (
                    <GroupRow
                      key={group.id}
                      group={group}
                      active={group.id === activeId}
                      onSelect={() => setActiveId(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
                Discover
              </p>
              {discover.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-orange-200 bg-[#fffaf4] p-4 text-center text-xs font-semibold text-black/50">
                  You are in every group there is.
                </div>
              ) : (
                <div className="space-y-2">
                  {discover.map((group) => (
                    <GroupRow
                      key={group.id}
                      group={group}
                      active={group.id === activeId}
                      onSelect={() => setActiveId(group.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  const activeSummary = detail?.group ?? groups?.find((group) => group.id === activeId) ?? null

  const composer =
    !membership || membership.status === 'banned' ? (
      <div className="border-t border-orange-100 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange-50 px-4 py-3">
          <p className="text-sm font-semibold text-orange-800">
            {membership?.status === 'banned'
              ? 'You can no longer post in this group.'
              : activeSummary?.visibility === 'private'
                ? 'This group is invitation only.'
                : 'Join this group to take part in the conversation.'}
          </p>
          {!membership && activeSummary && activeSummary.visibility !== 'private' && canParticipate ? (
            <Button
              type="button"
              disabled={joining}
              onClick={() => handleJoin(activeSummary)}
              className="rounded-full bg-orange-500 px-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
            >
              {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {activeSummary.visibility === 'request' ? 'Request to join' : 'Join group'}
            </Button>
          ) : null}
        </div>
      </div>
    ) : membership.status === 'pending' ? (
      <div className="border-t border-orange-100 pt-3">
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Your request is waiting for approval. We will let you know as soon as an owner reviews it.
        </p>
      </div>
    ) : activeSummary?.isArchived ? (
      <div className="border-t border-orange-100 pt-3">
        <p className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-black/60">
          This group has been archived, so it is read-only now.
        </p>
      </div>
    ) : (
      <form onSubmit={handleSend} className="border-t border-orange-100 pt-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder={`Message ${activeSummary?.name ?? 'the group'}...`}
            aria-label="Write a message to this group"
            rows={1}
            maxLength={GROUP_MESSAGE_MAX}
            className="min-h-[52px] flex-1 resize-none rounded-3xl border-orange-100 px-4 py-3.5 text-sm text-black placeholder:text-black/40"
          />
          <Button
            type="submit"
            disabled={sending || !draft.trim()}
            aria-label="Send message"
            className="h-[52px] w-[52px] shrink-0 rounded-2xl bg-orange-500 p-0 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" strokeWidth={2.4} />
            )}
          </Button>
        </div>
      </form>
    )

  const groupPane = (
    <div className={cn('min-h-0 flex-col', activeId ? 'flex' : 'hidden lg:flex')}>
      {!activeId || !activeSummary ? (
        <div className="grid h-full min-h-[320px] place-items-center rounded-[24px] border border-dashed border-orange-200 bg-[#fffaf4] p-6 text-center">
          <div>
            <MessageSquare className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
            <p className="mt-3 text-sm font-semibold text-black/55">
              Pick a group to read the conversation.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3 border-b border-orange-100 pb-3">
            <button
              type="button"
              aria-label="Back to groups"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-white text-black/70 hover:border-orange-300 lg:hidden"
              onClick={() => setActiveId(null)}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.8} />
            </button>
            <GroupBadge name={activeSummary.name} />
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-base font-bold text-black">{activeSummary.name}</h4>
              <p className="line-clamp-2 text-xs font-medium leading-5 text-black/50">
                {activeSummary.description || VISIBILITY_COPY[activeSummary.visibility]}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-black/40">
                {activeSummary.memberCount}{' '}
                {activeSummary.memberCount === 1 ? 'member' : 'members'}
              </p>
            </div>
            {membership && membership.status !== 'banned' ? (
              <Button
                type="button"
                variant="outline"
                disabled={joining}
                onClick={() => handleLeave(activeSummary)}
                className="hidden h-9 rounded-full border-orange-200 bg-white text-xs text-black hover:bg-orange-50 sm:inline-flex"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" strokeWidth={2.6} />
                Leave
              </Button>
            ) : null}
          </div>

          {isModerator ? (
            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => setTab('chat')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                  tab === 'chat'
                    ? 'bg-orange-500 text-[#fffaf0]'
                    : 'border border-orange-100 bg-white text-black/60 hover:bg-orange-50',
                )}
              >
                Conversation
              </button>
              <button
                type="button"
                onClick={() => setTab('requests')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition',
                  tab === 'requests'
                    ? 'bg-orange-500 text-[#fffaf0]'
                    : 'border border-orange-100 bg-white text-black/60 hover:bg-orange-50',
                )}
              >
                Requests ({pendingCount})
              </button>
            </div>
          ) : null}

          {tab === 'requests' && isModerator ? (
            <div className="min-h-[240px] flex-1 space-y-2 overflow-y-auto py-4 pr-1">
              {pendingCount === 0 ? (
                <div className="rounded-[24px] border border-dashed border-orange-200 bg-[#fffaf4] p-6 text-center">
                  <ShieldQuestion className="mx-auto h-8 w-8 text-orange-400" strokeWidth={2.2} />
                  <p className="mt-3 text-sm font-semibold text-black/55">
                    No one is waiting for approval.
                  </p>
                </div>
              ) : (
                detail?.pendingMembers.map((pending) => (
                  <div
                    key={pending.profileId}
                    className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white p-3"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-xs font-semibold text-[#fffaf0]">
                      {pending.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-black">{pending.name}</p>
                      <p className="truncate text-xs font-medium text-black/50">
                        {pending.headline || 'Africa Future Leader'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={() => handleModerate(pending.profileId, 'active')}
                        className="h-9 rounded-full bg-orange-500 px-4 text-xs text-[#fffaf0] hover:bg-orange-600"
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleModerate(pending.profileId, 'removed')}
                        className="h-9 rounded-full border-orange-200 bg-white px-4 text-xs text-black hover:bg-orange-50"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-[240px] flex-1 space-y-3 overflow-y-auto py-4 pr-1">
              {detailLoading && !detail ? (
                <div className="flex h-full items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                </div>
              ) : detailError && !detail ? (
                <div className="rounded-2xl border border-orange-100 bg-white p-5 text-center">
                  <p className="text-sm font-semibold text-orange-700">{detailError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
                    onClick={() => activeId && openGroup(activeId)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try again
                  </Button>
                </div>
              ) : detail && detail.messages.length === 0 ? (
                <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm font-medium leading-6 text-black/60">
                  No messages yet — start the conversation.
                </p>
              ) : (
                detail?.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn('flex', message.mine ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'group max-w-[82%] rounded-3xl px-4 py-2.5 sm:max-w-[70%]',
                        message.mine
                          ? 'rounded-br-lg bg-orange-500 text-[#fffaf0]'
                          : 'rounded-bl-lg bg-[#f5f4f0] text-black',
                      )}
                    >
                      {!message.mine ? (
                        <p className="text-[11px] font-bold text-black/55">{message.authorName}</p>
                      ) : null}
                      <p
                        className={cn(
                          'whitespace-pre-wrap break-words text-sm leading-6',
                          message.isDeleted ? 'italic opacity-70' : 'font-medium',
                        )}
                      >
                        {message.isDeleted ? 'This message was removed.' : message.body}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-2">
                        {!message.isDeleted && (message.mine || isModerator) ? (
                          <button
                            type="button"
                            aria-label="Remove message"
                            onClick={() => handleDeleteMessage(message.id)}
                            className={cn(
                              'opacity-60 transition hover:opacity-100',
                              message.mine ? 'text-[#fffaf0]' : 'text-black/50',
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.4} />
                          </button>
                        ) : null}
                        <span
                          className={cn(
                            'text-[10px] font-semibold',
                            message.mine ? 'text-[#fffaf0]/70' : 'text-black/35',
                          )}
                        >
                          {formatMessageTime(message.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'chat' ? composer : null}
        </>
      )}
    </div>
  )

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">Groups</h2>
          <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
            Topic communities where Africa Future Leaders think out loud together. Join one, or start
            the group you wish existed.
          </p>
        </div>
        <Button
          type="button"
          disabled={!canParticipate}
          onClick={() => setCreateOpen(true)}
          className="rounded-full bg-orange-500 px-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
        >
          <Plus className="mr-2 h-4 w-4" strokeWidth={2.8} />
          New group
        </Button>
      </div>

      {!canParticipate ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-amber-900">
            Groups open up once your membership is approved. You can browse in the meantime.
          </p>
        </div>
      ) : null}

      <div className="rounded-[30px] border border-orange-100 bg-white p-4 sm:p-5">
        <div className="grid min-h-[520px] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
          {listPane}
          {groupPane}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-[28px] border-orange-100 bg-[#fffaf4] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-black">
              Start a group
            </DialogTitle>
            <DialogDescription className="text-sm font-medium leading-6 text-black/60">
              Give it a clear name and say who it is for. You will be its owner.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name" className="font-semibold text-black">
                Name
              </Label>
              <Input
                id="group-name"
                name="name"
                required
                minLength={3}
                maxLength={80}
                placeholder="Founders & Builders"
                className="h-12 rounded-2xl border-orange-100 bg-white text-base text-black placeholder:text-black/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-topic" className="font-semibold text-black">
                Topic (optional)
              </Label>
              <Input
                id="group-topic"
                name="topic"
                maxLength={60}
                placeholder="Entrepreneurship"
                className="h-12 rounded-2xl border-orange-100 bg-white text-base text-black placeholder:text-black/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-description" className="font-semibold text-black">
                Description (optional)
              </Label>
              <Textarea
                id="group-description"
                name="description"
                maxLength={500}
                rows={3}
                placeholder="What will people talk about here?"
                className="resize-none rounded-2xl border-orange-100 bg-white text-sm text-black placeholder:text-black/40"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-visibility" className="font-semibold text-black">
                Who can join
              </Label>
              <select
                id="group-visibility"
                name="visibility"
                defaultValue="open"
                className="h-12 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-medium text-black"
              >
                <option value="open">Open — anyone approved joins instantly</option>
                <option value="request">By request — you approve each member</option>
                <option value="private">Private — invitation only</option>
              </select>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="rounded-full bg-orange-500 px-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create group'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  )
}
