'use client';

import { Mail, Users, Globe, Video, Send, MessageCircle, Instagram, Youtube, Linkedin, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function Talk100Live() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Talk 100 – Coming Soon</h1>
            <p className="text-xl md:text-2xl mb-8">
              An inspiring new live interview series with Top100 Africa Future Leaders.
            </p>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-lg mb-6">
                An inspiring new live interview series with Top100 Africa Future Leaders.
              </p>
            </div>
            <div className="mt-8">
              <Link 
                href="/#newsletter" 
                className="inline-block bg-white text-yellow-600 font-bold py-4 px-10 rounded-lg text-lg transition duration-300 hover:bg-gray-100"
              >
                Stay Updated
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Talk 100 */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">About Talk 100</h2>
            <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-8">
              <p className="text-lg text-gray-800 leading-relaxed">
                Talk 100 is a brand-new initiative by Top100 Africa Future Leaders. It will spotlight awardees and young changemakers across Africa who are driving innovation, leadership, and impact in their communities. Each session will be a deep dive into their journey — the challenges, the breakthroughs, and the lessons for the next generation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What to Expect */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What to Expect</h2>
            <p className="text-gray-700 max-w-2xl mx-auto">
              Teaser highlights of what's coming in the Talk 100 series
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Card 1 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-transform duration-300 hover:shadow-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <MessageCircle className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Live interviews</h3>
              <p className="text-gray-700">with Africa's brightest youth leaders</p>
            </div>
            
            {/* Card 2 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-transform duration-300 hover:shadow-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Globe className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Stories of resilience</h3>
              <p className="text-gray-700">innovation, and change</p>
            </div>
            
            {/* Card 3 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-transform duration-300 hover:shadow-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Send className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Actionable insights</h3>
              <p className="text-gray-700">and leadership lessons</p>
            </div>
            
            {/* Card 4 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center transition-transform duration-300 hover:shadow-lg">
              <div className="flex justify-center mb-4">
                <div className="bg-yellow-100 p-3 rounded-full">
                  <Video className="h-8 w-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Watch anywhere</h3>
              <p className="text-gray-700">online and on demand</p>
            </div>
          </div>
        </div>
      </section>

      {/* First Season Teaser */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Season 1 Coming Soon</h2>
          <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
            <Calendar className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <p className="text-lg text-gray-800 mb-6">
              Season 1 of Talk 100 will launch soon. Stay tuned for our first lineup of extraordinary leaders.
            </p>
            <Link 
              href="/#newsletter" 
              className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-8 rounded-lg transition duration-300"
            >
              Notify Me
            </Link>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-6">Join the Movement</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Be the first to watch, engage, and be inspired. Sign up now and don't miss the launch of Talk 100.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Link 
              href="/#newsletter" 
              className="inline-flex items-center justify-center bg-white text-yellow-600 font-bold py-3 px-8 rounded-lg transition duration-300 hover:bg-gray-100"
            >
              <Users className="h-5 w-5 mr-2" />
              Join Community
            </Link>
            
            <div className="inline-flex rounded-lg bg-white p-1">
              <a 
                href="https://instagram.com/top100afl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-md"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://youtube.com/top100afl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-md"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com/company/top100afl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-md"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Get Updates on Talk 100</h2>
            <p className="text-gray-700 mb-6">
              Subscribe to our newsletter to receive the latest updates on Talk 100 directly in your inbox.
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

      {/* Footer */}
      <section className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Top100 AFL</h3>
              <p className="text-gray-400 text-sm">
                Celebrating Africa's future leaders and creating pathways for impact across the continent.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Initiatives</h3>
              <ul className="space-y-2">
                <li><Link href="/initiatives/project100" className="text-gray-400 hover:text-white transition">Project100 Scholarship</Link></li>
                <li><Link href="/initiatives/talk100-live" className="text-gray-400 hover:text-white transition">Talk100 Live</Link></li>
                <li><Link href="/initiatives/summit" className="text-gray-400 hover:text-white transition">Future Leaders Summit</Link></li>
                <li><Link href="/initiatives/opportunities" className="text-gray-400 hover:text-white transition">Opportunities Hub</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Information</h3>
              <ul className="space-y-2">
                <li><Link href="/" className="text-gray-400 hover:text-white transition">Home</Link></li>
                <li><Link href="/awardees" className="text-gray-400 hover:text-white transition">Meet Awardees</Link></li>
                <li><Link href="/blog" className="text-gray-400 hover:text-white transition">Blog</Link></li>
                <li><Link href="/events" className="text-gray-400 hover:text-white transition">Events</Link></li>
                <li><Link href="/magazine" className="text-gray-400 hover:text-white transition">Magazine</Link></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">Connect</h3>
              <ul className="space-y-2">
                <li><Link href="/contact" className="text-gray-400 hover:text-white transition">Contact</Link></li>
                <li><Link href="/africa-future-leaders" className="text-gray-400 hover:text-white transition">About Us</Link></li>
                <li><Link href="/join" className="text-gray-400 hover:text-white transition">Partner With Us</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-400 text-sm">
              This page will be updated regularly as Talk 100 unfolds. Check back for new episodes, leader spotlights, and live session schedules.
            </p>
            <p className="text-gray-500 text-sm mt-4">
              &copy; {new Date().getFullYear()} Top100 Africa Future Leaders. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}