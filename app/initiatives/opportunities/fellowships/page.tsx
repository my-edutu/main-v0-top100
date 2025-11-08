import Link from 'next/link';

export default function FellowshipsPage() {
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
            <span className="text-gray-900">Fellowships</span>
          </div>
        </nav>

        <main>
          <section className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Fellowships</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About Fellowships</h2>
              <p className="text-gray-700 mb-6">
                Fellowships are competitive programs that provide funding, mentorship, and professional development 
                opportunities to individuals in specific fields. They often include research, study, or work experience.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Types of Fellowships</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                <li>Academic fellowships: For research and advanced study</li>
                <li>Professional fellowships: For career advancement in specific fields</li>
                <li>Leadership fellowships: To develop leadership skills</li>
                <li>Policy fellowships: To work on public policy issues</li>
                <li>Arts and culture fellowships: For creative professionals</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Benefits of Fellowships</h3>
              <p className="text-gray-700 mb-4">
                Fellowships offer more than just financial support. They provide networking opportunities, 
                access to expert mentors, and platforms to develop new skills that advance your career.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/initiatives/opportunities" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-300">
                  Back to Opportunities Hub
                </Link>
                <a href="mailto:partnership@top100afl.com?subject=Fellowships%20Opportunity%20Inquiry&body=Hello%2C%0A%0AI%20would%20love%20to%20get%20more%20information%20on%20the%20Fellowships%20plan.%0A%0AThank%20you." className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg transition duration-300">
                  Contact Us
                </a>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Application Tips</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Clearly articulate your goals and how the fellowship aligns</li>
                  <li>Demonstrate your potential for impact</li>
                  <li>Provide evidence of past accomplishments and leadership</li>
                  <li>Secure strong letters of recommendation</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Common Requirements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Detailed project proposal or research plan</li>
                  <li>Academic transcripts and CV</li>
                  <li>Letters of recommendation</li>
                  <li>Personal statement or essay</li>
                  <li>Interview (for many fellowships)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Ready to Apply?</h3>
              <p className="text-blue-800 mb-4">
                Browse our fellowship opportunities and find the perfect match for your career goals.
              </p>
              <Link href="/initiatives/opportunities" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Browse Fellowships
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}