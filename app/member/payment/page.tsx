'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PaymentData {
  id_member: number;
  nama: string;
  paket: string;
  total_bayar: number;
  ecard_code: string;
}

export default function MemberPayment() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const router = useRouter();

  useEffect(() => {
    const userData = localStorage.getItem('user');
    
    if (userData) {
      const user = JSON.parse(userData);
      setPaymentData({
        id_member: user.id,
        nama: user.nama,
        paket: user.paket || 'bulanan',
        total_bayar: 120000, // Default amount
        ecard_code: user.ecard_code || 'MEM-000'
      });
    } else {
      router.push('/login');
    }
  }, [router]);

  const handlePayment = async () => {
    if (!paymentData) return;
    
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/member/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: paymentData.id_member,
          payment_method: paymentMethod,
          amount: paymentData.total_bayar
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert('Pembayaran berhasil! Status member Anda akan segera aktif.');
        router.push('/member-dashboard');
      } else {
        alert(result.error || 'Pembayaran gagal');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Terjadi kesalahan saat pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data pembayaran...</p>
        </div>
      </div>
    );
  }

  const planNames = {
    bulanan: 'Bulanan',
    triwulan: 'Triwulan', 
    semester: 'Semester',
    tahunan: 'Tahunan'
  };

  const planPrices = {
    bulanan: 120000,
    triwulan: 300000,
    semester: 550000,
    tahunan: 1000000
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="flex items-center space-x-2 justify-center">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">HS</span>
              </div>
              <span className="text-2xl font-bold text-gray-800">Gym Rancakihiyang</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800">Pembayaran Member</h1>
          <p className="text-gray-600">Lengkapi pembayaran untuk mengaktifkan keanggotaan</p>
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-blue-600 py-4 text-center">
            <h2 className="text-2xl font-bold text-white">Konfirmasi Pembayaran</h2>
          </div>
          
          <div className="p-6">
            {/* Member Info */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-3">Data Member</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Nama:</span>
                  <span className="font-semibold">{paymentData.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span>E-Card:</span>
                  <span className="font-mono bg-blue-100 px-2 py-1 rounded">{paymentData.ecard_code}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paket:</span>
                  <span className="font-semibold">{planNames[paymentData.paket as keyof typeof planNames]}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center mb-6 p-4 bg-green-50 rounded-lg">
              <p className="text-gray-600">Total Pembayaran:</p>
              <p className="text-4xl font-bold text-green-600">
                Rp {planPrices[paymentData.paket as keyof typeof planPrices]?.toLocaleString('id-ID')}
              </p>
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Metode Pembayaran:</h3>
              <div className="space-y-3">
                {[
                  { id: 'transfer', name: 'Transfer Bank', desc: 'BCA, BNI, Mandiri, BRI', icon: '🏦' },
                  { id: 'qris', name: 'QRIS', desc: 'Scan QR Code', icon: '📱' },
                  { id: 'ewallet', name: 'E-Wallet', desc: 'Gopay, OVO, Dana', icon: '💳' }
                ].map((method) => (
                  <div 
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      paymentMethod === method.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
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
                          className="text-blue-500"
                        />
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Instructions */}
            {paymentMethod === 'transfer' && (
              <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h4 className="font-semibold text-yellow-800 mb-2">Instruksi Transfer:</h4>
                <div className="text-sm text-yellow-700 space-y-1">
                  <p><strong>Bank:</strong> BCA</p>
                  <p><strong>No. Rekening:</strong> 1234567890</p>
                  <p><strong>Atas Nama:</strong> HS GYM RANCAKIHIYANG</p>
                  <p><strong>Jumlah:</strong> Rp {planPrices[paymentData.paket as keyof typeof planPrices]?.toLocaleString('id-ID')}</p>
                  <p><strong>Keterangan:</strong> {paymentData.ecard_code}</p>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing}
              className="w-full bg-blue-500 text-white py-4 px-4 rounded-xl font-bold text-lg hover:bg-blue-600 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed shadow-lg"
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Memproses Pembayaran...
                </div>
              ) : (
                `Bayar Sekarang - Rp ${planPrices[paymentData.paket as keyof typeof planPrices]?.toLocaleString('id-ID')}`
              )}
            </button>

            <p className="text-sm text-gray-500 mt-4 text-center">
              Setelah pembayaran, status member Anda akan aktif dalam 1x24 jam
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <Link href="/member-dashboard" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Kembali ke Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}