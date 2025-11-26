'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: '',
    email: '',
    password: '',
    confirmPassword: '',
    telepon: '',
    paket: 'bulanan',
    payment_method: 'transfer'
  });
  const [loading, setLoading] = useState(false);
  const [generatedUsername, setGeneratedUsername] = useState<string>('');
  const [generatedEcard, setGeneratedEcard] = useState<string>('');
  const [nextMemberNumber, setNextMemberNumber] = useState<number>(1);
  const [nextEcardNumber, setNextEcardNumber] = useState<number>(1);
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [buktiPembayaran, setBuktiPembayaran] = useState<File | null>(null);

  // Fetch next member number untuk preview
  useEffect(() => {
    const fetchNextMemberNumber = async () => {
      try {
        const res = await fetch('/api/auth/next-member-number');
        const data = await res.json();
        if (data.success) {
          setNextMemberNumber(data.nextNumber);
          setNextEcardNumber(data.nextEcardNumber);
          setGeneratedUsername(`Member_${data.nextNumber.toString().padStart(3, '0')}`);
          setGeneratedEcard(`MEM-${data.nextEcardNumber.toString().padStart(3, '0')}`);
        }
      } catch (error) {
        console.error('Error fetching next member number:', error);
        setGeneratedUsername(`Member_001`);
        setGeneratedEcard(`MEM-001`);
      }
    };

    fetchNextMemberNumber();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validasi password match
    if (form.password !== form.confirmPassword) {
      alert('❌ Password dan konfirmasi password tidak cocok');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: form.nama,
          email: form.email,
          password: form.password,
          telepon: form.telepon,
          paket: form.paket,
          payment_method: form.payment_method
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRegistrationData(data.data);
        setStep('payment');
        alert('✅ Pendaftaran berhasil! Silakan lanjutkan ke pembayaran.');
      } else {
        alert('❌ ' + (data.error || 'Pendaftaran gagal'));
      }
    } catch (error) {
      alert('❌ Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
  if (!buktiPembayaran) {
    alert('❌ Harap upload bukti pembayaran');
    return;
  }

  setLoading(true);

  try {
    // Convert file to base64 untuk disimpan di database
    const toBase64 = (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

    const buktiBase64 = await toBase64(buktiPembayaran);

    // ✅ GUNAKAN member_id BUKAN id
    const res = await fetch('/api/member/payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    member_id: registrationData.member_id, // ✅ GUNAKAN member_id
    payment_method: form.payment_method,
    amount: registrationData.total_bayar,
    bukti_pembayaran: buktiBase64
  }),
});

    const data = await res.json();

    if (res.ok && data.success) {
      alert(`🎉 Pembayaran berhasil!\n\nAkun Anda sekarang aktif.\n\nUsername: ${registrationData.username}\nE-Card: ${registrationData.ecard_code}\nPassword: ${form.password}\n\nSilakan login!`);
      router.push('/login');
    } else {
      alert('❌ ' + (data.error || 'Pembayaran gagal'));
    }
  } catch (error) {
    alert('❌ Error: ' + error);
  } finally {
    setLoading(false);
  }
};

  const paketHarga = {
    bulanan: 120000,
    triwulan: 300000,
    semester: 550000,
    tahunan: 1000000
  };

  if (step === 'payment' && registrationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">HS</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-800">Lanjutkan Pembayaran</h2>
            <p className="text-gray-600 mt-2">Selesaikan pembayaran untuk mengaktifkan akun</p>
          </div>

          {/* Info Registrasi */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">Detail Pendaftaran:</h3>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>Nama:</strong> {registrationData.nama}</p>
              <p><strong>Username:</strong> {registrationData.username}</p>
              <p><strong>E-Card:</strong> {registrationData.ecard_code}</p>
              <p><strong>Paket:</strong> {form.paket}</p>
              <p><strong>Total Bayar:</strong> Rp {registrationData.total_bayar.toLocaleString()}</p>
            </div>
          </div>

          {/* Informasi Pembayaran */}
          <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">Transfer Pembayaran:</h3>
            <div className="text-sm text-yellow-700 space-y-2">
              <p><strong>Bank BCA:</strong> 1234-5678-9012</p>
              <p><strong>Atas Nama:</strong> HS GYM RANCAKIHIYANG</p>
              <p><strong>Jumlah:</strong> Rp {registrationData.total_bayar.toLocaleString()}</p>
              <p><strong>Keterangan:</strong> {registrationData.ecard_code} - {registrationData.nama}</p>
            </div>
          </div>

          {/* Upload Bukti Pembayaran */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Bukti Transfer *
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setBuktiPembayaran(e.target.files?.[0] || null)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: JPG, PNG, atau PDF (maks. 5MB)
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="flex-1 bg-gray-500 text-white p-3 rounded-lg hover:bg-gray-600 font-semibold transition"
            >
              Kembali
            </button>
            <button
              type="button"
              onClick={handlePayment}
              disabled={loading || !buktiPembayaran}
              className="flex-1 bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold transition"
            >
              {loading ? '🔄 Memproses...' : '✅ Konfirmasi Pembayaran'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">HS</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Daftar Member Baru</h2>
          <p className="text-gray-600 mt-2">Bergabunglah dengan komunitas fitness terbaik</p>
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap *</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={form.nama}
              onChange={(e) => setForm({...form, nama: e.target.value})}
              placeholder="Masukkan nama lengkap"
            />
          </div>

          {/* USERNAME GENERATED - TAMPILAN PREVIEW */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
            <div className="w-full p-3 border border-green-300 rounded-lg bg-green-50">
              <span className="text-green-700 font-bold text-lg">{generatedUsername}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Username digenerate otomatis oleh sistem</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email (Opsional)</label>
            <input
              type="email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              placeholder="contoh@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telepon *</label>
            <input
              type="tel"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={form.telepon}
              onChange={(e) => setForm({...form, telepon: e.target.value})}
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Paket Keanggotaan *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(paketHarga).map(([paket, harga]) => (
                <label key={paket} className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                  form.paket === paket ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-green-300'
                }`}>
                  <input
                    type="radio"
                    name="paket"
                    value={paket}
                    checked={form.paket === paket}
                    onChange={(e) => setForm({...form, paket: e.target.value})}
                    className="hidden"
                  />
                  <div className="text-center">
                    <div className="font-semibold capitalize">{paket}</div>
                    <div className="text-green-600 font-bold">Rp {harga.toLocaleString()}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              placeholder="Buat password untuk login"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Konfirmasi Password *</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              value={form.confirmPassword}
              onChange={(e) => setForm({...form, confirmPassword: e.target.value})}
              placeholder="Ulangi password Anda"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran *</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({...form, payment_method: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="transfer">Transfer Bank</option>
              <option value="cash">Tunai (Di Tempat)</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 text-white p-3 rounded-lg hover:bg-green-600 disabled:opacity-50 font-semibold text-lg transition"
            >
              {loading ? '🔄 Memproses...' : `🚀 Lanjutkan ke Pembayaran - Rp ${paketHarga[form.paket as keyof typeof paketHarga]?.toLocaleString()}`}
            </button>
          </div>
        </form>

        {/* INFO LOGIN SETELAH REGISTER */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-800 mb-2">Proses Pendaftaran:</h4>
          <p className="text-sm text-blue-700">
            1. Isi form pendaftaran<br/>
            2. Lanjutkan ke halaman pembayaran<br/>
            3. Transfer sesuai nominal<br/>
            4. Upload bukti transfer<br/>
            5. Akun aktif setelah pembayaran dikonfirmasi
          </p>
        </div>

        <p className="mt-6 text-center text-gray-600">
          Sudah punya akun?{' '}
          <Link href="/login" className="text-green-500 font-semibold hover:text-green-600">
            Login di sini
          </Link>
        </p>
      </div>
    </div>
  );
}