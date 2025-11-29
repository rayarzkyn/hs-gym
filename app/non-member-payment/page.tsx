'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentMethod {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  gradient: string;
}

export default function NonMemberPayment() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    telepon: '',
    payment_method: 'qris'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const paymentMethods: PaymentMethod[] = [
    { 
      id: 'qris', 
      name: 'QRIS', 
      desc: 'Scan QR Code', 
      icon: '📱',
      color: 'from-green-500 to-emerald-600',
      gradient: 'bg-gradient-to-r from-green-500 to-emerald-600'
    },
    { 
      id: 'cash', 
      name: 'Tunai', 
      desc: 'Bayar di tempat', 
      icon: '💵',
      color: 'from-yellow-500 to-amber-600',
      gradient: 'bg-gradient-to-r from-yellow-500 to-amber-600'
    },
    { 
      id: 'transfer', 
      name: 'Transfer Bank', 
      desc: 'BCA, BNI, Mandiri, BRI', 
      icon: '🏦',
      color: 'from-blue-500 to-cyan-600',
      gradient: 'bg-gradient-to-r from-blue-500 to-cyan-600'
    },
    { 
      id: 'ewallet', 
      name: 'E-Wallet', 
      desc: 'Gopay, OVO, Dana', 
      icon: '💳',
      color: 'from-purple-500 to-pink-600',
      gradient: 'bg-gradient-to-r from-purple-500 to-pink-600'
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validasi form
      if (!formData.nama || !formData.telepon || !formData.payment_method) {
        throw new Error('Nama, telepon, dan metode pembayaran wajib diisi');
      }

      console.log('💳 Submitting payment data:', formData);

      const response = await fetch('/api/non-member/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          harga: 15000
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Payment successful, redirecting to success page');
        
        // Simpan data untuk success page
        const successData = {
          daily_code: result.data.daily_code,
          username: result.data.username,
          password: result.data.password,
          nama: result.data.nama,
          harga: result.data.harga,
          payment_method: result.data.payment_method,
          transaction_id: result.data.transaction_id,
          expired_at: result.data.expired_at
        };
        
        // Simpan ke localStorage untuk success page
        localStorage.setItem('nonMemberPaymentData', JSON.stringify(successData));
        
        // Redirect ke success page dengan query parameters
        const params = new URLSearchParams({
          dailyCode: result.data.daily_code,
          username: result.data.username,
          password: result.data.password,
          nama: result.data.nama,
          harga: result.data.harga.toString(),
          payment_method: result.data.payment_method,
          transaction_id: result.data.transaction_id
        });
        
        router.push(`/non-member-success?${params.toString()}`);
      } else {
        throw new Error(result.error || 'Terjadi kesalahan saat memproses pembayaran');
      }
    } catch (err: any) {
      console.error('❌ Payment error:', err);
      setError(err.message || 'Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-8 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header Card */}
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-2xl">🎫</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-lg">Daily Pass</h1>
                <p className="text-white/90 text-lg">Akses Gym 24 Jam</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
              <div className="text-white text-center">
                <p className="text-4xl font-bold drop-shadow-lg">Rp 15.000</p>
                <p className="text-white/90 text-sm mt-1">Berlaku 24 jam sejak pembayaran</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-2xl">
          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <div>
                  <p className="text-red-100 font-semibold">Pembayaran Gagal</p>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-semibold flex items-center space-x-2">
                <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-sm">👤</span>
                <span>Informasi Pribadi</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    type="text"
                    name="nama"
                    value={formData.nama}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Masukkan nama lengkap Anda"
                  />
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="email@example.com (opsional)"
                  />
                </div>

                <div>
                  <label className="block text-white/90 text-sm font-medium mb-2">
                    Nomor Telepon *
                  </label>
                  <input
                    type="tel"
                    name="telepon"
                    value={formData.telepon}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="081234567890"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods Section */}
            <div className="space-y-4">
              <h3 className="text-white text-lg font-semibold flex items-center space-x-2">
                <span className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-sm">💳</span>
                <span>Metode Pembayaran *</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className={`relative group cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                      formData.payment_method === method.id
                        ? 'scale-105 ring-4 ring-white/50'
                        : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value={method.id}
                      checked={formData.payment_method === method.id}
                      onChange={handleInputChange}
                      className="sr-only"
                    />
                    <div className={`rounded-2xl p-4 text-white shadow-lg ${
                      formData.payment_method === method.id
                        ? method.gradient
                        : 'bg-white/20 backdrop-blur-sm border border-white/30'
                    } group-hover:shadow-xl transition-all duration-300`}>
                      <div className="text-center">
                        <span className="text-3xl mb-2 block">{method.icon}</span>
                        <span className="font-semibold text-sm block">
                          {method.name}
                        </span>
                        <span className="text-white/80 text-xs block mt-1">
                          {method.desc}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white py-4 px-6 rounded-2xl font-bold shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-lg">Memproses Pembayaran...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">⚡</span>
                  <span className="text-lg">Bayar Sekarang - Rp 15.000</span>
                </div>
              )}
            </button>
          </form>

          {/* Information Section */}
          <div className="mt-8 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/30">
            <h3 className="text-white text-lg font-semibold flex items-center space-x-2 mb-4">
              <span className="text-2xl">💡</span>
              <span>Informasi Penting</span>
            </h3>
            <ul className="text-white/90 text-sm space-y-3">
              <li className="flex items-start space-x-3">
                <span className="text-green-400 text-lg">✓</span>
                <span>Daily Pass berlaku 24 jam sejak pembayaran</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-blue-400 text-lg">🔐</span>
                <span>Setelah pembayaran, dapatkan username & password khusus</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-purple-400 text-lg">🎫</span>
                <span>Gunakan kredensial untuk login dan akses e-card</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-red-400 text-lg">⏰</span>
                <span>Tidak dapat refund setelah pembayaran berhasil</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-yellow-400 text-lg">🏋️</span>
                <span>Tunjukkan e-card di dashboard kepada staff reception</span>
              </li>
            </ul>
          </div>

          {/* Additional Links */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-white/80 text-sm">
              Sudah punya akun Daily Pass?{' '}
              <button 
                onClick={() => router.push('/non-member-login')}
                className="text-cyan-300 hover:text-cyan-200 font-semibold underline underline-offset-2 transition-colors"
              >
                Login di sini
              </button>
            </p>
            
            <p className="text-white/80 text-sm">
              Ingin menjadi member tetap?{' '}
              <button 
                onClick={() => router.push('/register')}
                className="text-green-300 hover:text-green-200 font-semibold underline underline-offset-2 transition-colors"
              >
                Daftar Member
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            HS Gym Rancakihiyang • Akses Fitness Terjangkau
          </p>
          <p className="text-white/40 text-xs mt-1">
            Support: 0812-3456-7890 • support@hsgym.com
          </p>
        </div>
      </div>
    </div>
  );
}