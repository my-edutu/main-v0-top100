import Link from 'next/link';

export default function GrantsPage() {
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
            <span className="text-gray-900">Grants</span>
          </div>
        </nav>

        <main>
          <section className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Grants</h1>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">About Grants</h2>
              <p className="text-gray-700 mb-6">
                Grants are financial awards given to individuals, organizations, or institutions to support 
                specific projects or research. Unlike loans, grants do not need to be repaid.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Types of Grants</h3>
              <ul className="list-disc pl-6 space-y-2 mb-6 text-gray-700">
                <li>Research grants: For scientific, medical, or social research</li>
                <li>Educational grants: For students or educational programs</li>
                <li>Community development grants: For local projects and initiatives</li>
                <li>Arts and culture grants: For creative projects and cultural preservation</li>
                <li>Start-up grants: For early-stage business development</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Finding and Applying for Grants</h3>
              <p className="text-gray-700 mb-4">
                Grant applications typically require detailed project proposals, budgets, and reporting plans. 
                Success often depends on clearly demonstrating the impact and feasibility of your proposed work.
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
                  <li>Read guidelines carefully before applying</li>
                  <li>Ensure your project aligns with the grant's objectives</li>
                  <li>Develop a realistic and detailed budget</li>
                  <li>Prepare a strong narrative about your project's impact</li>
                </ul>
              </div>
              
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Common Requirements</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Detailed project proposal</li>
                  <li>Comprehensive budget</li>
                  <li>Timeline for project completion</li>
                  <li>Evidence of organizational capability</li>
                  <li>Letters of support (for some grants)</li>
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 text-center">
              <h3 className="text-xl font-semibold text-blue-900 mb-2">Ready to Apply?</h3>
              <p className="text-blue-800 mb-4">
                Browse our grant opportunities and find the perfect match for your project.
              </p>
              <Link href="/initiatives/opportunities" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition duration-300">
                Browse Grants
              </Link>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}