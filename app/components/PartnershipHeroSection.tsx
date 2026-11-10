import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

import styles from './PartnershipHeroSection.module.css'

const partnershipFormUrl = process.env.NEXT_PUBLIC_PARTNERSHIP_GOOGLE_FORM_URL?.trim()

export default function PartnershipHeroSection({ showTalentPipelines = false }: { showTalentPipelines?: boolean }) {
  return (
    <section id="partner-with-us" aria-labelledby="home-org-title" className="container scroll-mt-24 py-6 sm:py-9">
      <div className={styles.card}>
        <div className={styles.content}>
          <h2 id="home-org-title" className={styles.title}>Meet standout African talent.</h2>
          <p className={styles.description}>
            {showTalentPipelines
              ? 'Our award winners lead teams, build projects and solve real problems. See their work and find people for your team, wherever you’re based.'
              : 'Work with us to run a workshop, fund a scholarship or help young African leaders find a mentor.'}
          </p>
          <div className={styles.actions}>
            {showTalentPipelines && (
              <Link href="/for-organisations#discover" className={styles.action}>
                Discover pipelines <span><ArrowRight size={16} aria-hidden="true" /></span>
              </Link>
            )}
            <Link
              href={partnershipFormUrl || '/partnership'}
              target={partnershipFormUrl ? '_blank' : undefined}
              rel={partnershipFormUrl ? 'noreferrer' : undefined}
              className={showTalentPipelines ? styles.textLink : styles.action}
            >
              Partner with us <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
