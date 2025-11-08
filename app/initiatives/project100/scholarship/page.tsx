import Link from 'next/link';

export default function ScholarshipPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <nav className="mb-8">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            <Link href="/initiatives" className="hover:text-blue-600">Initiatives</Link>
            <span>/</span>
            <Link href="/initiatives/project100" className="hover:text-blue-600">Project100 Scholarship</Link>
            <span>/</span>
            <span className="text-gray-900">Scholarship Details</span>
          </div>
        </nav>

        <main>
          <section className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Project100 Scholarship Program</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About the Scholarship</h2>
              <p className="text-gray-700 mb-6">
                The Project100 Scholarship is an initiative of Top100 Africa Future Leaders dedicated to 
                providing educational opportunities to disadvantaged children and undergraduates across Africa. 
                Our mission is to break the cycle of poverty through knowledge and empowerment.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">What We Offer</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                <li>Full tuition coverage for selected scholars</li>
                <li>Learning materials and supplies</li>
                <li>Uniforms and basic necessities</li>
                <li>Mentorship programs with industry leaders</li>
                <li>Access to global networking opportunities</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Eligibility Criteria</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                <li>Must be a resident of an African country</li>
                <li>Demonstrated financial need</li>
                <li>Strong academic record or potential</li>
                <li>Commitment to community service</li>
                <li>Age between 6-25 years for different programs</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Application Process</h3>
              <ol className="list-decimal pl-6 space-y-2 mb-6 text-gray-700">
                <li>Complete the online application form</li>
                <li>Submit required documents (transcripts, recommendation letters, personal statement)</li>
                <li>Participate in an interview if shortlisted</li>
                <li>Receive decision via email</li>
              </ol>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/initiatives/project100" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-300">
                  Back to Project100
                </Link>
                <a href="mailto:partnership@top100afl.com?subject=Project100%20Scholarship%20Inquiry&body=Hello%2C%0A%0AI%20would%20love%20to%20get%20more%20information%20on%20the%20Project100%20Scholarship%20plan.%0A%0AThank%20you." className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg transition duration-300">
                  Contact Us
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For Students</h3>
                <p className="text-gray-700 mb-4">
                  Are you a talented student facing financial challenges? Apply for our scholarship to continue your education.
                </p>
                <Link href="/apply" className="text-blue-600 font-medium hover:underline">
                  Apply Now →
                </Link>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">For Sponsors</h3>
                <p className="text-gray-700 mb-4">
                  Become a sponsor and directly support a student's educational journey. Your contribution makes a difference.
                </p>
                <Link href="/sponsor" className="text-blue-600 font-medium hover:underline">
                  Become a Sponsor →
                </Link>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Have Questions?</h3>
              <p className="text-blue-800 mb-4">
                Our team is here to help you navigate the scholarship process.
              </p>
              <a href="mailto:partnership@top100afl.com?subject=Project100%20Scholarship%20Support&body=Hello%2C%0A%0AI%20would%20love%20to%20get%20more%20information%20on%20the%20Project100%20Scholarship%20plan.%0A%0AThank%20you." className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Contact Support
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}