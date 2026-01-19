'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Award, GraduationCap, MapPin, Users, ArrowRight, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Awardee } from '@/lib/awardees-shared'
import { normalizeAwardeeEntry } from '@/lib/awardees-shared'
import { supabase } from '@/lib/supabase/client'
import { AvatarSVG } from '@/lib/avatars'
import type { AwardeeDirectoryEntry } from '@/types/profile'

const itemsPerPage = 18

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
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(2025)

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
    let result = people

    // Filter by year
    if (selectedYear !== 'all') {
      result = result.filter(a => {
        if (!a.year) return false;
        return Number(a.year) === Number(selectedYear);
      })
    }

    if (!searchTerm) return result

    const term = searchTerm.toLowerCase()
    return result.filter((awardee) => {
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
  }, [people, searchTerm, selectedYear])

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
            removeAwardeeBySlug((payload.old as any)?.slug ?? null, null)
            return
          }
          const entry = await fetchLatestEntry({
            slug: (payload.new as any)?.slug ?? (payload.old as any)?.slug,
            profileId: (payload.new as any)?.id ?? (payload.old as any)?.id,
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
            removeAwardeeBySlug((payload.old as any)?.slug ?? null, (payload.old as any)?.id ?? null)
            return
          }
          const entry = await fetchLatestEntry({
            slug: (payload.new as any)?.slug ?? (payload.old as any)?.slug,
            awardeeId: (payload.new as any)?.id ?? (payload.old as any)?.id,
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
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
            {selectedYear === 'all' ? 'All Africa Future Leaders' : `Top 100 Africa Future Leaders ${selectedYear}`}
          </h1>
          <p className="text-xl sm:text-2xl text-zinc-400 max-w-3xl mx-auto text-balance">
            Discover Africa's emerging leaders, innovators, and community builders.
          </p>
        </header>

        <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
              <input
                type="text"
                placeholder="Search by name, country, field..."
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 backdrop-blur-sm pl-10 pr-12 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all shadow-xl"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-9 w-9 rounded-xl transition-all",
                        selectedYear !== 'all' ? "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20" : "text-zinc-500 hover:bg-zinc-800"
                      )}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-zinc-900 border-zinc-800 text-zinc-300 rounded-2xl p-2 shadow-2xl">
                    <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Select Cohort</div>
                    <DropdownMenuItem
                      onClick={() => setSelectedYear('all')}
                      className={cn("rounded-xl cursor-pointer", selectedYear === 'all' && "bg-orange-500/10 text-orange-500 font-bold")}
                    >
                      View All Years
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedYear(2025)}
                      className={cn("rounded-xl cursor-pointer", selectedYear === 2025 && "bg-orange-500/10 text-orange-500 font-bold")}
                    >
                      2025 Cohort
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedYear(2024)}
                      className={cn("rounded-xl cursor-pointer", selectedYear === 2024 && "bg-orange-500/10 text-orange-500 font-bold")}
                    >
                      2024 Cohort
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          <div className="flex items-center text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Showing {currentPeople.length} Leaders
          </div>
        </div>

        {filteredPeople.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-700 bg-black/40 p-12 text-center text-zinc-400">
            No awardees match your search yet. Try a different phrase.
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
            {currentPeople.map((person) => {
              const displayTagline =
                person.tagline && person.tagline.trim().length > 0
                  ? person.tagline
                  : person.headline && person.headline.trim().length > 0
                    ? person.headline
                    : person.field_of_study || person.course || ''

              return (
                <Link key={person.slug} href={`/awardees/${person.slug}`} className="group block">
                  <div className="bg-white rounded-xl border border-zinc-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full active:scale-95">
                    {/* Image container */}
                    <div className="w-full aspect-square overflow-hidden bg-zinc-50 relative">
                      {(person.cover_image_url || person.avatar_url) ? (
                        <img
                          src={person.cover_image_url || person.avatar_url || ''}
                          alt={person.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-50 to-zinc-100 flex items-center justify-center">
                          <AvatarSVG name={person.name} size={24} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                    </div>

                    {/* Content area */}
                    <div className="p-2 sm:p-3 flex flex-col flex-grow">
                      <div className="flex-grow space-y-1">
                        <h3 className="text-[0.7rem] sm:text-xs font-bold text-zinc-900 group-hover:text-orange-600 transition-colors line-clamp-1 leading-tight">
                          {person.name}
                        </h3>

                        {displayTagline && (
                          <p className="text-[0.55rem] sm:text-[0.65rem] text-zinc-500 line-clamp-1 font-medium">
                            {displayTagline}
                          </p>
                        )}

                        {person.cgpa && (
                          <div className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[0.5rem] sm:text-[0.6rem] font-bold">
                            {person.cgpa}
                          </div>
                        )}
                      </div>

                      <div className="mt-1.5 pt-1.5 border-t border-zinc-100 flex items-center justify-between">
                        {person.country && (
                          <div className="flex items-center gap-0.5 text-[0.5rem] sm:text-[0.6rem] text-zinc-400 font-bold">
                            <MapPin className="h-2 w-2" />
                            <span>{person.country}</span>
                          </div>
                        )}
                        <ArrowRight className="h-2 w-2 text-zinc-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-t border-zinc-900">
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest order-2 sm:order-1">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-3 order-1 sm:order-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="h-10 px-6 rounded-xl border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-900/50 transition-all font-bold"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updatePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="h-10 px-6 rounded-xl border-zinc-800 bg-zinc-900/50 text-white hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-30 disabled:hover:bg-zinc-900/50 transition-all font-bold"
              >
                Next
              </Button>
            </div>

            <div className="hidden sm:block w-32 order-3" />
          </div>
        )}
      </div>
    </div>
  )
}
