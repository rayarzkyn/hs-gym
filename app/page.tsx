'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-800">

      {/* NAVBAR */}
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">

            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">HS</span>
              </div>
              <span className="text-white text-2xl font-bold">Gym Rancakihiyang</span>
            </div>

            {/* Right Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-4">
                  <Link
                    href={`/${
                      user.role === 'member'
                        ? 'member-dashboard'
                        : user.role === 'admin_operasional'
                        ? 'admin-operasional'
                        : user.role === 'admin_keuangan'
                        ? 'admin-keuangan'
                        : 'manager-dashboard'
                    }`}
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                  >
                    Dashboard
                  </Link>

                  <button
                    onClick={logout}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="space-x-3">
                  <Link
                    href="/login"
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition font-semibold"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-yellow-500 text-gray-900 px-6 py-2 rounded-lg hover:bg-yellow-400 transition font-semibold"
                  >
                    Daftar Member
                  </Link>
                  {/* TAMBAHAN: Tombol Non-Member Daily */}
                  <Link
                    href="/non-member-payment"
                    className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition font-semibold"
                  >
                    Non-Member Daily
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-6 leading-tight">
            Transformasi Tubuh Anda<br />
            Dengan <span className="text-yellow-400">HS Gym Rancakihiyang</span>
          </h1>

          <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
            HS Gym Rancakihiyang adalah pusat kebugaran modern yang menyediakan fasilitas lengkap 
            dan pelayanan terbaik untuk membantu Anda mencapai tujuan kebugaran. Dengan trainer 
            profesional dan equipment terbaru, kami siap mendukung perjalanan fitness Anda.
          </p>

          <div className="space-x-4">
            <Link
              href="/register"
              className="bg-yellow-500 text-gray-900 px-8 py-4 rounded-xl hover:bg-yellow-400 transition text-lg font-bold shadow-2xl"
            >
              🏋️ Mulai Perjalanan Fitness
            </Link>

            <Link
              href="/login"
              className="border-2 border-white text-white px-8 py-4 rounded-xl hover:bg-white hover:bg-opacity-10 transition text-lg font-bold"
            >
              🔑 Akses Member Area
            </Link>

            {/* TAMBAHAN: Tombol Non-Member di Hero Section */}
            <Link
              href="/non-member-payment"
              className="bg-green-500 text-white px-8 py-4 rounded-xl hover:bg-green-600 transition text-lg font-bold shadow-2xl"
            >
              💳 Non-Member Daily
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-white/5 backdrop-blur-sm py-16">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">

            <div className="text-white">
              <div className="text-4xl font-bold text-yellow-400 mb-2">500+</div>
              <div className="text-blue-100">Member Aktif</div>
            </div>

            <div className="text-white">
              <div className="text-4xl font-bold text-yellow-400 mb-2">50+</div>
              <div className="text-blue-100">Equipment Modern</div>
            </div>

            <div className="text-white">
              <div className="text-4xl font-bold text-yellow-400 mb-2">10+</div>
              <div className="text-blue-100">Trainer Profesional</div>
            </div>

            <div className="text-white">
              <div className="text-4xl font-bold text-yellow-400 mb-2">70-100</div>
              <div className="text-blue-100">Pengunjung/Hari</div>
            </div>

          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-16">
            Mengapa Memilih <span className="text-blue-600">HS Gym Rancakihiyang</span>?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

            {/* Digital Membership */}
            <div className="text-center p-8 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎫</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Digital Membership</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Kartu member digital dengan sistem verifikasi canggih. Akses gym dengan scan QR code melalui smartphone.
              </p>
            </div>

            {/* Multi Payment */}
            <div className="text-center p-8 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">💳</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Multi Payment</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Bayar dengan berbagai metode: Tunai, QRIS, E-Wallet, Transfer Bank. Proses cepat dan aman.
              </p>
            </div>

            {/* Non-Member Daily */}
            <div className="text-center p-8 bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl shadow-lg hover:shadow-xl transition">
              <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Non-Member Daily</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Akses gym harian tanpa perlu daftar member. Bayar Rp 15.000 dan dapatkan E-Card digital untuk hari itu.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* NON-MEMBER DAILY SECTION BARU */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-700 py-16">
        <div className="container mx-auto px-6">
          <div className="text-center text-white mb-12">
            <h2 className="text-4xl font-bold mb-4">Non-Member Daily Pass</h2>
            <p className="text-xl opacity-90">Ingin coba fasilitas gym kami tanpa komitmen member?</p>
          </div>

          <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2 bg-green-500 p-8 text-white">
                <h3 className="text-2xl font-bold mb-4">Kunjungan Harian</h3>
                <p className="mb-6">Cocok untuk Anda yang ingin mencoba fasilitas gym kami tanpa harus berlangganan.</p>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span>Akses semua equipment</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span>E-Card digital sekali pakai</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span>Berlaku 1 hari penuh</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">✅</span>
                    <span>Bebas pilih waktu kunjungan</span>
                  </div>
                </div>
              </div>

              <div className="md:w-1/2 p-8">
                <div className="text-center mb-6">
                  <div className="text-5xl font-bold text-green-600 mb-2">Rp 15.000</div>
                  <p className="text-gray-600">per kunjungan</p>
                </div>

                <div className="space-y-4">
                  <Link
                    href="/non-member-payment"
                    className="w-full bg-green-500 text-white py-4 px-6 rounded-xl hover:bg-green-600 transition font-bold text-lg text-center block"
                  >
                    Beli Sekarang
                  </Link>
                  
                  <p className="text-sm text-gray-500 text-center">
                    Setelah pembayaran, dapatkan E-Card digital untuk akses gym hari ini
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MEMBERSHIP PLANS */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-6">

          <h2 className="text-4xl font-bold text-center text-gray-800 mb-4">
            Paket Keanggotaan Eksklusif
          </h2>

          <p className="text-xl text-gray-600 text-center mb-12">
            Pilih paket yang sesuai dengan kebutuhan fitness Anda
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { name: 'Bulanan', price: 120000, features: ['Akses semua equipment', 'Kartu member digital', 'Free wifi', 'Locker harian'] },
              { name: 'Triwulan', price: 300000, popular: true, features: ['3 bulan akses penuh', '1x konsultasi trainer', 'Progress tracking', 'Special locker'] },
              { name: 'Semester', price: 550000, features: ['6 bulan akses penuh', '2x konsultasi trainer', 'Nutrition guide', 'Premium locker'] },
              { name: 'Tahunan', price: 1000000, features: ['1 tahun akses penuh', '4x konsultasi trainer', 'Personal program', 'VIP locker'] },
            ].map((plan, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition ${
                  plan.popular ? 'ring-4 ring-yellow-400' : ''
                }`}
              >
                {plan.popular && (
                  <div className="bg-yellow-500 text-white text-center py-2 font-bold">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">{plan.name}</h3>

                  <div className="text-3xl font-bold text-blue-600 mb-6">
                    Rp {plan.price.toLocaleString('id-ID')}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-gray-600">
                        <span className="text-green-500 mr-2">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/register?plan=${plan.name.toLowerCase()}`}
                    className={`w-full block text-center py-3 rounded-lg font-bold transition ${
                      plan.popular
                        ? 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Pilih Paket
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            <div>
              <h3 className="text-2xl font-bold mb-4">HS Gym Rancakihiyang</h3>
              <p className="text-gray-400">
                Pusat kebugaran modern dengan teknologi terdepan untuk mencapai tubuh ideal Anda.
                Berlokasi strategis di Rancakihiyang dengan fasilitas lengkap dan trainer profesional.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Kontak</h4>
              <p className="text-gray-400">📞 0812-3456-7890</p>
              <p className="text-gray-400">📧 info@hsgym-rancakihiyang.com</p>
              <p className="text-gray-400">📍 Jl. Rancakihiyang No. 123</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Jam Operasional</h4>
              <p className="text-gray-400">Senin - Minggu</p>
              <p className="text-gray-400">08:00 - 21:00 WIB</p>
              <p className="text-gray-400 mt-2 text-sm">Non-Member: Rp 15.000/hari</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <div className="space-y-2">
                <Link href="/login" className="block text-gray-400 hover:text-white">Login Member</Link>
                <Link href="/register" className="block text-gray-400 hover:text-white">Daftar Member</Link>
                <Link href="/non-member-payment" className="block text-green-400 hover:text-green-300">Non-Member Daily</Link>
              </div>
            </div>

          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 HS Gym Rancakihiyang. All rights reserved.</p>
          </div>

        </div>
      </footer>

    </div>
  );
}