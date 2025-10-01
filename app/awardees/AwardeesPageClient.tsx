'use client';

import { useState, useEffect } from 'react';
import { getAwardees } from "@/lib/awardees";
import { AvatarSVG, flagEmoji } from '@/lib/avatars';
import { MapPin } from 'lucide-react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export default function AwardeesPageClient({ 
  initialPeople, 
  initialSearchParams 
}: { 
  initialPeople: Awaited<ReturnType<typeof getAwardees>>;
  initialSearchParams?: { 
    page?: string;
    search?: string;
  } 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPeople, setFilteredPeople] = useState(initialPeople);
  const [showFilters, setShowFilters] = useState(false);
  
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentPage = Number(searchParams.get('page')) || 1;
  const urlSearch = searchParams.get('search') || '';
  
  // Update search term from URL
  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);
  
  // Filter data based on search term
  useEffect(() => {
    const filtered = initialPeople.filter(awardee => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        awardee.name.toLowerCase().includes(term) ||
        (awardee.country && awardee.country.toLowerCase().includes(term)) ||
        (awardee.course && awardee.course.toLowerCase().includes(term)) ||
        (awardee.bio && awardee.bio.toLowerCase().includes(term))
      );
    });
    setFilteredPeople(filtered);
  }, [searchTerm, initialPeople]);
  
  const itemsPerPage = 30;
  
  // Calculate pagination
  const totalItems = filteredPeople.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  // Get the people for the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPeople = filteredPeople.slice(startIndex, endIndex);
  
  // Check if there are previous/next pages
  const hasPreviousPage = currentPage > 1 && currentPage <= totalPages;
  const hasNextPage = currentPage < totalPages;
  
  // Update URL when search changes (only)
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchTerm) {
      params.set('search', searchTerm);
      params.delete('page'); // Reset to first page when search changes
    } else {
      params.delete('search');
      params.delete('page');
    }
    router.push(`${pathname}?${params.toString()}`);
  }, [searchTerm]); // Only run when searchTerm changes, not all parameters
  
  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', newPage.toString());
    }
    router.push(`${pathname}?${params.toString()}`);
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

        {/* Search Bar and Filter */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search awardees by name, country, course..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {currentPeople.map(p => (
            <a key={p.slug} href={`/awardees/${p.slug}`}>
              <div className="bg-black/50 rounded-2xl overflow-hidden backdrop-blur-lg border border-orange-400/20 hover:border-orange-400/40 transition-all duration-300 h-full flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-start space-x-4">
                    <div className="shrink-0">
                      <AvatarSVG name={p.name} size={64} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-white truncate">{p.name}</h3>
                        <span className="ml-2 text-xs font-medium bg-orange-500/20 text-orange-200 rounded-full px-2 py-1 whitespace-nowrap">
                          {p.cgpa || "—"}
                        </span>
                      </div>
                      <div className="flex items-center mt-1 text-orange-400">
                        <span className="mr-1">{flagEmoji(p.country || '')}</span>
                        <span className="text-sm">{p.country || "—"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Results Info */}
        <div className="mt-6 text-sm text-zinc-400">
          Showing {Math.min(currentPeople.length, itemsPerPage)} of {totalItems} awardees
        </div>

        {/* Pagination Controls */}
        <div className="mt-8 flex justify-between items-center">
          {hasPreviousPage ? (
            <button 
              onClick={() => updatePage(currentPage - 1)}
              className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 text-sm transition-colors"
            >
              Previous
            </button>
          ) : (
            <div></div> // Empty div to maintain alignment
          )}
          
          <div className="text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </div>
          
          {hasNextPage ? (
            <button 
              onClick={() => updatePage(currentPage + 1)}
              className="px-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-white hover:bg-zinc-800 text-sm transition-colors"
            >
              Next
            </button>
          ) : (
            <div></div> // Empty div to maintain alignment
          )}
        </div>
      </div>
    </div>
  );
}