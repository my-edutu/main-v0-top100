'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from '@/components/safe-image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Search, Shuffle, ArrowUpRight, Globe2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'

import type { Awardee } from '@/lib/awardees-shared'
import { normalizeAwardeeEntry } from '@/lib/awardees-shared'
import { countryKey, getDiscoverySummary, hasProfilePhoto, shufflePeople } from '@/lib/awardee-discovery'
import './awardees.css'
import { supabase } from '@/lib/supabase/client'
import { AvatarSVG } from '@/lib/avatars'
import type { AwardeeDirectoryEntry } from '@/types/profile'

const itemsPerPage = 18
const hasLiveSupabaseKey =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ'))

type AwardeesPageProps = {
  initialPeople: Awardee[]
  initialSearchParams?: {
    page?: string
    search?: string
    year?: string
    country?: string
  }
}

const parseYearParam = (year?: string | null): number | 'all' => {
  if (year === 'all') return 'all'
  if (!year) return 2025
  const parsed = Number.parseInt(year, 10)
  return [2024, 2025, 2026].includes(parsed) ? parsed : 2025
}



export default function AwardeesPageClient({ initialPeople, initialSearchParams }: AwardeesPageProps) {
  const [people, setPeople] = useState<Awardee[]>(() =>
    [...initialPeople],
  )
  const [searchTerm, setSearchTerm] = useState(initialSearchParams?.search ?? '')

  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set())

  // Randomize only after hydration so server and client markup agree.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPeople(previous => shufflePeople(previous)))
    return () => cancelAnimationFrame(frame)
  }, [])

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const currentPageFromUrl = Number(searchParams.get('page')) || 1

  const searchValue = searchParams.get('search') || ''
  const selectedYear = parseYearParam(searchParams.get('year'))
  const selectedCountry = countryKey(searchParams.get('country'))

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

  const updateYear = useCallback(
    (year: number | 'all') => {
      const params = createQueryParams()
      params.delete('page')
      params.delete('country')

      if (year === 'all') {
        params.set('year', 'all')
      } else {
        params.set('year', year.toString())
      }

      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [createQueryParams, pathname, router],
  )

  const updateSearch = (value: string) => {
    setSearchTerm(value)
    const params = createQueryParams()
    params.delete('page')
    if (value) params.set('search', value)
    else params.delete('search')
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false })
  }

  const cohortPeople = useMemo(() => selectedYear === 'all'
    ? people
    : people.filter(person => Number(person.year) === selectedYear), [people, selectedYear])
  const summary = useMemo(() => getDiscoverySummary(cohortPeople), [cohortPeople])
  const highlights = useMemo(() => cohortPeople.filter(person => hasProfilePhoto(person) && !failedPhotos.has(person.slug)).slice(0, 3), [cohortPeople, failedPhotos])

  const updateCountry = (country: string) => {
    const params = createQueryParams()
    params.delete('page')
    if (country) params.set('country', country)
    else params.delete('country')
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false })
  }
  const shuffleDirectory = () => {
    setPeople(previous => shufflePeople(previous))
    updatePage(1)
  }
  const resetFilters = () => {
    setSearchTerm('')
    const params = createQueryParams()
    params.delete('search')
    params.delete('country')
    params.delete('page')
    router.replace(`${pathname}${params.size ? `?${params}` : ''}`, { scroll: false })
  }

  const filteredPeople = useMemo(() => {
    let result = cohortPeople
    if (selectedCountry) result = result.filter(person => countryKey(person.country) === selectedCountry)

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
  }, [cohortPeople, searchTerm, selectedCountry])

  const totalItems = filteredPeople.length
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))
  const currentPage = Math.max(1, Math.min(Math.floor(currentPageFromUrl), totalPages))
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

      const clone = [...prev]
      clone.splice(Math.floor(Math.random() * (clone.length + 1)), 0, entry)
      return clone
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
    if (!hasLiveSupabaseKey) {
      return
    }

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
  }, [fetchLatestEntry, removeAwardeeBySlug, upsertAwardee, hasLiveSupabaseKey])

  return (
    <div className="leaders-discovery">
      <div className="leaders-container">
        <section className="discovery-bento" aria-label="Discover Africa Future Leaders">
          <header className="discovery-intro">
            <span className="discovery-eyebrow"><span /> THE AFRICA FUTURE LEADERS DIRECTORY</span>
            <h1>A continent of talent.<br /><span>A future full of possibility.</span></h1>
            <p>Meet the emerging leaders, innovators, and community builders shaping Africa&apos;s next chapter.</p>
            <div className="intro-actions">
              <a href="#leader-directory" className="discovery-primary">Explore the leaders <ArrowUpRight size={19} /></a>
              <span className="intro-cohort">{selectedYear === 'all' ? 'Every cohort. One community.' : `The ${selectedYear} cohort`}</span>
            </div>
          </header>

          {highlights.length > 0 && (
            <div className="discovery-spotlight">
              <div className="spotlight-heading"><span>IN THE SPOTLIGHT</span><button onClick={shuffleDirectory} aria-label="Discover different featured leaders"><Shuffle size={18} /></button></div>
              <div className="spotlight-portraits">
                {highlights.map((person, index) => (
                  <Link href={`/awardees/${person.slug}`} key={person.slug} className={cn('spotlight-person', index === 0 && 'spotlight-person-main')}>
                    <Image src={person.avatar_url!.trim()} alt={person.name} fill loading="eager" sizes="(max-width: 767px) 55vw, 320px" className="spotlight-image" onError={() => setFailedPhotos(previous => new Set([...previous, person.slug]))} />
                    <div className="spotlight-caption"><span>{person.country?.trim() || 'Africa Future Leader'}</span><h2>{person.name}</h2><ArrowUpRight size={20} /></div>
                  </Link>
                ))}
              </div>
              <p>New faces. Shared ambition. Discover someone inspiring.</p>
            </div>
          )}

          <div className="discovery-stats" aria-label="Selected cohort statistics">
            <div><strong>{summary.leaders.toLocaleString()}</strong><span>Leaders in {selectedYear === 'all' ? 'the directory' : selectedYear}</span></div>
            <div><strong>{summary.countries.length.toLocaleString()}</strong><span>Countries represented</span></div>
            <div><strong>{summary.cohorts.toLocaleString()}</strong><span>{summary.cohorts === 1 ? 'Cohort' : 'Cohorts'} to discover</span></div>
          </div>
          <div className="discovery-countries">
            <div className="countries-heading"><Globe2 size={21} /><h2>Across borders. Beyond expectations.</h2></div>
            <div className="country-chips">
              {summary.countries.slice(0, 5).map(country => <button key={country.key} onClick={() => { updateCountry(country.key); document.getElementById('leader-directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={cn(selectedCountry === country.key && 'is-selected')}>{country.name}<span>{country.count}</span></button>)}
              {summary.countries.length === 0 && <p>Country details will appear as profiles are completed.</p>}
              {summary.countries.length > 5 && <a href="#leader-directory">+{summary.countries.length - 5} more <ArrowRight size={14} /></a>}
            </div>
          </div>
        </section>

        <section id="leader-directory" className="leader-directory" aria-labelledby="directory-heading">
          <div className="directory-title-row">
            <div><span className="discovery-eyebrow">PEOPLE MAKING A DIFFERENCE</span><h2 id="directory-heading">Meet the future leaders<span>.</span></h2></div>
            <button className="shuffle-button" onClick={shuffleDirectory}><Shuffle size={17} /> Shuffle leaders</button>
          </div>
          <div className="directory-toolbar">
            <div className="directory-search"><Search size={20} /><label htmlFor="awardee-search" className="sr-only">Search leaders by name, country, or field</label><input id="awardee-search" type="search" placeholder="Find a name, country, or field…" value={searchTerm} onChange={event => updateSearch(event.target.value)} /></div>
            <div className="directory-select"><label htmlFor="cohort-filter">Cohort</label><select id="cohort-filter" value={selectedYear} onChange={event => updateYear(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">All years</option><option value="2026">2026</option><option value="2025">2025</option><option value="2024">2024</option></select></div>
            <div className="directory-select"><label htmlFor="country-filter">Country</label><select id="country-filter" value={selectedCountry} onChange={event => updateCountry(event.target.value)}><option value="">All countries</option>{summary.countries.map(country => <option value={country.key} key={country.key}>{country.name} ({country.count})</option>)}</select></div>
          </div>
          <div className="directory-results"><p role="status">{totalItems > 0 ? `${startIndex + 1}–${Math.min(startIndex + itemsPerPage, totalItems)} of ${totalItems} leaders` : '0 leaders'}<span> · A fresh mix of perspectives</span></p>{(searchTerm || selectedCountry) && <button onClick={resetFilters}>Clear filters</button>}</div>

          {filteredPeople.length === 0 ? (
            <div className="directory-empty"><Search size={28} /><h3>No leaders found</h3><p>Try another name, country, field, or cohort.</p>{(searchTerm || selectedCountry) && <button onClick={resetFilters}>Clear filters <ArrowRight size={16} /></button>}</div>
          ) : (
            <div className="leaders-grid">
              {currentPeople.map(person => {
                const tagline = person.tagline?.trim() || person.headline?.trim() || person.field_of_study || person.course
                const photo = hasProfilePhoto(person) && !failedPhotos.has(person.slug)
                return (
                  <Link key={person.slug} href={`/awardees/${person.slug}`} className={cn('leader-card', !photo && 'leader-card-no-photo')}>
                    <div className="leader-card-portrait">
                      {photo ? <Image src={person.avatar_url!.trim()} alt={person.name} fill sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 280px" className="leader-photo" onError={() => setFailedPhotos(previous => new Set([...previous, person.slug]))} /> : <div className="leader-initials"><AvatarSVG name={person.name} size={72} /></div>}
                      <span className="leader-year">{person.year || 'AFL'}</span>
                    </div>
                    <div className="leader-card-content"><h3>{person.name}</h3>{tagline && <p className="leader-tagline">{tagline}</p>}<div className="leader-card-footer"><span><MapPin size={13} />{summary.countries.find(country => country.key === countryKey(person.country))?.name || 'Africa Future Leader'}</span><ArrowUpRight size={18} /></div></div>
                  </Link>
                )
              })}
            </div>
          )}
          {totalPages > 1 && <nav className="directory-pagination" aria-label="Directory pagination"><p>Page {currentPage} of {totalPages}</p><div><button onClick={() => updatePage(currentPage - 1)} disabled={currentPage <= 1}>Previous</button><button onClick={() => updatePage(currentPage + 1)} disabled={currentPage >= totalPages}>Next <ArrowRight size={16} /></button></div></nav>}
        </section>
      </div>
    </div>
  )
}
