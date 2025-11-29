const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword 
} = require('firebase/auth');
const { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, orderBy, getDocs, addDoc } = require('firebase/firestore');

// Hanya jalankan di server-side
if (typeof window === 'undefined') {
  require('dotenv').config();
}

const firebaseConfig = {
  apiKey: process.env.GYM_FIREBASE_API_KEY || "AIzaSyC9XasG87vG18iVolQy_5zZJ9zfnTLAPMQ",
  authDomain: process.env.GYM_FIREBASE_AUTH_DOMAIN || "gym-managemen.firebaseapp.com",
  projectId: process.env.GYM_FIREBASE_PROJECT_ID || "gym-managemen",
  storageBucket: process.env.GYM_FIREBASE_STORAGE_BUCKET || "gym-managemen.firebasestorage.app",
  messagingSenderId: process.env.GYM_FIREBASE_MESSAGING_SENDER_ID || "500349115752",
  appId: process.env.GYM_FIREBASE_APP_ID || "1:500349115752:web:a71c3b62524bdbad3dcadd"
};

// Initialize Firebase hanya di server-side
let app, auth, db;

if (typeof window === 'undefined') {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('✅ Firebase Auth initialized successfully on server');
  } catch (error) {
    console.error('❌ Firebase Auth initialization error:', error.message);
    throw error;
  }
}

// Mock user data untuk fallback
const mockUsers = {
  'admin': { 
    role: 'admin_operasional', 
    fullName: 'Administrator',
    email: 'admin@gym.com'
  },
  'manager': { 
    role: 'manager', 
    fullName: 'Manager Gym',
    email: 'manager@gym.com'
  },
  'keuangan': { 
    role: 'admin_keuangan', 
    fullName: 'Admin Keuangan',
    email: 'keuangan@gym.com'
  },
  'operasional': { 
    role: 'admin_operasional', 
    fullName: 'Admin Operasional',
    email: 'operasional@gym.com'
  },
  'Member_001': { 
    role: 'member', 
    fullName: 'John Doe',
    email: 'member001@gym.com',
    membership_plan: 'Triwulan',
    membership_price: 300000,
    nomor_member: 'M001'
  },
  'Member_002': { 
    role: 'member', 
    fullName: 'Jane Smith',
    email: 'member002@gym.com',
    membership_plan: 'Bulanan',
    membership_price: 120000,
    nomor_member: 'M002'
  },
  'Member_003': { 
    role: 'member', 
    fullName: 'Bob Wilson',
    email: 'member003@gym.com',
    membership_plan: 'Tahunan',
    membership_price: 1000000,
    nomor_member: 'M003'
  }
};

// Helper function untuk harga membership
const getMembershipPrice = (plan) => {
  const prices = {
    'Bulanan': 120000,
    'Triwulan': 300000,
    'Semester': 550000,
    'Tahunan': 1000000
  };
  return prices[plan] || 120000;
};

// Helper function untuk generate nomor member
const generateMemberNumber = async () => {
  try {
    // Query untuk mendapatkan member terakhir
    const membersQuery = query(
      collection(db, 'members'),
      orderBy('nomor_member', 'desc'),
      limit(1)
    );

    const membersSnapshot = await getDocs(membersQuery);
    
    let nextNumber = 1;
    
    if (!membersSnapshot.empty) {
      const lastMember = membersSnapshot.docs[0].data();
      const lastMemberNumber = lastMember.nomor_member;
      
      // Extract number dari format "M001", "M002", dll
      if (lastMemberNumber && lastMemberNumber.startsWith('M')) {
        const lastNumber = parseInt(lastMemberNumber.substring(1));
        nextNumber = isNaN(lastNumber) ? 1 : lastNumber + 1;
      }
    }

    return `M${nextNumber.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating member number:', error);
    // Fallback: generate berdasarkan timestamp
    return `M${Date.now().toString().slice(-3)}`;
  }
};

// Login function dengan Firestore integration
const loginUser = async (username, password) => {
  // Jika di client-side, return error
  if (typeof window !== 'undefined') {
    return {
      success: false,
      error: 'Login function hanya bisa dipanggil dari server-side'
    };
  }

  try {
    const email = `${username}@gym.com`;
    console.log('🔐 Attempting login:', email);
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Coba ambil data user dari Firestore
    let userData = mockUsers[username];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', username));
      if (userDoc.exists()) {
        userData = { ...mockUsers[username], ...userDoc.data() };
        console.log('✅ User data loaded from Firestore');
      } else {
        console.log('ℹ️ User not found in Firestore, using mock data');
      }
    } catch (firestoreError) {
      console.log('ℹ️ Firestore error, using mock data:', firestoreError.message);
    }

    // Coba ambil data member dari Firestore untuk mendapatkan nomor_member
    let memberData = {};
    try {
      const memberDoc = await getDoc(doc(db, 'members', username));
      if (memberDoc.exists()) {
        memberData = memberDoc.data();
        console.log('✅ Member data loaded from Firestore');
      }
    } catch (firestoreError) {
      console.log('ℹ️ Member data not found in Firestore');
    }
    
    // Default data jika tidak ada di mock atau Firestore
    if (!userData) {
      userData = { 
        role: 'member', 
        fullName: username,
        membership_plan: 'Bulanan',
        membership_price: 120000
      };
    }
    
    console.log('✅ Firebase login successful for:', username, 'Role:', userData.role);
    
    return { 
      success: true, 
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        username: username,
        role: userData.role,
        fullName: userData.fullName || username,
        membership_plan: userData.membership_plan || 'Bulanan',
        membership_price: userData.membership_price || 120000,
        nomor_member: memberData.nomor_member || userData.nomor_member || `M${Date.now().toString().slice(-3)}`,
        status: memberData.status || 'active'
      }
    };
  } catch (error) {
    console.error('❌ Firebase login error:', error.message);
    
    // Fallback untuk testing tanpa Firebase Auth
    if (mockUsers[username]) {
      const userData = mockUsers[username];
      if ((username.startsWith('Member_') && password === 'qwerty123') || 
          (['admin', 'manager', 'keuangan', 'operasional'].includes(username) && password === 'password')) {
        
        console.log('🔄 Using mock login for:', username);
        return { 
          success: true, 
          user: {
            uid: `mock-${username}`,
            email: userData.email || `${username}@gym.com`,
            username: username,
            role: userData.role,
            fullName: userData.fullName || username,
            membership_plan: userData.membership_plan || 'Bulanan',
            membership_price: userData.membership_price || 120000,
            nomor_member: userData.nomor_member || `M${Date.now().toString().slice(-3)}`,
            status: 'active'
          }
        };
      }
    }
    
    return { 
      success: false, 
      error: getErrorMessage(error) 
    };
  }
};

// Helper function untuk error messages
const getErrorMessage = (error) => {
  switch (error.code) {
    case 'auth/invalid-email':
      return 'Email tidak valid';
    case 'auth/user-disabled':
      return 'Akun dinonaktifkan';
    case 'auth/user-not-found':
      return 'User tidak ditemukan';
    case 'auth/wrong-password':
      return 'Password salah';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan login. Coba lagi nanti';
    default:
      return 'Username/E-Card atau password salah';
  }
};

// Register new member
const registerMember = async (userData) => {
  // Jika di client-side, return error
  if (typeof window !== 'undefined') {
    return {
      success: false,
      error: 'Register function hanya bisa dipanggil dari server-side'
    };
  }

  try {
    const { username, email, password, fullName, telepon, alamat, membership_plan, nomor_member } = userData;
    
    console.log('👤 Registering new member:', username);

    // Generate nomor member jika tidak disediakan
    const finalNomorMember = nomor_member || await generateMemberNumber();
    
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Calculate membership expiration
    const duration = membership_plan === 'Bulanan' ? 30 : 
                    membership_plan === 'Triwulan' ? 90 :
                    membership_plan === 'Semester' ? 180 : 365;
    
    const masaAktif = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    
    // Prepare member data for Firestore
    const memberData = {
      id: username,
      nomor_member: finalNomorMember,
      nama: fullName,
      email: email,
      telepon: telepon || '081234567890',
      alamat: alamat || 'Alamat belum diisi',
      tanggal_daftar: new Date().toISOString(),
      masa_aktif: masaAktif.toISOString(),
      status: 'pending', // Status pending sampai pembayaran
      membership_type: 'regular',
      membership_plan: membership_plan,
      membership_price: getMembershipPrice(membership_plan),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Save to Firestore - users collection
    await setDoc(doc(db, 'users', username), {
      role: 'member',
      fullName: fullName,
      email: email,
      membership_plan: membership_plan,
      membership_price: getMembershipPrice(membership_plan),
      nomor_member: finalNomorMember,
      createdAt: new Date().toISOString()
    });
    
    // Save to Firestore - members collection
    await setDoc(doc(db, 'members', username), memberData);
    
    // Create initial transaction (pending)
    const transactionData = {
      memberId: username,
      memberName: fullName,
      nomor_member: finalNomorMember,
      tanggal: new Date().toISOString(),
      jenis: `Membership Payment - ${membership_plan}`,
      paket: membership_plan,
      jumlah: getMembershipPrice(membership_plan),
      status: 'pending',
      metode_pembayaran: 'Menunggu Pembayaran',
      createdAt: new Date().toISOString()
    };
    
    const transactionRef = await addDoc(collection(db, 'transactions'), transactionData);
    
    console.log('✅ Member registration successful:', username);
    console.log('📝 Member number:', finalNomorMember);
    console.log('💳 Transaction created:', transactionRef.id);
    
    return {
      success: true,
      user: {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        username: username,
        role: 'member',
        fullName: fullName,
        membership_plan: membership_plan,
        membership_price: getMembershipPrice(membership_plan),
        nomor_member: finalNomorMember,
        status: 'pending'
      },
      memberData: memberData,
      transactionId: transactionRef.id
    };
    
  } catch (error) {
    console.error('❌ Member registration error:', error.message);
    
    let errorMessage = 'Terjadi kesalahan saat registrasi';
    
    if (error.message.includes('email-already-in-use')) {
      errorMessage = 'Email sudah terdaftar';
    } else if (error.message.includes('weak-password')) {
      errorMessage = 'Password terlalu lemah, minimal 6 karakter';
    } else if (error.message.includes('invalid-email')) {
      errorMessage = 'Format email tidak valid';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

// Complete payment and activate member
const completeMemberPayment = async (username, transaction_id, bukti_pembayaran, payment_method = 'Transfer Bank') => {
  try {
    console.log('💳 Completing payment for member:', username);
    
    // 1. Update transaction status
    const transactionDocRef = doc(db, 'transactions', transaction_id);
    const transactionDoc = await getDoc(transactionDocRef);

    if (transactionDoc.exists()) {
      await updateDoc(transactionDocRef, {
        status: 'completed',
        bukti_pembayaran: bukti_pembayaran,
        metode_pembayaran: payment_method,
        updatedAt: new Date().toISOString()
      });
    }

    // 2. Update member status and activation dates
    const memberDocRef = doc(db, 'members', username);
    const memberDoc = await getDoc(memberDocRef);

    if (memberDoc.exists()) {
      const memberData = memberDoc.data();
      const now = new Date();
      const duration = memberData.membership_plan === 'Bulanan' ? 30 : 
                      memberData.membership_plan === 'Triwulan' ? 90 :
                      memberData.membership_plan === 'Semester' ? 180 : 365;
      
      const masaAktif = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

      await updateDoc(memberDocRef, {
        status: 'active',
        tanggal_daftar: now.toISOString(),
        masa_aktif: masaAktif.toISOString(),
        updatedAt: now.toISOString()
      });
    }

    // 3. Update user status
    const userDocRef = doc(db, 'users', username);
    await updateDoc(userDocRef, {
      status: 'active',
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Payment completed successfully for member:', username);

    return {
      success: true,
      message: 'Pembayaran berhasil! Akun Anda sekarang aktif.'
    };

  } catch (error) {
    console.error('❌ Complete payment error:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan saat mengaktifkan member'
    };
  }
};

// Get member payment status
const getMemberPaymentStatus = async (username) => {
  try {
    const memberDoc = await getDoc(doc(db, 'members', username));
    
    if (!memberDoc.exists()) {
      return { success: false, error: 'Member tidak ditemukan' };
    }

    const memberData = memberDoc.data();
    
    // Get latest transaction
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('memberId', '==', username),
      orderBy('tanggal', 'desc'),
      limit(1)
    );
    
    const transactionsSnapshot = await getDocs(transactionsQuery);
    let latestTransaction = null;
    
    if (!transactionsSnapshot.empty) {
      latestTransaction = {
        id: transactionsSnapshot.docs[0].id,
        ...transactionsSnapshot.docs[0].data()
      };
    }

    return {
      success: true,
      memberStatus: memberData.status,
      transaction: latestTransaction,
      membership_plan: memberData.membership_plan,
      membership_price: memberData.membership_price,
      nomor_member: memberData.nomor_member
    };

  } catch (error) {
    console.error('❌ Get payment status error:', error);
    return {
      success: false,
      error: 'Terjadi kesalahan saat mengambil status pembayaran'
    };
  }
};

const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Get member data from Firestore
const getMemberData = async (username) => {
  try {
    const memberDoc = await getDoc(doc(db, 'members', username));
    
    if (!memberDoc.exists()) {
      throw new Error('Member data not found');
    }
    
    return memberDoc.data();
  } catch (error) {
    console.error('Error getting member data:', error);
    throw error;
  }
};

module.exports = {
  auth,
  db,
  loginUser,
  logoutUser,
  registerMember,
  getMemberData,
  completeMemberPayment,
  getMemberPaymentStatus,
  generateMemberNumber
};