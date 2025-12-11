'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface PaymentData {
  username: string;
  nomor_member: string;
  nama: string;
  membership_plan: string;
  membership_price: number;
  transactionId?: string;
  type?: 'registration' | 'extension';
  newExpiry?: string;
  duration?: string;
}

function PaymentContent() {
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('transfer');
  const [buktiPembayaran, setBuktiPembayaran] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentType, setPaymentType] = useState<'registration' | 'extension'>('registration');
  const router = useRouter();
  const searchParams = useSearchParams();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateInput: string | Date) => {
    if (!dateInput) return 'Tanggal tidak valid';

    let date;
    if (dateInput instanceof Date) {
      date = dateInput;
    } else if (typeof dateInput === 'string') {
      date = new Date(dateInput);
    } else {
      return 'Tanggal tidak valid';
    }

    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  useEffect(() => {
    const type = searchParams.get('type') as 'registration' | 'extension' || 'registration';
    const transactionId = searchParams.get('transactionId');

    setPaymentType(type);

    if (type === 'extension') {
      // Handle pembayaran perpanjangan
      const pendingExtension = localStorage.getItem('pendingExtension');

      if (pendingExtension) {
        try {
          const extensionData = JSON.parse(pendingExtension);
          setPaymentData({
            username: extensionData.user.username,
            nomor_member: extensionData.user.nomor_member,
            nama: extensionData.user.fullName,
            membership_plan: extensionData.user.membership_plan,
            membership_price: extensionData.user.membership_price,
            transactionId: extensionData.transactionId,
            type: 'extension',
            newExpiry: extensionData.extensionData?.newExpiry,
            duration: extensionData.user?.duration || extensionData.extensionData?.duration
          });
        } catch (e) {
          console.error('Error parsing pending extension:', e);
          setError('Data perpanjangan tidak valid');
        }
      } else if (transactionId) {
        // Coba fetch data dari API
        fetchExtensionData(transactionId);
      }
    } else {
      // Handle registrasi baru
      const pendingRegistration = localStorage.getItem('pendingRegistration');

      if (pendingRegistration) {
        try {
          const registrationData = JSON.parse(pendingRegistration);
          setPaymentData({
            username: registrationData.user.username,
            nomor_member: registrationData.user.nomor_member,
            nama: registrationData.user.fullName,
            membership_plan: registrationData.user.membership_plan,
            membership_price: registrationData.user.membership_price,
            transactionId: registrationData.transactionId,
            type: 'registration'
          });
        } catch (e) {
          console.error('Error parsing pending registration:', e);
          setError('Data registrasi tidak valid');
        }
      } else {
        // Fallback ke user login
        const userData = localStorage.getItem('user');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            setPaymentData({
              username: user.username,
              nomor_member: user.nomor_member || `M${Date.now().toString().slice(-3)}`,
              nama: user.fullName || user.nama || user.username,
              membership_plan: user.membership_plan || 'Bulanan',
              membership_price: user.membership_price || 120000,
              type: 'registration'
            });
          } catch (e) {
            console.error('Error parsing user data:', e);
            setError('Data user tidak valid');
          }
        } else {
          router.push('/login');
        }
      }
    }
  }, [router, searchParams]);

  // Fungsi untuk fetch data perpanjangan
  const fetchExtensionData = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/member/extend-membership?transactionId=${transactionId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const extension = result.data;
        setPaymentData({
          username: extension.memberId || extension.member_id,
          nomor_member: extension.member_id || extension.nomor_member,
          nama: extension.nama_member,
          membership_plan: extension.paket,
          membership_price: extension.jumlah,
          transactionId: extension.id,
          type: 'extension',
          newExpiry: extension.masa_aktif_baru,
          duration: extension.durasi_perpanjangan || extension.duration
        });
      }
    } catch (error) {
      console.error('Error fetching extension data:', error);
    }
  };

  // Update handlePayment untuk handle perpanjangan
  const handlePayment = async () => {
    if (!paymentData) return;

    setIsProcessing(true);
    setError('');
    setSuccess('');

    try {
      console.log(`Processing ${paymentType} payment for:`, paymentData.username);

      const response = await fetch('/api/member/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          member_id: paymentData.username,
          payment_method: paymentMethod,
          amount: paymentData.membership_price,
          bukti_pembayaran: buktiPembayaran,
          membership_plan: paymentData.membership_plan,
          transaction_id: paymentData.transactionId,
          payment_type: paymentType,
          is_extension: paymentType === 'extension',
          new_expiry: paymentData.newExpiry
        })
      });

      const result = await response.json();

      if (result.success) {
        handlePaymentSuccess(result.message);
      } else {
        setError(result.error || 'Pembayaran gagal');
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Offline mode
      if (paymentType === 'extension') {
        handleOfflineExtensionSuccess();
      } else {
        handleOfflineSuccess();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Update handlePaymentSuccess untuk handle perpanjangan
  const handlePaymentSuccess = (message: string) => {
    // Hapus data pending
    if (paymentType === 'extension') {
      localStorage.removeItem('pendingExtension');

      // Update member data di localStorage
      const userData = localStorage.getItem('user');
      if (userData && paymentData) {
        const user = JSON.parse(userData);
        user.membership_plan = paymentData.membership_plan;
        user.membership_price = paymentData.membership_price;
        user.pending_extension = null;

        // Tambahkan info perpanjangan
        const durationText = paymentData.duration ||
          (paymentData.membership_plan === 'Bulanan' ? '30 hari (1 bulan)' :
            paymentData.membership_plan === 'Triwulan' ? '90 hari (3 bulan)' :
              paymentData.membership_plan === 'Semester' ? '180 hari (6 bulan)' :
                '365 hari (12 bulan)');

        localStorage.setItem('user', JSON.stringify(user));

        setSuccess(`✅ Perpanjangan membership berhasil!\n\nPaket: ${paymentData.membership_plan}\nDurasi: ${durationText}\n\nAnda akan diarahkan ke dashboard...`);
      } else {
        setSuccess('✅ Perpanjangan membership berhasil! Anda akan diarahkan ke dashboard...');
      }
    } else {
      localStorage.removeItem('pendingRegistration');

      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        user.status = 'active';
        localStorage.setItem('user', JSON.stringify(user));
      }

      setSuccess('✅ Pembayaran berhasil! Akun Anda sekarang aktif. Anda akan diarahkan ke dashboard...');
    }

    // Redirect setelah 3 detik
    setTimeout(() => {
      router.push('/member-dashboard');
    }, 3000);
  };

  // Offline mode untuk perpanjangan
  const handleOfflineExtensionSuccess = () => {
    console.log('Operating in offline extension mode');

    localStorage.removeItem('pendingExtension');

    const userData = localStorage.getItem('user');
    if (userData && paymentData) {
      const user = JSON.parse(userData);
      user.pending_extension = {
        plan: paymentData.membership_plan,
        price: paymentData.membership_price,
        method: paymentMethod,
        timestamp: new Date().toISOString(),
        status: 'completed_offline'
      };
      user.offlineMode = true;
      localStorage.setItem('user', JSON.stringify(user));
    }

    // Simpan data pembayaran offline
    const offlinePayment = {
      type: 'extension',
      memberId: paymentData?.username,
      amount: paymentData?.membership_price,
      plan: paymentData?.membership_plan,
      method: paymentMethod,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    localStorage.setItem('offlinePayment', JSON.stringify(offlinePayment));

    setSuccess('✅ Pembayaran perpanjangan berhasil! Status akan diperbarui ketika koneksi tersedia. Anda akan diarahkan ke dashboard...');

    setTimeout(() => {
      router.push('/member-dashboard');
    }, 3000);
  };

  // Offline mode untuk registrasi
  const handleOfflineSuccess = () => {
    console.log('Operating in offline mode');
    localStorage.removeItem('pendingRegistration');

    const userData = localStorage.getItem('user');
    if (userData && paymentData) {
      const user = JSON.parse(userData);
      user.status = 'active';
      user.offlineMode = true;
      localStorage.setItem('user', JSON.stringify(user));
    }

    const offlinePayment = {
      memberId: paymentData?.username,
      amount: paymentData?.membership_price,
      method: paymentMethod,
      timestamp: new Date().toISOString(),
      status: 'completed'
    };
    localStorage.setItem('offlinePayment', JSON.stringify(offlinePayment));

    setSuccess('✅ Pembayaran berhasil! Status akan disinkronisasi ketika koneksi tersedia. Anda akan diarahkan ke dashboard...');

    setTimeout(() => {
      router.push('/member-dashboard');
    }, 3000);
  };

  // Update UI untuk menampilkan info perpanjangan
  const renderExtensionInfo = () => {
    if (paymentType !== 'extension' || !paymentData) return null;

    const durationText = paymentData.duration ||
      (paymentData.membership_plan === 'Bulanan' ? '30 hari (1 bulan)' :
        paymentData.membership_plan === 'Triwulan' ? '90 hari (3 bulan)' :
          paymentData.membership_plan === 'Semester' ? '180 hari (6 bulan)' :
            '365 hari (12 bulan)');

    const expiryDate = paymentData.newExpiry ? new Date(paymentData.newExpiry) : null;
    const formattedDate = expiryDate ? formatDate(expiryDate) : 'Setelah pembayaran dikonfirmasi';

    return (
      <div className="mb-6 p-4 bg-purple-500/20 rounded-xl border border-purple-400/30">
        <div className="flex items-center mb-3">
          <span className="text-purple-300 mr-2">🔄</span>
          <h3 className="font-semibold text-purple-100">Perpanjangan Membership</h3>
        </div>
        <div className="text-sm text-purple-100 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-purple-200">Paket:</span>
              <div className="font-semibold text-white">{paymentData.membership_plan}</div>
            </div>
            <div>
              <span className="text-purple-200">Durasi:</span>
              <div className="font-semibold text-white">{durationText}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-purple-200">Harga:</span>
              <div className="font-semibold text-white">{formatCurrency(paymentData.membership_price)}</div>
            </div>
            <div>
              <span className="text-purple-200">Berlaku hingga:</span>
              <div className="font-semibold text-white">{formattedDate}</div>
            </div>
          </div>
          <div className="mt-2 p-2 bg-purple-500/10 rounded-lg">
            <p className="text-purple-200 text-xs">
              ✅ Membership Anda akan otomatis diperpanjang selama {durationText} setelah pembayaran dikonfirmasi.
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Update title berdasarkan type
  const getTitle = () => {
    return paymentType === 'extension'
      ? 'Pembayaran Perpanjangan Membership'
      : 'Pembayaran Member';
  };

  // Render loading jika paymentData belum ada
  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-cyan-100">Memuat data pembayaran...</p>
          {error && (
            <p className="mt-2 text-red-400">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>

      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="max-w-md mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <div className="flex items-center space-x-2 justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30">
                <span className="text-white font-bold text-xl">HS</span>
              </div>
              <span className="text-2xl font-bold text-white">Gym Rancakihiyang</span>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-white">{getTitle()}</h1>
          <p className="text-cyan-100">
            {paymentType === 'extension'
              ? 'Lengkapi pembayaran untuk memperpanjang keanggotaan'
              : 'Lengkapi pembayaran untuk mengaktifkan keanggotaan'}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 backdrop-blur-sm border border-red-400/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">!</span>
              </div>
              <div>
                <p className="text-red-100 font-medium">Error</p>
                <p className="text-red-200 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-6 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">✓</span>
              </div>
              <div>
                <p className="text-green-100 font-medium">Berhasil!</p>
                <p className="text-green-200 text-sm whitespace-pre-line">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
          <div className={`py-4 text-center ${paymentType === 'extension'
              ? 'bg-gradient-to-r from-purple-500 to-pink-500'
              : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}>
            <h2 className="text-2xl font-bold text-white">
              {paymentType === 'extension' ? '🔄 Perpanjangan Membership' : 'Konfirmasi Pembayaran'}
            </h2>
            {paymentData.transactionId && (
              <p className="text-white/80 text-sm mt-1">
                ID Transaksi: {paymentData.transactionId}
              </p>
            )}
          </div>

          <div className="p-6">
            {/* Info Perpanjangan */}
            {renderExtensionInfo()}

            {/* Member Info */}
            <div className="mb-6 p-4 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
              <h3 className="font-semibold text-cyan-100 mb-3">
                {paymentType === 'extension' ? '📋 Data Member' : '📋 Data Member Baru'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-200">Nomor Member:</span>
                  <span className="text-white font-semibold">{paymentData.nomor_member}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Nama:</span>
                  <span className="text-white font-semibold">{paymentData.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Username:</span>
                  <span className="text-white font-semibold">{paymentData.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-200">Paket:</span>
                  <span className="text-white font-semibold">{paymentData.membership_plan}</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <div className="text-center mb-6 p-4 bg-green-500/20 rounded-xl border border-green-400/30">
              <p className="text-cyan-100">Total Pembayaran:</p>
              <p className="text-4xl font-bold text-green-400">
                Rp {paymentData.membership_price.toLocaleString('id-ID')}
              </p>
              <p className="text-cyan-200 text-sm mt-1">
                {paymentType === 'extension'
                  ? `Untuk perpanjangan ${paymentData.membership_plan}`
                  : `Untuk paket ${paymentData.membership_plan}`}
              </p>
            </div>

            {/* Payment Methods */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-cyan-100">💳 Metode Pembayaran:</h3>
              <div className="space-y-3">
                {[
                  { id: 'transfer', name: 'Transfer Bank', desc: 'BCA, BNI, Mandiri, BRI', icon: '🏦' },
                  { id: 'qris', name: 'QRIS', desc: 'Scan QR Code', icon: '📱' },
                  { id: 'ewallet', name: 'E-Wallet', desc: 'Gopay, OVO, Dana', icon: '💳' },
                  { id: 'cash', name: 'Tunai', desc: 'Bayar di tempat', icon: '💵' }
                ].map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all backdrop-blur-sm ${paymentMethod === method.id
                        ? 'border-cyan-400 bg-cyan-500/20'
                        : 'border-white/20 bg-white/5 hover:border-cyan-300/50'
                      }`}
                  >
                    <div className="text-2xl mr-3">{method.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{method.name}</span>
                        <input
                          type="radio"
                          name="payment"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={() => setPaymentMethod(method.id)}
                          className="text-cyan-400"
                        />
                      </div>
                      <p className="text-sm text-cyan-200 mt-1">{method.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bukti Pembayaran untuk Transfer */}
            {paymentMethod === 'transfer' && (
              <div className="mb-4 p-4 bg-yellow-500/20 rounded-xl border border-yellow-400/30">
                <h4 className="font-semibold text-yellow-100 mb-2">📝 Informasi Transfer:</h4>
                <div className="text-sm text-yellow-100 space-y-1">
                  <p><strong>Bank:</strong> BCA</p>
                  <p><strong>No. Rekening:</strong> 1234567890</p>
                  <p><strong>Atas Nama:</strong> HS GYM RANCAKIHIYANG</p>
                  <p><strong>Jumlah:</strong> Rp {paymentData.membership_price.toLocaleString('id-ID')}</p>
                  <p><strong>Keterangan:</strong> {paymentData.transactionId || paymentData.nomor_member}</p>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-yellow-100 mb-2">
                    Nomor Referensi Transfer (Opsional):
                  </label>
                  <input
                    type="text"
                    value={buktiPembayaran}
                    onChange={(e) => setBuktiPembayaran(e.target.value)}
                    className="w-full px-3 py-2 bg-white/10 border border-yellow-400/30 rounded-lg text-white placeholder-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Contoh: TRF123456789"
                  />
                </div>
              </div>
            )}

            {/* Payment Instructions untuk QRIS */}
            {paymentMethod === 'qris' && (
              <div className="mb-4 p-4 bg-purple-500/20 rounded-xl border border-purple-400/30">
                <h4 className="font-semibold text-purple-100 mb-2">📱 Instruksi QRIS:</h4>
                <div className="text-sm text-purple-100 space-y-2 mb-4">
                  <p>1. Buka aplikasi e-wallet atau mobile banking Anda</p>
                  <p>2. Pilih fitur Scan QRIS</p>
                  <p>3. Arahkan kamera ke QR code di bawah</p>
                  <p>4. Konfirmasi pembayaran sebesar Rp {paymentData.membership_price.toLocaleString('id-ID')}</p>
                  <p className="text-purple-200 text-xs mt-2">
                    📝 Keterangan: {paymentData.transactionId || paymentData.nomor_member}
                  </p>
                </div>
                <div className="mt-3 bg-white p-4 rounded-lg text-center">
                  <div className="w-48 h-48 mx-auto mb-3">
                    <Image
                      src="/qris.jpg"
                      alt="QR Code Pembayaran QRIS"
                      width={192}
                      height={192}
                      className="w-full h-full object-contain border border-gray-300 rounded-lg"
                      priority
                    />
                  </div>
                  <p className="text-gray-600 text-sm font-medium">Scan QR Code di atas</p>
                  <p className="text-gray-500 text-xs mt-1">Gunakan aplikasi e-wallet atau mobile banking Anda</p>
                </div>
              </div>
            )}

            {/* Payment Instructions untuk Tunai */}
            {paymentMethod === 'cash' && (
              <div className="mb-4 p-4 bg-blue-500/20 rounded-xl border border-blue-400/30">
                <h4 className="font-semibold text-blue-100 mb-2">💵 Pembayaran Tunai:</h4>
                <div className="text-sm text-blue-100 space-y-2">
                  <p>1. Datang langsung ke HS Gym Rancakihiyang</p>
                  <p>2. Tunjukkan nomor member: <strong>{paymentData.nomor_member}</strong></p>
                  <p>3. Bayar sebesar Rp {paymentData.membership_price.toLocaleString('id-ID')} di kasir</p>
                  <p>4. {paymentType === 'extension' ? 'Perpanjangan' : 'Akun'} akan diaktifkan segera setelah pembayaran</p>
                </div>
                <div className="mt-3 p-3 bg-blue-400/20 rounded-lg">
                  <p className="text-blue-100 text-sm font-semibold">📍 Lokasi Gym:</p>
                  <p className="text-blue-200 text-sm">Jl. Rancakihiyang No. 123, Bandung</p>
                  <p className="text-blue-200 text-sm">Jam Operasional: 08:00 - 21:00 WIB</p>
                </div>
              </div>
            )}

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={isProcessing || !!success}
              className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all duration-300 transform hover:-translate-y-0.5 disabled:bg-gray-500 disabled:cursor-not-allowed shadow-lg ${paymentType === 'extension'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/25'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-green-500/25'
                } text-white`}
            >
              {isProcessing ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Memproses Pembayaran...
                </div>
              ) : success ? (
                '✅ Pembayaran Berhasil'
              ) : paymentType === 'extension' ? (
                `🔄 Bayar Perpanjangan Rp ${paymentData.membership_price.toLocaleString('id-ID')}`
              ) : (
                `💳 Bayar Rp ${paymentData.membership_price.toLocaleString('id-ID')}`
              )}
            </button>

            <p className="text-sm text-cyan-200 mt-4 text-center">
              {success ? '' :
                paymentType === 'extension'
                  ? `Setelah pembayaran, membership Anda akan diperpanjang selama ${paymentData.duration || 'durasi paket yang dipilih'}`
                  : 'Setelah pembayaran, status member Anda akan aktif dalam 1x24 jam'}
            </p>
          </div>
        </div>

        {/* Back Link */}
        {!success && (
          <div className="text-center mt-6">
            <Link
              href={paymentType === 'extension' ? '/member-dashboard' : '/register'}
              className="text-cyan-400 hover:text-cyan-300 font-medium"
            >
              ← Kembali ke {paymentType === 'extension' ? 'Dashboard' : 'Registrasi'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrapper utama dengan Suspense
export default function MemberPayment() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-cyan-100">Memuat halaman pembayaran...</p>
        </div>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}