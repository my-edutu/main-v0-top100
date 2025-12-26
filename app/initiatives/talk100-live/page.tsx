'use client';

import { Mail, Users, Globe, Video, Send, MessageCircle, Instagram, Youtube, Linkedin, Calendar, GraduationCap } from 'lucide-react';
import Link from 'next/link';
import NewsletterForm from '@/app/components/NewsletterForm';

export default function Talk100Live() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="py-20 bg-white text-gray-900">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Talk 100 – Coming Soon</h1>
            <p className="text-xl md:text-2xl mb-8">
              An inspiring new live interview series with Top100 Africa Future Leaders.
            </p>
            <div className="bg-gray-100 rounded-xl p-6 max-w-2xl mx-auto">
              <p className="text-lg mb-6">
                An inspiring new live interview series with Top100 Africa Future Leaders.
              </p>
            </div>
            <div className="mt-8">
              <Link
                href="#newsletter"
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
              href="#newsletter"
              className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-8 rounded-lg transition duration-300"
            >
              Notify Me
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section id="newsletter" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Get Updates on Talk 100</h2>
            <p className="text-gray-700">
              Subscribe to our newsletter to receive the latest updates on Talk 100 directly in your inbox.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>

    </div>
  );
}