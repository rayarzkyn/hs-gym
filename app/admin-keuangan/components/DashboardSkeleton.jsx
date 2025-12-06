'use client';

const DashboardSkeleton = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header with refresh button skeleton */}
      <div className="flex justify-between items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-4 bg-gray-300 rounded w-24"></div>
                <div className="h-8 w-8 bg-gray-300 rounded-full"></div>
              </div>
              <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-20"></div>
            </div>
          ))}
        </div>
        <div className="h-10 w-24 bg-gray-300 rounded-lg ml-4"></div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart skeleton */}
        <div className="bg-gray-200 rounded-xl p-6">
          <div className="h-6 bg-gray-300 rounded w-40 mb-6"></div>
          <div className="h-64 bg-gray-300 rounded mb-4"></div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-3 bg-gray-300 rounded w-10"></div>
            ))}
          </div>
        </div>

        {/* Side panel skeletons */}
        <div className="space-y-6">
          {/* Pending payments skeleton */}
          <div className="bg-gray-200 rounded-xl p-6">
            <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-gray-300 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-300 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>

          {/* Export panel skeleton */}
          <div className="bg-gray-200 rounded-xl p-6">
            <div className="h-6 bg-gray-300 rounded w-40 mb-4"></div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-20 bg-gray-300 rounded"></div>
              ))}
            </div>
            <div className="h-10 bg-gray-300 rounded w-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;