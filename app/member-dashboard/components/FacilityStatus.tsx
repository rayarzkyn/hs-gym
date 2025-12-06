// app/member-dashboard/components/FacilityStatus.tsx
'use client';

interface Equipment {
  name: string;
  count: number;
  status: string;
}

interface Facility {
  id: string;
  name: string;
  status: string;
  capacity: number;
  currentMembers: number;
  currentUsage: number;
  equipment: Equipment[];
  peakHours: string[];
  lastMaintenance: string;
  nextMaintenance: string;
  statusText?: string;
  isAvailable?: boolean;
  usagePercentage?: number;
}

interface FacilityStatusProps {
  facilities: Facility[];
  currentFacility?: string | null;
  onSelectFacility?: (facilityId: string, facilityName: string) => void;
  loading?: boolean;
  detailed?: boolean;
}

export default function FacilityStatus({ 
  facilities, 
  currentFacility, 
  onSelectFacility,
  loading = false,
  detailed = false 
}: FacilityStatusProps) {
  
  const getCapacityStatus = (facility: Facility) => {
    const usagePercentage = facility.usagePercentage || Math.round((facility.currentMembers / facility.capacity) * 100);
    
    if (facility.status === 'maintenance') {
      return { 
        text: 'Maintenance', 
        color: 'bg-gray-500', 
        textColor: 'text-gray-700',
        bgColor: 'bg-gray-100',
        isAvailable: false
      };
    }
    
    if (usagePercentage >= 90) {
      return { 
        text: 'Penuh', 
        color: 'bg-red-500', 
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        isAvailable: false
      };
    } else if (usagePercentage >= 70) {
      return { 
        text: 'Ramai', 
        color: 'bg-yellow-500', 
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        isAvailable: true
      };
    } else if (usagePercentage >= 40) {
      return { 
        text: 'Sedang', 
        color: 'bg-blue-500', 
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        isAvailable: true
      };
    } else {
      return { 
        text: 'Sejuk', 
        color: 'bg-green-500', 
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        isAvailable: true
      };
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat data fasilitas...</p>
      </div>
    );
  }

  if (!facilities || facilities.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg text-center">
        <div className="text-5xl mb-4">🏋️</div>
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Belum ada data fasilitas</h3>
        <p className="text-gray-500">Data fasilitas akan muncul di sini</p>
      </div>
    );
  }

  if (!detailed) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">🏋️ Status Fasilitas</h2>
          <span className="text-sm text-gray-500">Real-time</span>
        </div>
        
        <div className="space-y-4">
          {facilities.slice(0, 3).map((facility) => {
            const capacityStatus = getCapacityStatus(facility);
            const usagePercentage = facility.usagePercentage || Math.round((facility.currentMembers / facility.capacity) * 100);
            const isCurrent = currentFacility === facility.name;
            
            return (
              <div key={facility.id} className={`border rounded-lg p-4 hover:shadow-md transition ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold">{facility.name}</h3>
                    <p className="text-sm text-gray-600">
                      {facility.currentMembers}/{facility.capacity} orang • {capacityStatus.text}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${capacityStatus.textColor} ${capacityStatus.color.replace('bg-', 'bg-')} bg-opacity-20`}>
                      LIVE
                    </span>
                    {isCurrent && (
                      <span className="mt-1 text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                        Anda di sini
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Kapasitas</span>
                    <span>{usagePercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${capacityStatus.color}`}
                      style={{ width: `${usagePercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>🕐 {facility.peakHours?.[0] || '07:00-09:00'}</span>
                    <span>🏋️ {facility.equipment?.length || 0} alat</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Detailed View
  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold">🏋️ Semua Fasilitas</h2>
        <p className="text-gray-600">Pilih fasilitas yang ingin Anda gunakan</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {facilities.map((facility) => {
          const capacityStatus = getCapacityStatus(facility);
          const usagePercentage = facility.usagePercentage || Math.round((facility.currentMembers / facility.capacity) * 100);
          const isCurrent = currentFacility === facility.name;
          
          return (
            <div key={facility.id} className={`border rounded-xl p-4 hover:shadow-lg transition ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <h3 className="font-bold text-lg">{facility.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${capacityStatus.textColor} ${capacityStatus.color.replace('bg-', 'bg-')} bg-opacity-20`}>
                      LIVE
                    </span>
                  </div>
                  <p className="text-gray-600">
                    {facility.currentMembers}/{facility.capacity} orang • {capacityStatus.text}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${capacityStatus.color}`}>
                  {usagePercentage}%
                </span>
              </div>
              
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Kapasitas</span>
                  <span>Real-time</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${capacityStatus.color}`}
                    style={{ width: `${usagePercentage}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">🕐 Jam sibuk:</span>{' '}
                {facility.peakHours.join(', ')}
              </div>
              
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Equipment:</p>
                <div className="flex flex-wrap gap-2">
                  {facility.equipment.slice(0, 3).map((eq, idx) => (
                    <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {eq.name} ({eq.count} unit)
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mb-4">
                Maintenance terakhir: {formatDate(facility.lastMaintenance)} • 
                Next: {formatDate(facility.nextMaintenance)}
              </div>
              
              {onSelectFacility && (
                <button
                  onClick={() => onSelectFacility(facility.id, facility.name)}
                  disabled={!capacityStatus.isAvailable}
                  className={`w-full py-2 px-4 rounded-lg font-semibold ${
                    capacityStatus.isAvailable
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {capacityStatus.isAvailable ? `Pilih ${facility.name}` : capacityStatus.text}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}