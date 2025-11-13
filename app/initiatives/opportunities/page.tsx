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
    <div className="min-h-screen bg-white">
      {/* Partnership Hero */}
      <section className="bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="relative pt-[75%] max-w-4xl mx-auto"> {/* 4:3 aspect ratio using padding-top trick */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-4">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Top100 Partners with Edutu.ai</h2>
                <p className="text-lg md:text-xl mb-6">
                  Bringing personalized opportunities and global access to underprivileged communities lacking access to global opportunities.
                </p>
                <a
                  href="https://www.edutu.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-base transition duration-300"
                >
                  Join Edutu
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partnership Details */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">About Our Partnership</h3>
            <div className="prose prose-lg max-w-none text-gray-800">
              <p>
                Edutu uses AI to personalize global opportunities for young Africans, and gives them personalized roadmaps guiding them on applying and ensuring they get it. It refines their CVs, rewrites their results, and positions them for global opportunities.
              </p>
              <p className="mt-4">
                Through our partnership, we're extending these benefits to Top100 members, creating a pathway from talent to global opportunities. This collaboration represents our commitment to making high-quality, global opportunities accessible to talented young Africans who might otherwise lack the resources or guidance to access them.
              </p>
              <p className="mt-4">
                The AI-powered platform analyzes each candidate's profile and goals, then matches them with the most suitable opportunities while providing step-by-step guidance through the application process. This includes personalized feedback on application materials, interview preparation, and strategies for positioning themselves effectively for selection committees.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}