'use client'

import { Suspense, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { parseMessageRecipient } from '../_lib/message-route'
import { useDashboardBadges } from '../_providers/dashboard-badges'
import { useDashboardMember } from '../_providers/dashboard-member'
import MessagesSection from '../messages-section'

function MessagesListPageContent() {
  const { member } = useDashboardMember()
  const { setUnreadMessages } = useDashboardBadges()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pendingRecipient = parseMessageRecipient(searchParams)

  const handleConversationChange = useCallback(
    (conversationId: string | null) => {
      router.push(conversationId ? `/dashboard/messages/${encodeURIComponent(conversationId)}` : '/dashboard/messages')
    },
    [router],
  )

  return (
    <MessagesSection
      member={member}
      pendingRecipient={pendingRecipient}
      onUnreadChange={setUnreadMessages}
      onConversationChange={handleConversationChange}
    />
  )
}

export default function MessagesListPage() {
  return (
    <Suspense fallback={null}>
      <MessagesListPageContent />
    </Suspense>
  )
}
