import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc, 
  increment, 
  Timestamp,
  collection,
  addDoc
} from 'firebase/firestore';

export async function POST(request) {
  try {
    console.log('🔄 Processing member check-in...');
    const { memberId, facilityId, facilityName } = await request.json();

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: 'Member ID is required' },
        { status: 400 }
      );
    }

    const memberRef = doc(db, 'members', memberId);
    const memberDoc = await getDoc(memberRef);

    if (!memberDoc.exists()) {
      return NextResponse.json(
        { success: false, error: 'Member tidak ditemukan' },
        { status: 404 }
      );
    }

    const memberData = memberDoc.data();
    const now = new Date();
    const nowTimestamp = Timestamp.fromDate(now);

    // Cek status membership
    if (memberData.status !== 'active') {
      return NextResponse.json(
        { success: false, error: 'Membership tidak aktif. Silakan perpanjang membership Anda.' },
        { status: 403 }
      );
    }

    // Cek masa aktif
    const masaAktif = new Date(memberData.masa_aktif);
    if (masaAktif < now) {
      return NextResponse.json(
        { success: false, error: 'Membership telah kadaluarsa. Silakan perpanjang membership Anda.' },
        { status: 403 }
      );
    }

    let facilityUpdate = null;
    
    // Jika check-in ke fasilitas tertentu
    if (facilityId) {
      const facilityRef = doc(db, 'facilities', facilityId);
      const facilityDoc = await getDoc(facilityRef);
      
      if (facilityDoc.exists()) {
        const facilityData = facilityDoc.data();
        const currentMembers = facilityData.currentMembers || facilityData.currentUsage || 0;
        const capacity = facilityData.capacity || 25;
        
        // Cek kapasitas
        if (currentMembers >= capacity) {
          return NextResponse.json(
            { success: false, error: `Fasilitas ${facilityName || facilityData.name} sudah penuh.` },
            { status: 400 }
          );
        }
        
        // Cek status maintenance
        if (facilityData.status === 'maintenance') {
          return NextResponse.json(
            { success: false, error: `Fasilitas ${facilityName || facilityData.name} sedang dalam perawatan.` },
            { status: 400 }
          );
        }
        
        // Update facility
        await updateDoc(facilityRef, {
          currentMembers: increment(1),
          currentUsage: increment(1),
          updatedAt: nowTimestamp
        });
        
        facilityUpdate = {
          facilityId,
          facilityName: facilityName || facilityData.name,
          capacityStatus: `${currentMembers + 1}/${capacity}`
        };
      }
    }

    // Update member record
    const checkinData = {
      id: `checkin_${Date.now()}`,
      tanggal: nowTimestamp,
      durasi: '2 jam',
      facilityId: facilityId || null,
      facilityName: facilityName || null,
      status: 'completed',
      type: facilityId ? 'facility_checkin' : 'daily_checkin',
      timestamp: nowTimestamp
    };

    // Hitung kunjungan bulan ini
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastCheckin = memberData.lastCheckin ? new Date(memberData.lastCheckin.toDate()) : null;
    const isSameMonth = lastCheckin && 
                       lastCheckin.getMonth() === currentMonth && 
                       lastCheckin.getFullYear() === currentYear;

    const kunjunganBulanIni = isSameMonth ? 
      (memberData.kunjungan_bulan_ini || 0) + 1 : 1;

    await updateDoc(memberRef, {
      lastCheckin: nowTimestamp,
      totalVisits: increment(1),
      kunjungan_bulan_ini: kunjunganBulanIni,
      riwayat_kunjungan: arrayUnion(checkinData),
      updatedAt: nowTimestamp
    });

    // Simpan ke collection checkin_history juga
    const checkinHistoryRef = await addDoc(collection(db, 'checkin_history'), {
      memberId,
      memberName: memberData.nama,
      ...checkinData,
      createdAt: nowTimestamp
    });

    console.log('✅ Check-in successful:', memberData.nama);
    
    return NextResponse.json({
      success: true,
      message: facilityName 
        ? `✅ Check-in ke ${facilityName} berhasil! Selamat berolahraga 🏋️‍♂️` 
        : '✅ Check-in harian berhasil! Selamat berolahraga 🏋️‍♂️',
      data: {
        checkinTime: now.toISOString(),
        facilityId,
        facilityName,
        facilityUpdate,
        memberName: memberData.nama,
        checkinId: checkinHistoryRef.id
      }
    });

  } catch (error) {
    console.error('❌ Check-in error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Gagal memproses check-in. Silakan coba lagi.' 
      },
      { status: 500 }
    );
  }
}