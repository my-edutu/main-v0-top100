'use client'

import { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'

import { Command, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type City = { name: string; region: string }

export function CommunityCitySelect({ country, region, value, onChange, id, className, describedBy }: {
  country: string
  region: string
  value: string
  onChange: (value: string) => void
  id: string
  className: string
  describedBy?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<{ query: string; cities: City[]; unavailable: boolean }>()
  const search = query.trim()
  const loaded = result?.query === search
  const matches = loaded ? result.cities : []
  const canEnterCity = search.length > 0 && (loaded || search.length >= 150) &&
    !matches.some(city => city.name.toLocaleLowerCase() === search.toLocaleLowerCase())

  useEffect(() => {
    if (!open || !country) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ country, region, q: search })
        const response = await fetch(`/api/programmes/cities?${params}`, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
        })
        if (!response.ok) throw new Error('City lookup failed')
        const { cities } = await response.json() as { cities: City[] }
        if (!controller.signal.aborted) setResult({ query: search, cities, unavailable: false })
      } catch {
        if (!controller.signal.aborted) setResult({ query: search, cities: [], unavailable: true })
      }
    }, search ? 180 : 0)
    return () => { clearTimeout(timer); controller.abort() }
  }, [country, region, open, search])

  function select(city: string) {
    onChange(city)
    setOpen(false)
    setQuery('')
  }

  return <Popover open={open} onOpenChange={next => { setOpen(next); if (!next) setQuery('') }}>
    <PopoverTrigger asChild>
      <button id={id} type="button" disabled={!country} aria-describedby={describedBy}
        className={`${className} flex items-center justify-between gap-3 text-left disabled:opacity-60`}>
        <span className={value ? 'break-words' : 'text-stone-600'}>
          {value || (country ? 'Select or search for a city' : 'Select a country first')}
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-stone-500" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0">
      <Command shouldFilter={false}>
        <CommandInput aria-label="Search cities" placeholder={region ? 'Search cities in this region' : 'Search by city or state'} value={query} onValueChange={setQuery}
          maxLength={150} className="text-base" />
        <CommandList aria-label="City options" className="max-h-60 p-1">
          {matches.map(({ name, region }) => {
            const option = `${name},${region}`
            return <CommandItem key={option} value={option} onSelect={() => select(name)} className="min-h-11">
              <span className="min-w-0">
                <span className="block">{name}</span>
                {region && region !== name && <span className="block text-xs text-stone-600">{region}</span>}
              </span>
              {value === name && <Check aria-label="Selected" className="ml-auto size-4" />}
            </CommandItem>
          })}
          {canEnterCity && <CommandItem value={`manual:${search}`} onSelect={() => select(search)}>
            Enter “{search}” manually
          </CommandItem>}
          {value && <CommandItem value="clear-selection" onSelect={() => select('')}>Clear city</CommandItem>}
        </CommandList>
        {!loaded && <p role="status" className="px-3 py-2 text-sm text-stone-600">Finding cities…</p>}
        {loaded && matches.length === 0 && <p role="status" className="px-3 py-2 text-sm text-stone-600">
          {result.unavailable ? 'City suggestions are unavailable. Enter your city manually if it’s missing.' : 'No matching cities. Enter your city manually if it’s missing.'}
        </p>}
        <p className="border-t px-3 py-2 text-xs text-stone-600">
          City data from <a className="underline" href="https://www.geonames.org/" target="_blank" rel="noreferrer">GeoNames</a>
          {' · '}<a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>
        </p>
      </Command>
    </PopoverContent>
  </Popover>
}


export function CommunityRegionSelect({ country, ...selectProps }: {
  country: string
  id: string
  name: string
  className: string
  value: string
  autoComplete?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  onChange: React.ChangeEventHandler<HTMLSelectElement>
}) {
  const [regions, setRegions] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!country) return
    const controller = new AbortController()
    const params = new URLSearchParams({ country, scope: 'regions' })
    fetch(`/api/programmes/cities?${params}`, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
    }).then(async response => {
      if (!response.ok) throw new Error('Region lookup failed')
      const result = await response.json() as { regions: string[] }
      if (!controller.signal.aborted) setRegions(result.regions)
    }).catch(() => {
      if (!controller.signal.aborted) setFailed(true)
    })
    return () => controller.abort()
  }, [country])

  const options = regions ?? []
  const placeholder = !country ? 'Select a country first'
    : failed ? 'States or regions are unavailable'
    : !regions ? 'Loading states and regions…'
    : options.length ? 'Select a state or region (optional)' : 'No states or regions listed'

  return <select {...selectProps} disabled={options.length === 0}>
    <option value="">{placeholder}</option>
    {selectProps.value && !options.includes(selectProps.value) && <option value={selectProps.value}>{selectProps.value}</option>}
    {options.map(region => <option key={region} value={region}>{region}</option>)}
  </select>
}
