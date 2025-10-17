import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, ExternalLink, Globe, Instagram, Linkedin, Mail, MapPin, PenSquare, Trophy, Twitter, Users2, Youtube, GraduationCap } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeAwardeeEntry } from '@/lib/awardees'
import { fetchAwardeeBySlug } from '@/lib/dashboard/profile-service'
import { AvatarSVG, flagEmoji } from '@/lib/avatars'
import type { Achievement, GalleryItem, SocialLinks } from '@/types/profile'

export const runtime = 'nodejs'
export const revalidate = 0

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

export default async function AwardeeDetail({ params }: { params: { slug: string } }) {
  const raw = await fetchAwardeeBySlug(params.slug)

  if (!raw || raw.is_public === false) {
    return (
      <div className="container mx-auto px-4 py-12">
        <p className="text-zinc-300">Awardee not found.</p>
        <Link href="/awardees" className="text-orange-400 underline">Back to awardees</Link>
      </div>
    )
  }

  const awardee = normalizeAwardeeEntry(raw)

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

  return (
    <div className="min-h-screen bg-black">
      {awardee.cover_image_url ? (
        <div className="relative h-72 w-full overflow-hidden">
          <img
            src={awardee.cover_image_url}
            alt={`${awardee.name} cover`}
            className="h-full w-full object-cover object-center opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-r from-orange-500/20 via-black to-black" />
      )}

      <div className="container mx-auto max-w-5xl px-4 pb-16">
        <div className="-mt-24 flex flex-col gap-10 rounded-3xl border border-orange-400/10 bg-black/80 p-6 backdrop-blur">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="shrink-0">
              <div className="flex h-32 w-32 items-center justify-center rounded-full border border-orange-400/60 bg-orange-500/10">
                {awardee.avatar_url ? (
                  <img
                    src={awardee.avatar_url}
                    alt={awardee.name}
                    className="h-28 w-28 rounded-full object-cover"
                  />
                ) : (
                  <AvatarSVG name={awardee.name} size={96} />
                )}
              </div>
            </div>
            <div className="flex-1">
              <Badge variant="secondary" className="mb-2 bg-orange-500/20 text-orange-200">
                {spotlightLabel}
              </Badge>
              <h1 className="text-3xl font-bold text-white md:text-4xl">Meet {awardee.name}</h1>
              {heroSubtitle ? (
                <p className="mt-2 text-base text-orange-100 md:text-lg">{heroSubtitle}</p>
              ) : (
                <p className="mt-2 text-base text-orange-100 md:text-lg">
                  Championing impact as a Top100 Africa Future Leader.
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-3 py-1 text-orange-200">
                  <MapPin className="h-4 w-4" />
                  {flagEmoji(awardee.country ?? '')}
                  {awardee.country ?? 'Location TBD'}
                </span>
                {awardee.current_school && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1">
                    <GraduationCap className="h-4 w-4" />
                    {awardee.current_school}
                  </span>
                )}
                {awardee.field_of_study && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1">
                    <PenSquare className="h-4 w-4" />
                    {awardee.field_of_study}
                  </span>
                )}
                {awardee.cgpa && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1">
                    <Trophy className="h-4 w-4" />
                    CGPA {awardee.cgpa}
                  </span>
                )}
                {awardee.year && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/80 px-3 py-1">
                    <Calendar className="h-4 w-4" />
                    Class of {awardee.year}
                  </span>
                )}
              </div>
              {awardee.headline && (
                <p className="mt-4 text-lg text-orange-200">{awardee.headline}</p>
              )}
              {awardee.tagline && (
                <p className="mt-2 text-sm text-zinc-400">{awardee.tagline}</p>
              )}
            </div>
            <div className="flex flex-col gap-3 text-sm text-zinc-300">
              {awardee.email && (
                <div className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-300" />
                  <a href={`mailto:${awardee.email}`} className="text-orange-300 hover:text-orange-200">
                    {awardee.email}
                  </a>
                </div>
              )}
              {awardee.personal_email && awardee.personal_email !== awardee.email && (
                <div className="inline-flex items-center gap-2">
                  <Mail className="h-4 w-4 text-orange-300" />
                  <a href={`mailto:${awardee.personal_email}`} className="text-orange-300 hover:text-orange-200">
                    {awardee.personal_email}
                  </a>
                </div>
              )}
              {awardee.mentor && (
                <div className="inline-flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-orange-300" />
                  <span>Mentor: {awardee.mentor}</span>
                </div>
              )}
            </div>
          </div>

          {awardee.bio && (
            <section>
              <h2 className="text-xl font-semibold text-white">Biography</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-zinc-300">{awardee.bio}</p>
            </section>
          )}

          {awardee.interests && awardee.interests.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white">Focus Areas</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {awardee.interests.map((interest) => (
                  <Badge key={interest} variant="outline" className="border-orange-500/40 text-orange-200">
                    {interest}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          {hasAchievements(achievements) && (
            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Achievements</h2>
                <span className="text-sm text-zinc-400">{achievements.length} highlight{achievements.length > 1 ? 's' : ''}</span>
              </div>
              <div className="mt-4 space-y-4">
                {achievements.map((achievement, index) => (
                  <div key={achievement.id ?? `${achievement.title}-${index}`} className="rounded-2xl border border-orange-400/10 bg-zinc-900/50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-orange-300">
                          <Trophy className="h-4 w-4" />
                          <span className="font-semibold text-white">{achievement.title}</span>
                        </div>
                        {achievement.organization && (
                          <p className="mt-1 text-sm text-zinc-400">{achievement.organization}</p>
                        )}
                      </div>
                      {achievement.recognition_date && (
                        <span className="text-xs uppercase tracking-wide text-orange-200">
                          {achievement.recognition_date}
                        </span>
                      )}
                    </div>
                    {achievement.description && (
                      <p className="mt-3 text-sm text-zinc-400">{achievement.description}</p>
                    )}
                    {achievement.link && (
                      <Button asChild variant="link" className="mt-2 h-auto p-0 text-orange-300">
                        <Link href={achievement.link} target="_blank" rel="noopener noreferrer">
                          View reference
                          <ExternalLink className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {hasGallery(gallery) && (
            <section>
              <h2 className="text-xl font-semibold text-white">Gallery</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {gallery.map((item, index) => (
                  <figure key={item.id ?? `${item.url}-${index}`} className="overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/60">
                    <img src={item.url} alt={item.caption ?? awardee.name} className="h-40 w-full object-cover" />
                    {item.caption && (
                      <figcaption className="px-4 py-3 text-sm text-zinc-400">{item.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}

          {socialEntries.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-white">Connect</h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {socialEntries.map(([key, value]) => {
                  const Icon = socialIconMap[key] ?? Globe
                  const label = fallbackSocialLabel[key] ?? key
                  return (
                    <Button
                      key={key}
                      asChild
                      variant="outline"
                      className="border-orange-400/40 text-orange-200 hover:bg-orange-500/10"
                    >
                      <Link href={value} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                  )
                })}
              </div>
            </section>
          )}

          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
            <div>
              <p>Last updated: {awardee.updated_at ? new Date(awardee.updated_at).toLocaleString() : 'Recently'}</p>
              <p className="mt-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {awardee.location ?? awardee.country ?? 'Location forthcoming'}
              </p>
            </div>
            <Button asChild variant="ghost" className="text-orange-300 hover:text-orange-200">
              <Link href="/awardees">Back to directory</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
