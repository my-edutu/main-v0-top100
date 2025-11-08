'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Award, GraduationCap, MapPin, Users } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Awardee } from '@/lib/awardees'
import { normalizeAwardeeEntry } from '@/lib/awardees'
import { supabase } from '@/lib/supabase/client'
import { AvatarSVG } from '@/lib/avatars'
import type { AwardeeDirectoryEntry } from '@/types/profile'

const itemsPerPage = 30

const formatExcerpt = (input?: string | null, length = 160) => {
  if (!input) return ''
  if (input.length <= length) return input
  return `${input.slice(0, length)}...`
}

const countAchievements = (achievements?: any[] | null) => achievements?.length ?? 0

const pickInterests = (interests?: string[] | null, limit = 3) =>
  interests && interests.length > 0 ? interests.slice(0, limit) : []

type AwardeesPageProps = {
  initialPeople: Awardee[]
  initialSearchParams?: {
    page?: string
    search?: string
  }
}

const fallbackAvatar = (name: string) => (
  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/10">
    <AvatarSVG name={name} size={40} />
  </div>
)



export default function AwardeesPageClient({ initialPeople, initialSearchParams }: AwardeesPageProps) {
  const [people, setPeople] = useState<Awardee[]>(() =>
    [...initialPeople].sort((a, b) => a.name.localeCompare(b.name)),
  )
  const [searchTerm, setSearchTerm] = useState(initialSearchParams?.search ?? '')

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentPageFromUrl = Number(searchParams.get('page')) || 1

  const searchValue = searchParams.get('search') || ''

  useEffect(() => {
    setSearchTerm(searchValue)
  }, [searchValue])

  const updatePage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (newPage <= 1) {
        params.delete('page')
      } else {
        params.set('page', newPage.toString())
      }
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  const createQueryParams = useCallback(() => {
    return new URLSearchParams(Array.from(searchParams.entries()))
  }, [searchParams])

  useEffect(() => {
    const params = createQueryParams()
    if (searchTerm) {
      params.set('search', searchTerm)
      params.delete('page')
    } else {
      params.delete('search')
    }
    const query = params.toString()
    const target = query ? `${pathname}?${query}` : pathname
    const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    if (target !== current) {
      router.replace(target, { scroll: false })
    }
  }, [createQueryParams, pathname, router, searchParams, searchTerm])

  const filteredPeople = useMemo(() => {
    if (!searchTerm) return people
    const term = searchTerm.toLowerCase()
    return people.filter((awardee) => {
      const haystack = [
        awardee.name,
        awardee.country ?? '',
        awardee.course ?? '',
        awardee.headline ?? '',
        awardee.tagline ?? '',
        awardee.bio ?? '',
        awardee.cohort ?? '',
        awardee.current_school ?? '',
        awardee.field_of_study ?? '',
        awardee.interests?.join(' ') ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })
  }, [people, searchTerm])

  const totalItems = filteredPeople.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const currentPage = Math.min(currentPageFromUrl, totalPages)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentPeople = filteredPeople.slice(startIndex, startIndex + itemsPerPage)

  const upsertAwardee = useCallback((entry: Awardee) => {
    setPeople((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.slug === entry.slug || item.awardee_id === entry.awardee_id,
      )

      if (!entry.is_public) {
        if (existingIndex === -1) return prev
        const clone = [...prev]
        clone.splice(existingIndex, 1)
        return clone
      }

      if (existingIndex >= 0) {
        const clone = [...prev]
        clone[existingIndex] = { ...clone[existingIndex], ...entry }
        return clone
      }

      return [...prev, entry].sort((a, b) => a.name.localeCompare(b.name))
    })
  }, [])

  const removeAwardeeBySlug = useCallback((slug?: string | null, awardeeId?: string | null) => {
    if (!slug && !awardeeId) return
    setPeople((prev) =>
      prev.filter((item) => {
        if (slug && item.slug === slug) return false
        if (awardeeId && item.awardee_id === awardeeId) return false
        return true
      }),
    )
  }, [])

  const fetchLatestEntry = useCallback(async (filters: {
    slug?: string | null
    profileId?: string | null
    awardeeId?: string | null
  }) => {
    let query = supabase.from('awardee_directory').select('*').limit(1)
    if (filters.slug) {
      query = query.eq('slug', filters.slug)
    } else if (filters.profileId) {
      query = query.eq('profile_id', filters.profileId)
    } else if (filters.awardeeId) {
      query = query.eq('awardee_id', filters.awardeeId)
    }

    const { data, error } = await query.maybeSingle()
    if (error) {
      console.error('Realtime awardee refresh failed', error)
      return null
    }
    if (!data) return null
    return normalizeAwardeeEntry(data as AwardeeDirectoryEntry)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('awardee-directory-stream')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            removeAwardeeBySlug(payload.old?.slug ?? null, null)
            return
          }
          const entry = await fetchLatestEntry({
            slug: payload.new?.slug ?? payload.old?.slug,
            profileId: payload.new?.id ?? payload.old?.id,
          })
          if (entry) {
            upsertAwardee(entry)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'awardees' },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            removeAwardeeBySlug(payload.old?.slug ?? null, payload.old?.id ?? null)
            return
          }
          const entry = await fetchLatestEntry({
            slug: payload.new?.slug ?? payload.old?.slug,
            awardeeId: payload.new?.id ?? payload.old?.id,
          })
          if (entry) {
            upsertAwardee(entry)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchLatestEntry, removeAwardeeBySlug, upsertAwardee])

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        <header className="mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            Meet the Awardees
          </h1>
          <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Discover Africa's emerging leaders, innovators, and community builders.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by name, country, field, or interest"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="flex items-center text-sm text-zinc-400">
            Showing {currentPeople.length} of {filteredPeople.length} awardees
          </div>
        </div>

        {filteredPeople.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-black/40 p-12 text-center text-zinc-400">
            No awardees match your search yet. Try a different phrase.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {currentPeople.map((person) => {
              const displayTagline =
                person.tagline && person.tagline.trim().length > 0
                  ? person.tagline
                  : person.headline && person.headline.trim().length > 0
                  ? person.headline
                  : person.field_of_study || person.course || ''

              return (
                <Link key={person.slug} href={`/awardees/${person.slug}`} className="group">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-900 transition-all duration-300 ease-out group-hover:scale-105 group-hover:z-10">
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900" />

                    {/* Cover image if available */}
                    {person.cover_image_url && (
                      <div className="absolute inset-0">
                        <img
                          src={person.cover_image_url}
                          alt={person.name}
                          className="h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-60"
                        />
                      </div>
                    )}

                    {/* Content overlay */}
                    <div className="absolute inset-0 flex flex-col justify-end p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
                      <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">
                        {person.name}
                      </h3>

                      {displayTagline && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mb-2">
                          {displayTagline}
                        </p>
                      )}

                      <div className="flex flex-col gap-1 text-xs text-zinc-500">
                        {person.country && (
                          <span className="line-clamp-1">
                            {person.country}
                          </span>
                        )}
                      </div>

                      {/* Hover state - show more info */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-2 pt-2 border-t border-zinc-700">
                        {person.bio && (
                          <p className="text-xs text-zinc-400 line-clamp-3 mb-2">
                            {person.bio}
                          </p>
                        )}
                        {person.interests && person.interests.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {pickInterests(person.interests, 2).map((interest) => (
                              <span key={interest} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">
                                {interest}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between text-sm text-zinc-400">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updatePage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="border-zinc-700 text-white hover:border-orange-400 hover:text-orange-300"
          >
            Previous
          </Button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updatePage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="border-zinc-700 text-white hover:border-orange-400 hover:text-orange-300"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
