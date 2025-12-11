'use client';

import { useEffect, useState } from 'react';

const DashboardSkeleton = () => {
  const [showProgressive, setShowProgressive] = useState(false);
  
  // Progressive loading effect
  useEffect(() => {
    const timer1 = setTimeout(() => {
      setShowProgressive(true);
    }, 50);
    
    return () => clearTimeout(timer1);
  }, []);
  
  // Initial minimal skeleton
  if (!showProgressive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">Menyiapkan dashboard...</div>
          <div className="text-sm text-gray-500 mt-2">Loading ultra-fast</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex justify-between items-center bg-white rounded-xl p-4 shadow animate-pulse">
        <div>
          <div className="h-7 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-100 rounded w-32"></div>
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded-lg"></div>
      </div>
      
      {/* Stats grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 shadow animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-28 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-16"></div>
          </div>
        ))}
      </div>
      
      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart skeleton */}
        <div className="bg-white rounded-xl p-4 shadow animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
          <div className="h-64 bg-gray-100 rounded mb-4"></div>
          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-3 bg-gray-200 rounded w-12"></div>
            ))}
          </div>
        </div>
        
        {/* Side panel skeletons */}
        <div className="space-y-6">
          {/* Pending payments skeleton */}
          <div className="bg-white rounded-xl p-4 shadow animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
          
          {/* Export panel skeleton */}
          <div className="bg-white rounded-xl p-4 shadow animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="h-24 bg-gray-100 rounded mb-4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;