'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('🔄 Starting login process...');
      console.log('📝 Username:', username);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      console.log('📥 API Response received');
      console.log('✅ Response OK:', response.ok);
      console.log('🎯 Success:', data.success);
      console.log('📊 Response data:', data);

      if (response.ok && data.success) {
        console.log('💾 Saving to localStorage...');
        
        // Simpan user data ke localStorage
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token || 'dummy-token');
        
        console.log('📋 User data saved:', data.user);
        console.log('🎭 User role:', data.user.role);
        
        // Redirect berdasarkan role menggunakan router.push() dengan fallback
        let redirectPath = '/';
        
        if (data.user.role === 'non_member') {
          redirectPath = '/non-member-dashboard';
          console.log('🚀 Redirecting to non-member-dashboard');
        } else if (data.user.role === 'member') {
          redirectPath = '/member-dashboard';
          console.log('🚀 Redirecting to member-dashboard');
        } else if (data.user.role === 'admin_operasional') {
          redirectPath = '/admin-operasional';
          console.log('🚀 Redirecting to admin-operasional');
        } else if (data.user.role === 'admin_keuangan') {
          redirectPath = '/admin-keuangan';
          console.log('🚀 Redirecting to admin-keuangan');
        } else if (data.user.role === 'manager') {
          redirectPath = '/manager-dashboard';
          console.log('🚀 Redirecting to manager-dashboard');
        } else {
          console.log('🚀 Redirecting to home');
        }

        // Coba router.push dulu
        router.push(redirectPath);
        
        // Fallback: jika router tidak bekerja dalam 2 detik, gunakan window.location
        setTimeout(() => {
          if (window.location.pathname === '/login' || window.location.pathname === '/') {
            console.log('🔄 Router might have failed, using window.location');
            window.location.href = redirectPath;
          }
        }, 2000);

      } else {
        console.log('❌ Login failed:', data.error);
        setError(data.error || 'Login gagal');
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setError('Terjadi kesalahan saat login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">HS</span>
            </div>
            <span className="text-3xl font-bold text-white">Gym Rancakihiyang</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Masuk ke Akun Anda</h2>
          <p className="text-blue-200 mt-2">
            Login sebagai member, admin, atau non-member daily
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Masukkan username Anda"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Masukkan password Anda"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <strong>Error:</strong> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Memproses Login...
                </div>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          {/* Info Non-Member */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-semibold text-green-800 mb-2">Non-Member Daily?</h4>
            <p className="text-sm text-green-700">
              Setelah pembayaran, gunakan username & password yang diberikan sistem untuk login di sini
            </p>
            <Link 
              href="/non-member-payment" 
              className="inline-block mt-2 text-green-600 hover:text-green-700 font-medium text-sm"
            >
              → Belum bayar? Klik di sini
            </Link>
          </div>

          {/* Test Credentials Info */}
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">Test Credentials:</h4>
            <div className="text-sm text-yellow-700 space-y-1">
              <p><strong>Admin:</strong> admin / password</p>
              <p><strong>Manager:</strong> manager / password</p>
              <p><strong>Keuangan:</strong> keuangan / password</p>
              <p><strong>Operasional:</strong> operasional / password</p>
              <p className="text-red-600 font-semibold">* Untuk member, gunakan username & password yang didaftarkan</p>
            </div>
          </div>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <Link 
              href="/register" 
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Belum punya akun member? Daftar di sini
            </Link>
            <br />
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-700 text-sm"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}