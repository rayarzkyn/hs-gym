// app/member-dashboard/components/MembershipInfo.tsx
'use client';

interface MemberData {
  id: string;
  nomor_member: string;
  nama: string;
  email: string;
  telepon: string;
  alamat: string;
  tanggal_daftar: string | Date;
  masa_aktif: string | Date;
  status: string;
  membership_type: string;
  membership_plan: string;
  membership_price: number;
  sisa_hari: number;
  total_kunjungan: number;
  kunjungan_bulan_ini: number;
}

interface MembershipInfoProps {
  memberData: MemberData;
  onExtendMembership?: (plan: string) => void;
  detailed?: boolean;
}

export default function MembershipInfo({ 
  memberData, 
  onExtendMembership,
  detailed = false 
}: MembershipInfoProps) {
  
  const formatDate = (dateInput: string | Date) => {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getRemainingDaysText = (days: number): string => {
    if (days === 0) return 'Habis';
    if (days === 1) return '1 hari';
    if (days < 7) return `${days} hari`;
    if (days < 30) return `${Math.ceil(days / 7)} minggu`;
    return `${Math.ceil(days / 30)} bulan`;
  };

  const getMembershipPlanInfo = (plan: string) => {
    const plans: any = {
      'Bulanan': { color: 'from-blue-500 to-cyan-500', price: 120000, duration: '1 bulan' },
      'Triwulan': { color: 'from-purple-500 to-pink-500', price: 300000, duration: '3 bulan' },
      'Semester': { color: 'from-green-500 to-emerald-500', price: 550000, duration: '6 bulan' },
      'Tahunan': { color: 'from-orange-500 to-red-500', price: 1000000, duration: '12 bulan' }
    };
    return plans[plan] || plans['Bulanan'];
  };

  const planInfo = getMembershipPlanInfo(memberData.membership_plan);
  const remainingDaysText = getRemainingDaysText(memberData.sisa_hari);

  if (!detailed) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">🎯 Membership</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            memberData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {memberData.status === 'active' ? 'AKTIF' : 'TIDAK AKTIF'}
          </span>
        </div>

        <div className="flex items-center mb-6">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-r ${planInfo.color} mr-4`}>
            <span className="text-white text-2xl">🎫</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">{memberData.membership_plan}</h3>
            <p className="text-gray-600">Berlaku hingga {formatDate(memberData.masa_aktif)}</p>
            <p className="text-sm text-gray-500 mt-1">{formatCurrency(memberData.membership_price)}</p>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Sisa waktu</span>
            <span>{remainingDaysText}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full" 
              style={{ width: `${(memberData.sisa_hari / 30) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Bergabung</div>
            <div className="font-semibold">{formatDate(memberData.tanggal_daftar)}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Kunjungan Bulan Ini</div>
            <div className="font-semibold">{memberData.kunjungan_bulan_ini}x</div>
          </div>
        </div>

        {onExtendMembership && (
          <button 
            onClick={() => onExtendMembership(memberData.membership_plan)}
            className="w-full mt-6 bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition font-medium"
          >
            Perpanjang Membership
          </button>
        )}
      </div>
    );
  }

  // Detailed View
  const membershipPlans = [
    { name: 'Bulanan', price: 120000, duration: '1 bulan', color: 'from-blue-500 to-cyan-500' },
    { name: 'Triwulan', price: 300000, duration: '3 bulan', color: 'from-purple-500 to-pink-500' },
    { name: 'Semester', price: 550000, duration: '6 bulan', color: 'from-green-500 to-emerald-500' },
    { name: 'Tahunan', price: 1000000, duration: '12 bulan', color: 'from-orange-500 to-red-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Current Membership Card */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold">Paket Membership Saat Ini</h2>
            <p className="text-gray-600">Detail paket yang sedang aktif</p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              memberData.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {memberData.status === 'active' ? 'AKTIF' : 'TIDAK AKTIF'}
            </span>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition text-sm">
              Ubah Paket
            </button>
          </div>
        </div>

        <div className={`rounded-xl p-6 text-white bg-gradient-to-r ${planInfo.color} mb-6`}>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold mb-2">{memberData.membership_plan.toUpperCase()}</h3>
              <p className="text-white/90">Paket {memberData.membership_type}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatCurrency(memberData.membership_price)}</div>
              <div className="text-white/80">/bulan</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">ID Member</div>
            <div className="font-semibold">{memberData.nomor_member}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Bergabung Sejak</div>
            <div className="font-semibold">{formatDate(memberData.tanggal_daftar)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Berlaku Hingga</div>
            <div className="font-semibold">{formatDate(memberData.masa_aktif)}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Total Kunjungan</div>
            <div className="text-2xl font-bold text-blue-600">{memberData.total_kunjungan}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-gray-600">Kunjungan Bulan Ini</div>
            <div className="text-2xl font-bold text-green-600">{memberData.kunjungan_bulan_ini}</div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-6">Paket Membership Tersedia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {membershipPlans.map((plan) => (
            <div key={plan.name} className="border rounded-xl overflow-hidden hover:shadow-lg transition">
              <div className={`bg-gradient-to-r ${plan.color} p-6 text-white`}>
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="flex items-end">
                  <span className="text-2xl font-bold">{formatCurrency(plan.price)}</span>
                  <span className="ml-2 opacity-90">/{plan.duration}</span>
                </div>
              </div>
              <div className="p-6">
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    Akses semua fasilitas
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    Free konsultasi trainer
                  </li>
                  <li className="flex items-center text-sm">
                    <span className="text-green-500 mr-2">✓</span>
                    Group class unlimited
                  </li>
                </ul>
                {onExtendMembership && (
                  <button
                    onClick={() => onExtendMembership(plan.name)}
                    className={`w-full py-2 px-4 rounded-lg font-semibold ${
                      plan.name === memberData.membership_plan
                        ? 'bg-gray-500 text-white cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90'
                    }`}
                    disabled={plan.name === memberData.membership_plan}
                  >
                    {plan.name === memberData.membership_plan ? 'Paket Aktif' : `Pilih ${plan.name}`}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}