'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function OpportunitiesHub() {
  // State for filters
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    level: '',
    deadline: '',
    funding: ''
  });


  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value === prev[filterType] ? '' : value
    }));
  };

  return (
    <div className="min-h-screen bg-white pt-12 sm:pt-16">
      {/* Partnership Hero */}
      <section className="bg-white text-gray-900 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">Top100 Partners with Edutu.ai</h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-2xl mx-auto">
              Bringing personalized opportunities and global access to underprivileged communities lacking access to global opportunities.
            </p>
            <a
              href="https://www.edutu.org"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition duration-300"
            >
              <span className="text-white">Join Edutu</span>
            </a>
          </div>
        </div>
      </section>

      {/* Partnership Details */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 text-center">About Our Partnership</h3>
            <div className="prose prose-lg max-w-none text-gray-800">
              <p className="text-base sm:text-lg">
                Edutu uses AI to personalize global opportunities for young Africans, and gives them personalized roadmaps guiding them on applying and ensuring they get it. It refines their CVs, rewrites their results, and positions them for global opportunities.
              </p>
              <p className="mt-4 text-base sm:text-lg">
                Through our partnership, we're extending these benefits to Top100 members, creating a pathway from talent to global opportunities. This collaboration represents our commitment to making high-quality, global opportunities accessible to talented young Africans who might otherwise lack the resources or guidance to access them.
              </p>
              <p className="mt-4 text-base sm:text-lg">
                The AI-powered platform analyzes each candidate's profile and goals, then matches them with the most suitable opportunities while providing step-by-step guidance through the application process. This includes personalized feedback on application materials, interview preparation, and strategies for positioning themselves effectively for selection committees.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}