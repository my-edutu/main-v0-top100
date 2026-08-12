'use client'

import { useRouter } from 'next/navigation'

import { RouteSection } from '../../../_components/route-section'
import { useDashboardMember } from '../../../_providers/dashboard-member'
import PostsSection from '../../../posts-section'

export default function NewPostPage() {
  const { member } = useDashboardMember()
  const router = useRouter()

  return (
    <RouteSection eyebrow="Your writing" title="New post" description="Save a draft now or publish when your membership allows it.">
      <PostsSection member={member} mode="new" onEditorExit={() => router.push('/dashboard/me/posts')} />
    </RouteSection>
  )
}
