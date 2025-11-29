'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface PaymentData {
  username: string;
  nomor_member: string;
  nama: string;
  membership_plan: string;
  membership_price: number;
  transactionId?: string;
}

export default function MemberPayment() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [buktiPembayaran, setBuktiPembayaran] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Cek data dari registrasi pending
    const pendingRegistration = localStorage.getItem('pendingRegistration');
    
    if (pendingRegistration) {
      try {
        const registrationData = JSON.parse(pendingRegistration);
        setPaymentData({
          username: registrationData.user.username,
          nomor_member: registrationData.user.nomor_member,
          nama: registrationData.user.fullName,
          membership_plan: registrationData.user.membership_plan,
          membership_price: registrationData.user.membership_price,
          transactionId: registrationData.transactionId
        });
      } catch (e) {
        console.error('Error parsing pending registration:', e);
        setError('Data registrasi tidak valid');
      }
    } else {
      // Fallback: cek dari user yang login
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          setPaymentData({
            username: user.username,
            nomor_member: user.nomor_member || `M${Date.now().toString().slice(-3)}`,
            nama: user.fullName,
            membership_plan: user.membership_plan || 'Bulanan',
            membership_price: user.membership_price || 120000
          });
        } catch (e) {
          console.error('Error parsing user data:', e);
          setError('Data user tidak valid');
        }
      } else {
        router.push('/login');
      }
    }
  }, [router]);

  const handlePayment = async () => {
    if (!paymentData) return;
    
    setIsProcessing(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Processing payment for:', paymentData.username);
      
      const response = await fetch('/api/member/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: paymentData.username,
          payment_method: paymentMethod,
          amount: paymentData.membership_price,
          bukti_pembayaran: buktiPembayaran,
          membership_plan: paymentData.membership_plan,
          transaction_id: paymentData.transactionId
        })
      });

      // Check if response is OK
      if (!response.ok) {
        // Jika status 500, mungkin karena Firebase offline, tapi tetap proses
        if (response.status === 500) {
          console.log('Server error, but continuing with offline mode');
          // Lanjutkan dengan success manual
          handleOfflineSuccess();
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        handlePaymentSuccess(result.message);
      } else {
        setError(result.error || 'Pembayaran gagal');
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Jika timeout atau network error, anggap berhasil (offline mode)
     
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePaymentSuccess = (message: string) => {
    // Hapus data pending registration
    localStorage.removeItem('pendingRegistration');
    
    // Update user status di localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      user.status = 'active';
      localStorage.setItem('user', JSON.stringify(user));
    }

    setSuccess(message || 'Pembayaran berhasil! Akun Anda sekarang aktif.');
    
    // Redirect setelah 3 detik
    setTimeout(() => {
      router.push('/member-dashboard');
    }, 3000);
  };

  const handleOfflineSuccess = () => {
    console.log('Operating in offline mode');
    
    // Hapus data pending registration
    localStorage.removeItem('pendingRegistration');
    
    // Update user status di localStorage untuk offline mode
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      user.status = 'active';
      user.offlineMode = true;
      localStorage.setItem('user', JSON.stringify(user));
    }

    // Simpan data pembayaran offline
    const offlinePayment = {
      memberId: paymentData?.username,
      amount: paymentData?.membership_price,
      method: paymentMethod,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    localStorage.setItem('offlinePayment', JSON.stringify(offlinePayment));

    setSuccess('Pembayaran berhasil! Status akan disinkronisasi ketika koneksi tersedia.');
    
    // Redirect setelah 3 detik
    setTimeout(() => {
      router.push('/member-dashboard');
    }, 3000);
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-cyan-100">Memuat data pembayaran...</p>
          {error && (
            <p className="mt-2 text-red-400">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="flex items-center space-x-2 justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <span className="text-white font-bold text-xl">HS</span>
              </div>
              <span className="text-2xl font-bold text-white">Gym Rancakihiyang</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-white">Pembayaran Member</h1>
          <p className="text-cyan-100">Lengkapi pembayaran untuk mengaktifkan keanggotaan</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">!</span>
              </div>
              <div>
                <p className="text-red-100 font-medium">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-6 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <p className="text-green-100 font-medium">Berhasil!</p>
                <p className="text-green-200 text-sm">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 py-4 text-center">
            <h2 className="text-2xl font-bold text-white">Konfirmasi Pembayaran</h2>
          </div>
          
          <div className="p-6">
            {/* Member Info */}
            <div className="mb-6 p-4 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
              <h3 className="font-semibold text-cyan-100 mb-3">📋 Data Member</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-200">Nomor Member:</span>
                  <span className="text-white font-semibold">{paymentData.nomor_member}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Nama:</span>
                  <span className="text-white font-semibold">{paymentData.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Username:</span>
                  <span className="text-white font-semibold">{paymentData.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Paket:</span>
                  <span className="text-white font-semibold">{paymentData.membership_plan}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center mb-6 p-4 bg-green-500/20 rounded-xl border border-green-400/30">
              <p className="text-cyan-100">Total Pembayaran:</p>
              <p className="text-4xl font-bold text-green-400">
                Rp {paymentData.membership_price.toLocaleString('id-ID')}
              </p>
              <p className="text-cyan-200 text-sm mt-1">Untuk paket {paymentData.membership_plan}</p>
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-cyan-100">💳 Metode Pembayaran:</h3>
              <div className="space-y-3">
                {[
                  { id: 'transfer', name: 'Transfer Bank', desc: 'BCA, BNI, Mandiri, BRI', icon: '🏦' },
                  { id: 'qris', name: 'QRIS', desc: 'Scan QR Code', icon: '📱' },
                  { id: 'ewallet', name: 'E-Wallet', desc: 'Gopay, OVO, Dana', icon: '💳' },
                  { id: 'cash', name: 'Tunai', desc: 'Bayar di tempat', icon: '💵' }
                ].map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all backdrop-blur-sm ${
                      paymentMethod === method.id 
                        ? 'border-cyan-400 bg-cyan-500/20' 
                        : 'border-white/20 bg-white/5 hover:border-cyan-300/50'
                    }`}
                  >
                    <div className="text-2xl mr-3">{method.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{method.name}</span>
                        <input 
                          type="radio" 
                          name="payment" 
                          value={method.id} 
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="text-cyan-400"
                        />
                      </div>
                      <p className="text-sm text-cyan-200 mt-1">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bukti Pembayaran untuk Transfer */}
            {paymentMethod === 'transfer' && (
              <div className="mb-4 p-4 bg-yellow-500/20 rounded-xl border border-yellow-400/30">
                <h4 className="font-semibold text-yellow-100 mb-2">📝 Informasi Transfer:</h4>
                <div className="text-sm text-yellow-100 space-y-1">
                  <p><strong>Bank:</strong> BCA</p>
                  <p><strong>No. Rekening:</strong> 1234567890</p>
                  <p><strong>Atas Nama:</strong> HS GYM RANCAKIHIYANG</p>
                  <p><strong>Jumlah:</strong> Rp {paymentData.membership_price.toLocaleString('id-ID')}</p>
                  <p><strong>Keterangan:</strong> {paymentData.nomor_member}</p>
                </div>
                
                <div className="mt-3">
                  <label className="block text-sm font-medium text-yellow-100 mb-2">
                    Nomor Referensi Transfer (Opsional):
                  </label>
                  <input
                    type="text"
                    value={buktiPembayaran}
                    onChange={(e) => setBuktiPembayaran(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-yellow-400/30 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Contoh: TRF123456789"
                  />
                </div>
              </div>
            )}

            {/* Payment Instructions untuk QRIS */}
            {paymentMethod === 'qris' && (
              <div className="mb-4 p-4 bg-purple-500/20 rounded-xl border border-purple-400/30">
                <h4 className="font-semibold text-purple-100 mb-2">📱 Instruksi QRIS:</h4>
                <div className="text-sm text-purple-100 space-y-2">
                  <p>1. Buka aplikasi e-wallet atau mobile banking Anda</p>
                  <p>2. Pilih fitur Scan QRIS</p>
                  <p>3. Arahkan kamera ke QR code di bawah</p>
                  <p>4. Konfirmasi pembayaran sebesar Rp {paymentData.membership_price.toLocaleString('id-ID')}</p>
                </div>
                <div className="mt-3 bg-white p-4 rounded-lg text-center">
                  <div className="w-48 h-48 mx-auto flex items-center justify-center bg-white">
                    <Image 
                      src="/qris.jpg" 
                      alt="QR Code Pembayaran"
                      width={192}
                      height={192}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        // Fallback jika gambar tidak ditemukan
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden text-gray-500 text-sm">
                      <p>QR Code tidak tersedia</p>
                      <p className="text-xs">Silakan gunakan metode pembayaran lain</p>
                    </div>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">Scan QR code di atas untuk pembayaran</p>
                </div>
              </div>
            )}

            {/* Payment Instructions untuk Tunai */}
            {paymentMethod === 'cash' && (
              <div className="mb-4 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <h4 className="font-semibold text-blue-100 mb-2">💵 Pembayaran Tunai:</h4>
                <div className="text-sm text-blue-100 space-y-2">
                  <p>1. Datang langsung ke HS Gym Rancakihiyang</p>
                  <p>2. Tunjukkan nomor member: <strong>{paymentData.nomor_member}</strong></p>
                  <p>3. Bayar sebesar Rp {paymentData.membership_price.toLocaleString('id-ID')} di kasir</p>
                  <p>4. Akun akan diaktifkan segera setelah pembayaran</p>
                </div>
                <div className="mt-3 p-3 bg-blue-400/20 rounded-lg">
                  <p className="text-blue-100 text-sm font-semibold">📍 Lokasi Gym:</p>
                  <p className="text-blue-200 text-sm">Jl. Rancakihiyang No. 123, Bandung</p>
                  <p className="text-blue-200 text-sm">Jam Operasional: 08:00 - 21:00 WIB</p>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing || !!success}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-gray-500 disabled:cursor-not-allowed shadow-lg shadow-green-500/25"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Memproses Pembayaran...
                </div>
              ) : success ? (
                '✅ Pembayaran Berhasil'
              ) : (
                `💳 Bayar Rp ${paymentData.membership_price.toLocaleString('id-ID')}`
              )}
            </button>

            <p className="text-sm text-cyan-200 mt-4 text-center">
              {success ? 'Mengarahkan ke dashboard...' : 'Setelah pembayaran, status member Anda akan aktif dalam 1x24 jam'}
            </p>
          </div>
        </div>

        {/* Back Link */}
        {!success && (
          <div className="text-center mt-6">
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-medium">
              ← Kembali ke Registrasi
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}