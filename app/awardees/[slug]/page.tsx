import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, ExternalLink, Globe, Instagram, Linkedin, Mail, MapPin, PenSquare, Trophy, Twitter, Users2, Youtube, GraduationCap, ArrowLeft, Quote, Award, Briefcase } from 'lucide-react'
import type { Metadata } from 'next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeAwardeeEntry } from '@/lib/awardees'
import { fetchAwardeeBySlug } from '@/lib/dashboard/profile-service'
import { AvatarSVG, flagEmoji } from '@/lib/avatars'
import type { Achievement, GalleryItem, SocialLinks } from '@/types/profile'
import ConnectButton from './ConnectButton'
import LinkedInPostCard from './LinkedInPostCard'
import StructuredData from '@/components/StructuredData'

export const runtime = 'nodejs'
export const revalidate = 0

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
  const showcaseYear = typeof awardee.year === 'number' && Number.isFinite(awardee.year) ? awardee.year : new Date().getFullYear()
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

  const imageUrl = awardee.cover_image_url || awardee.avatar_url || '/top100-africa-future-leaders-2024-magazine-cover-w.jpg'

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${awardee.name} - ${cohortLabel}`,
        }
      ],
      type: 'profile',
      url: `https://www.top100afl.org/awardees/${awardee.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description.substring(0, 200),
      images: [imageUrl],
    },
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

  // Fetch random other awardees for suggestions
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient(true)
  const { data: otherAwardees } = await supabase
    .from('awardee_directory')
    .select('slug, name, avatar_url, cover_image_url, headline, country')
    .neq('slug', slug)
    .eq('is_public', true)
    .limit(20)

  const randomAwardees = otherAwardees
    ? otherAwardees.sort(() => Math.random() - 0.5).slice(0, 4)
    : []

  if (!awardee.slug) {
    notFound()
  }

  const socialEntries = Object.entries(awardee.social_links ?? {})
    .filter(([, value]) => Boolean(value)) as Array<[keyof SocialLinks, string]>

  const achievements = (awardee.achievements ?? []) as Achievement[]
  const gallery = (awardee.gallery ?? []) as GalleryItem[]
  const showcaseYear =
    typeof awardee.year === 'number' && Number.isFinite(awardee.year)
      ? awardee.year
      : new Date().getFullYear()
  const spotlightLabel =
    awardee.cohort && awardee.cohort.trim().length > 0
      ? awardee.cohort
      : `Top100 Africa Future Leader ${showcaseYear}`
  const heroSubtitle =
    awardee.tagline && awardee.tagline.trim().length > 0
      ? awardee.tagline
      : awardee.headline ?? null

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

      {/* Forbes-Style Hero */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="pt-8 pb-6 border-b border-gray-200">
          <Link
            href="/awardees"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Leaders</span>
          </Link>
        </nav>

        {/* Header Section */}
        <header className="py-10 sm:py-16 border-b border-gray-100">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            {/* Photo */}
            <div className="shrink-0 mx-auto md:mx-0">
              <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64">
                {awardee.avatar_url || awardee.cover_image_url ? (
                  <img
                    src={awardee.avatar_url || awardee.cover_image_url || ''}
                    alt={awardee.name}
                    className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <AvatarSVG name={awardee.name} size={150} />
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              {/* Category Tag */}
              <div className="mb-4">
                <span className="inline-block text-xs font-bold uppercase tracking-[0.2em] text-red-600 border-b-2 border-red-600 pb-1">
                  {spotlightLabel}
                </span>
              </div>

              {/* Name */}
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif font-bold text-gray-900 leading-tight tracking-tight">
                {awardee.name}
              </h1>

              {/* Tagline - Shortened */}
              {heroSubtitle && (
                <p className="mt-4 text-lg sm:text-xl text-gray-600 font-light leading-relaxed max-w-xl line-clamp-2">
                  {heroSubtitle.length > 80 ? heroSubtitle.substring(0, 80) + '...' : heroSubtitle}
                </p>
              )}

              {/* Quick Meta */}
              <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-sm text-gray-500">
                {awardee.country && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {awardee.country}
                  </span>
                )}
                {awardee.current_school && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4" />
                    {awardee.current_school}
                  </span>
                )}
                {awardee.year && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Class of {awardee.year}
                  </span>
                )}
                {awardee.cgpa && (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-gray-900">
                    <Award className="h-4 w-4 text-red-600" />
                    {awardee.cgpa} CGPA
                  </span>
                )}
              </div>

              {/* Actions Row - Social Links + Connect Button */}
              <div className="mt-6 flex flex-wrap justify-center md:justify-start items-center gap-3">
                {/* Social Links */}
                {socialEntries.map(([key, value]) => {
                  const Icon = socialIconMap[key] ?? Globe
                  return (
                    <Link
                      key={key}
                      href={value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 w-10 rounded-full bg-gray-100 hover:bg-orange-500 hover:text-white flex items-center justify-center text-gray-600 transition-all duration-300"
                    >
                      <Icon className="h-4 w-4" />
                    </Link>
                  )
                })}

                {/* Connect Button with Popup */}
                <ConnectButton
                  linkedin={awardee.social_links?.linkedin}
                  twitter={awardee.social_links?.twitter}
                  facebook={awardee.social_links?.facebook}
                  name={awardee.name}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="py-10 sm:py-16">

          {/* Biography - Magazine Style */}
          {awardee.bio && (
            <section className="mb-12">
              {/* Drop Cap First Paragraph Style */}
              <div className="prose prose-lg max-w-none">
                <p className="text-lg sm:text-xl text-gray-700 leading-relaxed first-letter:text-6xl first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-gray-900">
                  {awardee.bio}
                </p>
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

          {/* Focus Areas */}
          {awardee.interests && awardee.interests.length > 0 && (
            <section className="mb-12 pb-12 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Areas of Focus</h2>
              <div className="flex flex-wrap gap-2">
                {awardee.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Achievements - Editorial List */}
          {hasAchievements(achievements) && (
            <section className="mb-12 pb-12 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Recognition & Achievements</h2>
              <div className="space-y-6">
                {achievements.map((achievement, index) => (
                  <div
                    key={achievement.id ?? `${achievement.title}-${index}`}
                    className="flex gap-4 group"
                  >
                    <div className="shrink-0 w-12 h-12 bg-red-600 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <h3 className="font-bold text-gray-900 group-hover:text-red-600 transition-colors">
                        {achievement.title}
                      </h3>
                      {achievement.organization && (
                        <p className="text-sm text-gray-500 mt-0.5">{achievement.organization}</p>
                      )}
                      {achievement.description && (
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{achievement.description}</p>
                      )}
                      {achievement.link && (
                        <Link
                          href={achievement.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-red-600 hover:underline font-medium mt-2"
                        >
                          Learn more
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    {achievement.recognition_date && (
                      <span className="shrink-0 text-xs text-gray-400 font-medium pt-1">
                        {achievement.recognition_date}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Gallery - Magazine Grid */}
          {hasGallery(gallery) && (
            <section className="mb-12 pb-12 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Photo Gallery</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                {gallery.map((item, index) => (
                  <figure
                    key={item.id ?? `${item.url}-${index}`}
                    className="group overflow-hidden bg-gray-100"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={item.url}
                        alt={item.caption ?? awardee.name}
                        className="h-full w-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                      />
                    </div>
                    {item.caption && (
                      <figcaption className="px-3 py-2 text-xs text-gray-500 italic">
                        {item.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {/* YouTube Video */}
          {awardee.youtube_video_url && (
            <section className="mb-12 pb-12 border-b border-gray-100">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-6">Featured Video</h2>
              <div className="aspect-video bg-gray-900">
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

          {/* Mentor */}
          {awardee.mentor && (
            <section className="mb-12">
              <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">Mentor</h2>
              <div className="flex items-center gap-4 p-4 bg-gray-50">
                <Briefcase className="h-6 w-6 text-gray-400" />
                <p className="font-medium text-gray-900">{awardee.mentor}</p>
              </div>
            </section>
          )}

          {/* Location */}
          {awardee.location && (
            <div className="py-6 border-t border-gray-100">
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {awardee.location}
              </p>
            </div>
          )}
        </div>

        {/* Related Leaders - Forbes "More From" Section */}
        {randomAwardees.length > 0 && (
          <section className="py-8 border-t border-gray-200">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 mb-4">More Future Leaders</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible">
              {randomAwardees.map((other: any) => (
                <Link
                  key={other.slug}
                  href={`/awardees/${other.slug}`}
                  className="group flex-shrink-0 w-28 sm:w-auto"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden mb-2 rounded">
                    {other.avatar_url || other.cover_image_url ? (
                      <img
                        src={other.avatar_url || other.cover_image_url}
                        alt={other.name}
                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <AvatarSVG name={other.name} size={60} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 group-hover:text-orange-500 transition-colors line-clamp-1">
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
