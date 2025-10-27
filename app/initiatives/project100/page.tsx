import Image from 'next/image';
import Link from 'next/link';

export default function Project100Page() {
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
            <span className="text-gray-900">Project100 Scholarship</span>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Banner */}
        <section className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">🎓 Project100 Scholarship</h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              From street to school — giving every child the chance to dream again.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button className="bg-white hover:bg-gray-100 text-yellow-600 font-bold py-3 px-6 rounded-lg transition duration-300">
                Donate Now
              </button>
              <button className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300">
                Become a Partner
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">About Project100 Scholarship</h2>
              <p className="text-gray-700 text-lg">
                Project100 Scholarship is an initiative of Top100 Africa Future Leaders dedicated to sending disadvantaged children and undergraduates back to school. 
                Our mission is to provide educational opportunities to those who need them most, breaking the cycle of poverty through knowledge and empowerment.
              </p>
              <div className="mt-6">
                <Link href="/initiatives/opportunities/scholarships" className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Our Mission</h2>
            <div className="max-w-3xl mx-auto">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="bg-yellow-100 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700">Provide scholarships to deserving students who cannot afford education</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-yellow-100 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700">Offer mentorship programs to guide students in their academic and career paths</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-yellow-100 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700">Create opportunities for global exposure and networking</span>
                </li>
                <li className="flex items-start">
                  <div className="bg-yellow-100 p-2 rounded-full mr-4">
                    <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <span className="text-lg text-gray-700">Break the intergenerational cycle of poverty through education</span>
                </li>
              </ul>
              <div className="mt-8 text-center">
                <Link href="/initiatives/opportunities/scholarships" className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                  Learn More About Our Mission
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Support Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Who We Support</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-yellow-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Disadvantaged Children</h3>
                <p className="text-gray-700">Children from impoverished backgrounds who lack access to quality education and basic resources.</p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-yellow-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Mission-Driven Undergraduates</h3>
                <p className="text-gray-700">University students with a passion for social impact but limited financial resources.</p>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-yellow-600 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">First-Class/Outstanding Students</h3>
                <p className="text-gray-700">Exceptional students with academic excellence but facing financial constraints.</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link href="/initiatives/opportunities/scholarships" className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Learn More About Who We Support
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-yellow-600">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Identification</h3>
                <p className="text-gray-700">We identify disadvantaged children and students in need through our network of community leaders and educators.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-yellow-600">2</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Selection</h3>
                <p className="text-gray-700">Our committee carefully selects candidates based on need, merit, and potential for leadership.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-yellow-600">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Scholarship Support</h3>
                <p className="text-gray-700">We provide comprehensive support including tuition, books, uniforms, and basic necessities.</p>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-yellow-600">4</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Monitoring & Growth</h3>
                <p className="text-gray-700">We track progress and provide mentorship to ensure our scholars reach their full potential.</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link href="/initiatives/opportunities/scholarships" className="inline-block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Learn More About Our Process
              </Link>
            </div>
          </div>
        </section>

        {/* Impact Section */}
        <section className="py-16 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Our Impact</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">16+</div>
                <p className="text-white/90">Nigerian States</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">50+</div>
                <p className="text-white/90">Already Back to School</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">500+</div>
                <p className="text-white/90">Identified for Support</p>
              </div>
              
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">400+</div>
                <p className="text-white/90">Awardees Backing</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why It Matters Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Why It Matters</h2>
              <p className="text-gray-700 text-lg mb-8">
                Education is the greatest equalizer, unlocking the potential of every child regardless of their background. 
                When we invest in a child's education, we're not just changing one life — we're creating a ripple effect that 
                transforms entire communities. Every scholar we support becomes a beacon of hope, demonstrating that with 
                the right opportunity, anyone can rise above their circumstances and achieve greatness. 
                Education restores dignity, builds confidence, and opens doors to possibilities that once seemed impossible.
              </p>
              <div className="relative h-64 rounded-xl overflow-hidden max-w-2xl mx-auto">
                <Image 
                  src="https://placehold.co/600x400?text=Education+Transforming+Lives" 
                  alt="Children in a classroom receiving educational support" 
                  fill
                  className="object-cover opacity-80"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Get Involved Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Get Involved</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="text-yellow-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Become a Donor</h3>
                <p className="text-gray-700 mb-6">
                  Your contribution directly funds scholarships, providing access to education for disadvantaged children.
                </p>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                    Donate Now
                  </button>
                  <Link href="/initiatives/opportunities/scholarships" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 text-center">
                    Learn More
                  </Link>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="text-yellow-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Become a Mentor</h3>
                <p className="text-gray-700 mb-6">
                  Share your expertise and guide scholars in their academic and professional journey.
                </p>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                    Volunteer as Mentor
                  </button>
                  <Link href="/initiatives/opportunities/scholarships" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 text-center">
                    Learn More
                  </Link>
                </div>
              </div>
              
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center">
                <div className="text-yellow-500 mb-4">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Become a Partner</h3>
                <p className="text-gray-700 mb-6">
                  Collaborate with us to expand our reach and impact in transforming lives through education.
                </p>
                <div className="space-y-3">
                  <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                    Partner With Us
                  </button>
                  <Link href="/initiatives/opportunities/scholarships" className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-6 rounded-lg transition duration-300 text-center">
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stories Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Scholar Stories</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
                  <Image 
                    src="https://placehold.co/600x300?text=Aisha%27s+Journey" 
                    alt="Scholar story" 
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Aisha's Journey</h3>
                  <p className="text-gray-700 mb-4">
                    From the streets of Lagos to university — Aisha's story of transformation through education.
                  </p>
                  <button className="text-blue-600 font-medium hover:underline">
                    Read Full Story
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
                  <Image 
                    src="https://placehold.co/600x300?text=David%27s+Achievement" 
                    alt="Scholar story" 
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">David's Achievement</h3>
                  <p className="text-gray-700 mb-4">
                    How a scholarship helped David become the first in his family to attend college.
                  </p>
                  <button className="text-blue-600 font-medium hover:underline">
                    Read Full Story
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
                  <Image 
                    src="https://placehold.co/600x300?text=Fatima%27s+Leadership" 
                    alt="Scholar story" 
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Fatima's Leadership</h3>
                  <p className="text-gray-700 mb-4">
                    From refugee to scholar — Fatima's path to becoming a community leader.
                  </p>
                  <button className="text-blue-600 font-medium hover:underline">
                    Read Full Story
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
                  <Image 
                    src="https://placehold.co/600x300?text=Samuel%27s+Success" 
                    alt="Scholar story" 
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Samuel's Success</h3>
                  <p className="text-gray-700 mb-4">
                    Overcoming financial hardship to pursue engineering at a top university.
                  </p>
                  <button className="text-blue-600 font-medium hover:underline">
                    Read Full Story
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
                  <Image 
                    src="https://placehold.co/600x300?text=Grace%27s+Journey" 
                    alt="Scholar story" 
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Grace's Journey</h3>
                  <p className="text-gray-700 mb-4">
                    From rural village to medical school — breaking barriers in healthcare.
                  </p>
                  <button className="text-blue-600 font-medium hover:underline">
                    Read Full Story
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-48 bg-gray-200 relative">
                  <Image 
                    src="https://placehold.co/600x300?text=Kofi%27s+Transformation" 
                    alt="Scholar story" 
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Kofi's Transformation</h3>
                  <p className="text-gray-700 mb-4">
                    Becoming the first in his family to graduate despite multiple challenges.
                  </p>
                  <button className="text-blue-600 font-medium hover:underline">
                    Read Full Story
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Stay Updated</h2>
              <p className="text-gray-700 mb-6">
                Subscribe to our newsletter to receive updates on our scholarship program and success stories.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Your email address" 
                  className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-3 px-6 rounded-lg transition duration-300 whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer would normally go here */}
    </div>
  );
}