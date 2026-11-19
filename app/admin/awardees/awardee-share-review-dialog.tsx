'use client'

import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import SpotlightComposer from '@/app/admin/social/spotlight-composer'
import type { FeatureProfile } from '@/app/admin/social/social-sharing-workspace'
import { readSocialResponse } from '@/lib/admin-social/client'

const saved = () => undefined

export default function AwardeeShareReviewDialog({
  awardeeId,
  onClose,
}: {
  awardeeId: string
  onClose: () => void
}) {
  const [profile, setProfile] = useState<FeatureProfile | null>(null)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch(
      `/api/admin/social/awardees?awardeeId=${encodeURIComponent(awardeeId)}`,
      { signal: controller.signal },
    )
      .then(readSocialResponse)
      .then((data) => {
        if (controller.signal.aborted) return
        if (!data.awardees?.[0])
          throw new Error(
            'This awardee needs a public profile before they can be featured.',
          )
        setProfile(data.awardees[0])
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message)
      })
    return () => controller.abort()
  }, [awardeeId])
  const close = () => {
    if (
      dirty &&
      !window.confirm('Discard unsaved feature edits and close this feature?')
    )
      return
    onClose()
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent className="max-h-[92svh] max-w-3xl overflow-y-auto rounded-2xl p-4 sm:p-6">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Feature awardee</DialogTitle>
          <DialogDescription>
            Draft the story, prepare channel copy and record live posts.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </p>
        ) : profile ? (
          <SpotlightComposer
            key={profile.awardeeId}
            profile={profile}
            onDirty={setDirty}
            onSaved={saved}
          />
        ) : (
          <p
            role="status"
            className="flex min-h-32 items-center justify-center gap-2 text-sm text-stone-500"
          >
            <LoaderCircle className="size-4 animate-spin" />
            Loading awardee feature…
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
