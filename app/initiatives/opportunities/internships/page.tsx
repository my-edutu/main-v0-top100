import Link from 'next/link';

export default function InternshipsPage() {
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
            <Link href="/initiatives/opportunities" className="hover:text-blue-600">Opportunities Hub</Link>
            <span>/</span>
            <span className="text-gray-900">Internships</span>
          </div>
        </nav>

        <main>
          <section className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Internships</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About Internships</h2>
              <p className="text-gray-700 mb-6">
                Internships provide hands-on work experience in a particular field or industry. 
                They allow students and recent graduates to apply classroom knowledge in real-world settings.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Types of Internships</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                <li>Summer internships: Typically during university breaks</li>
                <li>Co-op programs: Alternating periods of study and work</li>
                <li>Virtual internships: Remote work opportunities</li>
                <li>Unpaid internships: For experience rather than compensation</li>
                <li>Graduate internships: For recent graduates seeking experience</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Benefits of Internships</h3>
              <p className="text-gray-700 mb-4">
                Internships provide practical experience, networking opportunities, professional skill development, 
                and often serve as pathways to full-time employment in the chosen field.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/initiatives/opportunities" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-300">
                  Back to Opportunities Hub
                </Link>
                <a href="mailto:partnership@top100afl.com?subject=Internships%20Opportunity%20Inquiry&body=Hello%2C%0A%0AI%20would%20love%20to%20get%20more%20information%20on%20the%20Internships%20plan.%0A%0AThank%20you." className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg transition duration-300">
                  Contact Us
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Application Tips</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Customize your resume and cover letter for each role</li>
                  <li>Highlight relevant coursework and projects</li>
                  <li>Prepare for interviews by researching the organization</li>
                  <li>Follow up after applications and interviews</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Common Requirements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Resume or CV</li>
                  <li>Cover letter</li>
                  <li>Academic transcripts</li>
                  <li>Letters of recommendation</li>
                  <li>Portfolio or work samples (for some positions)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Ready to Apply?</h3>
              <p className="text-blue-800 mb-4">
                Browse our internship opportunities and find the perfect match for your career path.
              </p>
              <Link href="/initiatives/opportunities" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Browse Internships
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}