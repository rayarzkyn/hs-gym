'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface PaymentData {
  username: string;
  password: string;
  ecard_code: string;
  urutan_harian: number;
  tanggal_kunjungan: string;
}

export default function NonMemberSuccess() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const ecard_code = searchParams.get('ecard_code');
    const urutan_harian = searchParams.get('urutan_harian');
    const tanggal_kunjungan = searchParams.get('tanggal_kunjungan');

    if (username && password) {
      setPaymentData({
        username,
        password,
        ecard_code: ecard_code || '',
        urutan_harian: parseInt(urutan_harian || '0'),
        tanggal_kunjungan: tanggal_kunjungan || new Date().toISOString().split('T')[0]
      });
    }
  }, [searchParams]);

  const handleLoginRedirect = () => {
    router.push('/login');
  };

  const handleCopyCredentials = () => {
    if (paymentData) {
      const text = `Username: ${paymentData.username}\nPassword: ${paymentData.password}`;
      navigator.clipboard.writeText(text);
      alert('Username dan password berhasil disalin!');
    }
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pembayaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="flex items-center space-x-2 justify-center">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">HS</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">Gym Rancakihiyang</span>
            </div>
          </Link>
        </div>

        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-green-600 py-6 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-green-600">✓</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Pembayaran Berhasil!</h2>
            <p className="text-green-100 mt-2">Simpan username dan password Anda</p>
          </div>
          
          <div className="p-6">
            {/* Credentials Box */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-yellow-800 mb-3 text-center">Login Credentials</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Username:</span>
                  <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">
                    {paymentData.username}
                  </code>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Password:</span>
                  <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm">
                    {paymentData.password}
                  </code>
                </div>
              </div>

              <button
                onClick={handleCopyCredentials}
                className="w-full mt-4 bg-yellow-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-yellow-600 transition-colors"
              >
                Salin Username & Password
              </button>
            </div>

            {/* Information */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-gray-700">E-Card Code:</span>
                <span className="font-mono bg-blue-100 px-2 py-1 rounded text-blue-800 font-bold">
                  {paymentData.ecard_code}
                </span>
              </div>
              
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-semibold text-gray-700">Pengunjung Ke:</span>
                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded font-bold">
                  #{paymentData.urutan_harian}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Tanggal:</span>
                <span className="text-gray-600">
                  {new Date(paymentData.tanggal_kunjungan).toLocaleDateString('id-ID')}
                </span>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">Cara Login:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>1. Pergi ke halaman <strong>Login</strong></li>
                <li>2. Masukkan username & password di atas</li>
                <li>3. Anda akan diarahkan ke dashboard</li>
                <li>4. Tunjukkan E-Card kepada admin</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleLoginRedirect}
                className="w-full bg-green-500 text-white py-3 px-4 rounded-xl font-bold text-lg hover:bg-green-600 transition-colors"
              >
                🎫 Pergi ke Halaman Login
              </button>
              
              <Link
                href="/"
                className="w-full block text-center bg-gray-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-gray-600 transition-colors"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}