'use client'

import { useState } from 'react'

import SafeImage from '@/components/safe-image'
import { cn } from '@/lib/utils'
import defaultOpportunityCover from '@/public/dashboard/cards/opportunities.jpg'

export function OpportunityCover({ imageUrl, detail = false }: { imageUrl?: string | null; detail?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const image = imageUrl && imageUrl !== failedUrl ? imageUrl : null

  if (detail && !image) return null

  return (
    <span className={cn(
      'relative block overflow-hidden bg-[#eee8e0]',
      detail ? 'aspect-[16/9] rounded-2xl' : 'aspect-[7/3] shrink-0',
    )}>
      <SafeImage
        src={image ?? defaultOpportunityCover}
        alt=""
        fill
        sizes={detail ? '(max-width: 640px) 92vw, 704px' : '(max-width: 767px) 100vw, 50vw'}
        unoptimized={Boolean(image)}
        referrerPolicy="no-referrer"
        className={detail ? 'object-contain' : 'object-cover'}
        onError={image ? () => setFailedUrl(image) : undefined}
      />
    </span>
  )
}
