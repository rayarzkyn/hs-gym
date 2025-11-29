'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface NonMemberData {
  daily_code: string;
  username: string;
  password: string;
  nama: string;
  harga: number;
  payment_method: string;
  expired_at: string;
  transaction_id: string;
}

export default function NonMemberSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nonMemberData, setNonMemberData] = useState<NonMemberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Coba ambil data dari URL parameters terlebih dahulu
    const dailyCode = searchParams.get('dailyCode');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const nama = searchParams.get('nama');
    const harga = searchParams.get('harga');
    const paymentMethod = searchParams.get('payment_method');
    const transactionId = searchParams.get('transaction_id');

    if (username && password) {
      // Data dari URL parameters
      const data: NonMemberData = {
        daily_code: dailyCode || `NM${Date.now().toString().slice(-6)}`,
        username: username,
        password: password,
        nama: nama || 'Member',
        harga: parseInt(harga || '15000'),
        payment_method: paymentMethod || 'cash',
        expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        transaction_id: transactionId || `TRX-${Date.now()}`
      };
      setNonMemberData(data);
      setLoading(false);
    } else {
      // Coba ambil dari localStorage sebagai fallback
      const savedData = localStorage.getItem('nonMemberPaymentData');
      
      if (!savedData) {
        router.push('/non-member-payment');
        return;
      }

      try {
        const data = JSON.parse(savedData);
        setNonMemberData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing saved data:', error);
        router.push('/non-member-payment');
      }
    }
  }, [router, searchParams]);

  const handleContinueToLogin = () => {
    // Redirect ke halaman login non-member
    router.push('/non-member-login');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Berhasil disalin!');
  };

  const formatExpiryDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-cyan-100">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (!nonMemberData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Data tidak ditemukan</p>
          <Link 
            href="/non-member-payment" 
            className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block border border-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-400/10 transition"
          >
            Kembali ke Pembayaran
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
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
        </div>

        {/* Success Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Pembayaran Berhasil! 🎉</h1>
            <p className="text-cyan-100">Daily Pass Anda telah aktif</p>
          </div>

          {/* Credentials Card */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white mb-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🔐</div>
              <h2 className="text-2xl font-bold">AKSES LOGIN ANDA</h2>
              <p className="text-blue-100">Gunakan kredensial ini untuk login</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-blue-200 text-sm">Username</label>
                <div className="flex items-center justify-between bg-white/20 rounded-lg p-3 mt-1">
                  <span className="font-mono font-bold text-lg">{nonMemberData.username}</span>
                  <button 
                    onClick={() => copyToClipboard(nonMemberData.username)}
                    className="text-blue-200 hover:text-white transition"
                  >
                    📋
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-blue-200 text-sm">Password</label>
                <div className="flex items-center justify-between bg-white/20 rounded-lg p-3 mt-1">
                  <span className="font-mono font-bold text-lg">
                    {showPassword ? nonMemberData.password : '•'.repeat(6)}
                  </span>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-blue-200 hover:text-white transition"
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                    <button 
                      onClick={() => copyToClipboard(nonMemberData.password)}
                      className="text-blue-200 hover:text-white transition"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-white/10 rounded-lg p-3 text-center">
              <p className="text-blue-200 text-sm">
                ⚠️ <strong>Simpan kredensial ini!</strong> Tidak dapat direset
              </p>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-cyan-500/20 rounded-xl p-4 border border-cyan-400/30 mb-6">
            <h3 className="font-semibold text-cyan-100 mb-3">📋 Detail Pembayaran</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-cyan-200">Nama:</span>
                <span className="text-white font-semibold">{nonMemberData.nama}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-200">Metode Bayar:</span>
                <span className="text-white font-semibold capitalize">{nonMemberData.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-200">Jumlah:</span>
                <span className="text-white font-semibold">Rp {nonMemberData.harga.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cyan-200">Berlaku hingga:</span>
                <span className="text-white font-semibold">{formatExpiryDate(nonMemberData.expired_at)}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-500/20 rounded-xl p-4 border border-yellow-400/30 mb-6">
            <h3 className="font-semibold text-yellow-100 mb-2">📝 Cara Menggunakan:</h3>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>1. <strong>Simpan username & password</strong> di atas</li>
              <li>2. Klik tombol "Login Sekarang" di bawah</li>
              <li>3. Masukkan username & password untuk login</li>
              <li>4. Setelah login, tunjukkan e-card ke reception</li>
              <li>5. Nikmati akses gym selama 24 jam</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleContinueToLogin}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
            >
              🔐 Login Sekarang
            </button>
            
            <button
              onClick={() => {
                copyToClipboard(`Username: ${nonMemberData.username}\nPassword: ${nonMemberData.password}`);
              }}
              className="w-full border border-cyan-400 text-cyan-400 py-3 px-6 rounded-xl hover:bg-cyan-400/10 transition font-semibold"
            >
              📋 Salin Kredensial
            </button>
          </div>

          <p className="text-sm text-cyan-200 mt-4 text-center">
            Kredensial hanya berlaku hingga {formatExpiryDate(nonMemberData.expired_at)}
          </p>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-6">
          <p className="text-cyan-200/80 text-sm">
            Untuk bantuan, hubungi reception di 0812-3456-7890
          </p>
        </div>
      </div>
    </div>
  );
}