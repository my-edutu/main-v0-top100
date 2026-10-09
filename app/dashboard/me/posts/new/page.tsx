'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { useDashboardMember } from '../../../_providers/dashboard-member'
import PostsSection from '../../../posts-section'

export default function NewPostPage() {
  const { member } = useDashboardMember()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const onboardingIntroduction = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('onboarding') === 'introduction'
  useEffect(() => {
    try {
      if (!onboardingIntroduction && localStorage.getItem(`afl-posts-intro:${member.id}`) !== 'seen') {
        router.replace('/dashboard/me/posts')
        return
      }
    } catch { /* Allow writing when browser storage is unavailable. */ }
    setReady(true)
  }, [member.id, onboardingIntroduction, router])
  if (!ready) return <div className="flex min-h-48 items-center justify-center" role="status" aria-label="Loading posts"><LoaderCircle className="h-6 w-6 animate-spin" /></div>

  return (
    <PostsSection member={member} mode="new" onboardingIntroduction={onboardingIntroduction} onEditorExit={() => router.push('/dashboard/me/posts')} />
  )
}
