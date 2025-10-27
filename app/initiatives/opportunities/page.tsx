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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Partnership Hero */}
      <section className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
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
                  className="inline-block bg-white text-yellow-600 font-bold py-3 px-8 rounded-lg text-base transition duration-300 hover:bg-gray-100"
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

      {/* Newsletter Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Weekly Curated Opportunities</h2>
            <p className="text-gray-700 mb-6">
              Subscribe to our newsletter to receive the latest scholarships, fellowships, and grants directly in your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Your email address" 
                className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-lg transition duration-300 whitespace-nowrap">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}