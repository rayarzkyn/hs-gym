'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserData {
  role: string;
  username: string;
  nama: string;
  masa_aktif?: string;
  ecard_code?: string;
  tanggal_kunjungan?: string;
  expired_at?: string;
  urutan_harian?: number;
}

export default function MemberDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    router.push('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">HS</span>
              </div>
              <span className="text-xl font-bold text-gray-800">
                {user.role === 'non_member' ? 'Non-Member Dashboard' : 'Member Dashboard'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Halo, {user.nama}</span>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-6 py-8">
        {/* Role Badge */}
        <div className="mb-6">
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
            user.role === 'non_member' 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {user.role === 'non_member' ? 'Non-Member Daily' : 'Member'}
          </span>
        </div>

        {/* E-Card Section */}
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className={`py-4 text-center ${
              user.role === 'non_member' ? 'bg-orange-500' : 'bg-blue-500'
            }`}>
              <h2 className="text-xl font-bold text-white">
                {user.role === 'non_member' ? 'DAILY PASS' : 'MEMBER CARD'}
              </h2>
              <p className="text-white text-opacity-90 text-sm">
                {user.role === 'non_member' ? 'Non-Member Access Card' : 'HS Gym Membership'}
              </p>
            </div>
            
            <div className="p-6">
              {/* Gym Logo */}
              <div className="text-center mb-6">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  user.role === 'non_member' ? 'bg-orange-500' : 'bg-blue-500'
                }`}>
                  <span className="text-2xl font-bold text-white">HS</span>
                </div>
                <p className="text-sm text-gray-500">
                  {user.role === 'non_member' 
                    ? 'Tunjukkan kepada admin untuk check-in' 
                    : 'Kartu Member HS Gym'
                  }
                </p>
              </div>
              
              {/* Information Grid */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="font-semibold text-gray-700">Nama:</span>
                  <span className="text-gray-600">{user.nama}</span>
                </div>

                {user.role === 'non_member' ? (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-700">Username:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                        {user.username}
                      </code>
                    </div>

                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-700">E-Card Code:</span>
                      <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-800 font-bold">
                        {user.ecard_code}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-700">Pengunjung Ke:</span>
                      <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold">
                        #{user.urutan_harian}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-700">Tanggal:</span>
                      <span className="text-gray-600">
                        {user.tanggal_kunjungan && new Date(user.tanggal_kunjungan).toLocaleDateString('id-ID', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Berlaku Sampai:</span>
                      <span className="text-red-600 font-bold">
                        {user.expired_at && new Date(user.expired_at).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })} WIB
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-700">Username:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded font-mono text-sm">
                        {user.username}
                      </code>
                    </div>

                    <div className="flex justify-between items-center border-b pb-2">
                      <span className="font-semibold text-gray-700">Masa Aktif:</span>
                      <span className={`${
                        user.masa_aktif && new Date(user.masa_aktif) < new Date() 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      } font-semibold`}>
                        {user.masa_aktif && new Date(user.masa_aktif).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700">Status:</span>
                      <span className={`${
                        user.masa_aktif && new Date(user.masa_aktif) < new Date() 
                          ? 'text-red-600' 
                          : 'text-green-600'
                      } font-semibold`}>
                        {user.masa_aktif && new Date(user.masa_aktif) < new Date() 
                          ? 'Tidak Aktif' 
                          : 'Aktif'
                        }
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 py-3 text-center">
              <p className="text-sm text-gray-600">
                Terima kasih telah berkunjung ke HS Gym Rancakihiyang
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex gap-4">
            <button 
              onClick={() => window.print()}
              className="flex-1 bg-green-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-green-600 transition-colors"
            >
              Print E-Card
            </button>
            <Link 
              href="/"
              className="flex-1 bg-gray-500 text-white px-4 py-3 rounded-xl font-semibold hover:bg-gray-600 transition-colors text-center"
            >
              Kembali ke Home
            </Link>
          </div>

          {/* Info untuk Non-Member */}
          {user.role === 'non_member' && (
            <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800 text-center">
                <strong>Perhatian:</strong> Akses hanya berlaku untuk hari ini sampai jam 23:59. 
                Besok harus melakukan pembayaran lagi untuk mendapatkan credentials baru.
              </p>
            </div>
          )}

          {/* Info untuk Member */}
          {user.role === 'member' && user.masa_aktif && new Date(user.masa_aktif) < new Date() && (
            <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800 text-center">
                <strong>Masa aktif telah habis!</strong> Silakan perpanjang keanggotaan Anda.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}