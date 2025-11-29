'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NonMemberLogin() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.username || !formData.password) {
        throw new Error('Username dan password harus diisi');
      }

      console.log('🔐 Attempting non-member login with:', formData.username);

      const response = await fetch('/api/non-member/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.toUpperCase(),
          password: formData.password
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Non-member login successful');
        
        // Simpan user data ke localStorage
        localStorage.setItem('nonMemberUser', JSON.stringify(result.data));
        
        // Redirect ke dashboard
        router.push('/non-member-dashboard');
      } else {
        throw new Error(result.error || 'Login gagal');
      }
    } catch (err: any) {
      console.error('❌ Non-member login error:', err);
      setError(err.message || 'Terjadi kesalahan saat login');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const copyToClipboard = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
      // Show temporary success message
      const originalText = document.getElementById('copy-success')?.textContent;
      const successEl = document.getElementById('copy-success');
      if (successEl) {
        successEl.textContent = '✓ Berhasil disalin!';
        successEl.className = 'text-green-400 text-xs mt-1 font-semibold animate-pulse';
        setTimeout(() => {
          successEl.textContent = originalText || '';
          successEl.className = 'text-cyan-300 text-xs mt-1';
        }, 2000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600 py-8 px-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>

      <div className="max-w-md w-full mx-auto relative z-10">
        {/* Header Card */}
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-2xl mb-6 transform hover:scale-105 transition-transform duration-300">
          <div className="text-center">
            <Link href="/" className="inline-block mb-4 transform hover:scale-110 transition-transform duration-300">
              <div className="flex items-center space-x-3 justify-center">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-2xl">HS</span>
                </div>
                <div className="text-left">
                  <span className="text-3xl font-bold text-white drop-shadow-lg block">HS Gym</span>
                  <span className="text-white/90 text-sm block">Rancakihiyang</span>
                </div>
              </div>
            </Link>
            
            <div className="bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-2xl p-4 shadow-lg">
              <h1 className="text-2xl font-bold text-white mb-2">🎫 Daily Pass Login</h1>
              <p className="text-white/90">Masuk dengan kredensial khusus Anda</p>
            </div>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 border border-white/30 shadow-2xl">
          {error && (
            <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-2xl p-4 mb-6 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">⚠️</span>
                </div>
                <div>
                  <p className="text-red-100 font-semibold">Login Gagal</p>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                <span className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-xs">👤</span>
                <span>Username Daily Pass *</span>
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 bg-white/20 border border-cyan-400/50 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm font-mono uppercase text-center text-lg tracking-wider"
                  placeholder="NMABC123"
                  style={{ letterSpacing: '0.2em' }}
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.username)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-cyan-300 hover:text-cyan-200 transition-colors duration-200 bg-cyan-500/20 rounded-lg p-1.5"
                  title="Salin username"
                >
                  <span className="text-sm">📋</span>
                </button>
              </div>
              <p id="copy-success" className="text-cyan-300 text-xs mt-1">
                Format: NM + 6 karakter (contoh: NMABC123)
              </p>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-white text-sm font-semibold mb-3 flex items-center space-x-2">
                <span className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs">🔒</span>
                <span>Password *</span>
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-4 bg-white/20 border border-emerald-400/50 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm font-mono text-center text-lg tracking-widest"
                  placeholder="••••••"
                  maxLength={6}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-emerald-300 hover:text-emerald-200 transition-colors duration-200 bg-emerald-500/20 rounded-lg p-1.5"
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    <span className="text-sm">{showPassword ? '🙈' : '👁️'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(formData.password)}
                    className="text-emerald-300 hover:text-emerald-200 transition-colors duration-200 bg-emerald-500/20 rounded-lg p-1.5"
                    title="Salin password"
                  >
                    <span className="text-sm">📋</span>
                  </button>
                </div>
              </div>
              <p className="text-cyan-300 text-xs mt-1">
                6 digit angka (contoh: 123456)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white py-4 px-6 rounded-2xl font-bold shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span className="text-lg">Memproses Login...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <span className="text-2xl">⚡</span>
                  <span className="text-lg">Masuk ke Dashboard</span>
                </div>
              )}
            </button>
          </form>

          {/* Information Section */}
          <div className="mt-8 bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-2xl p-6 border border-amber-400/30">
            <h3 className="text-white text-lg font-semibold flex items-center space-x-2 mb-4">
              <span className="text-2xl">💡</span>
              <span>Panduan Login Daily Pass</span>
            </h3>
            <ul className="text-white/90 text-sm space-y-3">
              <li className="flex items-start space-x-3">
                <span className="text-cyan-400 text-lg flex-shrink-0">🔑</span>
                <span><strong>Username:</strong> Format NMABC123 (6 karakter setelah NM)</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-emerald-400 text-lg flex-shrink-0">🔢</span>
                <span><strong>Password:</strong> 6 digit angka acak</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-purple-400 text-lg flex-shrink-0">🎫</span>
                <span>Kredensial diberikan setelah pembayaran berhasil</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-yellow-400 text-lg flex-shrink-0">⏰</span>
                <span>Akses hanya berlaku 24 jam sejak pembayaran</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-red-400 text-lg flex-shrink-0">🚫</span>
                <span>Tidak bisa mendaftar sendiri, harus melalui pembayaran</span>
              </li>
            </ul>
          </div>

          {/* Action Links */}
          <div className="mt-6 text-center space-y-4">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl p-4 border border-blue-400/30">
              <p className="text-white/90 text-sm mb-2">
                Belum punya Daily Pass?
              </p>
              <button 
                onClick={() => router.push('/non-member-payment')}
                className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white py-2 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🎫 Beli Daily Pass Sekarang
              </button>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-2xl p-4 border border-green-400/30">
              <p className="text-white/90 text-sm mb-2">
                Ingin menjadi member tetap?
              </p>
              <button 
                onClick={() => router.push('/register')}
                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white py-2 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                🏋️ Daftar Member Premium
              </button>
            </div>
          </div>

          {/* Support Info */}
          <div className="mt-6 bg-gradient-to-r from-red-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-4 border border-red-400/30">
            <h4 className="text-white font-semibold text-sm mb-2 flex items-center space-x-2">
              <span className="text-lg">📞</span>
              <span>Butuh Bantuan?</span>
            </h4>
            <p className="text-white/80 text-xs">
              Hubungi reception di <strong className="text-yellow-300">0812-3456-7890</strong> dengan menyebutkan nama dan nomor telepon yang digunakan saat pembayaran.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-white/60 text-sm">
            HS Gym Rancakihiyang • Akses Fitness Harian
          </p>
          <p className="text-white/40 text-xs mt-1">
            Support 24/7 • support@hsgym.com
          </p>
        </div>
      </div>
    </div>
  );
}