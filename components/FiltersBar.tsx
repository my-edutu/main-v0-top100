'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface FilterOptions {
  search: string;
  countries: string[];
  categories: string[];
  year: number;
  sortBy: 'name' | 'country' | 'category';
}

interface FiltersBarProps {
  allCountries: string[];
  allCategories: string[];
  allYears: number[];
  onFiltersChange: (filters: FilterOptions) => void;
}

const FiltersBar: React.FC<FiltersBarProps> = ({ 
  allCountries, 
  allCategories, 
  allYears,
  onFiltersChange 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize filters from query params
  const [search, setSearch] = useState('');
  const [countries, setCountries] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [year, setYear] = useState<number>(allYears.length > 0 ? Math.max(...allYears) : new Date().getFullYear());
  const [sortBy, setSortBy] = useState<'name' | 'country' | 'category'>('name');
  const [showFilters, setShowFilters] = useState(false);
  const [showCountries, setShowCountries] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  
  const filtersRef = useRef<HTMLDivElement>(null);

  // Update filters when query params change
  useEffect(() => {
    const searchParam = searchParams.get('search') || '';
    const countriesParam = searchParams.get('countries') ? searchParams.get('countries')?.split(',') || [] : [];
    const categoriesParam = searchParams.get('categories') ? searchParams.get('categories')?.split(',') || [] : [];
    const yearParam = searchParams.get('year') ? parseInt(searchParams.get('year') || '0') : year;
    const sortParam = searchParams.get('sort') || 'name';

    setSearch(searchParam);
    setCountries(countriesParam);
    setCategories(categoriesParam);
    if (yearParam) setYear(yearParam);
    setSortBy(sortParam as 'name' | 'country' | 'category');
  }, [searchParams]);

  // Apply filters and update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (countries.length > 0) params.set('countries', countries.join(','));
    if (categories.length > 0) params.set('categories', categories.join(','));
    if (year) params.set('year', year.toString());
    if (sortBy) params.set('sort', sortBy);
    
    // Update URL without causing a full page refresh
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
    
    // Notify parent of filter changes
    onFiltersChange({
      search,
      countries,
      categories,
      year,
      sortBy
    });
  }, [search, countries, categories, year, sortBy, pathname, router, onFiltersChange]);

  // Handle country selection
  const toggleCountry = (country: string) => {
    if (countries.includes(country)) {
      setCountries(countries.filter(c => c !== country));
    } else {
      setCountries([...countries, country]);
    }
  };

  // Handle category selection
  const toggleCategory = (category: string) => {
    if (categories.includes(category)) {
      setCategories(categories.filter(c => c !== category));
    } else {
      setCategories([...categories, category]);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setSearch('');
    setCountries([]);
    setCategories([]);
    setYear(allYears.length > 0 ? Math.max(...allYears) : new Date().getFullYear());
    setSortBy('name');
  };

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target as HTMLElement)) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={filtersRef}>
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Bar - Visible on all screen sizes */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search awardees by name or bio..."
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filter Icon - Visible only on mobile */}
        <div className="sm:hidden flex items-center">
          <button
            className="flex items-center justify-center border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-900 text-white w-10 h-10"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              ></path>
            </svg>
          </button>
        </div>

        {/* Filter Tag Button - Visible only on desktop and tablet */}
        <div className="hidden sm:block">
          <button
            className="flex items-center justify-between border border-zinc-700 rounded-lg px-3 py-2 bg-zinc-900 text-white min-w-[120px] hover:bg-zinc-800 transition-colors text-sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <span className="mr-2">Filters</span>
            <svg 
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Filters Panel - Visible on both mobile and desktop when expanded */}
      {showFilters && (
        <div className="mt-4 p-6 rounded-xl bg-zinc-900/90 border border-zinc-700 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Year Filter */}
            <div>
              <h3 className="font-medium text-zinc-300 mb-3">Year</h3>
              <div className="space-y-2">
                {allYears.map(y => (
                  <div key={y} className="flex items-center">
                    <input
                      type="radio"
                      id={`year-${y}`}
                      name="year"
                      checked={year === y}
                      onChange={() => setYear(y)}
                      className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-zinc-600 bg-zinc-800"
                    />
                    <label htmlFor={`year-${y}`} className="ml-2 text-sm text-zinc-300">
                      {y}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Sort Filter */}
            <div>
              <h3 className="font-medium text-zinc-300 mb-3">Sort By</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="sort-name"
                    name="sort"
                    checked={sortBy === 'name'}
                    onChange={() => setSortBy('name')}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-zinc-600 bg-zinc-800"
                  />
                  <label htmlFor="sort-name" className="ml-2 text-sm text-zinc-300">
                    Name A-Z
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="sort-country"
                    name="sort"
                    checked={sortBy === 'country'}
                    onChange={() => setSortBy('country')}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-zinc-600 bg-zinc-800"
                  />
                  <label htmlFor="sort-country" className="ml-2 text-sm text-zinc-300">
                    Country
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="sort-category"
                    name="sort"
                    checked={sortBy === 'category'}
                    onChange={() => setSortBy('category')}
                    className="h-4 w-4 text-orange-500 focus:ring-orange-500 border-zinc-600 bg-zinc-800"
                  />
                  <label htmlFor="sort-category" className="ml-2 text-sm text-zinc-300">
                    Category
                  </label>
                </div>
              </div>
            </div>

            {/* Countries Filter */}
            <div>
              <h3 className="font-medium text-zinc-300 mb-3">Countries</h3>
              <div className="max-h-60 overflow-y-auto">
                {allCountries.map((country) => (
                  <div key={country} className="flex items-center mb-2">
                    <input
                      id={`country-${country}`}
                      type="checkbox"
                      checked={countries.includes(country)}
                      onChange={() => toggleCountry(country)}
                      className="h-4 w-4 text-orange-500 rounded focus:ring-orange-500 border-zinc-600 bg-zinc-800"
                    />
                    <label
                      htmlFor={`country-${country}`}
                      className="ml-2 text-sm text-zinc-300"
                    >
                      {country}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Categories Filter */}
            <div>
              <h3 className="font-medium text-zinc-300 mb-3">Categories</h3>
              <div className="max-h-60 overflow-y-auto">
                {allCategories.map((category) => (
                  <div key={category} className="flex items-center mb-2">
                    <input
                      id={`category-${category}`}
                      type="checkbox"
                      checked={categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                      className="h-4 w-4 text-orange-500 rounded focus:ring-orange-500 border-zinc-600 bg-zinc-800"
                    />
                    <label
                      htmlFor={`category-${category}`}
                      className="ml-2 text-sm text-zinc-300"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={resetFilters}
              className="text-sm font-medium text-orange-400 hover:text-orange-300 py-2 px-4 rounded-lg hover:bg-orange-500/10 transition-colors"
            >
              Reset all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersBar;