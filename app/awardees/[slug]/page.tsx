import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Calendar, ExternalLink, Globe, Instagram, Linkedin, Mail, MapPin, PenSquare, Trophy, Twitter, Users2, Youtube, GraduationCap, ArrowLeft } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { normalizeAwardeeEntry } from '@/lib/awardees'
import { fetchAwardeeBySlug } from '@/lib/dashboard/profile-service'
import { AvatarSVG, flagEmoji } from '@/lib/avatars'
import type { Achievement, GalleryItem, SocialLinks } from '@/types/profile'
import ContactCardClient from './ContactCardClient'

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

  // Fetch random other awardees for suggestions
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = createClient(true)
  const { data: otherAwardees } = await supabase
    .from('awardee_directory')
    .select('slug, name, avatar_url, cover_image_url, headline, country')
    .neq('slug', params.slug)
    .eq('is_public', true)
    .limit(20)

  // Randomly select 3 from the fetched awardees
  const randomAwardees = otherAwardees
    ? otherAwardees
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-orange-50 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      {/* Hero Section with Full-Width Image */}
      <div className="relative h-[500px] w-full overflow-hidden">
        {awardee.cover_image_url || awardee.avatar_url ? (
          <>
            <img
              src={awardee.cover_image_url || awardee.avatar_url || ''}
              alt={`${awardee.name}`}
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 dark:from-black/95 dark:via-black/60 dark:to-black/30" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600">
            <div className="flex h-full items-center justify-center">
              <AvatarSVG name={awardee.name} size={200} />
            </div>
          </div>
        )}

        {/* Back Button - Positioned on the gradient */}
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-zinc-900 shadow-lg border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition-all duration-300 group hover:shadow-xl hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="h-4 w-4 text-zinc-700 dark:text-zinc-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors" />
            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">back</span>
          </Link>
        </div>

        {/* Hero Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="container mx-auto max-w-6xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
              {awardee.name}
            </h1>
            {heroSubtitle && (
              <p className="text-lg md:text-xl text-white/90 max-w-2xl drop-shadow-lg">
                {heroSubtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto max-w-6xl px-4 py-12">

        {/* Quick Info Cards */}
        <div className="grid grid-cols-2 gap-4 mb-12 -mt-8 relative z-10">
          {awardee.cgpa && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                  <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{awardee.cgpa} CGPA</p>
                </div>
              </div>
            </div>
          )}
          {awardee.country && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-500/20 rounded-xl">
                  <MapPin className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">{awardee.country}</p>
                </div>
              </div>
            </div>
          )}
          {awardee.current_school && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                  <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white break-words leading-tight">{awardee.current_school}</p>
                </div>
              </div>
            </div>
          )}
          {awardee.year && (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-xl border border-zinc-200 dark:border-zinc-800 hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                  <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white">Class of {awardee.year}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Impact Metrics Row */}
        {(awardee.impact_projects || awardee.lives_impacted || awardee.awards_received) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {awardee.impact_projects && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                    <Trophy className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Projects</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{awardee.impact_projects}</p>
                  </div>
                </div>
              </div>
            )}
            {awardee.lives_impacted && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                    <Users2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Lives Impacted</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{awardee.lives_impacted}</p>
                  </div>
                </div>
              </div>
            )}
            {awardee.awards_received && (
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                    <Trophy className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Awards</p>
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{awardee.awards_received}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2 space-y-8">
            {/* Biography Section */}
            {awardee.bio && (
              <section className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                  About
                </h2>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line text-base">
                  {awardee.bio}
                </p>
              </section>
            )}

            {/* Focus Areas */}
            {awardee.interests && awardee.interests.length > 0 && (
              <section className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                  Focus Areas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {awardee.interests.map((interest) => (
                    <Badge
                      key={interest}
                      className="bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-500/20 dark:to-amber-500/20 text-orange-800 dark:text-orange-300 border-0 px-4 py-2 text-sm hover:from-orange-200 hover:to-amber-200 dark:hover:from-orange-500/30 dark:hover:to-amber-500/30 transition-all"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </section>
            )}

            {/* Achievements Section */}
            {hasAchievements(achievements) && (
              <section className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                    Achievements
                  </h2>
                  <Badge className="bg-orange-100 dark:bg-orange-500/20 text-orange-800 dark:text-orange-300 border-0">
                    {achievements.length} {achievements.length > 1 ? 'highlights' : 'highlight'}
                  </Badge>
                </div>
                <div className="space-y-4">
                  {achievements.map((achievement, index) => (
                    <div
                      key={achievement.id ?? `${achievement.title}-${index}`}
                      className="p-5 rounded-2xl bg-gradient-to-br from-zinc-50 to-orange-50/30 dark:from-zinc-800/50 dark:to-orange-900/10 border border-zinc-200 dark:border-zinc-700 hover:shadow-md transition-all group"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
                              <Trophy className="h-4 w-4 text-white" />
                            </div>
                            <h3 className="font-semibold text-zinc-900 dark:text-white">{achievement.title}</h3>
                          </div>
                          {achievement.organization && (
                            <p className="text-sm text-zinc-600 dark:text-zinc-400">{achievement.organization}</p>
                          )}
                        </div>
                        {achievement.recognition_date && (
                          <Badge variant="outline" className="text-xs border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                            {achievement.recognition_date}
                          </Badge>
                        )}
                      </div>
                      {achievement.description && (
                        <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-400">{achievement.description}</p>
                      )}
                      {achievement.link && (
                        <Button asChild variant="link" className="mt-2 h-auto p-0 text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
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

            {/* Gallery Section */}
            {hasGallery(gallery) && (
              <section className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                  Gallery
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {gallery.map((item, index) => (
                    <figure
                      key={item.id ?? `${item.url}-${index}`}
                      className="group overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-all"
                    >
                      <div className="relative overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.caption ?? awardee.name}
                          className="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      {item.caption && (
                        <figcaption className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50">
                          {item.caption}
                        </figcaption>
                      )}
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {/* YouTube Video Section */}
            {awardee.youtube_video_url && (
              <section className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6 flex items-center gap-2">
                  <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full"></div>
                  Featured Interview
                </h2>
                <div className="aspect-video rounded-2xl overflow-hidden shadow-md">
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
          </div>

          {/* Sidebar - Right Side */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Card */}
            {(awardee.email || awardee.personal_email) && (
              <ContactCardClient 
                email={awardee.email} 
                personalEmail={awardee.personal_email} 
                name={awardee.name} 
              />
            )}

            {/* Social Links Card */}
            {socialEntries.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-4">Connect</h3>
                <div className="space-y-2">
                  {socialEntries.map(([key, value]) => {
                    const Icon = socialIconMap[key] ?? Globe
                    const label = fallbackSocialLabel[key] ?? key
                    return (
                      <Button
                        key={key}
                        asChild
                        variant="outline"
                        className="w-full justify-start border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 dark:hover:border-orange-600 transition-all"
                      >
                        <Link href={value} target="_blank" rel="noopener noreferrer">
                          <Icon className="h-4 w-4" />
                          <span className="flex-1">{label}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </Button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mentor Card */}
            {awardee.mentor && (
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                  <Users2 className="h-5 w-5" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide">Mentor</h3>
                </div>
                <p className="text-zinc-900 dark:text-white font-medium">{awardee.mentor}</p>
              </div>
            )}
          </div>
        </div>



        {/* Footer Info */}
        {awardee.location && (
          <div className="mt-12 p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg">
            <div className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
              <p className="flex items-center gap-2 justify-center">
                <MapPin className="h-4 w-4" />
                {awardee.location}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
