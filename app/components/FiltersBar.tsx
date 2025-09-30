'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
}

interface FiltersBarProps {
  onSearchChange: (search: string) => void
  onCountryChange: (countries: string[]) => void
  onCategoryChange: (categories: string[]) => void
  onYearChange: (year: number) => void
  onSortChange: (sort: string) => void
  availableCountries: FilterOption[]
  availableCategories: FilterOption[]
  availableYears: number[]
  selectedCountries: string[]
  selectedCategories: string[]
  selectedYear: number
  selectedSort: string
}

export function FiltersBar({
  onSearchChange,
  onCountryChange,
  onCategoryChange,
  onYearChange,
  onSortChange,
  availableCountries,
  availableCategories,
  selectedCountries,
  selectedCategories,
  selectedYear,
  selectedSort
}: FiltersBarProps) {
  const [openCountry, setOpenCountry] = useState(false)
  const [openCategory, setOpenCategory] = useState(false)

  const handleCountryToggle = (value: string) => {
    const newCountries = selectedCountries.includes(value)
      ? selectedCountries.filter(c => c !== value)
      : [...selectedCountries, value]
    onCountryChange(newCountries)
  }

  const handleCategoryToggle = (value: string) => {
    const newCategories = selectedCategories.includes(value)
      ? selectedCategories.filter(c => c !== value)
      : [...selectedCategories, value]
    onCategoryChange(newCategories)
  }

  const clearCountries = () => onCountryChange([])
  const clearCategories = () => onCategoryChange([])

  return (
    <div className="sticky top-0 z-40 bg-zinc-900/95 backdrop-blur-md border-b border-white/10 md:rounded-none rounded-t-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by name or bio..."
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-10"
              aria-label="Search awardees"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Country Filter */}
            <Popover open={openCountry} onOpenChange={setOpenCountry}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 border-white/20">
                  Country{selectedCountries.length > 0 ? ` (${selectedCountries.length})` : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 max-h-64 overflow-y-auto">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">Countries</h3>
                  {selectedCountries.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-orange-400 hover:text-orange-300 mt-2"
                      onClick={clearCountries}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="p-2">
                  {availableCountries.map((country) => (
                    <div
                      key={country.value}
                      className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded"
                    >
                      <Checkbox
                        id={`country-${country.value}`}
                        checked={selectedCountries.includes(country.value)}
                        onCheckedChange={() => handleCountryToggle(country.value)}
                      />
                      <label
                        htmlFor={`country-${country.value}`}
                        className="text-sm text-white font-medium cursor-pointer select-none"
                      >
                        {country.label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Category Filter */}
            <Popover open={openCategory} onOpenChange={setOpenCategory}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 border-white/20">
                  Category{selectedCategories.length > 0 ? ` (${selectedCategories.length})` : ''}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 max-h-64 overflow-y-auto">
                <div className="p-4 border-b border-white/10">
                  <h3 className="font-semibold text-white">Categories</h3>
                  {selectedCategories.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-orange-400 hover:text-orange-300 mt-2"
                      onClick={clearCategories}
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <div className="p-2">
                  {availableCategories.map((category) => (
                    <div
                      key={category.value}
                      className="flex items-center space-x-2 p-2 hover:bg-white/5 rounded"
                    >
                      <Checkbox
                        id={`category-${category.value}`}
                        checked={selectedCategories.includes(category.value)}
                        onCheckedChange={() => handleCategoryToggle(category.value)}
                      />
                      <label
                        htmlFor={`category-${category.value}`}
                        className="text-sm text-white font-medium cursor-pointer select-none"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Year Select */}
            <Select value={selectedYear.toString()} onValueChange={(value) => onYearChange(parseInt(value))}>
              <SelectTrigger className="h-10 w-[120px] border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Select */}
            <Select value={selectedSort} onValueChange={onSortChange}>
              <SelectTrigger className="h-10 w-[140px] border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name A-Z</SelectItem>
                <SelectItem value="country">Country</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected filters badges */}
        {(selectedCountries.length > 0 || selectedCategories.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-4 max-w-full overflow-x-auto pb-2">
            {selectedCountries.map((country) => (
              <Badge
                key={country}
                variant="secondary"
                className="bg-orange-500/20 text-orange-300 border-orange-400/30"
              >
                {country}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-orange-200"
                  onClick={() => handleCountryToggle(country)}
                />
              </Badge>
            ))}
            {selectedCategories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="bg-orange-500/20 text-orange-300 border-orange-400/30"
              >
                {category}
                <X
                  className="w-3 h-3 ml-1 cursor-pointer hover:text-orange-200"
                  onClick={() => handleCategoryToggle(category)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
