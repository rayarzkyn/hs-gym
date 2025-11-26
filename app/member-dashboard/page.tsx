'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface MemberData {
  nomor_member: string;
  e_card_number: string;
  paket_keanggotaan: string;
  tanggal_bergabung: string;
  tanggal_berakhir: string;
  status: string;
  payment_status?: string;
  status_pembayaran?: string;
}

export default function MemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [router]);

  const checkAuth = () => {
    console.log('🔍 Starting auth check...');
    const userData = localStorage.getItem('user');
    
    console.log('📋 User data from localStorage:', userData);
    
    if (!userData) {
      console.log('❌ No user data found, redirecting to login');
      router.push('/login');
      return;
    }
    
    try {
      const userObj = JSON.parse(userData);
      console.log('✅ User object parsed:', userObj);
      console.log('💰 Payment status from localStorage:', userObj.status_pembayaran);
      
      if (userObj.role !== 'member') {
        console.log('❌ User role is not member, redirecting to login. Role:', userObj.role);
        router.push('/login');
        return;
      }
      
      console.log('✅ Auth successful, setting user data');
      setUser(userObj);
      setAuthChecked(true);
      fetchMemberData(userObj.id || userObj.member_id);
    } catch (error) {
      console.error('💥 Error parsing user data:', error);
      router.push('/login');
    }
  };

  const fetchMemberData = async (memberId: number) => {
    try {
      console.log('📡 Fetching member data for ID:', memberId);
      
      // 1. Ambil data dari API member/data
      const memberResponse = await fetch(`/api/member/data?member_id=${memberId}`);
      const memberResult = await memberResponse.json();

      // 2. Ambil status pembayaran dari API member/status
      const statusResponse = await fetch(`/api/member/status?member_id=${memberId}`);
      const statusResult = await statusResponse.json();

      console.log('📊 Member data API result:', memberResult);
      console.log('💰 Payment status API result:', statusResult);

      if (memberResult.success) {
        // Gabungkan data dari kedua API
        const combinedData = {
          ...memberResult.data,
          // Prioritaskan status dari API status, lalu dari member data, lalu dari localStorage
          payment_status: statusResult.payment_status || 
                         memberResult.data.status_pembayaran || 
                         statusResult.member_status ||
                         'unknown'
        };
        
        console.log('📦 Combined member data:', combinedData);
        setMemberData(combinedData);
      } else {
        console.error('❌ Error fetching member data:', memberResult.error);
        // Fallback ke data dari localStorage
        setMemberData({
          nomor_member: user?.member_id?.toString() || user?.id?.toString() || 'N/A',
          e_card_number: user?.ecard_code || 'N/A',
          paket_keanggotaan: 'Bulanan',
          tanggal_bergabung: user?.tanggal_daftar || new Date().toISOString(),
          tanggal_berakhir: user?.masa_aktif || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          payment_status: user?.status_pembayaran || 'completed'
        });
      }
    } catch (error) {
      console.error('💥 Error fetching member data:', error);
      // Fallback ke data dari localStorage
      setMemberData({
        nomor_member: user?.member_id?.toString() || user?.id?.toString() || 'N/A',
        e_card_number: user?.ecard_code || 'N/A',
        paket_keanggotaan: 'Bulanan',
        tanggal_bergabung: user?.tanggal_daftar || new Date().toISOString(),
        tanggal_berakhir: user?.masa_aktif || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        payment_status: user?.status_pembayaran || 'completed'
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('🚪 Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  // Tentukan status pembayaran untuk ditampilkan
  const isPaymentCompleted = memberData?.payment_status === 'completed' || 
                            memberData?.payment_status === 'success' || 
                            user?.status_pembayaran === 'completed';

  // Show loading while checking authentication
  if (!authChecked || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {!authChecked ? 'Memeriksa autentikasi...' : 'Memuat dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <nav className="bg-white shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Member Dashboard</h1>
                <p className="text-sm text-gray-600">HS Gym Rancakihiyang</p>
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
        {/* Debug Info - Hanya di development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Debug Info:</strong> Payment Status: {memberData?.payment_status} | 
              User Status: {user?.status_pembayaran} | 
              Is Completed: {isPaymentCompleted.toString()}
            </p>
          </div>
        )}

        {/* Payment Status Alert */}
        {!isPaymentCompleted && (
          <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-yellow-800">Menunggu Pembayaran</h3>
                <p className="text-yellow-700">Silakan selesaikan pembayaran untuk mengaktifkan keanggotaan</p>
                <p className="text-yellow-600 text-sm mt-1">
                  Status: {memberData?.payment_status || user?.status_pembayaran || 'unknown'}
                </p>
              </div>
              <Link 
                href="/member/payment"
                className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition"
              >
                Bayar Sekarang
              </Link>
            </div>
          </div>
        )}

        {isPaymentCompleted && (
          <div className="mb-6 p-4 bg-green-100 border border-green-400 rounded-lg">
            <div className="flex items-center">
              <span className="text-green-600 mr-2">✅</span>
              <span className="text-green-800 font-semibold">Pembayaran berhasil! Keanggotaan aktif.</span>
            </div>
          </div>
        )}

        {/* Member Card */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl p-8 mb-8 shadow-2xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">Kartu Member Digital</h2>
              <p className="text-blue-100 text-lg">No. Member: {user.member_id || user.id}</p>
              <p className="text-blue-100">E-Card: {user.ecard_code || 'MEM-000'}</p>
              <p className="text-blue-100">Username: {user.username}</p>
              <div className="mt-4">
                <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                  isPaymentCompleted ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {isPaymentCompleted ? 'AKTIF' : 'MENUNGGU'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">HS GYM</div>
              <p className="text-blue-100 mt-2">Paket: {memberData?.paket_keanggotaan || 'Bulanan'}</p>
              <p className="text-blue-100">Bergabung: {new Date(user.tanggal_daftar || Date.now()).toLocaleDateString('id-ID')}</p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
            <div className="text-gray-600">Kunjungan Bulan Ini</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {isPaymentCompleted ? '100%' : '0%'}
            </div>
            <div className="text-gray-600">Status Keanggotaan</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {user.masa_aktif ? Math.ceil((new Date(user.masa_aktif).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : '30'}
            </div>
            <div className="text-gray-600">Hari Tersisa</div>
          </div>
        </div>

        {/* Quick Actions */}
        {isPaymentCompleted && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-xl font-bold mb-4">Aksi Cepat</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="bg-blue-500 text-white p-4 rounded-lg hover:bg-blue-600 transition">
                Check-in Gym
              </button>
              <button className="bg-green-500 text-white p-4 rounded-lg hover:bg-green-600 transition">
                Lihat Jadwal
              </button>
              <button className="bg-purple-500 text-white p-4 rounded-lg hover:bg-purple-600 transition">
                Riwayat
              </button>
              <Link 
                href="/member/payment"
                className="bg-yellow-500 text-white p-4 rounded-lg hover:bg-yellow-600 transition text-center"
              >
                Perpanjang
              </Link>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Status Keanggotaan</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Pendaftaran</span>
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
                Selesai
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pembayaran</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                isPaymentCompleted 
                  ? 'bg-green-100 text-green-800' 
                  : memberData?.payment_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {isPaymentCompleted ? 'Lunas' : 
                 memberData?.payment_status === 'pending' ? 'Menunggu' : 'Belum Bayar'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Akses Gym</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                isPaymentCompleted 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {isPaymentCompleted ? 'Aktif' : 'Terkunci'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Masa Aktif</span>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                {user.masa_aktif ? new Date(user.masa_aktif).toLocaleDateString('id-ID') : '30 hari'}
              </span>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-6">
          <h3 className="text-xl font-bold mb-4">Informasi Akun</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600"><strong>Username:</strong> {user.username}</p>
              <p className="text-gray-600"><strong>Nama:</strong> {user.nama}</p>
              <p className="text-gray-600"><strong>Telepon:</strong> {user.telepon}</p>
            </div>
            <div>
              <p className="text-gray-600"><strong>E-Card:</strong> {user.ecard_code}</p>
              <p className="text-gray-600"><strong>Tanggal Daftar:</strong> {new Date(user.tanggal_daftar || Date.now()).toLocaleDateString('id-ID')}</p>
              <p className="text-gray-600"><strong>Role:</strong> {user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}