'use client'

import { useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'

import { useDashboardBadges } from '../../_providers/dashboard-badges'
import { useDashboardMember } from '../../_providers/dashboard-member'
import MessagesSection from '../../messages-section'

export default function ConversationDetailPage() {
  const { member } = useDashboardMember()
  const { setUnreadMessages } = useDashboardBadges()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const handleConversationChange = useCallback(
    (conversationId: string | null) => {
      router.push(conversationId ? `/dashboard/messages/${encodeURIComponent(conversationId)}` : '/dashboard/messages')
    },
    [router],
  )

  return (
    <MessagesSection
      member={member}
      initialConversationId={id}
      onUnreadChange={setUnreadMessages}
      onConversationChange={handleConversationChange}
    />
  )
}
