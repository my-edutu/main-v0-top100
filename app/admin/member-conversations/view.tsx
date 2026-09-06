'use client'
import { useCallback, useEffect, useState } from 'react'
import type { MemberProfile } from '@/lib/member-hub'
import MessagesSection from '@/app/dashboard/messages-section'
export function AdminConversations({ member }: { member: MemberProfile }) {
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [error, setError] = useState('')
  const [recipient, setRecipient] = useState<{
    profileId: string
    name: string
  } | null>(null)
  const [, setUnread] = useState(0)
  const onChange = useCallback(() => setRecipient(null), [])
  useEffect(() => {
    void fetch('/api/admin/members')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load members.')
        const data = await response.json()
        setMembers(data.members ?? [])
      })
      .catch((cause) => setError(cause.message))
  }, [])
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-medium">Awardee conversations</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Reach out as yourself and reply to awardees. Paul Light’s welcome
          replies appear in his account here.
        </p>
      </div>
      <label className="block text-sm">
        Start a conversation
        <select
          className="mt-2 block h-12 w-full rounded-xl border px-3"
          value={recipient?.profileId ?? ''}
          onChange={(e) => {
            const next = members.find((item) => item.id === e.target.value)
            setRecipient(next ? { profileId: next.id, name: next.name } : null)
          }}
        >
          <option value="">Choose an awardee</option>
          {members
            .filter((item) => item.id !== member.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      <MessagesSection
        member={member}
        pendingRecipient={recipient}
        onUnreadChange={setUnread}
        onConversationChange={onChange}
        apiBase="/api/admin/member-conversations"
      />
    </div>
  )
}
