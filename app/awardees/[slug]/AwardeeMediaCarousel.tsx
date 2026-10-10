'use client'

import { useState } from 'react'
import Image from '@/components/safe-image'
import AwardeePortrait from './AwardeePortrait'

export default function AwardeeMediaCarousel({ name, portraitSources, coverUrl }: { name: string; portraitSources: (string | null | undefined)[]; coverUrl: string | null }) {
  const [coverFailed, setCoverFailed] = useState(false)
  const hasCover = Boolean(coverUrl) && !coverFailed

  return (
    <div className="mx-auto w-full max-w-[440px] sm:mx-0">
      <div className={hasCover ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1'}>
        <div className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-[18px] bg-stone-100">
          <AwardeePortrait name={name} sources={portraitSources} size={220} />
        </div>
        {hasCover && coverUrl ? (
          <div className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-[18px] bg-[#fff4e4]">
            <Image
              src={coverUrl}
              alt={`${name} awardee cover`}
              fill
              sizes="(max-width: 640px) 44vw, (max-width: 1024px) 22vw, 220px"
              className="object-contain"
              onError={() => setCoverFailed(true)}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
