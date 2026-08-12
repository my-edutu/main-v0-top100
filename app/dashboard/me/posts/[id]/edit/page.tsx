'use client'

import { useParams, useRouter } from 'next/navigation'

import { RouteSection } from '../../../../_components/route-section'
import { useDashboardMember } from '../../../../_providers/dashboard-member'
import PostsSection from '../../../../posts-section'

export default function EditPostPage() {
  const { member } = useDashboardMember()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  return (
    <RouteSection eyebrow="Your writing" title="Edit post" description="Update this story while keeping its existing public URL.">
      <PostsSection member={member} mode="edit" postId={id} onEditorExit={() => router.push('/dashboard/me/posts')} />
    </RouteSection>
  )
}
