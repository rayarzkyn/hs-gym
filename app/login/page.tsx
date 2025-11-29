'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginUser, checkFirestoreConnection } from '@/lib/firebase-client';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const router = useRouter();

  // Check connection status on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await checkFirestoreConnection();
        setConnectionStatus(result.success ? 'connected' : 'disconnected');
        
        if (!result.success) {
          console.warn('⚠️ Firestore connection issue:', result.error);
        } else {
          console.log('✅ Firestore connection established');
        }
      } catch (error) {
        setConnectionStatus('disconnected');
        console.error('❌ Connection check failed:', error);
      }
    };

    checkConnection();
  }, []);

  // Check if user is already logged in - FIXED to prevent automatic redirect
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        // Skip if we've already checked auth or if user is trying to login
        if (hasCheckedAuth || formData.identifier || formData.password) {
          setIsCheckingAuth(false);
          return;
        }

        const memberUser = localStorage.getItem('user');
        const nonMemberUser = localStorage.getItem('nonMemberUser');
        const staffUser = localStorage.getItem('staffUser');

        // Only redirect if there's clear evidence of a valid session
        if (memberUser) {
          const user = JSON.parse(memberUser);
          // Additional validation to ensure it's a real session
          const loginTime = new Date(user.loginTime);
          const currentTime = new Date();
          const timeDiff = currentTime.getTime() - loginTime.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          // Only auto-redirect if session is less than 24 hours old
          if (hoursDiff < 24 && user.role && user.status) {
            console.log('✅ Found valid member session, redirecting...');
            redirectBasedOnRole(user.role, user.status);
            return;
          } else {
            // Clear expired session
            localStorage.removeItem('user');
          }
        } 
        
        if (nonMemberUser) {
          const nonMember = JSON.parse(nonMemberUser);
          const loginTime = new Date(nonMember.loginTime);
          const currentTime = new Date();
          const timeDiff = currentTime.getTime() - loginTime.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          // Only auto-redirect if session is less than 12 hours old for non-members
          if (hoursDiff < 12) {
            console.log('✅ Found valid non-member session, redirecting...');
            redirectBasedOnRole('non_member_daily');
            return;
          } else {
            // Clear expired session
            localStorage.removeItem('nonMemberUser');
          }
        }
        
        if (staffUser) {
          const staff = JSON.parse(staffUser);
          const loginTime = new Date(staff.loginTime);
          const currentTime = new Date();
          const timeDiff = currentTime.getTime() - loginTime.getTime();
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          // Only auto-redirect if session is less than 8 hours old for staff
          if (hoursDiff < 8 && staff.role && staff.status) {
            console.log('✅ Found valid staff session, redirecting...');
            redirectBasedOnRole(staff.role, staff.status);
            return;
          } else {
            // Clear expired session
            localStorage.removeItem('staffUser');
          }
        }

        setIsCheckingAuth(false);
        setHasCheckedAuth(true);
      } catch (error) {
        console.log('⚠️ No existing auth found or error parsing:', error);
        setIsCheckingAuth(false);
        setHasCheckedAuth(true);
      }
    };

    // Add small delay to ensure this runs after initial render
    const timer = setTimeout(checkExistingAuth, 100);
    return () => clearTimeout(timer);
  }, [router, hasCheckedAuth, formData.identifier, formData.password]);

  const redirectBasedOnRole = (role: string, status: string = 'active') => {
    sessionStorage.setItem('justLoggedIn', 'true');
    
    switch (role) {
      case 'admin_keuangan':
      case 'keuangan':
        router.push('/admin-keuangan');
        break;
      case 'admin_operasional':
      case 'operasional':
      case 'manager':
        router.push('/admin-operasional');
        break;
      case 'member':
        if (status === 'pending') {
          router.push('/member/payment');
        } else {
          router.push('/member-dashboard');
        }
        break;
      case 'non_member_daily':
        router.push('/non-member-dashboard');
        break;
      default:
        router.push('/dashboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Check connection before proceeding
    if (connectionStatus === 'disconnected') {
      setError('Koneksi database terputus. Silakan refresh halaman dan coba lagi.');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 Attempting client-side login...', { identifier: formData.identifier });
      
      // Check network connectivity
      if (typeof window !== 'undefined' && !navigator.onLine) {
        throw new Error('Tidak ada koneksi internet. Periksa koneksi Anda.');
      }
      
      // Coba login sebagai regular user/member/staff terlebih dahulu
      const result = await loginUser(formData.identifier, formData.password);
      console.log('📨 Login response:', result);

      if (result.success && result.user) {
        console.log('✅ Login successful, user data:', result.user);
        
        // Simpan user data ke localStorage berdasarkan role
        const userData = {
          uid: result.user.uid,
          username: result.user.username,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
          telepon: result.user.telepon,
          alamat: result.user.alamat,
          membership_plan: result.user.membership_plan,
          nomor_member: result.user.nomor_member,
          status: result.user.status,
          loginTime: new Date().toISOString()
        };

        // Simpan ke localStorage berdasarkan role
        if (result.user.role === 'member') {
          localStorage.setItem('user', JSON.stringify(userData));
        } else if (['admin_keuangan', 'admin_operasional', 'keuangan', 'operasional', 'manager'].includes(result.user.role)) {
          localStorage.setItem('staffUser', JSON.stringify(userData));
        } else {
          localStorage.setItem('user', JSON.stringify(userData));
        }
        
        localStorage.setItem('token', 'logged-in');
        
        console.log('✅ Login successful, redirecting...', result.user.role);
        
        // Redirect berdasarkan role dari Firebase
        redirectBasedOnRole(result.user.role, result.user.status);
        
      } else {
        // Jika login regular gagal, coba sebagai non-member daily
        console.log('🔄 Trying non-member login...');
        await handleNonMemberLogin();
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      
      // Handle specific error messages
      if (error.message?.includes('koneksi') || error.message?.includes('internet')) {
        setError('Tidak ada koneksi internet. Periksa koneksi Anda dan coba lagi.');
      } else if (error.message?.includes('database') || error.message?.includes('unavailable')) {
        setError('Koneksi database bermasalah. Silakan refresh halaman dan coba lagi.');
      } else if (error.message?.includes('invalid-credential') || 
          error.message?.includes('salah') ||
          error.message?.includes('tidak ditemukan')) {
        setError('Username/email atau password salah. Pastikan kredensial Anda benar.');
      } else if (error.message?.includes('kadaluarsa')) {
        setError('Akun daily pass sudah kadaluarsa. Silakan beli daily pass baru.');
      } else if (error.message?.includes('tidak aktif')) {
        setError('Akun Anda tidak aktif. Silakan hubungi administrator.');
      } else {
        setError(error.message || 'Terjadi kesalahan saat login. Coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNonMemberLogin = async () => {
    try {
      console.log('🔐 Attempting non-member login with:', formData.identifier);
      
      const response = await fetch('/api/non-member/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.identifier.toUpperCase(),
          password: formData.password
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login non-member gagal');
      }

      const result = await response.json();
      console.log('📨 Non-member login response:', result);

      if (result.success) {
        console.log('✅ Non-member login successful');
        
        // Simpan non-member user data
        const nonMemberData = {
          ...result.data,
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('nonMemberUser', JSON.stringify(nonMemberData));
        localStorage.setItem('token', 'logged-in');
        
        // Redirect ke non-member dashboard
        redirectBasedOnRole('non_member_daily');
      } else {
        throw new Error(result.error || 'Login non-member gagal');
      }
    } catch (error: any) {
      console.error('❌ Non-member login error:', error);
      throw new Error(error.message || 'Login gagal untuk semua tipe akun');
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

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return { text: '✅ Terhubung ke Database', color: 'text-green-400' };
      case 'disconnected':
        return { text: '❌ Koneksi Database Terputus', color: 'text-red-400' };
      default:
        return { text: '🔄 Memeriksa Koneksi...', color: 'text-yellow-400' };
    }
  };

  const connectionStatusInfo = getConnectionStatusText();

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-100 text-lg font-medium">Memeriksa autentikasi...</p>
          <p className="text-cyan-300 text-sm mt-2">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Connection Status */}
        <div className={`text-center text-sm ${connectionStatusInfo.color} bg-black/30 rounded-lg py-2 px-4 backdrop-blur-sm border ${
          connectionStatus === 'connected' ? 'border-green-500/30' : 
          connectionStatus === 'disconnected' ? 'border-red-500/30' : 
          'border-yellow-500/30'
        }`}>
          {connectionStatusInfo.text}
        </div>

        {/* Header */}
        <div className="text-center">
          <Link href="/" className="inline-block mb-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center space-x-3 justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <span className="text-white font-bold text-2xl">HS</span>
              </div>
              <div className="text-left">
                <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent block">
                  HS Gym
                </span>
                <span className="text-cyan-300 text-sm block mt-1">Rancakihiyang</span>
              </div>
            </div>
          </Link>
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-2">Selamat Datang</h2>
            <p className="text-cyan-100 text-lg">Masuk ke akun Anda</p>
            
            <div className="mt-4 flex items-center justify-center space-x-4 text-sm">
              <span className="text-cyan-200">🏋️ Member</span>
              <span className="text-cyan-200">💰 Keuangan</span>
              <span className="text-cyan-200">⚙️ Operasional</span>
              <span className="text-cyan-200">🎫 Daily Pass</span>
            </div>
          </div>
        </div>

        {/* Connection Warning if disconnected */}
        {connectionStatus === 'disconnected' && (
          <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <div className="flex-1">
                <p className="text-red-100 font-medium">Koneksi Terputus</p>
                <p className="text-red-200 text-sm">Database tidak dapat diakses. Periksa koneksi internet Anda atau refresh halaman.</p>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 w-full bg-red-500/30 hover:bg-red-500/40 text-red-100 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Refresh Halaman
            </button>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-red-100 font-medium">Login Gagal</p>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-cyan-100 mb-3">
                  👤 Username atau Email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={formData.identifier}
                  onChange={handleInputChange}
                  disabled={loading || connectionStatus === 'disconnected'}
                  className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Masukkan username atau email"
                />
                <p className="text-cyan-300 text-xs mt-1">
                  Untuk Daily Pass: gunakan username (contoh: NMABC123)
                </p>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-cyan-100 mb-3">
                  🔒 Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={loading || connectionStatus === 'disconnected'}
                  className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Masukkan password"
                />
                <p className="text-cyan-300 text-xs mt-1">
                  Untuk Daily Pass: gunakan password 6 digit angka
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || connectionStatus === 'disconnected'}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Memproses Login...</span>
                </div>
              ) : connectionStatus === 'disconnected' ? (
                <div className="flex items-center justify-center space-x-2">
                  <span>❌ Koneksi Terputus - Tidak Dapat Login</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>🚀 Masuk Sekarang</span>
                </div>
              )}
            </button>

            <div className="text-center space-y-3 pt-4">
              <p className="text-cyan-200 text-sm">
                Belum punya akun member?{' '}
                <Link href="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors">
                  Daftar Member Baru
                </Link>
              </p>
              
              <p className="text-cyan-200 text-sm">
                Ingin akses harian?{' '}
                <Link href="/non-member-payment" className="text-green-400 hover:text-green-300 font-semibold underline underline-offset-2 transition-colors">
                  Beli Daily Pass
                </Link>
              </p>

              <p className="text-cyan-200 text-sm">
                Sudah beli Daily Pass?{' '}
                <Link href="/non-member-login" className="text-orange-400 hover:text-orange-300 font-semibold underline underline-offset-2 transition-colors">
                  Login Non-Member
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Info Login */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30 shadow-xl">
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-white mb-1">💡 Informasi Login</h3>
            <p className="text-cyan-100 text-sm">Sistem mendeteksi role secara otomatis</p>
          </div>
          
          <div className="text-cyan-200 text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-medium">Member Regular:</span>
              <span className="text-xs">Username / Email</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Staff Keuangan:</span>
              <span className="text-xs">Username</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Staff Operasional:</span>
              <span className="text-xs">Username</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Daily Pass:</span>
              <span className="text-xs">Username (NM...)</span>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center">
          <p className="text-cyan-200/80 text-sm">
            HS Gym Rancakihiyang • Sistem Manajemen Modern
          </p>
          <p className="text-cyan-200/60 text-xs mt-1">
            Real-time authentication dengan Firebase
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;