import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, increment } from 'firebase/firestore';

export async function POST(request) {
  try {
    const { 
      member_id, 
      payment_method, 
      amount, 
      bukti_pembayaran, 
      membership_plan, 
      transaction_id,
      payment_type = 'registration',
      is_extension = false,
      new_expiry
    } = await request.json();

    console.log('💳 Processing payment for member:', member_id);
    console.log('📦 Payment data:', { 
      member_id, 
      payment_method, 
      amount, 
      membership_plan,
      payment_type,
      is_extension 
    });

    // 1. Simpan data pembayaran ke collection 'transactions'
    const transactionData = {
      member_id: member_id,
      memberId: member_id,
      tanggal: serverTimestamp(),
      jenis: is_extension 
        ? `Perpanjangan Membership - ${membership_plan}` 
        : `Membership Payment - ${membership_plan || 'Bulanan'}`,
      paket: membership_plan || 'Bulanan',
      jumlah: amount,
      status: 'completed',
      metode_pembayaran: payment_method,
      bukti_pembayaran: bukti_pembayaran || '',
      is_extension: is_extension,
      payment_type: payment_type,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Jika ada transaction_id yang dikirim, update transaksi yang sudah ada
    let finalTransactionId = transaction_id;
    if (transaction_id) {
      try {
        // Cari transaksi yang sudah ada
        const transactionDoc = doc(db, 'transactions', transaction_id);
        await updateDoc(transactionDoc, {
          ...transactionData,
          status: 'completed'
        });
        console.log('✅ Transaction updated:', transaction_id);
      } catch (updateError) {
        console.log('⚠️ Cannot update transaction, creating new one');
        const newTransactionRef = await addDoc(collection(db, 'transactions'), transactionData);
        finalTransactionId = newTransactionRef.id;
      }
    } else {
      const newTransactionRef = await addDoc(collection(db, 'transactions'), transactionData);
      finalTransactionId = newTransactionRef.id;
    }

    console.log('✅ Transaction saved successfully:', finalTransactionId);

    // 2. Update status member di collection 'members'
    const memberDocRef = doc(db, 'members', member_id);
    const memberDoc = await getDoc(memberDocRef);

    if (memberDoc.exists()) {
      const memberData = memberDoc.data();
      let updateData = {};
      let durationAdded = '';
      
      if (is_extension) {
        // Handle perpanjangan membership
        const currentExpiry = memberData.masa_aktif ? 
          (memberData.masa_aktif.toDate ? memberData.masa_aktif.toDate() : new Date(memberData.masa_aktif)) : 
          new Date();
        
        const now = new Date();
        const startDate = currentExpiry > now ? currentExpiry : now;
        
        // Hitung durasi berdasarkan plan yang dipilih
        let monthsToAdd = 1;
        let daysToAdd = 30;
        switch (membership_plan) {
          case 'Triwulan': 
            monthsToAdd = 3; 
            daysToAdd = 90;
            break;
          case 'Semester': 
            monthsToAdd = 6; 
            daysToAdd = 180;
            break;
          case 'Tahunan': 
            monthsToAdd = 12; 
            daysToAdd = 365;
            break;
          default: 
            monthsToAdd = 1;
            daysToAdd = 30;
        }
        
        const newExpiry = new Date(startDate);
        newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);
        
        durationAdded = `${daysToAdd} hari (${monthsToAdd} bulan)`;

        updateData = {
          status: 'active',
          membership_plan: membership_plan || 'Bulanan',
          membership_price: amount,
          masa_aktif: newExpiry.toISOString(),
          last_payment_date: serverTimestamp(),
          last_extension_date: serverTimestamp(),
          total_extensions: increment(1),
          extension_days_added: daysToAdd,
          pending_extension: null, // Hapus pending extension
          updatedAt: serverTimestamp()
        };
        
        console.log(`✅ Membership extended by ${durationAdded}`);
        console.log(`✅ New expiry date: ${newExpiry.toISOString()}`);
      } else {
        // Handle registrasi baru
        const now = new Date();
        const duration = membership_plan === 'Bulanan' ? 30 : 
                       membership_plan === 'Triwulan' ? 90 :
                       membership_plan === 'Semester' ? 180 : 365;
        
        const masaAktif = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

        updateData = {
          status: 'active',
          membership_plan: membership_plan || 'Bulanan',
          membership_price: amount,
          tanggal_daftar: serverTimestamp(),
          masa_aktif: masaAktif.toISOString(),
          last_payment_date: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        console.log('✅ New membership created with expiry:', masaAktif.toISOString());
      }

      console.log('🔄 Updating member data:', updateData);
      await updateDoc(memberDocRef, updateData);
      console.log('✅ Member status updated:', member_id);

      // 3. Juga update di collection 'users'
      await updateUserCollection(member_id, membership_plan, amount, updateData.masa_aktif, is_extension);

      const successMessage = is_extension 
        ? `Perpanjangan membership ${membership_plan} berhasil! Durasi ditambahkan: ${durationAdded}`
        : 'Pembayaran berhasil! Status member telah aktif.';

      return NextResponse.json({
        success: true,
        message: successMessage,
        transactionId: finalTransactionId,
        data: {
          durationAdded: durationAdded,
          newExpiry: updateData.masa_aktif
        }
      });

    } else {
      console.log('❌ Member not found in members collection:', member_id);
      
      // Untuk development, jika member tidak ditemukan, buat member baru
      if (is_extension) {
        return NextResponse.json({
          success: false,
          error: 'Member tidak ditemukan. Silakan hubungi admin.'
        }, { status: 404 });
      }
      
      // Buat member baru untuk registrasi
      const now = new Date();
      const duration = membership_plan === 'Bulanan' ? 30 : 
                     membership_plan === 'Triwulan' ? 90 :
                     membership_plan === 'Semester' ? 180 : 365;
      
      const masaAktif = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
      
      const newMemberData = {
        nomor_member: `M${Date.now().toString().slice(-6)}`,
        nama: member_id,
        email: `${member_id}@gym.com`,
        telepon: '081234567890',
        alamat: 'Alamat belum diisi',
        tanggal_daftar: serverTimestamp(),
        masa_aktif: masaAktif.toISOString(),
        status: 'active',
        membership_plan: membership_plan || 'Bulanan',
        membership_price: amount,
        last_payment_date: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'members'), {
        ...newMemberData,
        id: member_id
      });
      
      console.log('✅ New member created:', member_id);
      
      return NextResponse.json({
        success: true,
        message: 'Pembayaran berhasil! Member baru telah dibuat.',
        transactionId: finalTransactionId
      });
    }

  } catch (error) {
    console.error('❌ Member payment error:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Terjadi kesalahan saat memproses pembayaran'
    }, { status: 500 });
  }
}

// Helper function untuk update user collection
async function updateUserCollection(member_id, membership_plan, amount, masa_aktif, is_extension = false) {
  try {
    const userDocRef = doc(db, 'users', member_id);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const updateData = {
        status: 'active',
        membership_plan: membership_plan || 'Bulanan',
        membership_price: amount,
        last_payment_date: serverTimestamp(),
        masa_aktif: masa_aktif,
        pending_extension: null,
        updatedAt: serverTimestamp()
      };

      if (is_extension) {
        updateData.last_extension_date = serverTimestamp();
      }

      await updateDoc(userDocRef, updateData);
      console.log('✅ User status updated:', member_id);
    } else {
      console.log('⚠️ User not found in users collection:', member_id);
    }
  } catch (error) {
    console.error('⚠️ Cannot update user collection:', error.message);
  }
}