// app/admin-operasional/components/FacilityStatus.tsx
'use client';

import { useState, useEffect } from 'react';

interface FacilityStatusProps {
  data: Array<{
    id: string;
    name: string;
    status: string;
    capacity: number;
    currentMembers: number;
    currentUsage: number;
    equipment: Array<{
      name: string;
      count: number;
      status: string;
    }>;
    peakHours: string[];
    lastMaintenance: string;
    nextMaintenance: string;
    activeMembers?: Array<{
      id: string;
      name: string;
      checkinTime: string;
      type?: string;
    }>;
    usagePercentage?: number;
    isAvailable?: boolean;
  }>;
  detailed?: boolean;
}

export default function FacilityStatus({ data, detailed = false }: FacilityStatusProps) {
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hasData, setHasData] = useState(false);

  // Update time setiap menit
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(timer);
  }, []);

  // Set loading false setelah data diterima
  useEffect(() => {
    console.log('📊 FacilityStatus received data:', data?.length || 0);
    
    if (data && data.length > 0) {
      setLoading(false);
      setHasData(true);
    } else if (data && data.length === 0) {
      setLoading(false);
      setHasData(false);
    }
    
    // Fallback: jika setelah 5 detik masih loading, force stop
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⏰ Timeout - forcing stop loading');
        setLoading(false);
        setHasData(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [data, loading]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Status Fasilitas</h2>
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-gray-200 h-4 w-20 rounded"></div>
            <div className="text-sm text-gray-500">
              {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        
        {/* Skeleton Loader */}
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-gray-100 rounded-xl p-4 h-40">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2 mb-4"></div>
                  <div className="h-2 bg-gray-300 rounded w-full mb-2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6 text-gray-500">
          <div className="inline-flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Memuat data fasilitas...
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Status Fasilitas</h2>
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏋️‍♂️</div>
          <p className="text-gray-500 text-lg mb-2">Data fasilitas tidak tersedia</p>
          <p className="text-gray-400 mb-4">SSE connection mungkin terputus</p>
          
          <div className="flex justify-center space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
            >
              🔄 Refresh Halaman
            </button>
            <button 
              onClick={() => setHasData(true)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition text-sm"
            >
              Tampilkan Data Offline
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getStatusInfo = (status: string, usagePercentage: number) => {
    if (status === 'maintenance') {
      return {
        label: 'Maintenance',
        color: 'bg-gray-100 text-gray-800',
        textColor: 'text-gray-600',
        icon: '🔧'
      };
    }
    
    if (status === 'cleaning') {
      return {
        label: 'Pembersihan',
        color: 'bg-blue-100 text-blue-800',
        textColor: 'text-blue-600',
        icon: '🧹'
      };
    }
    
    if (usagePercentage >= 90) {
      return {
        label: 'Penuh',
        color: 'bg-red-100 text-red-800',
        textColor: 'text-red-600',
        icon: '🔴'
      };
    } else if (usagePercentage >= 70) {
      return {
        label: 'Ramai',
        color: 'bg-orange-100 text-orange-800',
        textColor: 'text-orange-600',
        icon: '🟠'
      };
    } else if (usagePercentage >= 40) {
      return {
        label: 'Sedang',
        color: 'bg-yellow-100 text-yellow-800',
        textColor: 'text-yellow-600',
        icon: '🟡'
      };
    } else {
      return {
        label: 'Tersedia',
        color: 'bg-green-100 text-green-800',
        textColor: 'text-green-600',
        icon: '🟢'
      };
    }
  };

  // Hitung summary
  const totalCapacity = data.reduce((sum, f) => sum + (f.capacity || 0), 0);
  const totalCurrent = data.reduce((sum, f) => sum + (f.currentMembers || 0), 0);
  const availableFacilities = data.filter(f => 
    f.status === 'available' && 
    (f.currentMembers / f.capacity) < 0.9
  ).length;
  const fullFacilities = data.filter(f => 
    (f.currentMembers / f.capacity) >= 0.9
  ).length;
  const maintenanceFacilities = data.filter(f => 
    f.status === 'maintenance' || f.status === 'cleaning'
  ).length;

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Status Fasilitas</h2>
          <p className="text-sm text-gray-600">Real-time pengguna dan kapasitas</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-500">
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs">Live</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">{availableFacilities}</div>
          <div className="text-sm text-gray-700">Tersedia</div>
        </div>
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{totalCurrent}</div>
          <div className="text-sm text-gray-700">Pengguna Aktif</div>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 text-center border border-orange-200">
          <div className="text-2xl font-bold text-orange-600">{fullFacilities}</div>
          <div className="text-sm text-gray-700">Penuh</div>
        </div>
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 text-center border border-gray-200">
          <div className="text-2xl font-bold text-gray-600">{maintenanceFacilities}</div>
          <div className="text-sm text-gray-700">Maintenance</div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-xs">Tersedia (0-39%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span className="text-xs">Sedang (40-69%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span className="text-xs">Ramai (70-89%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs">Penuh (90-100%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span className="text-xs">Maintenance</span>
        </div>
      </div>

      {/* Facilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((facility) => {
          const usagePercentage = Math.round((facility.currentMembers / facility.capacity) * 100);
          const statusInfo = getStatusInfo(facility.status, usagePercentage);
          
          return (
            <div key={facility.id} className="border rounded-xl p-4 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-800">{facility.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </span>
                    <span className="text-xs text-gray-600">
                      {facility.currentMembers}/{facility.capacity}
                    </span>
                  </div>
                </div>
                <div className="text-2xl">
                  {facility.name.includes('Cardio') ? '🏃‍♂️' : 
                   facility.name.includes('Weight') ? '🏋️‍♂️' : 
                   facility.name.includes('Yoga') ? '🧘‍♀️' : '💪'}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600">Penggunaan</span>
                  <span className="font-medium">{usagePercentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${statusInfo.textColor.replace('text-', 'bg-')}`}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {detailed && facility.activeMembers && facility.activeMembers.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-gray-700 mb-1">
                    Pengguna Aktif ({facility.activeMembers.length}):
                  </p>
                  <div className="space-y-1">
                    {facility.activeMembers.slice(0, 3).map((member, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="truncate">{member.name}</span>
                        <span className="text-gray-500 text-xs">
                          {new Date(member.checkinTime).toLocaleTimeString('id-ID', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    ))}
                    {facility.activeMembers.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{facility.activeMembers.length - 3} lainnya
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Equipment Preview */}
              <div className="mt-2 text-xs text-gray-600">
                {facility.equipment.length > 0 ? (
                  <span>
                    Equipment: {facility.equipment.slice(0, 2).map(e => e.name).join(', ')}
                    {facility.equipment.length > 2 && ` +${facility.equipment.length - 2}`}
                  </span>
                ) : (
                  <span>No equipment data</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}