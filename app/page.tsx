'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  const getDashboardPath = (role: string) => {
    switch (role) {
      case 'member':
        return '/member-dashboard';
      case 'admin_operasional':
        return '/admin-operasional';
      case 'admin_keuangan':
        return '/admin-keuangan';
      case 'manager':
        return '/admin-operasional';
      default:
        return '/';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">
      {/* NAVBAR */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">HS</span>
              </div>
              <div>
                <span className="text-white text-2xl font-bold block">HS Gym</span>
                <span className="text-yellow-400 text-sm block">Rancakihiyang</span>
              </div>
            </div>

            {/* Right Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <div className="text-right hidden md:block">
                    <p className="text-white font-semibold text-sm">Halo, {user.fullName || user.username}</p>
                    <p className="text-yellow-400 text-xs capitalize">{user.role?.replace('_', ' ')}</p>
                  </div>
                  <Link
                    href={getDashboardPath(user.role)}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🚀 Dashboard
                  </Link>
                  <button
                    onClick={logout}
                    className="bg-gradient-to-r from-red-500 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-pink-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/non-member-payment"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    💳 Non-Member Daily
                  </Link>
                  <Link
                    href="/login"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🔑 Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-6 py-3 rounded-lg hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 font-semibold text-center shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    🏋️ Daftar Member
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="container mx-auto px-6 py-20 lg:py-32">
        <div className="text-center">
          <div className="inline-block bg-white/10 backdrop-blur-sm rounded-2xl px-6 py-3 mb-8 border border-white/20">
            <span className="text-yellow-400 font-semibold">🏆 Gym Terbaik di Rancakihiyang</span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Transformasi Tubuh
            <span className="block text-yellow-400 mt-2">Impian Anda</span>
          </h1>

          <p className="text-xl lg:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
            Di <span className="text-yellow-400 font-semibold">HS Gym Rancakihiyang</span>, kami menghadirkan pengalaman fitness terbaik dengan teknologi modern, trainer profesional, dan komunitas yang mendukung perjalanan kebugaran Anda.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
            <Link
              href="/register"
              className="group bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-8 py-4 rounded-xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 text-lg font-bold shadow-2xl transform hover:-translate-y-1 hover:scale-105 flex items-center space-x-3 min-w-[200px] justify-center"
            >
              <span className="text-2xl">🏋️</span>
              <span>Mulai Sekarang</span>
            </Link>

            <Link
              href="/login"
              className="group border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white hover:bg-opacity-10 transition-all duration-300 text-lg font-bold transform hover:-translate-y-1 flex items-center space-x-3 min-w-[200px] justify-center"
            >
              <span className="text-2xl">🔑</span>
              <span>Member Login</span>
            </Link>

            <Link
              href="/non-member-payment"
              className="group bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 text-lg font-bold shadow-2xl transform hover:-translate-y-1 hover:scale-105 flex items-center space-x-3 min-w-[200px] justify-center"
            >
              <span className="text-2xl">💳</span>
              <span>Coba Sekarang</span>
            </Link>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-white/5 backdrop-blur-sm py-16 border-y border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { number: '500+', label: 'Member Aktif', emoji: '👥' },
              { number: '50+', label: 'Equipment Modern', emoji: '🏃‍♂️' },
              { number: '10+', label: 'Trainer Profesional', emoji: '💪' },
              { number: '70-100', label: 'Pengunjung/Hari', emoji: '🔥' },
            ].map((stat, index) => (
              <div key={index} className="text-white group">
                <div className="text-4xl mb-3 transform group-hover:scale-110 transition duration-300">
                  {stat.emoji}
                </div>
                <div className="text-3xl lg:text-4xl font-bold text-yellow-400 mb-2">
                  {stat.number}
                </div>
                <div className="text-blue-100 font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
              Keunggulan <span className="text-blue-600">HS Gym</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Kami menghadirkan solusi fitness modern dengan teknologi terkini untuk pengalaman terbaik
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                emoji: '📱',
                title: 'Digital Membership',
                description: 'Kartu member digital dengan QR code, akses gym hanya dengan smartphone Anda',
                gradient: 'from-blue-500 to-purple-600',
                bgGradient: 'from-blue-50 to-purple-50'
              },
              {
                emoji: '💳',
                title: 'Multi Payment',
                description: 'Bayar dengan berbagai metode: QRIS, E-Wallet, Transfer, atau Tunai dengan proses instan',
                gradient: 'from-green-500 to-blue-500',
                bgGradient: 'from-green-50 to-blue-50'
              },
              {
                emoji: '👤',
                title: 'Non-Member Daily',
                description: 'Coba fasilitas kami dengan bayar harian Rp 15.000, dapat E-Card digital sekali pakai',
                gradient: 'from-orange-500 to-red-500',
                bgGradient: 'from-orange-50 to-red-50'
              },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 bg-gradient-to-br relative overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-100 group-hover:opacity-0 transition-opacity duration-500`}></div>
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">{feature.emoji}</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 group-hover:text-white mb-4 transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 group-hover:text-white/90 leading-relaxed transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NON-MEMBER DAILY PASS SECTION */}
      <section className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-700 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center text-white mb-16">
            <div className="inline-block bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-2 mb-4">
              <span className="font-semibold">✨ Coba Dulu Sebelum Langganan</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold mb-6">Non-Member Daily Pass</h2>
            <p className="text-xl lg:text-2xl opacity-90 max-w-3xl mx-auto">
              Ingin merasakan fasilitas gym kami tanpa komitmen member? Cukup bayar sekali, nikmati sehari penuh!
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="lg:flex">
                <div className="lg:w-1/2 bg-gradient-to-br from-green-500 to-emerald-600 p-8 lg:p-12 text-white">
                  <h3 className="text-3xl font-bold mb-6">Kunjungan Harian</h3>
                  <p className="text-lg mb-8 opacity-90 leading-relaxed">
                    Perfect untuk Anda yang ingin mencoba semua fasilitas gym kami sebelum memutuskan menjadi member tetap.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      'Akses penuh semua equipment dan area gym',
                      'E-Card digital sekali pakai via WhatsApp/Email',
                      'Berlaku 1 hari penuh (08:00 - 21:00 WIB)',
                      'Bebas pilih waktu kunjungan',
                      'Free WiFi dan locker sementara',
                      'Bimbingan basic dari trainer'
                    ].map((benefit, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <span className="text-2xl mt-1">✅</span>
                        <span className="text-lg">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:w-1/2 p-8 lg:p-12">
                  <div className="text-center mb-8">
                    <div className="text-6xl font-bold text-green-600 mb-2">Rp 15K</div>
                    <p className="text-gray-600 text-lg">per kunjungan / hari</p>
                    <div className="inline-block bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mt-3">
                      💰 Hemat dibanding gym lain!
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Link
                      href="/non-member-payment"
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 px-8 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-bold text-lg text-center block shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                      💳 Beli Sekarang - Cukup 15K!
                    </Link>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-500">
                        Setelah pembayaran, Anda akan mendapatkan E-Card digital via WhatsApp/Email
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        *Tunjukan E-Card di reception untuk akses gym
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PLANS SECTION */}
      <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-800 mb-4">
              Paket Membership Eksklusif
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Mulai dari <span className="text-green-600 font-bold">Rp 120.000/bulan</span>. Pilih paket yang paling sesuai dengan goals dan budget fitness Anda
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            {[
              { 
                name: 'Bulanan', 
                price: 120000, 
                duration: '1 bulan',
                popular: false,
                features: [
                  'Akses semua equipment gym',
                  'Kartu member digital dengan QR Code',
                  'Free WiFi high-speed',
                  'Locker harian',
                  'Basic guidance dari trainer',
                  'Akses 08:00 - 21:00 WIB'
                ],
                color: 'from-blue-500 to-cyan-500',
                savings: null
              },
              { 
                name: 'Triwulan', 
                price: 300000, 
                duration: '3 bulan',
                popular: true,
                features: [
                  'Semua benefit paket bulanan',
                  'Hemat Rp 60.000',
                  '1x konsultasi trainer gratis',
                  'Progress tracking aplikasi',
                  'Special locker priority',
                  'Tips nutrition dasar',
                  'Guest pass 1x untuk teman'
                ],
                color: 'from-purple-500 to-pink-500',
                savings: 'Hemat 17%'
              },
              { 
                name: 'Semester', 
                price: 550000, 
                duration: '6 bulan',
                popular: false,
                features: [
                  'Semua benefit paket triwulan',
                  'Hemat Rp 170.000',
                  '2x konsultasi trainer pribadi',
                  'Nutrition guide lengkap',
                  'Premium locker dedicated',
                  'Personal workout program',
                  'Guest pass 3x untuk teman'
                ],
                color: 'from-green-500 to-emerald-500',
                savings: 'Hemat 24%'
              },
              { 
                name: 'Tahunan', 
                price: 1000000, 
                duration: '12 bulan',
                popular: false,
                features: [
                  'Semua benefit paket semester',
                  'Hemat Rp 440.000',
                  '4x konsultasi trainer pribadi',
                  'VIP nutrition guide & monitoring',
                  'VIP locker permanen',
                  'Custom program & assessment',
                  'Guest pass 12x untuk teman',
                  'Free HS Gym merchandise'
                ],
                color: 'from-orange-500 to-red-500',
                savings: 'Hemat 31%'
              },
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-3xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-500 ${
                  plan.popular ? 'ring-4 ring-yellow-400 relative' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg">
                      ⭐ MOST POPULAR
                    </div>
                  </div>
                )}

                {plan.savings && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {plan.savings}
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2 text-center">{plan.name}</h3>
                  <p className="text-gray-600 text-center mb-4">{plan.duration}</p>

                  <div className="text-center mb-6">
                    <div className={`text-4xl font-bold bg-gradient-to-r ${plan.color} bg-clip-text text-transparent mb-2`}>
                      Rp {plan.price.toLocaleString('id-ID')}
                    </div>
                    {plan.name !== 'Bulanan' && (
                      <div className="text-sm text-gray-600">
                        Rp {(plan.price / (plan.name === 'Triwulan' ? 3 : plan.name === 'Semester' ? 6 : 12)).toLocaleString('id-ID')}/bulan
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start text-gray-600 text-sm">
                        <span className="text-green-500 mr-3 text-lg mt-0.5 flex-shrink-0">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/register?plan=${plan.name.toLowerCase()}`}
                    className={`w-full block text-center py-4 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl ${
                      plan.popular
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:from-yellow-300 hover:to-orange-400'
                        : `bg-gradient-to-r ${plan.color} text-white hover:shadow-2xl`
                    }`}
                  >
                    {plan.popular ? '🔥 Pilih Paket' : 'Pilih Paket'}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="text-center mt-12">
            <div className="bg-white rounded-2xl p-6 shadow-lg inline-block">
              <p className="text-gray-600">
                💡 <span className="font-semibold">Tips:</span> Paket <span className="text-green-600 font-bold">Triwulan</span> paling populer karena memberikan keseimbangan terbaik antara harga dan benefit!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">HS</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">HS Gym Rancakihiyang</h3>
                  <p className="text-yellow-400 text-sm">Your Fitness Journey Starts Here</p>
                </div>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
                Pusat kebugaran modern dengan teknologi terdepan untuk membantu Anda mencapai tubuh ideal. 
                Dengan fasilitas lengkap, trainer profesional, dan komunitas yang supportive.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-xl mb-6">Kontak & Lokasi</h4>
              <div className="space-y-3">
                <p className="flex items-center space-x-3 text-gray-400">
                  <span className="text-2xl">📞</span>
                  <span>0812-3456-7890</span>
                </p>
                <p className="flex items-center space-x-3 text-gray-400">
                  <span className="text-2xl">📧</span>
                  <span>info@hsgym-rancakihiyang.com</span>
                </p>
                <p className="flex items-center space-x-3 text-gray-400">
                  <span className="text-2xl">📍</span>
                  <span>Jl. Rancakihiyang No. 123, Bandung</span>
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xl mb-6">Quick Access</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/login" className="text-gray-400 hover:text-yellow-400 transition-colors block">
                    🔐 Login Member
                  </Link>
                  <Link href="/register" className="text-gray-400 hover:text-yellow-400 transition-colors block">
                    🏋️ Daftar Member
                  </Link>
                  <Link href="/non-member-payment" className="text-green-400 hover:text-green-300 transition-colors font-semibold block">
                    💳 Non-Member Daily
                  </Link>
                  <Link href="/admin-operasional" className="text-blue-400 hover:text-blue-300 transition-colors block">
                    ⚙️ Admin Panel
                  </Link>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <h5 className="font-semibold mb-3">Jam Operasional</h5>
                <p className="text-gray-400 text-sm">Senin - Minggu</p>
                <p className="text-gray-400 text-sm">08:00 - 21:00 WIB</p>
                <p className="text-green-400 text-sm font-semibold mt-2">Non-Member: Rp 15.000/hari</p>
                <p className="text-blue-400 text-sm font-semibold mt-1">Member: Mulai Rp 120.000/bulan</p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-12 pt-8 text-center">
            <p className="text-gray-400">
              &copy; 2024 HS Gym Rancakihiyang. All rights reserved. | 
              <span className="text-yellow-400 ml-2">Built with ❤️ for fitness enthusiasts</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}