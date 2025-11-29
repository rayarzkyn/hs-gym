'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  telepon: string;
  alamat: string;
  membership_plan: string;
}

interface RegistrationResult {
  success: boolean;
  user?: any;
  memberData?: any;
  transactionId?: string;
  error?: string;
  message?: string;
}

export default function Register() {
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    telepon: '',
    alamat: '',
    membership_plan: 'Bulanan'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nextMemberNumber, setNextMemberNumber] = useState('');
  const [generatedUsername, setGeneratedUsername] = useState('');
  const [registrationResult, setRegistrationResult] = useState<RegistrationResult | null>(null);
  const router = useRouter();

  // Fetch next available member number
  useEffect(() => {
    const fetchNextMemberNumber = async () => {
      try {
        const response = await fetch('/api/auth/next-member-number');
        const data = await response.json();
        
        if (data.success) {
          setNextMemberNumber(data.nextMemberNumber);
          // Generate username berdasarkan nomor member (M001 -> Member_001)
          const memberNumber = data.nextMemberNumber.replace('M', '');
          const username = `Member_${memberNumber.padStart(3, '0')}`;
          setGeneratedUsername(username);
          setFormData(prev => ({ ...prev, username }));
        }
      } catch (error) {
        console.error('Error fetching member number:', error);
        // Fallback: generate based on timestamp
        const fallbackNumber = `M${Date.now().toString().slice(-3)}`;
        const memberNumber = fallbackNumber.replace('M', '');
        const username = `Member_${memberNumber.padStart(3, '0')}`;
        setNextMemberNumber(fallbackNumber);
        setGeneratedUsername(username);
        setFormData(prev => ({ ...prev, username }));
      }
    };

    fetchNextMemberNumber();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validasi
    if (formData.password !== formData.confirmPassword) {
      setError('Password dan konfirmasi password tidak cocok');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }

    try {
      console.log('📝 Registering member:', formData);
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          nomor_member: nextMemberNumber,
          membership_price: membershipPlans.find(plan => plan.value === formData.membership_plan)?.price || 120000
        }),
      });

      const result: RegistrationResult = await response.json();
      console.log('📨 Registration response:', result);

      if (result.success) {
        setRegistrationResult(result);
        setSuccess('Registrasi berhasil! Silakan lanjutkan ke pembayaran.');
        
        // Simpan data sementara untuk pembayaran
        localStorage.setItem('pendingRegistration', JSON.stringify({
          user: result.user,
          memberData: result.memberData,
          transactionId: result.transactionId
        }));
        
      } else {
        setError(result.error || 'Registrasi gagal');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Terjadi kesalahan saat registrasi');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToPayment = () => {
    if (registrationResult) {
      router.push('/member/payment');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const membershipPlans = [
    { value: 'Bulanan', label: 'Bulanan - Rp 120.000', price: 120000 },
    { value: 'Triwulan', label: 'Triwulan - Rp 300.000', price: 300000 },
    { value: 'Semester', label: 'Semester - Rp 550.000', price: 550000 },
    { value: 'Tahunan', label: 'Tahunan - Rp 1.000.000', price: 1000000 }
  ];

  const selectedPlan = membershipPlans.find(plan => plan.value === formData.membership_plan);

  // Jika registrasi berhasil, tampilkan konfirmasi dan tombol pembayaran
  if (registrationResult?.success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

        <div className="max-w-md w-full space-y-8 relative z-10">
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
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl">
              <h2 className="text-3xl font-bold text-white mb-2">Registrasi Berhasil! 🎉</h2>
              <p className="text-cyan-100 text-lg">Lanjutkan ke pembayaran untuk mengaktifkan akun</p>
            </div>
          </div>

          {/* Success Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">✓</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Data Berhasil Disimpan</h3>
              <p className="text-cyan-100">Akun Anda telah dibuat dan siap untuk pembayaran</p>
            </div>

            {/* Member Info */}
            <div className="bg-cyan-500/20 rounded-xl p-6 border border-cyan-400/30 mb-6">
              <h4 className="text-lg font-semibold text-cyan-100 mb-4">📋 Data Member</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-200">Nomor Member:</span>
                  <span className="text-white font-semibold">{registrationResult.user?.nomor_member}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Username:</span>
                  <span className="text-white font-semibold">{registrationResult.user?.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Nama:</span>
                  <span className="text-white font-semibold">{registrationResult.user?.fullName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Paket:</span>
                  <span className="text-white font-semibold">{registrationResult.user?.membership_plan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Total Bayar:</span>
                  <span className="text-white font-semibold">
                    Rp {registrationResult.user?.membership_price?.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment CTA */}
            <div className="text-center">
              <p className="text-cyan-200 text-sm mb-4">
                Status akun: <span className="text-yellow-400 font-semibold">Menunggu Pembayaran</span>
              </p>
              
              <button
                onClick={handleContinueToPayment}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>💳 Lanjutkan ke Pembayaran</span>
                </div>
              </button>

              <p className="text-cyan-200 text-xs mt-3">
                Anda akan diarahkan ke halaman pembayaran
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="text-center">
            <p className="text-cyan-200/80 text-sm">
              Akun akan aktif secara otomatis setelah pembayaran dikonfirmasi
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Tampilan form registrasi normal
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-2xl w-full space-y-8 relative z-10">
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
          
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-2">Daftar Member Baru</h2>
            <p className="text-cyan-100 text-lg">Bergabunglah dengan komunitas fitness terbaik</p>
            
            {nextMemberNumber && (
              <div className="mt-4 bg-cyan-500/20 rounded-lg p-3 border border-cyan-400/30">
                <p className="text-cyan-100 text-sm">
                  <span className="font-semibold">Nomor Member Anda:</span> {nextMemberNumber}
                </p>
                <p className="text-cyan-100 text-sm">
                  <span className="font-semibold">Username:</span> {generatedUsername}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Registration Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4 animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">!</span>
                  </div>
                  <div>
                    <p className="text-red-100 font-medium">Registrasi Gagal</p>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-green-100 font-medium">Registrasi Berhasil!</p>
                    <p className="text-green-200 text-sm">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Informasi Akun */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-100 border-b border-cyan-400/30 pb-2">
                  🔐 Informasi Akun
                </h3>
                
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-cyan-100 mb-2">
                    Username *
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Username akan digenerate otomatis"
                    readOnly
                  />
                  <p className="text-cyan-200 text-xs mt-1">Username digenerate otomatis</p>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-cyan-100 mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-cyan-100 mb-2">
                    Password *
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-cyan-100 mb-2">
                    Konfirmasi Password *
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Ulangi password"
                  />
                </div>
              </div>

              {/* Informasi Pribadi */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-100 border-b border-cyan-400/30 pb-2">
                  👤 Informasi Pribadi
                </h3>

                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-cyan-100 mb-2">
                    Nama Lengkap *
                  </label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="Nama lengkap sesuai KTP"
                  />
                </div>

                <div>
                  <label htmlFor="telepon" className="block text-sm font-medium text-cyan-100 mb-2">
                    Nomor Telepon *
                  </label>
                  <input
                    id="telepon"
                    name="telepon"
                    type="tel"
                    required
                    value={formData.telepon}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                    placeholder="081234567890"
                  />
                </div>

                <div>
                  <label htmlFor="alamat" className="block text-sm font-medium text-cyan-100 mb-2">
                    Alamat Lengkap *
                  </label>
                  <textarea
                    id="alamat"
                    name="alamat"
                    required
                    value={formData.alamat}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white placeholder-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm resize-none"
                    placeholder="Alamat lengkap tempat tinggal"
                  />
                </div>

                <div>
                  <label htmlFor="membership_plan" className="block text-sm font-medium text-cyan-100 mb-2">
                    Paket Membership *
                  </label>
                  <select
                    id="membership_plan"
                    name="membership_plan"
                    required
                    value={formData.membership_plan}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white/10 border border-cyan-400/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm"
                  >
                    {membershipPlans.map(plan => (
                      <option key={plan.value} value={plan.value} className="bg-slate-800">
                        {plan.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Plan Summary */}
            {selectedPlan && (
              <div className="bg-cyan-500/20 rounded-xl p-4 border border-cyan-400/30">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-cyan-100 font-semibold">Paket {selectedPlan.value}</p>
                    <p className="text-cyan-200 text-sm">Total yang harus dibayar</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      Rp {selectedPlan.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-cyan-200 text-xs">Setelah registrasi</p>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Memproses Pendaftaran...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>📝 Daftar Sekarang </span>
                  </div>
                )}
              </button>
            </div>

            <div className="text-center pt-4">
              <p className="text-cyan-200 text-sm">
                Sudah punya akun?{' '}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 transition-colors">
                  Masuk di sini
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Membership Info */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30 shadow-xl">
          <h3 className="text-lg font-semibold text-white text-center mb-4">💎 Paket Membership</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            {membershipPlans.map(plan => (
              <div key={plan.value} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-cyan-400/30 transition-colors">
                <div className="text-cyan-100 font-semibold">{plan.value}</div>
                <div className="text-cyan-300 text-sm">Rp {plan.price.toLocaleString('id-ID')}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}