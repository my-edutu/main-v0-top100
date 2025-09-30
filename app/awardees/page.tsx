'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { AwardeeCard } from '@/app/components/AwardeeCard'
import { FiltersBar } from '@/app/components/FiltersBar'
import { Button } from '@/components/ui/button'
import awardees from '../../../content/data/awardees.json'

// Interface
interface Awardee {
  id: string
  name: string
  country: string
  category: string
  year: number
  bio30?: string
  photo_url?: string
  featured?: boolean
}

const typedAwardees: Awardee[] = awardees

// Types
type SortKey = 'name' | 'country' | 'category'

function filterAwardees(
  awardees: Awardee[],
  search: string,
  selectedCountries: string[],
  selectedCategories: string[],
  selectedYear: number | null
) {
  return awardees.filter((awardee: Awardee) => {
    // Search filter
    const matchesSearch = !search || 
      awardee.name.toLowerCase().includes(search.toLowerCase()) ||
      (awardee.bio30 && awardee.bio30.toLowerCase().includes(search.toLowerCase()))

    // Country filter
    const matchesCountry = selectedCountries.length === 0 || selectedCountries.includes(awardee.country)

    // Category filter
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(awardee.category)

    // Year filter
    const matchesYear = !selectedYear || awardee.year === selectedYear

    return matchesSearch && matchesCountry && matchesCategory && matchesYear
  })
}

function sortAwardees(awardees: Awardee[], sortBy: SortKey) {
  return [...awardees].sort((a: Awardee, b: Awardee) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'country':
        return a.country.localeCompare(b.country)
      case 'category':
        return a.category.localeCompare(b.category)
      default:
        return 0
    }
  })
}

function getUniqueOptions(awardees: Awardee[], key: keyof Pick<Awardee, 'country' | 'category'>) {
  const options = [...new Set(awardees.map((a: Awardee) => a[key]))] as string[]
  return options.map((value) => ({ value, label: value }))
}

export default function AwardeesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Read initial from URL
  const initialSearch = searchParams.get('search') || ''
  const initialPage = parseInt(searchParams.get('page') || '1', 10)
  const initialCountries = searchParams.get('countries') ? searchParams.get('countries')!.split(',') : []
  const initialCategories = searchParams.get('categories') ? searchParams.get('categories')!.split(',') : []
  const initialYear = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : null
  const initialSort = searchParams.get('sort') || 'name'

  // State
  const [search, setSearch] = useState(initialSearch)
  const [page, setPage] = useState(initialPage)
  const [selectedCountries, setSelectedCountries] = useState<string[]>(initialCountries)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialCategories)
  const [selectedYear, setSelectedYear] = useState<number | null>(initialYear)
  const [selectedSort, setSelectedSort] = useState<string>(initialSort)
  const [loading, setLoading] = useState(true)

  // Sync state with URL changes
  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setPage(parseInt(searchParams.get('page') || '1', 10))
    setSelectedCountries(searchParams.get('countries') ? searchParams.get('countries')!.split(',') : [])
    setSelectedCategories(searchParams.get('categories') ? searchParams.get('categories')!.split(',') : [])
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : null
    setSelectedYear(year)
    setSelectedSort(searchParams.get('sort') || 'name')
  }, [searchParams])

  // Get unique options
  const availableCountries = useMemo(() => 
    getUniqueOptions(typedAwardees, 'country'), []
  )
  const availableCategories = useMemo(() => 
    getUniqueOptions(typedAwardees, 'category'), []
  )

  // Available years
  const availableYears = useMemo(() => {
    const years = [...new Set(typedAwardees.map((a: Awardee) => a.year))].sort((a, b) => b - a)
    return years
  }, [])

  // Default year
  const defaultYear = availableYears[0] || null
  useEffect(() => {
    if (selectedYear === null && defaultYear !== null) {
      setSelectedYear(defaultYear)
    }
  }, [defaultYear, selectedYear])

  // Filter and sort
  const filteredAwardees = useMemo(() => {
    let result = filterAwardees(typedAwardees, search, selectedCountries, selectedCategories, selectedYear)
    result = sortAwardees(result, selectedSort as SortKey)
    return result
  }, [search, selectedCountries, selectedCategories, selectedYear, selectedSort, typedAwardees])

  const total = filteredAwardees.length
  const pageSize = 24
  const totalPages = Math.ceil(total / pageSize)
  const startIdx = (page - 1) * pageSize
  const endIdx = startIdx + pageSize
  const paginatedAwardees = filteredAwardees.slice(startIdx, endIdx)
  const showing = Math.min(endIdx, total)

  // Update URL on filter changes (excluding page)
  useEffect(() => {
    const params = new URLSearchParams()

    if (search) params.set('search', search)
    if (selectedCountries.length > 0) params.set('countries', selectedCountries.join(','))
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','))
    if (selectedYear && selectedYear !== defaultYear) params.set('year', selectedYear.toString())
    if (selectedSort !== 'name') params.set('sort', selectedSort)
    // Do not set page here, let it reset to 1 implicitly by not including it, but since push without page, it may keep, but to reset:
    // If filters changed, reset page to 1
    if (page !== 1) {
      params.set('page', '1')
      setPage(1)
    }

    if (params.toString()) {
      router.replace(`?${params.toString()}`, { scroll: false })
    } else {
      router.replace('/awardees', { scroll: false })
    }
  }, [search, selectedCountries, selectedCategories, selectedYear, selectedSort, router, defaultYear, page])

  // Handle page change
  const updatePage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return
    setPage(newPage)
    const params = new URLSearchParams(searchParams)
    params.set('page', newPage.toString())
    router.push(`?${params.toString()}`)
  }

  // Loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="h-8 bg-white/10 rounded w-64 mx-auto mb-4 animate-pulse"></div>
            <div className="h-4 bg-white/10 rounded w-96 mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="w-16 h-16 bg-white/10 rounded-full animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-white/10 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-white/10 rounded w-2/3 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* Header */}
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300 mb-4">
          Meet the Awardees
        </h1>
        <p className="text-xl text-zinc-300 max-w-2xl mx-auto">
          Explore the exceptional young leaders shaping Africa's future through innovation, impact, and dedication.
        </p>
      </div>

      <FiltersBar
        onSearchChange={setSearch}
        onCountryChange={setSelectedCountries}
        onCategoryChange={setSelectedCategories}
        onYearChange={setSelectedYear}
        onSortChange={setSelectedSort}
        availableCountries={availableCountries}
        availableCategories={availableCategories}
        selectedCountries={selectedCountries}
        selectedCategories={selectedCategories}
        selectedYear={selectedYear}
        selectedSort={selectedSort}
      />

      {/* Results */}
      <div className="container mx-auto px-4 py-8 pb-20">
        <div className="flex items-center justify-between mb-8">
          <p className="text-sm text-zinc-400" aria-live="polite">
            Showing {showing} of {total} awardees
          </p>
        </div>

        {total === 0 ? (
          <div className="py-12 text-center text-zinc-400">
            <h2 className="text-2xl font-semibold text-white mb-2">No matching awardees</h2>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {paginatedAwardees.map((awardee: Awardee) => (
                <div 
                  key={awardee.id} 
                  style={{ 
                    contentVisibility: 'auto', 
                    containIntrinsicSize: '0px' 
                  }}
                >
                  <AwardeeCard awardee={awardee} />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => updatePage(page - 1)}
                  disabled={page === 1}
                  className="border-white/20"
                >
                  Previous
                </Button>
                <span className="text-sm text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => updatePage(page + 1)}
                  disabled={page === totalPages}
                  className="border-white/20"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
