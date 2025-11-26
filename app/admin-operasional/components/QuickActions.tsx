'use client';
import { useState } from 'react';

export default function QuickActions() {
  const [showQRScanner, setShowQRScanner] = useState(false);

  const actions = [
    {
      title: 'Scan QR Code',
      description: 'Scan keanggotaan member',
      icon: '📱',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => setShowQRScanner(true)
    },
    {
      title: 'Tambah Member',
      description: 'Registrasi member baru',
      icon: '👤',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => console.log('Tambah Member')
    },
    {
      title: 'Laporan Cepat',
      description: 'Generate laporan harian',
      icon: '📊',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => console.log('Laporan Cepat')
    },
    {
      title: 'Manajemen Staff',
      description: 'Kelola jadwal staff',
      icon: '👨‍💼',
      color: 'bg-orange-500 hover:bg-orange-600',
      onClick: () => console.log('Manajemen Staff')
    }
  ];

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Aksi Cepat</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex items-center space-x-4 p-4 text-white rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md ${action.color}`}
            >
              <div className="text-2xl">{action.icon}</div>
              <div className="text-left">
                <div className="font-semibold">{action.title}</div>
                <div className="text-sm opacity-90">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Scan QR Code</h3>
              <button
                onClick={() => setShowQRScanner(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center mb-4">
              <div className="text-center text-gray-600">
                <div className="text-4xl mb-2">📷</div>
                <p>Scanner Camera</p>
                <p className="text-sm">Arahkan kamera ke QR Code member</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowQRScanner(false)}
                className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  console.log('Manual input');
                  setShowQRScanner(false);
                }}
                className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Input Manual
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}