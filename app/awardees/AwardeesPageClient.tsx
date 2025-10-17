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
import { AvatarSVG, flagEmoji } from '@/lib/avatars'
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

const findCountry = (country?: string | null) => {
  if (!country) return 'Unknown'
  return country
}

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
            Discover Africa's emerging leaders, innovators, and community builders shaping the future.
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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {currentPeople.map((person) => {
              const trimmedCohort = person.cohort?.trim() ?? ''
              const spotlightLabel =
                trimmedCohort.length > 0
                  ? trimmedCohort
                  : `Top100 Africa Future Leader ${person.year ?? new Date().getFullYear()}`
              const supportingLine =
                person.tagline && person.tagline.trim().length > 0
                  ? person.tagline
                  : person.headline && person.headline.trim().length > 0
                  ? person.headline
                  : 'Amplifying African excellence with purpose and impact.'

              return (
                <Link key={person.slug} href={`/awardees/${person.slug}`} className="group">
                  <div className="flex h-full flex-col rounded-2xl border border-orange-400/10 bg-black/60 p-6 transition-all duration-300 group-hover:border-orange-400/50 group-hover:bg-black/80">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 border border-orange-400/20 text-white">
                        {person.avatar_url ? (
                          <AvatarImage src={person.avatar_url} alt={person.name} />
                        ) : (
                          <AvatarFallback className="bg-orange-500/10 text-white">
                            {fallbackAvatar(person.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">Meet {person.name}</h3>
                          <Badge variant="outline" className="border-orange-400/50 text-orange-200">
                            {spotlightLabel}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-orange-200">{supportingLine}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3 text-sm text-zinc-300">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-orange-200">
                          <MapPin className="h-3 w-3" />
                          {flagEmoji(person.country ?? '')}
                          {findCountry(person.country)}
                        </span>
                        {(person.current_school || person.field_of_study) && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/60 px-3 py-1 text-zinc-300">
                            <GraduationCap className="h-3 w-3" />
                            {person.current_school || person.field_of_study}
                          </span>
                        )}
                      </div>
                      {person.bio && (
                        <p className="text-sm text-zinc-400">{formatExcerpt(person.bio)}</p>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1">
                        <Award className="h-3 w-3" />
                        {countAchievements(person.achievements)} achievements
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1">
                        <Users className="h-3 w-3" />
                        {person.interests?.length ?? 0} interests
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {pickInterests(person.interests).map((interest) => (
                        <Badge key={interest} variant="outline" className="border-zinc-700 text-zinc-300">
                          {interest}
                        </Badge>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between text-sm">
                      <span className="text-zinc-500">Tap to explore full profile</span>
                      <Button variant="ghost" className="text-orange-300" size="sm">
                        View profile →
                      </Button>
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
