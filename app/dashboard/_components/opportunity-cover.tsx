'use client'

import { useState } from 'react'

import SafeImage from '@/components/safe-image'
import { cn } from '@/lib/utils'
import defaultOpportunityCover from '@/public/dashboard/cards/opportunities.jpg'

export function OpportunityCover({ imageUrl, detail = false, compact = false }: {
  imageUrl?: string | null
  detail?: boolean
  compact?: boolean
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const image = imageUrl && imageUrl !== failedUrl ? imageUrl : null

  if (detail && !image) return null

  return (
    <span className={cn(
      'block overflow-hidden bg-[#eee8e0]',
      compact ? 'absolute inset-0' : 'relative',
      detail ? 'aspect-[16/9] rounded-2xl' : !compact && 'aspect-[7/3] shrink-0',
    )}>
      <SafeImage
        src={image ?? defaultOpportunityCover}
        alt=""
        fill
        sizes={compact ? '(max-width: 390px) 82vw, 320px' : detail ? '(max-width: 640px) 94vw, 704px' : '(max-width: 767px) 100vw, 50vw'}
        unoptimized={Boolean(image)}
        referrerPolicy="no-referrer"
        className={detail ? 'object-contain' : 'object-cover'}
        onError={image ? () => setFailedUrl(image) : undefined}
      />
    </span>
  )
}
