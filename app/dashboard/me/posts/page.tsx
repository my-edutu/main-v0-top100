'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'
import PostsSection from '../../posts-section'

export default function PostsPage() {
  const { member } = useDashboardMember()
  const [introOpen, setIntroOpen] = useState(false)
  useEffect(() => {
    try { setIntroOpen(localStorage.getItem(`afl-posts-intro:${member.id}`) !== 'seen') }
    catch { setIntroOpen(true) }
  }, [member.id])
  function closeIntro() {
    try { localStorage.setItem(`afl-posts-intro:${member.id}`, 'seen') } catch { /* Continue for this visit. */ }
    setIntroOpen(false)
  }

  return (
    <RouteSection eyebrow="Your writing" title="Posts" description="Your shared writing, all in one place.">
      <PostsSection member={member} mode="list" />
      <Dialog open={introOpen} onOpenChange={(open) => { if (!open) closeIntro() }}>
        <DialogContent>
          <DialogTitle>Your stories belong here</DialogTitle>
          <DialogDescription>Share your awardee introduction, ideas, projects, and lessons with the AFL community. Your articles and drafts live here. Choose Start writing when you’re ready to create your first draft.</DialogDescription>
          <Button onClick={closeIntro}>View my articles</Button>
        </DialogContent>
      </Dialog>
    </RouteSection>
  )
}
