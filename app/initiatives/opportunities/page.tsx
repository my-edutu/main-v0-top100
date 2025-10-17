'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function OpportunitiesHub() {
  // Mock data for featured opportunities
  const [opportunities] = useState([
    {
      id: 1,
      title: 'Africa Leadership Fellowship',
      organization: 'African Leadership University',
      summary: 'A fully-funded fellowship for young African leaders to develop skills in entrepreneurship and innovation.',
      coverage: ['Full scholarship', 'Accommodation', 'Travel'],
      deadline: '2024-12-15',
      tags: ['Leadership', 'Fellowship', 'Fully-funded'],
      location: 'Rwanda',
      level: 'Undergraduate'
    },
    {
      id: 2,
      title: 'Google Africa Developer Scholarship',
      organization: 'Google',
      summary: 'Intensive training program for African developers focusing on mobile and web technologies.',
      coverage: ['Training', 'Mentorship', 'Stipend'],
      deadline: '2024-11-30',
      tags: ['Technology', 'Training', 'Stipend'],
      location: 'Remote',
      level: 'All levels'
    },
    {
      id: 3,
      title: 'Meltwater Entrepreneurial School of Technology',
      organization: 'MEST',
      summary: '1-year intensive residential program for tech entrepreneurs from Africa.',
      coverage: ['Tuition', 'Accommodation', 'Network access'],
      deadline: '2024-10-31',
      tags: ['Entrepreneurship', 'Technology', 'Residential'],
      location: 'Ghana',
      level: 'Postgraduate'
    },
    {
      id: 4,
      title: 'Commonwealth Scholarship',
      organization: 'Commonwealth Scholarship Commission',
      summary: 'Scholarships for students from developing Commonwealth countries to pursue postgraduate study in the UK.',
      coverage: ['Tuition', 'Living expenses', 'Travel'],
      deadline: '2024-11-15',
      tags: ['Postgraduate', 'UK', 'International'],
      location: 'United Kingdom',
      level: 'Postgraduate'
    },
    {
      id: 5,
      title: 'UNESCO International Youth Forum',
      organization: 'UNESCO',
      summary: 'Annual forum for young leaders to discuss global challenges and solutions.',
      coverage: ['Accommodation', 'Travel', 'Food'],
      deadline: '2024-10-20',
      tags: ['Conference', 'Leadership', 'International'],
      location: 'France',
      level: 'Young professionals'
    },
    {
      id: 6,
      title: 'Mastercard Foundation Scholars Program',
      organization: 'Mastercard Foundation',
      summary: 'Comprehensive scholarship program for academically talented students from disadvantaged communities.',
      coverage: ['Tuition', 'Living expenses', 'Mentorship'],
      deadline: '2024-12-01',
      tags: ['Scholarship', 'Mentorship', 'Leadership'],
      location: 'Partner universities globally',
      level: 'Undergraduate'
    }
  ]);

  // Mock data for success stories
  const [successStories] = useState([
    {
      id: 1,
      name: 'Chiamaka Nwosu',
      title: 'Google Africa Developer Scholar',
      story: 'The Opportunities Hub helped me find and apply for the Google Africa Developer Scholarship. The application guidance section was particularly helpful in preparing my documents.',
      image: 'https://placehold.co/100x100?text=CN'
    },
    {
      id: 2,
      name: 'Kofi Asante',
      title: 'ALU Fellowship Recipient',
      story: 'Through the hub, I discovered the African Leadership University Fellowship. The deadline tracking feature helped me ensure I never missed an important date.',
      image: 'https://placehold.co/100x100?text=KA'
    }
  ]);

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
      {/* Breadcrumbs */}
      <nav className="bg-white py-4 px-6">
        <div className="container mx-auto">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            <Link href="/initiatives" className="hover:text-blue-600">Initiatives</Link>
            <span>/</span>
            <span className="text-gray-900">Opportunities Hub</span>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">🚀 Opportunities Hub</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Curated scholarships, grants, fellowships, and internships for young African leaders.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-lg transition duration-300">
                Browse Opportunities
              </button>
              <button className="bg-white hover:bg-gray-100 text-blue-900 font-bold py-3 px-6 rounded-lg transition duration-300">
                Submit an Opportunity
              </button>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Curate</h3>
                <p className="text-gray-700">We carefully review and select opportunities that match our criteria for African leaders.</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Match</h3>
                <p className="text-gray-700">Our system helps match you with opportunities that align with your profile and goals.</p>
              </div>
              
              <div className="text-center p-6">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Apply</h3>
                <p className="text-gray-700">Access application materials and submit your application through our streamlined process.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Filters & Categories */}
        <section className="py-12 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">Find Opportunities</h2>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {['Scholarships', 'Fellowships', 'Internships', 'Grants', 'Conferences'].map((category) => (
                <div key={category} className="flex flex-col items-center">
                  <button
                    className={`px-4 py-2 rounded-full ${
                      filters.category === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => handleFilterChange('category', category)}
                  >
                    {category}
                  </button>
                  <Link 
                    href={`/initiatives/opportunities/${category.toLowerCase()}`}
                    className="text-xs text-blue-600 hover:underline mt-1"
                  >
                    Learn More
                  </Link>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                >
                  <option value="">All Locations</option>
                  <option value="Africa">Africa</option>
                  <option value="Europe">Europe</option>
                  <option value="North America">North America</option>
                  <option value="Asia">Asia</option>
                  <option value="Remote">Remote</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={filters.level}
                  onChange={(e) => handleFilterChange('level', e.target.value)}
                >
                  <option value="">All Levels</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Postgraduate">Postgraduate</option>
                  <option value="PhD">PhD</option>
                  <option value="Professional">Professional</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={filters.deadline}
                  onChange={(e) => handleFilterChange('deadline', e.target.value)}
                >
                  <option value="">All Deadlines</option>
                  <option value="next-week">Next Week</option>
                  <option value="next-month">Next Month</option>
                  <option value="next-3-months">Next 3 Months</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Funding</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  value={filters.funding}
                  onChange={(e) => handleFilterChange('funding', e.target.value)}
                >
                  <option value="">All Funding</option>
                  <option value="full">Full Funding</option>
                  <option value="partial">Partial Funding</option>
                  <option value="stipend">Stipend Only</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Featured Opportunities */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Featured Opportunities</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {opportunities.map((opportunity) => (
                <div key={opportunity.id} className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-900">{opportunity.title}</h3>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{opportunity.level}</span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">Hosted by: <span className="font-medium">{opportunity.organization}</span></p>
                    
                    <p className="text-gray-700 mb-4">{opportunity.summary}</p>
                    
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-1">Coverage:</h4>
                      <ul className="flex flex-wrap gap-2">
                        {opportunity.coverage.map((item, index) => (
                          <li key={index} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Deadline:</span> {new Date(opportunity.deadline).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span> {opportunity.location}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {opportunity.tags.map((tag, index) => (
                        <span key={index} className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-300">
                      Apply Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Search Tips / Guidance */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Application Guidance</h2>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <p className="text-gray-700 mb-6">
                Applying for opportunities can be competitive. Here are some tips to increase your chances of success:
              </p>
              
              <ul className="space-y-4">
                <li className="flex">
                  <div className="bg-blue-100 p-2 rounded-full mr-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Prepare your documents in advance</h3>
                    <p className="text-gray-700">Have your CV, personal statement, transcripts, and recommendation letters ready and tailored to each opportunity.</p>
                  </div>
                </li>
                
                <li className="flex">
                  <div className="bg-blue-100 p-2 rounded-full mr-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Choose your referees wisely</h3>
                    <p className="text-gray-700">Select referees who know your work well and can provide specific examples of your capabilities and achievements.</p>
                  </div>
                </li>
                
                <li className="flex">
                  <div className="bg-blue-100 p-2 rounded-full mr-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Mark deadlines in your calendar</h3>
                    <p className="text-gray-700">Set reminders well in advance of application deadlines to ensure you have enough time to submit a strong application.</p>
                  </div>
                </li>
                
                <li className="flex">
                  <div className="bg-blue-100 p-2 rounded-full mr-4">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Tailor your application</h3>
                    <p className="text-gray-700">Customize your personal statement and CV to highlight how your experience aligns with the specific opportunity's goals.</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Success Stories</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {successStories.map((story) => (
                <div key={story.id} className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center mb-4">
                    <img 
                      src={story.image} 
                      alt={story.name} 
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">{story.name}</h3>
                      <p className="text-sm text-gray-600">{story.title}</p>
                    </div>
                  </div>
                  <p className="text-gray-700">"{story.story}"</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partnership Note with Edutu */}
        <section className="py-16 bg-gradient-to-r from-blue-900 to-indigo-800 text-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-6">Powered by Partnerships</h2>
            <p className="text-xl max-w-3xl mx-auto mb-8">
              We are teaming up with <strong>Edutu</strong> to provide access to opportunities for millions of young Africans.
            </p>
            <a 
              href="https://www.edutu.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block bg-white text-blue-900 font-bold py-3 px-8 rounded-lg transition duration-300 hover:bg-gray-100"
            >
              Join Edutu
            </a>
          </div>
        </section>

        {/* Submit an Opportunity */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Submit an Opportunity</h2>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                  <input 
                    type="text" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Organization name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                  <input 
                    type="url" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/opportunity"
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500">
                  <option value="">Select category</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="fellowship">Fellowship</option>
                  <option value="internship">Internship</option>
                  <option value="grant">Grant</option>
                  <option value="conference">Conference</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Coverage</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., tuition, accommodation, travel"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input 
                    type="date" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input 
                    type="email" 
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>
              
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-300">
                Submit Opportunity
              </button>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="py-8 bg-white">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-gray-600 italic">
              We do our best to verify; always confirm details on the official page.
            </p>
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
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-300 whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}