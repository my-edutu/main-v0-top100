"use client"

import { useCallback } from "react"
import { ChevronsUpDown, Filter, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

export type SortKey = "name" | "country" | "category"

type FiltersBarProps = {
  search: string
  countries: string[]
  categories: string[]
  year: number
  sort: SortKey
  availableCountries: string[]
  availableCategories: string[]
  availableYears: number[]
  onSearchChange: (value: string) => void
  onCountriesChange: (value: string[]) => void
  onCategoriesChange: (value: string[]) => void
  onYearChange: (value: number) => void
  onSortChange: (value: SortKey) => void
  resultsCount: number
  totalCount: number
  isPending?: boolean
}

/**
 * Editors: change labels here.
 */
export function FiltersBar({
  search,
  countries,
  categories,
  year,
  sort,
  availableCountries,
  availableCategories,
  availableYears,
  onSearchChange,
  onCountriesChange,
  onCategoriesChange,
  onYearChange,
  onSortChange,
  resultsCount,
  totalCount,
  isPending = false
}: FiltersBarProps) {
  const handleCountryToggle = useCallback(
    (value: string, checked: boolean) => {
      if (checked) {
        onCountriesChange([...new Set([...countries, value])])
      } else {
        onCountriesChange(countries.filter((country) => country !== value))
      }
    },
    [countries, onCountriesChange]
  )

  const handleCategoryToggle = useCallback(
    (value: string, checked: boolean) => {
      if (checked) {
        onCategoriesChange([...new Set([...categories, value])])
      } else {
        onCategoriesChange(categories.filter((category) => category !== value))
      }
    },
    [categories, onCategoriesChange]
  )

  return (
    <aside className="sticky top-16 z-30 -mx-4 bg-zinc-950/95 px-4 py-4 shadow-sm backdrop-blur lg:top-20 lg:-mx-0 lg:rounded-2xl lg:border lg:border-zinc-800/70">
      <form
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:items-end"
        onSubmit={(event) => event.preventDefault()}
        aria-label="Awardee filters"
      >
        <div className="lg:col-span-4">
          <Label htmlFor="awardee-search" className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Search
          </Label>
          <Input
            id="awardee-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by name or bio"
            autoComplete="off"
            aria-describedby="awardee-results"
          />
        </div>

        <div className="sm:col-span-1 lg:col-span-2">
          <span className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Countries
          </span>
          <MultiSelectPopover
            label="Select countries"
            options={availableCountries}
            selected={countries}
            onToggle={handleCountryToggle}
            disabled={availableCountries.length === 0}
          />
        </div>

        <div className="sm:col-span-1 lg:col-span-2">
          <span className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            Categories
          </span>
          <MultiSelectPopover
            label="Select categories"
            options={availableCategories}
            selected={categories}
            onToggle={handleCategoryToggle}
            disabled={availableCategories.length === 0}
          />
        </div>

        <div className="sm:col-span-1 lg:col-span-2">
          <Label htmlFor="awardee-year" className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Year
          </Label>
          <Select value={String(year)} onValueChange={(value) => onYearChange(Number(value))}>
            <SelectTrigger id="awardee-year" aria-label="Year filter">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-1 lg:col-span-2">
          <Label htmlFor="awardee-sort" className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-zinc-400">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Sort
          </Label>
          <Select value={sort} onValueChange={(value: SortKey) => onSortChange(value)}>
            <SelectTrigger id="awardee-sort" aria-label="Sort awardees">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 lg:col-span-2">
          <p
            id="awardee-results"
            className="text-sm font-medium text-zinc-200"
            aria-live="polite"
            aria-atomic="true"
          >
            Showing {resultsCount} of {totalCount} awardees
            {isPending ? " (updating…)" : ""}
          </p>
        </div>
      </form>
    </aside>
  )
}

type MultiSelectPopoverProps = {
  label: string
  options: string[]
  selected: string[]
  onToggle: (value: string, checked: boolean) => void
  disabled?: boolean
}

function MultiSelectPopover({ label, options, selected, onToggle, disabled }: MultiSelectPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between bg-zinc-900/60 text-left text-sm text-zinc-200 hover:bg-zinc-800"
          aria-label={label}
          disabled={disabled}
        >
          <span className="truncate">
            {selected.length > 0 ? `${selected.length} selected` : "All"}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-70" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="max-h-64 overflow-y-auto p-3" role="listbox" aria-label={label}>
          {options.map((option) => {
            const checked = selected.includes(option)
            return (
              <Label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-800"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(state) => onToggle(option, state === true)}
                  aria-checked={checked}
                />
                <span>{option}</span>
              </Label>
            )
          })}
          {options.length === 0 && (
            <p className="px-2 py-4 text-sm text-zinc-400">No options available.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
