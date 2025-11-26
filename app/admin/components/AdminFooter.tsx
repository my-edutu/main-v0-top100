'use client'

export default function AdminFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-white border-t border-gray-200 py-6 mt-8">
      <div className="container mx-auto px-0 sm:px-1">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="text-sm text-gray-600 mb-4 md:mb-0">
            © {currentYear} Top100 Africa Future Leaders. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a 
              href="/admin/privacy" 
              className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="/admin/terms" 
              className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              Terms of Service
            </a>
            <a 
              href="/admin/support" 
              className="text-sm text-gray-600 hover:text-orange-600 transition-colors"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}