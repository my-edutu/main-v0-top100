'use client'

import React from 'react'
import Link from 'next/link'
import { AvatarSVG, flagEmoji } from '@/lib/avatars'

interface Awardee {
  id: string
  name: string
  country: string
  category: string
  year: number
  bio30?: string
  photo_url?: string
  featured?: boolean
}

interface AwardeeCardProps {
  awardee: Awardee
}

export function AwardeeCard({ awardee }: AwardeeCardProps) {
  // Editors: change labels here if needed for accessibility

  return (
    <article className="group relative bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden hover:border-orange-400/50 transition-all duration-300 shadow-lg hover:shadow-xl h-full">
      {/* Optional featured badge */}
      {awardee.featured && (
        <div className="absolute top-4 left-4 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
          Featured
        </div>
      )}

      <div className="p-6 space-y-4">
        <div className="flex items-start space-x-4">
          <AvatarSVG 
            name={awardee.name} 
            className="flex-shrink-0 w-16 h-16 lg:w-20 lg:h-20"
            aria-label={`Avatar for ${awardee.name}`}
          />
          <div className="flex-1 min-w-0">
            <Link 
              href={`/awardees/${awardee.id}`} // Assume individual pages exist or can be added later
              className="block hover:underline focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              <h3 className="text-xl font-bold text-white group-hover:text-orange-300 transition-colors">
                {awardee.name}
              </h3>
            </Link>
            <p className="text-sm text-zinc-300 mt-1">
              {flagEmoji(awardee.country)} {awardee.country}
            </p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-orange-400 font-medium">{awardee.year}</span>
              <span 
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100/20 text-orange-300 border border-orange-400/30"
                role="img"
                aria-label={awardee.category}
              >
                {awardee.category}
              </span>
            </div>
          </div>
        </div>

        {awardee.bio30 && (
          <p className="text-sm text-zinc-300 line-clamp-3">
            {awardee.bio30}
          </p>
        )}
      </div>

      {/* Bottom hover effect for accessibility */}
      <div className="absolute inset-0 border-2 border-transparent rounded-xl group-hover:border-orange-400/50 pointer-events-none transition-colors" />
    </article>
  )
}
