import { Search, SlidersHorizontal } from 'lucide-react'
import type { ReactNode, Ref } from 'react'

import '@/app/awardees/awardees.css'

export function DirectorySearch({
  id, label, placeholder, value, onChange, filterLabel, hasFilters, filtersRef, children,
}: {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  filterLabel: string
  hasFilters: boolean
  filtersRef?: Ref<HTMLDetailsElement>
  children: ReactNode
}) {
  return (
    <div className="directory-search">
      <Search size={20} aria-hidden="true" />
      <label htmlFor={id} className="sr-only">{label}</label>
      <input id={id} type="search" placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
      <details ref={filtersRef} className="directory-filter">
        <summary aria-label={filterLabel}>
          <SlidersHorizontal size={19} aria-hidden="true" />
          {hasFilters && <span className="filter-active-dot" />}
        </summary>
        <div className="directory-filter-panel">{children}</div>
      </details>
    </div>
  )
}
