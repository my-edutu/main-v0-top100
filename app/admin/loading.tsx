export default function AdminLoading() {
  return (
    <div className="space-y-6">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="h-10 w-64 bg-gradient-to-r from-orange-200 to-amber-200 rounded-lg animate-pulse"></div>
          <div className="h-5 w-96 bg-gray-200 rounded mt-2 animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
        ))}
      </div>

      {/* Content Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-white rounded-lg shadow animate-pulse"></div>
        <div className="h-96 bg-white rounded-lg shadow animate-pulse"></div>
      </div>

      {/* Bottom Cards Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-lg shadow animate-pulse"></div>
        <div className="h-80 bg-white rounded-lg shadow animate-pulse"></div>
      </div>

      {/* Loading Overlay */}
      <div className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="h-16 w-16 border-4 border-orange-200 rounded-full"></div>
            <div className="h-16 w-16 border-4 border-orange-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">Loading...</p>
            <p className="text-sm text-gray-500 mt-1">Please wait while we load the content</p>
          </div>
        </div>
      </div>
    </div>
  )
}
