import React from 'react'

// Palette of pleasant colors
const COLORS = [
  '#FDE68A',
  '#A7F3D0',
  '#BFDBFE',
  '#FBCFE8',
  '#C7D2FE',
  '#FECACA',
  '#E9D5FF',
  '#BBF7D0'
] as const

// Simple hash function to generate color index from name
export function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}

// Extract initials from name
export function initials(name: string): string {
  const names = name.trim().split(/\s+/)
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  } else if (names.length === 1) {
    const single = names[0]
    return (single.substring(0, 2)).toUpperCase()
  }
  return '??'
}

// Helper to get flag emoji for country (limited map, fallback to empty)
export function flagEmoji(country: string): string {
  const countryFlags: Record<string, string> = {
    'Nigeria': '🇳🇬',
    'Ghana': '🇬🇭',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Ethiopia': '🇪🇹',
    'Senegal': '🇸🇳',
    'Kenya': '🇰🇪',
    'Mali': '🇲🇱',
    'Angola': '🇦🇴',
    'Morocco': '🇲🇦'
  }
  return countryFlags[country] || ''
}

// React component for SVG avatar
interface AvatarSVGProps {
  name: string
  size?: 'sm' | 'md' | 'lg' // but spec is 48x48 base, lg 64x64
  className?: string
}

export function AvatarSVG({ name, className = 'w-12 h-12 lg:w-16 lg:h-16' }: AvatarSVGProps) {
  const color = colorFromName(name)
  const init = initials(name)

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill={color} />
      <text
        x="24"
        y="32"
        textAnchor="middle"
        fill="white"
        fontSize="18"
        fontWeight="700"
        dy=".3em"
      >
        {init}
      </text>
    </svg>
  )
}

// For larger sizes, the viewBox is fixed, className handles scaling
