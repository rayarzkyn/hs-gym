import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';

export async function GET(request) {
  try {
    console.log('👤 Member data API called');
    
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    
    if (!memberId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Member ID diperlukan' 
        },
        { status: 400 }
      );
    }

    console.log('🔍 Fetching data for member:', memberId);

    // Get member data from Firestore
    let memberDocRef = doc(db, 'members', memberId);
    let memberDoc = await getDoc(memberDocRef);

    if (!memberDoc.exists()) {
      console.log('ℹ️ Member not found in members collection, trying users collection...');
      memberDocRef = doc(db, 'users', memberId);
      memberDoc = await getDoc(memberDocRef);
    }

    if (!memberDoc.exists()) {
      console.log('❌ Member not found in both collections:', memberId);
      return NextResponse.json({
        success: false,
        error: 'Member tidak ditemukan di database'
      }, { status: 404 });
    }

    const memberData = memberDoc.data();
    console.log('✅ Member data found:', memberData.nama || memberData.fullName);

    // Get transaction history - dengan error handling yang lebih baik
    let riwayatTransaksi = [];
    try {
      // Coba query dengan field yang berbeda
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('member_id', '==', memberId),
        orderBy('tanggal', 'desc')
      );
      
      const transactionsSnapshot = await getDocs(transactionsQuery);
      riwayatTransaksi = transactionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          jenis: data.jenis || 'Membership Payment',
          paket: data.paket || data.membership_plan,
          jumlah: data.jumlah || data.amount || 0,
          status: data.status || 'completed',
          tanggal: data.tanggal?.toDate?.() || data.createdAt?.toDate?.() || new Date(),
          metode_pembayaran: data.metode_pembayaran || data.payment_method
        };
      }).slice(0, 10); // Limit to 10 items
      
      console.log(`✅ Found ${riwayatTransaksi.length} transactions`);
    } catch (error) {
      console.log('Error getting transactions:', error.message);
      // Fallback: get all and filter manually
      try {
        const allTransactions = await getDocs(collection(db, 'transactions'));
        riwayatTransaksi = allTransactions.docs
          .map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              tanggal: data.tanggal?.toDate?.() || data.createdAt?.toDate?.() || new Date()
            };
          })
          .filter(t => t.member_id === memberId || t.memberId === memberId)
          .sort((a, b) => b.tanggal - a.tanggal)
          .slice(0, 10);
        console.log(`✅ Found ${riwayatTransaksi.length} transactions with fallback`);
      } catch (fallbackError) {
        console.log('Fallback also failed:', fallbackError.message);
      }
    }

    // Get visit history - dengan error handling yang lebih baik
    let riwayatKunjungan = [];
    try {
      const visitsQuery = query(
        collection(db, 'visits'),
        where('memberId', '==', memberId),
        orderBy('checkinTime', 'desc')
      );
      
      const visitsSnapshot = await getDocs(visitsQuery);
      riwayatKunjungan = visitsSnapshot.docs.map(doc => {
        const data = doc.data();
        const checkinTime = data.checkinTime?.toDate?.() || new Date();
        return {
          id: doc.id,
          ...data,
          tanggal: checkinTime,
          waktu: checkinTime.toLocaleTimeString('id-ID'),
          durasi: data.duration || '2 jam'
        };
      }).slice(0, 10);
      
      console.log(`✅ Found ${riwayatKunjungan.length} visits`);
    } catch (error) {
      console.log('Error getting visits:', error.message);
      // Fallback: get all and filter manually
      try {
        const allVisits = await getDocs(collection(db, 'visits'));
        riwayatKunjungan = allVisits.docs
          .map(doc => {
            const data = doc.data();
            const checkinTime = data.checkinTime?.toDate?.() || new Date();
            return {
              id: doc.id,
              ...data,
              tanggal: checkinTime,
              waktu: checkinTime.toLocaleTimeString('id-ID'),
              durasi: data.duration || '2 jam'
            };
          })
          .filter(v => v.memberId === memberId)
          .sort((a, b) => b.tanggal - a.tanggal)
          .slice(0, 10);
        console.log(`✅ Found ${riwayatKunjungan.length} visits with fallback`);
      } catch (fallbackError) {
        console.log('Fallback also failed:', fallbackError.message);
      }
    }

    // Calculate remaining days
    const masaAktif = memberData.masa_aktif ? 
      (memberData.masa_aktif.toDate ? memberData.masa_aktif.toDate() : new Date(memberData.masa_aktif)) : 
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const sekarang = new Date();
    const sisaHari = Math.max(0, Math.ceil((masaAktif.getTime() - sekarang.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate monthly visits
    const awalBulanIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), 1);
    const kunjunganBulanIni = riwayatKunjungan.filter(visit => {
      const visitDate = visit.tanggal;
      return visitDate >= awalBulanIni;
    }).length;

    // Prepare complete member data
    const completeMemberData = {
      id: memberId,
      nomor_member: memberData.nomor_member || `M${memberId.replace('Member_', '')}`,
      nama: memberData.nama || memberData.fullName || memberId,
      email: memberData.email || `${memberId}@gym.com`,
      telepon: memberData.telepon || memberData.phone || '081234567890',
      alamat: memberData.alamat || memberData.address || 'Alamat belum diisi',
      tanggal_daftar: memberData.tanggal_daftar?.toDate?.() || memberData.createdAt?.toDate?.() || new Date(),
      masa_aktif: memberData.masa_aktif?.toDate?.() || new Date(memberData.masa_aktif) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: memberData.status || 'active',
      membership_type: 'regular',
      membership_plan: memberData.membership_plan || 'Bulanan',
      membership_price: memberData.membership_price || 120000,
      sisa_hari: sisaHari,
      kunjungan_bulan_ini: kunjunganBulanIni,
      total_kunjungan: riwayatKunjungan.length,
      riwayat_transaksi: riwayatTransaksi,
      riwayat_kunjungan: riwayatKunjungan
    };

    console.log('✅ Complete member data prepared for:', completeMemberData.nama);
    console.log('📊 Stats - Transactions:', riwayatTransaksi.length, 'Visits:', riwayatKunjungan.length);

    return NextResponse.json({
      success: true,
      data: completeMemberData,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in member data API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan server',
        message: error.message
      },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { memberId, action, data } = await request.json();
    
    console.log('🔄 Member action:', action, 'for member:', memberId);

    if (!memberId) {
      return NextResponse.json({
        success: false,
        error: 'Member ID diperlukan'
      }, { status: 400 });
    }

    // Cari member di collections
    let memberDocRef = doc(db, 'members', memberId);
    let memberDoc = await getDoc(memberDocRef);

    if (!memberDoc.exists()) {
      memberDocRef = doc(db, 'users', memberId);
      memberDoc = await getDoc(memberDocRef);
    }

    if (!memberDoc.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Member tidak ditemukan di database'
      }, { status: 404 });
    }

    const memberData = memberDoc.data();

    switch (action) {
      case 'update_profile':
        const profileUpdateData = {
          ...data,
          updatedAt: serverTimestamp()
        };
        
        await updateDoc(memberDocRef, profileUpdateData);
        
        return NextResponse.json({
          success: true, 
          message: 'Profile updated successfully',
          data: profileUpdateData
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Action tidak dikenali. Gunakan endpoint /api/member/checkin untuk check-in.'
        }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Error in member POST API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan server',
        message: error.message 
      },
      { status: 500 }
    );
  }
}