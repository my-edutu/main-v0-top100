import { createAdminClient } from '@/lib/supabase/server'
import { validateSocialLinks, type SocialLink } from '@/lib/profile-contact'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronDown, ExternalLink, Globe, Instagram, Linkedin, Mail, PenSquare, Twitter, Users2, Youtube } from 'lucide-react'
import type { Metadata } from 'next'

import { getAwardees } from '@/lib/awardees'
import { normalizeAwardeeEntry } from '@/lib/awardees-shared'
import { fetchAwardeeBySlug } from '@/lib/dashboard/profile-service'
import { ogMetadata } from '@/lib/og'
import type { Achievement, GalleryItem, SocialLinks } from '@/types/profile'
import LinkedInPostCard from './LinkedInPostCard'
import AwardeePostsList from './AwardeePostsList'
import StructuredData from '@/components/StructuredData'
import AwardeePortrait from './AwardeePortrait'
import AwardeeMediaCarousel from './AwardeeMediaCarousel'
import BackToLeaders from './BackToLeaders'

export const runtime = 'nodejs'
export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raw = await fetchAwardeeBySlug(slug)

  if (!raw || raw.is_public === false) {
    return {
      title: 'Awardee Not Found',
      description: 'This awardee profile is not available.',
    }
  }

  const awardee = normalizeAwardeeEntry(raw)
  const portfolioCoverUrl = typeof raw.portfolio_cover_url === 'string' ? raw.portfolio_cover_url : null
  const showcaseYear = typeof awardee.year === 'number' && Number.isFinite(awardee.year) ? awardee.year : 2025
  const cohortLabel = awardee.cohort && awardee.cohort.trim().length > 0 ? awardee.cohort : `Top100 Africa Future Leader ${showcaseYear}`

  const title = `${awardee.name} - ${awardee.headline || cohortLabel}`
  const description = awardee.bio?.substring(0, 160) ||
    `Meet ${awardee.name}, ${cohortLabel}${awardee.country ? ` from ${awardee.country}` : ''}. ${awardee.tagline || awardee.headline || 'Celebrating excellence in African youth leadership.'}`

  const keywords = [
    awardee.name,
    ...(awardee.country ? [awardee.country, `${awardee.country} youth leader`] : []),
    ...(awardee.interests || []),
    'Top100 Africa Future Leaders',
    'African youth leader',
    'African innovation',
    cohortLabel
  ]

  // The portrait leads the card rather than sitting behind the text: a
  // headshot cropped to 1.91:1 loses the face, which is the whole subject.
  const card = {
    title: awardee.name,
    eyebrow: `Top100 AFL ${showcaseYear}`,
    subtitle: awardee.headline || awardee.tagline || cohortLabel,
    meta: [awardee.country, cohortLabel].filter(Boolean).join(' · '),
    hero: portfolioCoverUrl || awardee.avatar_url || awardee.cover_image_url || null,
    variant: 'profile' as const,
  }

  return {
    title,
    description,
    keywords,
    ...ogMetadata(card, {
      url: `/awardees/${awardee.slug}`,
      type: 'profile',
      description: description.substring(0, 200),
    }),
  }
}

const socialIconMap: Partial<Record<keyof SocialLinks, React.ComponentType<{ className?: string }>>> = {
  website: Globe,
  linkedin: Linkedin,
  twitter: Twitter,
  instagram: Instagram,
  facebook: Globe,
  youtube: Youtube,
  medium: PenSquare,
  threads: Users2,
}

const fallbackSocialLabel: Record<string, string> = {
  website: 'Website',
  linkedin: 'LinkedIn',
  twitter: 'Twitter',
  instagram: 'Instagram',
  facebook: 'Facebook',
  youtube: 'YouTube',
  medium: 'Medium',
  threads: 'Threads',
}

const hasGallery = (items?: GalleryItem[] | null) => Boolean(items && items.length > 0)
const hasAchievements = (items?: Achievement[] | null) => Boolean(items && items.length > 0)

function relatedLeaderScore(currentSlug: string, candidateSlug: string): number {
  let score = 0
  for (const character of `${currentSlug}:${candidateSlug}`) score = (score * 31 + character.charCodeAt(0)) >>> 0
  return score
}

export default async function AwardeeDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await fetchAwardeeBySlug(slug)

  if (!raw || raw.is_public === false) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-gray-500">Awardee not found.</p>
          <Link href="/awardees" className="text-red-600 hover:underline text-sm font-medium">Back to awardees</Link>
        </div>
      </div>
    )
  }

  const awardee = normalizeAwardeeEntry(raw)
  const portfolioCoverUrl = typeof raw.portfolio_cover_url === 'string' ? raw.portfolio_cover_url : null

  const relatedAwardees = (await getAwardees())
    .filter((entry) => entry.slug !== slug && entry.is_public !== false)
    .sort((a, b) => relatedLeaderScore(slug, a.slug) - relatedLeaderScore(slug, b.slug) || a.slug.localeCompare(b.slug))
    .slice(0, 4)

  if (!awardee.slug) {
    notFound()
  }

  const contactDb = createAdminClient()
  const { data: linkedAwardee } = await contactDb.from('awardees').select('profile_id').eq('slug', slug).maybeSingle()
  const { data: contactProfile } = linkedAwardee?.profile_id
    ? await contactDb.from('profiles').select('email,notification_prefs').eq('id', linkedAwardee.profile_id).maybeSingle()
    : { data: null }
  const contactPrefs = contactProfile?.notification_prefs ?? {}
  const memberLinks = contactPrefs.socialLinksConsent === true && !validateSocialLinks(contactPrefs.socialLinks)
    ? Object.fromEntries((contactPrefs.socialLinks as SocialLink[]).map(link => [link.platform, link.url])) : {}
  const contactEmail = contactPrefs.emailVisible === true && contactPrefs.contactEmailConsent === true ? contactProfile?.email : null
  const socialEntries = Object.entries(contactProfile ? memberLinks : (awardee.social_links ?? {}))
    .filter(([, value]) => Boolean(value)) as Array<[keyof SocialLinks, string]>

  const achievements = (awardee.achievements ?? []) as Achievement[]
  const gallery = (awardee.gallery ?? []) as GalleryItem[]
  const showcaseYear =
    typeof awardee.year === 'number' && Number.isFinite(awardee.year)
      ? awardee.year
      : 2025
  const cohortName = awardee.cohort?.trim()
  const spotlightLabel = cohortName && cohortName !== String(showcaseYear) && cohortName.toLowerCase() !== `class of ${showcaseYear}`
    ? cohortName
    : 'Top100 Africa Future Leaders'
  const heroSubtitle =
    awardee.tagline && awardee.tagline.trim().length > 0
      ? awardee.tagline
      : awardee.headline ?? null
  const currentSchool = awardee.current_school?.trim() || null
  const backgroundDetail = currentSchool && currentSchool.toLowerCase() !== heroSubtitle?.trim().toLowerCase()
    ? currentSchool
    : null

  // Person Schema for SEO
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": awardee.name,
    "image": awardee.avatar_url || awardee.cover_image_url,
    "jobTitle": awardee.headline,
    "description": awardee.bio,
    ...(awardee.current_school && { "alumniOf": awardee.current_school }),
    ...(awardee.country && { "nationality": awardee.country }),
    ...(achievements.length > 0 && { "award": achievements.map(a => a.title) }),
    ...(socialEntries.length > 0 && { "sameAs": socialEntries.map(([, url]) => url) }),
    "memberOf": {
      "@type": "Organization",
      "name": "Top100 Africa Future Leaders"
    },
    ...(awardee.interests && awardee.interests.length > 0 && { "knowsAbout": awardee.interests })
  }

  return (
    <div className="min-h-screen bg-white">
      <StructuredData data={personSchema} />

      <article className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-10">
        <nav className="py-4 sm:py-6">
          <BackToLeaders year={awardee.year} />
        </nav>

        <header className="border-b border-stone-200 pb-8 pt-2 sm:pb-10 sm:pt-4">
          <div className="grid items-center gap-5 sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[208px_minmax(0,1fr)] lg:gap-10">
            <AwardeeMediaCarousel name={awardee.name} portraitSources={[awardee.avatar_url, awardee.cover_image_url]} coverUrl={portfolioCoverUrl} />

            <div className="min-w-0 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A94412]">{spotlightLabel}</p>
              <h1 className="mt-2 break-words text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.08] tracking-[-0.035em] text-[#171412]">
                {awardee.name}
              </h1>
              {heroSubtitle && (
                <p className="mx-auto mt-3 max-w-xl text-base leading-6 text-stone-600 sm:mx-0 sm:text-lg sm:leading-7">
                  {heroSubtitle}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-stone-600 sm:justify-start">
                {awardee.country ? <span>{awardee.country}</span> : null}
                {awardee.country && awardee.year ? <span aria-hidden="true" className="text-stone-400">·</span> : null}
                {awardee.year ? <span>Class of {awardee.year}</span> : null}
              </div>
            </div>
          </div>
          {(contactEmail || socialEntries.length > 0) && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:ml-[208px] sm:justify-start lg:ml-[248px]">
              {contactEmail ? <a href={`mailto:${contactEmail}`} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#C62828] bg-[#C62828] px-4 text-sm font-medium text-[#fff] transition-colors hover:bg-[#A91F1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412]"><Mail className="h-4 w-4" aria-hidden="true" />Email me</a> : null}
              {socialEntries.map(([key, value]) => {
                const Icon = socialIconMap[key] ?? Globe
                const label = fallbackSocialLabel[key] ?? key
                const color = key === 'linkedin'
                  ? 'border-[#0A66C2] bg-[#0A66C2] text-[#fff] hover:bg-[#084F96]'
                  : key === 'instagram'
                    ? 'border-[#B33383] text-[#fff] hover:brightness-110'
                    : 'border-stone-300 bg-white text-stone-600 hover:border-[#E9A879] hover:bg-[#FFF7EF] hover:text-[#A94412]'
                return <Link key={key} href={value} target="_blank" rel="noopener noreferrer" aria-label={`${awardee.name} on ${label}`} title={label} style={key === 'instagram' ? { backgroundImage: 'linear-gradient(135deg, #833AB4, #C13584 55%, #E1306C)' } : undefined} className={`inline-flex size-11 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] ${color}`}><Icon className="h-5 w-5" aria-hidden="true" /></Link>
              })}
            </div>
          )}
        </header>

        {(backgroundDetail || awardee.cgpa || awardee.location) && (
          <details className="group border-b border-stone-200">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-[#25211D] marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
              Background and highlights
              <ChevronDown className="h-4 w-4 shrink-0 text-stone-500 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="grid gap-5 pb-6 sm:grid-cols-2 sm:gap-8">
              {backgroundDetail && <div><h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Background</h2><p className="mt-2 break-words text-sm leading-6 text-[#25211D] sm:text-base">{backgroundDetail}</p></div>}
              {awardee.cgpa && <div><h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Academic record</h2><p className="mt-2 break-words text-sm leading-6 text-[#25211D] sm:text-base">{awardee.cgpa}</p></div>}
              {awardee.location && <div><h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">Location</h2><p className="mt-2 break-words text-sm leading-6 text-[#25211D] sm:text-base">{awardee.location}</p></div>}
            </div>
          </details>
        )}

        <div className="max-w-3xl py-8 sm:py-12">
          {awardee.bio && (
            <section className="mb-10">
              <h2 className="text-xl font-semibold tracking-tight text-[#171412]">About {awardee.name.split(/\s+/)[0]}</h2>
              <div className="mt-4 space-y-4">
                {awardee.bio.split(/\n\n+/).map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-base leading-7 text-stone-700"
                  >
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* Featured LinkedIn Post */}
          {awardee.linkedin_post_url && (
            <LinkedInPostCard
              postUrl={awardee.linkedin_post_url}
              name={awardee.name}
            />
          )}

          {awardee.interests && awardee.interests.length > 0 && (
            <section className="mb-10 border-t border-stone-200 pt-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Areas of focus</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {awardee.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-700"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </section>
          )}

          {hasAchievements(achievements) && (
            <section className="mb-10 border-t border-stone-200 pt-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Recognition and achievements</h2>
              <div className="mt-5 space-y-6">
                {achievements.map((achievement, index) => (
                  <div
                    key={achievement.id ?? `${achievement.title}-${index}`}
                    className="border-l-2 border-[#E9A879] pl-4"
                  >
                    <div>
                      <h3 className="text-base font-semibold text-[#25211D]">
                        {achievement.title}
                      </h3>
                      {achievement.organization && (
                        <p className="mt-1 text-sm text-stone-600">{achievement.organization}</p>
                      )}
                      {achievement.description && (
                        <p className="mt-2 text-sm leading-6 text-stone-700">{achievement.description}</p>
                      )}
                      {achievement.link && (
                        <Link
                          href={achievement.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[#A94412] hover:underline"
                        >
                          Learn more
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      )}
                      {achievement.recognition_date && <p className="mt-2 text-xs text-stone-500">{achievement.recognition_date}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasGallery(gallery) && (
            <section className="mb-10 border-t border-stone-200 pt-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Photos</h2>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {gallery.map((item, index) => (
                  <figure
                    key={item.id ?? `${item.url}-${index}`}
                    className="overflow-hidden rounded-xl bg-stone-100"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <Image
                        src={item.url}
                        alt={item.caption ?? awardee.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 33vw"
                        className="object-cover"
                      />
                    </div>
                    {item.caption && (
                      <figcaption className="px-3 py-2 text-xs text-stone-600">
                        {item.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {awardee.youtube_video_url && (
            <section className="mb-10 border-t border-stone-200 pt-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Featured video</h2>
              <div className="mt-5 aspect-video overflow-hidden rounded-xl bg-stone-900">
                <iframe
                  src={`https://www.youtube.com/embed/${awardee.youtube_video_url}`}
                  title="Featured Interview"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </section>
          )}

          {awardee.mentor && (
            <section className="border-t border-stone-200 pt-8">
              <h2 className="text-xl font-semibold tracking-tight text-[#171412]">Mentor</h2>
              <p className="mt-3 text-base text-stone-700">{awardee.mentor}</p>
            </section>
          )}
        </div>

        {/* Posts written by this awardee. Renders nothing when they have none. */}
        <AwardeePostsList slug={slug} />

        {relatedAwardees.length > 0 && (
          <section className="border-t border-stone-200 py-8">
            <h2 className="mb-5 text-xl font-semibold tracking-tight text-[#171412]">More future leaders</h2>
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible sm:px-0">
              {relatedAwardees.map((other) => (
                <Link
                  key={other.slug}
                  href={`/awardees/${other.slug}`}
                  className="group w-28 flex-shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A94412] sm:w-auto"
                >
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-lg bg-stone-100">
                    <AwardeePortrait name={other.name} sources={[other.avatar_url, other.cover_image_url]} size={60} priority={false} />
                  </div>
                  <h3 className="line-clamp-2 text-xs font-medium leading-4 text-[#25211D] transition-colors group-hover:text-[#A94412] sm:text-sm">
                    {other.name}
                  </h3>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
