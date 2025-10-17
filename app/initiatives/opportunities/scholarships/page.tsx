import Link from 'next/link';

export default function ScholarshipsPage() {
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
            <span className="text-gray-900">Scholarships</span>
          </div>
        </nav>

        <main>
          <section className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Scholarships</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About Scholarships</h2>
              <p className="text-gray-700 mb-6">
                Scholarships are financial awards that support students in pursuing their educational goals. 
                They can cover tuition, living expenses, books, and other educational costs without requiring repayment.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Types of Scholarships</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                <li>Merit-based scholarships: Awarded based on academic, artistic, or athletic achievement</li>
                <li>Need-based scholarships: Awarded based on financial circumstances</li>
                <li>Diversity scholarships: Supporting underrepresented groups in specific fields</li>
                <li>Field-specific scholarships: Targeted at students in particular disciplines</li>
                <li>Country-specific scholarships: Available to students from specific regions</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">How to Find Scholarships</h3>
              <p className="text-gray-700 mb-4">
                Use our Opportunities Hub to filter and find scholarships that match your profile. 
                You can filter by location, level of study, field of study, and funding type.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link href="/initiatives/opportunities" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition duration-300">
                  Back to Opportunities Hub
                </Link>
                <Link href="/contact" className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg transition duration-300">
                  Contact Us
                </Link>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Application Tips</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Start early and keep track of deadlines</li>
                  <li>Tailor your essays to each scholarship</li>
                  <li>Secure strong recommendation letters</li>
                  <li>Highlight your unique experiences and achievements</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Common Requirements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Academic transcripts</li>
                  <li>Personal statement or essay</li>
                  <li>Letters of recommendation</li>
                  <li>Proof of financial need (for some scholarships)</li>
                  <li>Portfolio or work samples (for some fields)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Ready to Apply?</h3>
              <p className="text-blue-800 mb-4">
                Browse our scholarship opportunities and find the perfect match for you.
              </p>
              <Link href="/initiatives/opportunities" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Browse Scholarships
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}