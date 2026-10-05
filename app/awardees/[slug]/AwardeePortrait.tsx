'use client'

import Image from 'next/image'
import { useState } from 'react'
import { AvatarSVG } from '@/lib/avatars'

export default function AwardeePortrait({ name, sources, size = 150, priority = true }: { name: string; sources: (string | null | undefined)[]; size?: number; priority?: boolean }) {
  const [failed, setFailed] = useState<string[]>([])
  const source = sources.find((value) => {
    if (!value || failed.includes(value)) return false
    if (value.startsWith('/') && !value.startsWith('//')) return true
    try {
      const url = new URL(value)
      // Imported Drive sharing links return HTML rather than image bytes.
      return url.protocol === 'https:' && url.hostname !== 'drive.google.com'
    } catch {
      return false
    }
  })

  if (!source) {
    return <div className="w-full h-full bg-gray-100 flex items-center justify-center"><AvatarSVG name={name} size={size} /></div>
  }

  const optimized = source.startsWith('/') || new URL(source).hostname === 'supabase.top100afl.com' || new URL(source).hostname.endsWith('.supabase.co')

  return <Image src={source} alt={name} fill priority={priority} sizes={size === 60 ? '112px' : '256px'} unoptimized={!optimized} onError={() => setFailed((values) => [...values, source])} className="object-cover grayscale hover:grayscale-0 transition-all duration-500" />
}
