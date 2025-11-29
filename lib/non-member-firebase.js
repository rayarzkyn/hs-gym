import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase-client';

// Generate daily code (format: NMDDMMYYXXX)
export const generateDailyCode = async () => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  }).replace(/\//g, '');
  
  // Cari kode terakhir hari ini
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  
  try {
    const dailyMembersQuery = query(
      collection(db, 'non_members'),
      where('tanggal_daftar', '>=', todayStart),
      where('tanggal_daftar', '<', todayEnd),
      orderBy('tanggal_daftar', 'desc'),
      limit(1)
    );
    
    const snapshot = await getDocs(dailyMembersQuery);
    let sequence = 1;
    
    if (!snapshot.empty) {
      const lastMember = snapshot.docs[0].data();
      const lastCode = lastMember.daily_code;
      const lastSequence = parseInt(lastCode.slice(-3)) || 0;
      sequence = lastSequence + 1;
    }
    
    return `NM${dateStr}${sequence.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating daily code:', error);
    // Fallback: timestamp based
    return `NM${dateStr}${Date.now().toString().slice(-3)}`;
  }
};

// Generate username dan password untuk non-member daily
export const generateNonMemberCredentials = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const numbers = '0123456789';
  
  // Generate username: NM + 6 random characters
  let username = 'NM';
  for (let i = 0; i < 6; i++) {
    username += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  // Generate password: 6 random numbers
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  }
  
  return { username, password };
};

// Create new non-member daily dengan username & password
export const createNonMemberDaily = async (memberData) => {
  try {
    const dailyCode = await generateDailyCode();
    const { username, password } = await generateNonMemberCredentials();
    const now = new Date();
    const expiredAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 jam
    
    const nonMemberDoc = {
      daily_code: dailyCode,
      username: username,
      password: password,
      nama: memberData.nama,
      email: memberData.email || '',
      telepon: memberData.telepon,
      harga: memberData.harga || 25000,
      payment_method: memberData.payment_method,
      status: 'active',
      tanggal_daftar: serverTimestamp(),
      expired_at: Timestamp.fromDate(expiredAt),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    await setDoc(doc(db, 'non_members', dailyCode), nonMemberDoc);
    
    return {
      success: true,
      daily_code: dailyCode,
      username: username,
      password: password,
      data: nonMemberDoc
    };
  } catch (error) {
    console.error('Error creating non-member:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Create transaction record
export const createNonMemberTransaction = async (transactionData) => {
  try {
    const transactionDoc = {
      ...transactionData,
      created_at: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'non_member_transactions'), transactionDoc);
    
    return {
      success: true,
      transaction_id: docRef.id
    };
  } catch (error) {
    console.error('Error creating transaction:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Check non-member validity berdasarkan username & password
export const checkNonMemberCredentials = async (username, password) => {
  try {
    const nonMemberQuery = query(
      collection(db, 'non_members'),
      where('username', '==', username),
      where('password', '==', password),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(nonMemberQuery);
    
    if (querySnapshot.empty) {
      return {
        valid: false,
        error: 'Username atau password salah'
      };
    }

    const memberDoc = querySnapshot.docs[0];
    const memberData = memberDoc.data();
    const now = new Date();
    
    // Handle timestamp conversion
    let expiredAt;
    if (memberData.expired_at?.toDate) {
      expiredAt = memberData.expired_at.toDate();
    } else if (memberData.expired_at instanceof Timestamp) {
      expiredAt = memberData.expired_at.toDate();
    } else {
      expiredAt = new Date(memberData.expired_at);
    }
    
    if (now > expiredAt) {
      // Update status to expired
      await updateDoc(doc(db, 'non_members', memberDoc.id), {
        status: 'expired',
        updated_at: serverTimestamp()
      });
      
      return {
        valid: false,
        error: 'Daily pass sudah kadaluarsa'
      };
    }
    
    return {
      valid: true,
      data: memberData
    };
  } catch (error) {
    console.error('Error checking non-member credentials:', error);
    return {
      valid: false,
      error: 'Terjadi kesalahan saat memverifikasi kredensial'
    };
  }
};

// Get non-member data by username
export const getNonMemberByUsername = async (username) => {
  try {
    const nonMemberQuery = query(
      collection(db, 'non_members'),
      where('username', '==', username)
    );
    
    const querySnapshot = await getDocs(nonMemberQuery);
    
    if (querySnapshot.empty) {
      return {
        success: false,
        error: 'Data non-member tidak ditemukan'
      };
    }

    const memberDoc = querySnapshot.docs[0];
    const memberData = memberDoc.data();
    
    // Check expiration
    const now = new Date();
    let expiredAt;
    if (memberData.expired_at?.toDate) {
      expiredAt = memberData.expired_at.toDate();
    } else if (memberData.expired_at instanceof Timestamp) {
      expiredAt = memberData.expired_at.toDate();
    } else {
      expiredAt = new Date(memberData.expired_at);
    }
    
    if (now > expiredAt) {
      // Update status to expired
      await updateDoc(doc(db, 'non_members', memberDoc.id), {
        status: 'expired',
        updated_at: serverTimestamp()
      });
      
      return {
        success: false,
        error: 'Daily pass sudah kadaluarsa'
      };
    }

    if (memberData.status !== 'active') {
      return {
        success: false,
        error: 'Akun non-member tidak aktif'
      };
    }
    
    return {
      success: true,
      data: memberData
    };
  } catch (error) {
    console.error('Error getting non-member data:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan saat mengambil data'
    };
  }
};

// Record visit
export const recordNonMemberVisit = async (visitData) => {
  try {
    const visitDoc = {
      ...visitData,
      checkin_time: serverTimestamp(),
      status: 'active',
      created_at: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'non_member_visits'), visitDoc);
    
    return {
      success: true,
      visit_id: docRef.id
    };
  } catch (error) {
    console.error('Error recording visit:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get visit history by username
export const getNonMemberVisits = async (username) => {
  try {
    const visitsQuery = query(
      collection(db, 'non_member_visits'),
      where('username', '==', username),
      orderBy('checkin_time', 'desc')
    );
    
    const visitsSnapshot = await getDocs(visitsQuery);
    const visits = visitsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      checkin_time: doc.data().checkin_time?.toDate?.() || doc.data().checkin_time
    }));
    
    return {
      success: true,
      data: visits
    };
  } catch (error) {
    console.error('Error getting visits:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get daily stats for admin
export const getDailyStats = async (date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // Get transactions for the day
    const startDate = new Date(targetDate);
    const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    
    const transactionsQuery = query(
      collection(db, 'non_member_transactions'),
      where('tanggal', '>=', startDate),
      where('tanggal', '<', endDate)
    );
    
    const visitsQuery = query(
      collection(db, 'non_member_visits'),
      where('checkin_time', '>=', startDate),
      where('checkin_time', '<', endDate)
    );
    
    const [transactionsSnapshot, visitsSnapshot] = await Promise.all([
      getDocs(transactionsQuery),
      getDocs(visitsQuery)
    ]);
    
    const totalRevenue = transactionsSnapshot.docs.reduce((sum, doc) => {
      return sum + (doc.data().jumlah || 0);
    }, 0);
    
    const stats = {
      date: targetDate,
      total_visitors: visitsSnapshot.size,
      total_revenue: totalRevenue,
      transactions: transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      visits: visitsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })),
      updated_at: serverTimestamp()
    };
    
    // Save/update stats
    await setDoc(doc(db, 'non_member_daily_stats', targetDate), stats, { merge: true });
    
    return {
      success: true,
      data: stats
    };
  } catch (error) {
    console.error('Error getting daily stats:', error);
    return {
      success: false,
      error: error.message
    };
  }
};