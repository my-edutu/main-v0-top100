'use client'
import { useState } from 'react'
export function MemberAvatar({
  src,
  initials,
  size = 40,
}: {
  src?: string | null
  initials: string
  size?: number
}) {
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-medium"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(110deg,#f97316,#f59e0b)',
        color: '#171717',
      }}
      aria-hidden="true"
    >
      {src && failed !== src ? (
        <img
          src={src}
          alt=""
          onError={() => setFailed(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  )
}
