'use client'

import { useRouter } from 'next/navigation'

import { useDashboardMember } from '../../../_providers/dashboard-member'
import PostsSection from '../../../posts-section'

export default function NewPostPage() {
  const { member } = useDashboardMember()
  const router = useRouter()

  return (
    <PostsSection member={member} mode="new" onEditorExit={() => router.push('/dashboard/me/posts')} />
  )
}
