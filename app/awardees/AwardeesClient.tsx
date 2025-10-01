'use client';

import { useState, useEffect, useMemo } from 'react';
import { AwardeeCard } from '@/components/AwardeeCard';
import FiltersBar from '@/components/FiltersBar';
import { useSearchParams } from 'next/navigation';

// Type definition for awardee
interface Awardee {
  id: string;
  name: string;
  country: string;
  category: string;
  year: number;
  bio30?: string;
  photo_url?: string;
  featured?: boolean;
}

interface AwardeesClientProps {
  awardees: Awardee[];
}

export const AwardeesClient = ({ awardees }: AwardeesClientProps) => {
  const searchParams = useSearchParams();

  // Get unique values for filters
  const allCountries = useMemo(() => {
    return Array.from(new Set(awardees.map(a => a.country))).sort();
  }, [awardees]);

  const allCategories = useMemo(() => {
    return Array.from(new Set(awardees.map(a => a.category))).sort();
  }, [awardees]);

  const allYears = useMemo(() => {
    return Array.from(new Set(awardees.map(a => a.year))).sort((a, b) => b - a);
  }, [awardees]);

  // Current filters state
  const [filters, setFilters] = useState({
    search: '',
    countries: [] as string[],
    categories: [] as string[],
    year: allYears.length > 0 ? Math.max(...allYears) : new Date().getFullYear(),
    sortBy: 'name' as 'name' | 'country' | 'category'
  });

  // Apply filters
  const filteredAwardees = useMemo(() => {
    return awardees
      .filter(awardee => {
        // Year filter
        if (awardee.year !== filters.year) return false;
        
        // Search filter (name or bio)
        if (filters.search && 
            !awardee.name.toLowerCase().includes(filters.search.toLowerCase()) &&
            !(awardee.bio30 && awardee.bio30.toLowerCase().includes(filters.search.toLowerCase()))) {
          return false;
        }
        
        // Country filter
        if (filters.countries.length > 0 && !filters.countries.includes(awardee.country)) {
          return false;
        }
        
        // Category filter
        if (filters.categories.length > 0 && !filters.categories.includes(awardee.category)) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'name':
            return a.name.localeCompare(b.name);
          case 'country':
            return a.country.localeCompare(b.country);
          case 'category':
            return a.category.localeCompare(b.category);
          default:
            return 0;
        }
      });
  }, [awardees, filters]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 24;
  
  // Update current page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Calculate pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAwardees.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAwardees.length / itemsPerPage);

  // Handle filter changes
  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // Handle pagination
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Loading skeletons for better UX
  const renderSkeletons = () => {
    return Array.from({ length: 12 }).map((_, index) => (
      <div 
        key={`skeleton-${index}`} 
        className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/20 animate-pulse"
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-gray-700 rounded-full w-12 h-12" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2"></div>
              <div className="h-6 bg-gray-700 rounded w-1/4 mt-2"></div>
              <div className="h-3 bg-gray-700 rounded w-full mt-3"></div>
              <div className="h-3 bg-gray-700 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="container mx-auto px-4">
        {/* Header - only show on first page */}
        {currentPage === 1 && (
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white to-orange-300">
              Meet the Awardees
            </h1>
            <p className="text-xl text-zinc-400 max-w-3xl mx-auto text-balance">
              Discover the inspiring individuals who have made significant contributions to their fields and communities.
            </p>
          </header>
        )}

        {/* Filters Bar */}
        <div className="relative z-10 bg-black/80 backdrop-blur-lg border-b border-zinc-800 p-4 mb-8">
          <FiltersBar 
            allCountries={allCountries} 
            allCategories={allCategories} 
            allYears={allYears} 
            onFiltersChange={handleFiltersChange} 
          />
        </div>

        {/* Results Info */}
        <div className="mb-8 flex justify-between items-center">
          <div className="text-sm text-zinc-400" aria-live="polite">
            Showing {Math.min(currentItems.length, itemsPerPage)} of {filteredAwardees.length} awardees
          </div>
        </div>

        {/* Results or Empty State */}
        {filteredAwardees.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-zinc-500 text-xl">No matching awardees. Try a different filter.</div>
          </div>
        ) : (
          <>
            {/* Awardee Grid */}
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12"
              style={{ contentVisibility: 'auto' }}
            >
              {currentItems.map((awardee) => (
                <AwardeeCard key={awardee.id} awardee={awardee} />
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mb-12">
              {currentPage > 1 && (
                <button
                  onClick={goToPrevPage}
                  className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 text-sm transition-colors"
                  aria-label="Previous page"
                >
                  Previous
                </button>
              )}
              
              <div className="text-sm text-zinc-400 mx-4">
                Page {currentPage} of {totalPages}
              </div>
              
              {currentPage < totalPages && (
                <button
                  onClick={goToNextPage}
                  className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 text-sm transition-colors"
                  aria-label="Next page"
                >
                  Next
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};