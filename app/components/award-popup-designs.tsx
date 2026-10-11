'use client'

import type { CSSProperties } from 'react'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, Star, Trophy, Users } from 'lucide-react'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import type { AwardPopupVariant } from '@/lib/awards/popup'
import styles from './award-popups.module.css'

type Props = { variant: AwardPopupVariant; name: string; onReserve: () => void }

// Crop the photography from the supplied design boards in CSS, preserving the original files.
const scenes = {
  achievement: { source: '/award-card-reference-scenes.png', x: 18, y: 150, width: 484, height: 316 },
  invitation: { source: '/award-card-reference-scenes.png', x: 528, y: 150, width: 484, height: 300 },
  recognition: { source: '/award-card-reference-scenes.png', x: 1037, y: 150, width: 483, height: 337 },
  celebration: { source: '/award-card-reference-scenes-alt.png', x: 17, y: 150, width: 486, height: 344 },
  keepsake: { source: '/award-card-reference-scenes-alt.png', x: 526, y: 150, width: 485, height: 356 },
  presentation: { source: '/award-card-reference-scenes-alt.png', x: 1035, y: 150, width: 485, height: 350 },
} as const

export function AwardPopupDesign({ variant, name, onReserve }: Props) {
  const scene = scenes[variant.id]
  const photoStyle = {
    '--photo-ratio': `${scene.width} / ${scene.height}`,
    '--photo-width': `${1536 / scene.width * 100}%`,
    '--photo-height': `${1024 / scene.height * 100}%`,
    '--photo-left': `${-scene.x / scene.width * 100}%`,
    '--photo-top': `${-scene.y / scene.height * 100}%`,
  } as CSSProperties
  const BadgeIcon = variant.id === 'recognition' ? Users : variant.id === 'celebration' ? Star : variant.id === 'presentation' ? Trophy : CalendarDays
  const badge = variant.id === 'recognition' ? 'Africa Future Leaders · Class of 2026' : 'Official presentation · November 2026'

  return <article className={styles.card} data-award-popup={variant.id}>
    <div className={styles.scroller}>
      <header className={styles.header}>Africa Future Leaders 2026</header>
      <figure className={styles.hero} style={photoStyle}>
        <Image src={scene.source} alt="Africa Future Leaders 2026 framed physical award" width={1536} height={1024} className={styles.sceneImage} unoptimized loading="eager" />
      </figure>
      <div className={styles.copy}>
        <p className={styles.badge}><BadgeIcon size={19} aria-hidden="true" />{badge}</p>
        <DialogTitle className={`${styles.title} ${variant.id === 'achievement' ? styles.personalTitle : ''}`}>
          {variant.id === 'achievement' && <span className={styles.greeting}>Hi {name},</span>}
          {variant.title}
        </DialogTitle>
        {variant.id !== 'achievement' && <span className={styles.rule} aria-hidden="true" />}
        <DialogDescription className={styles.description}>{variant.description}</DialogDescription>
      </div>
    </div>
    <footer className={styles.footer}>
      <Link href="/dashboard/me/award/payment" onClick={onReserve} className={styles.cta}>Reserve My Award <ArrowRight size={22} aria-hidden="true" /></Link>
      <Link href="/dashboard/me/award" className={styles.details}>View award details</Link>
    </footer>
  </article>
}
