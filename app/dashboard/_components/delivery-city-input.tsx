'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown, LoaderCircle } from 'lucide-react'
import { locationSuggestions } from '@/lib/awards/locations'
import type { DeliveryCitySuggestion } from '@/lib/awards/delivery-locations'

export function DeliveryCityInput({ countryCode, region, value, onChange, className }: {
  countryCode: string; region: string; value: string; onChange: (value: string) => void; className: string;
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [result, setResult] = useState<{ key: string; items: DeliveryCitySuggestion[]; error: string } | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const listId = useId()
  const key = JSON.stringify([countryCode, region, value.trim()])
  const local = countryCode === 'NG'
  const loading = !local && open && value.trim().length >= 2 && result?.key !== key
  const suggestions = local
    ? locationSuggestions(region).filter(name => name.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 12).map(name => ({ name, label: name }))
    : result?.key === key ? result.items : []

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open, listId])

  useEffect(() => {
    if (local || !open || value.trim().length < 2) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ countryCode, region, query: value.trim() })
        const response = await fetch(`/api/member/award/delivery-cities?${params}`, { signal: controller.signal, cache: 'no-store' })
        const body = await response.json()
        if (!response.ok || !Array.isArray(body.suggestions)) throw new Error('Unavailable')
        if (!controller.signal.aborted) setResult({ key, items: body.suggestions, error: '' })
      } catch {
        if (!controller.signal.aborted) setResult({ key, items: [], error: 'Suggestions are unavailable. Enter your city manually.' })
      }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [countryCode, region, value, key, local, open])

  function choose(item: DeliveryCitySuggestion) { onChange(item.name); ref.current?.focus(); setOpen(false); setActive(-1) }
  return <div className="delivery-city-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <div className="relative">
      <input ref={ref} id="delivery-city" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && active >= 0 && suggestions[active] ? `${listId}-${active}` : undefined} autoComplete="off" required minLength={2} maxLength={100} value={value} placeholder={region ? 'Search or enter your city' : 'Enter your city or choose a region'} className={`${className} pr-10`}
        onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onChange={event => { onChange(event.target.value); setOpen(true); setActive(-1) }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setActive(-1) }
          if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive(index => Math.min(index + 1, suggestions.length - 1)) }
          if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)) }
          if (event.key === 'Enter' && open && active >= 0 && suggestions[active]) { event.preventDefault(); choose(suggestions[active]) }
        }} />
      {loading ? <LoaderCircle className="delivery-city-search__icon animate-spin" size={16} aria-hidden="true" /> : <ChevronDown className="delivery-city-search__icon" size={16} aria-hidden="true" />}
    </div>
    {open && <div className="delivery-city-search__menu">
      <div role="listbox" id={listId} aria-label="City suggestions">
        {suggestions.map((item, index) => <button type="button" role="option" id={`${listId}-${index}`} aria-selected={active === index} key={item.name} tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => choose(item)}><span>{item.name}</span>{item.label !== item.name && <small>{item.label}</small>}</button>)}
      </div>
      {suggestions.length === 0 && <p role="status">{loading ? 'Finding cities…' : !local && value.trim().length < 2 ? 'Type two letters to search cities in this country and region.' : result?.key === key && result.error ? result.error : 'No suggestions found. You can enter your city manually.'}</p>}
      {!local && suggestions.length > 0 && <small className="delivery-city-search__credit">City suggestions by Geoapify</small>}
    </div>}
  </div>
}
