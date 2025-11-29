'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface MemberData {
  id: string;
  nomor_member: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  tanggal_daftar: string | Date;
  masa_aktif: string | Date;
  status: string;
  membership_type: string;
  membership_plan: string;
  membership_price: number;
  sisa_hari: number;
  total_kunjungan: number;
  kunjungan_bulan_ini: number;
  riwayat_transaksi: any[];
  riwayat_kunjungan: any[];
}

export default function MemberDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [memberData, setMemberData] = useState<MemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }
    
    const userObj = JSON.parse(userData);
    if (userObj.role !== 'member') {
      router.push('/login');
      return;
    }
    
    setUser(userObj);
    fetchMemberData(userObj.username);
  }, [router]);

  const fetchMemberData = async (username: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Fetching member data for:', username);
      
      const response = await fetch(`/api/member/data?memberId=${username}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📨 Member data response:', result);
      
      if (result.success) {
        console.log('✅ Member data loaded:', result.data.nama);
        setMemberData(result.data);
      } else {
        console.error('❌ Error fetching member data:', result.error);
        setError(result.error || 'Gagal memuat data member');
      }
    } catch (error) {
      console.error('❌ Error fetching member data:', error);
      setError('Terjadi kesalahan saat memuat data member');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    try {
      console.log('🔄 Attempting checkin for:', user?.username);
      
      const response = await fetch('/api/member/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: user?.username
        }),
      });

      // Cek jika response OK
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('📨 Checkin response:', result);

      if (result.success) {
        alert(result.message || 'Check-in berhasil! Selamat berolahraga 🏋️‍♂️');
        // Refresh data
        fetchMemberData(user?.username);
      } else {
        alert('Gagal check-in: ' + result.error);
      }
    } catch (error) {
      console.error('Check-in error:', error);
      alert('Terjadi kesalahan saat check-in. Silakan coba lagi.');
    }
  };

  const getMembershipPlanInfo = (plan: string) => {
    const plans: any = {
      'Bulanan': { color: 'from-blue-500 to-cyan-500', price: 120000, duration: '1 bulan' },
      'Triwulan': { color: 'from-purple-500 to-pink-500', price: 300000, duration: '3 bulan' },
      'Semester': { color: 'from-green-500 to-emerald-500', price: 550000, duration: '6 bulan' },
      'Tahunan': { color: 'from-orange-500 to-red-500', price: 1000000, duration: '12 bulan' }
    };
    return plans[plan] || plans['Bulanan'];
  };

  const getRemainingDaysText = (days: number): string => {
    if (days === 0) return 'Habis';
    if (days === 1) return '1 hari';
    if (days < 7) return `${days} hari`;
    if (days < 30) return `${Math.ceil(days / 7)} minggu`;
    return `${Math.ceil(days / 30)} bulan`;
  };

  const getProgressPercentage = (days: number): number => {
    const totalDays = memberData?.membership_plan === 'Bulanan' ? 30 :
                     memberData?.membership_plan === 'Triwulan' ? 90 :
                     memberData?.membership_plan === 'Semester' ? 180 : 365;
    return Math.max(0, Math.min(100, ((totalDays - days) / totalDays) * 100));
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const formatDate = (dateInput: string | Date) => {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Tanggal tidak valid';
    }
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateInput: string | Date) => {
    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Tanggal tidak valid';
    }
    
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading Member Dashboard...</div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'membership', label: 'Membership', icon: '🎯' },
    { id: 'history', label: 'Riwayat', icon: '📊' },
    { id: 'payment', label: 'Pembayaran', icon: '💳' },
  ];

  const renderTabContent = () => {
    if (!memberData) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">Data member tidak tersedia</div>
          <button 
            onClick={() => fetchMemberData(user?.username)}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
          >
            🔄 Refresh Data
          </button>
        </div>
      );
    }

    const planInfo = getMembershipPlanInfo(memberData.membership_plan);
    const remainingDaysText = getRemainingDaysText(memberData.sisa_hari);
    const progressPercentage = getProgressPercentage(memberData.sisa_hari);

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
              <h1 className="text-2xl font-bold mb-2">
                Selamat Datang, {memberData.nama}! 👋
              </h1>
              <p className="opacity-90">Semangat berolahraga hari ini!</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Membership Card */}
              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-600 text-sm">Paket Membership</p>
                    <p className="text-xl font-bold text-green-600 truncate">
                      {memberData.membership_plan}
                    </p>
                  </div>
                  <div className="text-2xl">🎯</div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Sisa waktu:</span>
                    <span className="font-semibold text-blue-600">{remainingDaysText}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{memberData.sisa_hari} hari</span>
                    <span>
                      {memberData.membership_plan === 'Bulanan' ? '30' :
                       memberData.membership_plan === 'Triwulan' ? '90' :
                       memberData.membership_plan === 'Semester' ? '180' : '365'} hari
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Kunjungan Bulan Ini</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {memberData.kunjungan_bulan_ini}x
                    </p>
                  </div>
                  <div className="text-3xl">🏋️</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Total: {memberData.total_kunjungan} kunjungan
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Masa Aktif</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatDate(memberData.masa_aktif)}
                    </p>
                  </div>
                  <div className="text-3xl">⏰</div>
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Bergabung: {formatDate(memberData.tanggal_daftar)}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleCheckin}
                  className="bg-green-500 text-white py-4 px-6 rounded-lg hover:bg-green-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                >
                  <span>📝</span>
                  <span>Check-in Sekarang</span>
                </button>
                <button 
                  onClick={() => setActiveTab('payment')}
                  className="bg-blue-500 text-white py-4 px-6 rounded-lg hover:bg-blue-600 transition font-semibold text-lg flex items-center justify-center space-x-2"
                >
                  <span>💳</span>
                  <span>Perpanjang Membership</span>
                </button>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-xl font-bold mb-4">Aktivitas Terbaru</h2>
              {memberData.riwayat_kunjungan && memberData.riwayat_kunjungan.length > 0 ? (
                <div className="space-y-3">
                  {memberData.riwayat_kunjungan.slice(0, 3).map((visit, index) => (
                    <div key={visit.id || `visit-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600">🏃</span>
                        </div>
                        <div>
                          <p className="font-semibold">Kunjungan Gym</p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(visit.tanggal)} • {visit.durasi}
                          </p>
                        </div>
                      </div>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                        Selesai
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  Belum ada aktivitas terbaru. Lakukan check-in pertama Anda!
                </p>
              )}
            </div>
          </div>
        );

      case 'profile':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h2 className="text-2xl font-bold mb-6">Profile Member</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Informasi Pribadi</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Nomor Member</label>
                    <p className="font-semibold">{memberData.nomor_member}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nama Lengkap</label>
                    <p className="font-semibold">{memberData.nama}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Email</label>
                    <p className="font-semibold">{memberData.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Telepon</label>
                    <p className="font-semibold">{memberData.telepon}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Informasi Membership</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Tipe Membership</label>
                    <p className="font-semibold capitalize">{memberData.membership_type}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Paket</label>
                    <p className="font-semibold">{memberData.membership_plan}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Status</label>
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                      memberData.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {memberData.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Tanggal Bergabung</label>
                    <p className="font-semibold">{formatDate(memberData.tanggal_daftar)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Masa Aktif Hingga</label>
                    <p className="font-semibold">{formatDate(memberData.masa_aktif)}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Alamat</h3>
              <p className="text-gray-700">{memberData.alamat}</p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold">
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        );

      case 'membership':
        return (
          <div className="space-y-6">
            {/* Current Membership Card */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h2 className="text-2xl font-bold mb-6">Paket Membership Anda</h2>
              
              <div className={`bg-gradient-to-r ${planInfo.color} rounded-2xl p-6 text-white`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 truncate">{memberData.membership_plan}</h3>
                    <p className="text-white/90 mb-4">{planInfo.duration}</p>
                    <div className="text-3xl font-bold">
                      {formatCurrency(memberData.membership_price)}
                    </div>
                    {memberData.membership_plan !== 'Bulanan' && (
                      <p className="text-white/80 text-sm mt-2">
                        {formatCurrency(memberData.membership_price / 
                          (memberData.membership_plan === 'Triwulan' ? 3 : 
                           memberData.membership_plan === 'Semester' ? 6 : 12))}/bulan
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                      Aktif
                    </span>
                    <div className="mt-4">
                      <p className="text-sm">Sisa</p>
                      <p className="text-xl font-bold">{remainingDaysText}</p>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-2">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/20">
                  <p className="font-semibold mb-2">Benefit yang Anda dapatkan:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    {memberData.membership_plan === 'Bulanan' && (
                      <>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Akses semua equipment</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Kartu member digital</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Free WiFi</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Locker harian</span>
                        </div>
                      </>
                    )}
                    {memberData.membership_plan === 'Triwulan' && (
                      <>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Semua benefit bulanan</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>1x konsultasi trainer</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Progress tracking</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Special locker</span>
                        </div>
                      </>
                    )}
                    {memberData.membership_plan === 'Semester' && (
                      <>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Semua benefit triwulan</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>2x konsultasi trainer</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Nutrition guide</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Premium locker</span>
                        </div>
                      </>
                    )}
                    {memberData.membership_plan === 'Tahunan' && (
                      <>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>Semua benefit semester</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>4x konsultasi trainer</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>VIP nutrition guide</span>
                        </div>
                        <div className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>VIP locker permanen</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex gap-4 flex-wrap">
                <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold">
                  💳 Perpanjang Membership
                </button>
                <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition font-semibold">
                  🔄 Upgrade Paket
                </button>
              </div>
            </div>

            {/* Membership History */}
            <div className="bg-white rounded-xl p-6 shadow-lg border">
              <h3 className="text-xl font-bold mb-4">Riwayat Membership</h3>
              {memberData.riwayat_transaksi && 
               memberData.riwayat_transaksi.filter((t: any) => t.jenis?.includes('Membership')).length > 0 ? (
                <div className="space-y-4">
                  {memberData.riwayat_transaksi
                    .filter((t: any) => t.jenis?.includes('Membership'))
                    .map((transaction: any, index: number) => (
                      <div key={transaction.id || `trans-membership-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 text-xl">🔄</span>
                          </div>
                          <div>
                            <p className="font-semibold">{transaction.jenis}</p>
                            <p className="text-sm text-gray-600">
                              {formatDateTime(transaction.tanggal)} • {transaction.paket || memberData.membership_plan}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{formatCurrency(transaction.jumlah)}</p>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                            {transaction.status || 'completed'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">📝</div>
                  <p className="text-gray-500">Belum ada riwayat membership</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h2 className="text-2xl font-bold mb-6">Riwayat Kunjungan</h2>
            {memberData.riwayat_kunjungan && memberData.riwayat_kunjungan.length > 0 ? (
              <div className="space-y-4">
                {memberData.riwayat_kunjungan.map((visit, index) => (
                  <div key={visit.id || `visit-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-xl">🏃</span>
                      </div>
                      <div>
                        <p className="font-semibold">Kunjungan Gym</p>
                        <p className="text-sm text-gray-600">
                          {formatDateTime(visit.tanggal)}
                        </p>
                        <p className="text-sm text-gray-500">Durasi: {visit.durasi}</p>
                        {visit.location && (
                          <p className="text-sm text-gray-500">Lokasi: {visit.location}</p>
                        )}
                      </div>
                    </div>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Selesai
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <p className="text-gray-500 text-lg">Belum ada riwayat kunjungan</p>
                <p className="text-gray-400">Lakukan check-in pertama Anda!</p>
                <button 
                  onClick={handleCheckin}
                  className="mt-4 bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition font-semibold"
                >
                  📝 Check-in Sekarang
                </button>
              </div>
            )}
          </div>
        );

      case 'payment':
        return (
          <div className="bg-white rounded-xl p-6 shadow-lg border">
            <h2 className="text-2xl font-bold mb-6">Riwayat Pembayaran</h2>
            
            {memberData.riwayat_transaksi && memberData.riwayat_transaksi.length > 0 ? (
              <div className="space-y-4">
                {memberData.riwayat_transaksi.map((transaction, index) => {
                  // Handle timestamp conversion
                  const transactionDate = transaction.tanggal instanceof Date ? 
                    transaction.tanggal : 
                    new Date(transaction.tanggal);
                  
                  return (
                    <div key={transaction.id || `trans-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-xl">💳</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{transaction.jenis || 'Pembayaran Membership'}</p>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(transactionDate)}
                          </p>
                          {transaction.paket && (
                            <p className="text-sm text-blue-600">Paket: {transaction.paket}</p>
                          )}
                          {transaction.metode_pembayaran && (
                            <p className="text-sm text-gray-500">Metode: {transaction.metode_pembayaran}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(transaction.jumlah || 0)}
                        </p>
                        <span className={`px-2 py-1 rounded-full text-sm ${
                          transaction.status === 'completed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status || 'completed'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💳</div>
                <p className="text-gray-500 text-lg">Belum ada riwayat pembayaran</p>
                <p className="text-gray-400 mt-2">
                  {memberData.status === 'pending' 
                    ? 'Silakan lakukan pembayaran untuk mengaktifkan membership'
                    : 'Riwayat pembayaran akan muncul di sini setelah pembayaran'
                  }
                </p>
                {memberData.status === 'pending' && (
                  <button 
                    onClick={() => router.push('/member/payment')}
                    className="mt-4 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition font-semibold"
                  >
                    💳 Bayar Sekarang
                  </button>
                )}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Member Dashboard</h1>
                <p className="text-sm text-gray-600">HS Gym Management System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right hidden md:block">
                <p className="text-gray-700 font-semibold truncate max-w-[200px]">{memberData?.nama}</p>
                <p className="text-sm text-gray-600 truncate max-w-[200px]">
                  Paket {memberData?.membership_plan} • {getRemainingDaysText(memberData?.sisa_hari || 0)} tersisa
                </p>
              </div>
              <button 
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex space-x-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600">⚠️</div>
              <div className="ml-3">
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {renderTabContent()}
      </div>
    </div>
  );
}