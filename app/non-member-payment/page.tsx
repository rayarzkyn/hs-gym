'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NonMemberPayment() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('qris');
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handlePayment = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/non-member/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payment_method: paymentMethod })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Redirect ke halaman success dengan data credentials
        const successParams = new URLSearchParams({
          username: result.username,
          password: result.password,
          ecard_code: result.ecard_code,
          urutan_harian: result.urutan_harian.toString(),
          tanggal_kunjungan: result.tanggal_kunjungan
        });
        
        router.push(`/non-member-success?${successParams.toString()}`);
      } else {
        setErrorMessage(result.error || 'Pembayaran gagal');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('Terjadi kesalahan jaringan');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">HS</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">Gym Rancakihiyang</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Non-Member Daily</h1>
          <p className="text-gray-600">Akses gym harian tanpa daftar member</p>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-green-600 py-4 text-center">
            <h2 className="text-2xl font-bold text-white">Pembayaran Kunjungan Harian</h2>
          </div>
          
          <div className="p-6">
            {/* Price Display */}
            <div className="text-center mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-gray-600">Total Pembayaran:</p>
              <p className="text-4xl font-bold text-green-600">Rp 15.000</p>
              <p className="text-sm text-gray-500 mt-1">Berlaku untuk 1 hari akses penuh</p>
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Pilih Metode Pembayaran:</h3>
              <div className="space-y-3">
                {[
                  { id: 'qris', name: 'QRIS', desc: 'Scan QR Code', icon: '📱' },
                  { id: 'ewallet', name: 'E-Wallet', desc: 'Gopay, OVO, Dana', icon: '💳' },
                  { id: 'transfer', name: 'Transfer Bank', desc: 'BCA, BNI, Mandiri', icon: '🏦' },
                  { id: 'tunai', name: 'Tunai', desc: 'Bayar di tempat', icon: '💵' }
                ].map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === method.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="text-2xl mr-3">{method.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">{method.name}</span>
                        <input 
                          type="radio" 
                          name="payment" 
                          value={method.id} 
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="text-green-500"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-green-500 text-white py-4 px-4 rounded-xl font-bold text-lg hover:bg-green-600 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed shadow-lg"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Memproses Pembayaran...
                </div>
              ) : (
                `Bayar Sekarang - Rp 15.000`
              )}
            </button>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">Setelah Pembayaran:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Dapatkan username & password unik</li>
                <li>• Login untuk melihat E-Card digital</li>
                <li>• Tunjukkan E-Card ke admin saat check-in</li>
                <li>• Akses berlaku sampai jam 23:59 WIB</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-green-600 hover:text-green-700 font-medium">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}