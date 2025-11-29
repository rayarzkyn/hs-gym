'use client';
import { useState, useEffect } from 'react';

interface FacilityStatusProps {
  data: any[];
  detailed?: boolean;
}

export default function FacilityStatus({ data, detailed = false }: FacilityStatusProps) {
  const [facilities, setFacilities] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      setFacilities(data);
    }
  }, [data]);

  const getStatusColor = (status: string) => {
    const colors = {
      available: 'bg-green-500',
      maintenance: 'bg-red-500',
      occupied: 'bg-yellow-500',
      cleaning: 'bg-blue-500',
      closed: 'bg-gray-500'
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const texts = {
      available: 'Tersedia',
      maintenance: 'Maintenance',
      occupied: 'Digunakan',
      cleaning: 'Pembersihan',
      closed: 'Tutup'
    };
    return texts[status as keyof typeof texts] || status;
  };

  if (!facilities || facilities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Status Fasilitas</h2>
        <div className="text-center text-gray-500 py-8">
          Tidak ada data fasilitas
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">Status Fasilitas</h2>
        <div className="text-sm text-gray-600">
          {facilities.filter(f => f.status === 'available').length} dari {facilities.length} tersedia
        </div>
      </div>

      <div className="space-y-4">
        {facilities.map((facility) => (
          <div
            key={facility.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(facility.status)}`}></div>
                <div>
                  <h3 className="font-semibold text-gray-800">{facility.name}</h3>
                  <p className="text-sm text-gray-600">
                    {facility.currentUsage || 0}/{facility.capacity} orang • {getStatusText(facility.status)}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {Math.round(((facility.currentUsage || 0) / facility.capacity) * 100)}%
                </div>
                <div className="text-xs text-gray-500">kapasitas</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getStatusColor(facility.status)}`}
                style={{ width: `${((facility.currentUsage || 0) / facility.capacity) * 100}%` }}
              ></div>
            </div>

            {/* Detailed View */}
            {detailed && facility.equipment && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Equipment:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {facility.equipment.map((equip: any, index: number) => (
                    <div key={index} className="flex justify-between">
                      <span className="text-gray-600">{equip.name}</span>
                      <span className={`px-2 rounded ${
                        equip.status === 'good' ? 'bg-green-100 text-green-800' :
                        equip.status === 'maintenance' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {equip.count} unit
                      </span>
                    </div>
                  ))}
                </div>
                
                {/* Maintenance Info */}
                {facility.nextMaintenance && (
                  <div className="mt-2 text-xs text-gray-500">
                    Maintenance: {new Date(facility.nextMaintenance).toLocaleDateString('id-ID')}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Status Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Tersedia</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <span>Digunakan</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Maintenance</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Pembersihan</span>
        </div>
      </div>
    </div>
  );
}