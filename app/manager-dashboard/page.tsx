'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const userObj = JSON.parse(userData);
    if (userObj.role !== 'manager') {
      router.push('/login');
      return;
    }
    
    setUser(userObj);
  }, [router]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Manager Dashboard</h1>
                <p className="text-sm text-gray-600">HS Gym Management System</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Halo, <strong>{user.nama}</strong></span>
              <button 
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">1,245</div>
            <div className="text-gray-600">Total Pengunjung Bulan Ini</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">Rp 85.2M</div>
            <div className="text-gray-600">Pendapatan Tahunan</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">89%</div>
            <div className="text-gray-600">Kepuasan Member</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Manager Dashboard</h2>
          <div className="space-y-4">
            <p>Selamat datang di panel manager HS Gym.</p>
            <p>Anda memiliki akses penuh untuk memonitoring seluruh operasional gym.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold">Operasional</h3>
                <p className="text-sm text-gray-600">Pantau kinerja staff dan fasilitas</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold">Keuangan</h3>
                <p className="text-sm text-gray-600">Analisis laporan keuangan</p>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold">Member</h3>
                <p className="text-sm text-gray-600">Data member dan retention</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <h3 className="font-semibold">Marketing</h3>
                <p className="text-sm text-gray-600">Strategi pemasaran</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}