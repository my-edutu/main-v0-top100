'use client'

import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import PostsSection from '../../posts-section'

export default function PostsPage() {
  const { member } = useDashboardMember()

  return (
    <RouteSection eyebrow="Your writing" title="Posts" description="Manage drafts and published stories at durable links.">
      <PostsSection member={member} mode="list" />
    </RouteSection>
  )
}
