import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Validasi konfigurasi Firebase
const validateFirebaseConfig = () => {
  const requiredFields = ['apiKey', 'authDomain', 'projectId'];
  const missing = requiredFields.filter(field => !firebaseConfig[field]);
  
  if (missing.length > 0) {
    console.error('❌ Missing Firebase config fields:', missing);
    throw new Error(`Firebase config incomplete. Missing: ${missing.join(', ')}`);
  }
  
  console.log('✅ Firebase config validated');
};

// Initialize Firebase (prevent multiple initializations)
let app;
let auth;
let db;

try {
  validateFirebaseConfig();
  
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized');
  } else {
    app = getApps()[0];
    console.log('✅ Using existing Firebase instance');
  }
  
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Enable offline persistence (client-side only)
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED
    }).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Persistence failed: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Persistence not available in this browser');
      }
    });
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  throw error;
}

export { auth, db };

// Check Firestore Connection
export const checkFirestoreConnection = async () => {
  try {
    console.log('🔄 Checking Firestore connection...');
    
    // Try to read a test document
    const testDocRef = doc(db, '_connection_test', 'test');
    await getDoc(testDocRef);
    
    console.log('✅ Firestore connection successful');
    return { success: true };
  } catch (error) {
    console.error('❌ Firestore connection failed:', error);
    return { 
      success: false, 
      error: error.message || 'Connection failed' 
    };
  }
};

// Generate nomor member dengan error handling lebih baik
const generateNomorMember = async () => {
  try {
    const membersQuery = query(
      collection(db, 'members'), 
      orderBy('nomor_member', 'desc'), 
      limit(1)
    );
    
    const querySnapshot = await getDocs(membersQuery);
    
    if (!querySnapshot.empty) {
      const lastMember = querySnapshot.docs[0].data();
      const lastNumber = parseInt(lastMember.nomor_member.replace('M', '')) || 0;
      return `M${(lastNumber + 1).toString().padStart(3, '0')}`;
    }
    
    return 'M001';
  } catch (error) {
    console.error('Error generating member number:', error);
    // Fallback: generate based on timestamp
    return `M${Date.now().toString().slice(-3)}`;
  }
};

// Register function dengan timeout protection
export const registerUser = async (userData) => {
  try {
    const { username, email, password, fullName, telepon, alamat, membership_plan, membership_price, nomor_member } = userData;
    
    console.log('🔐 Attempting client-side registration:', email);
    
    // Check network connectivity
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('Tidak ada koneksi internet. Periksa koneksi Anda.');
    }
    
    // 1. Buat user di Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // 2. Update display name
    await updateProfile(userCredential.user, {
      displayName: fullName
    });
    
    // 3. Generate nomor member
    const finalNomorMember = nomor_member || await generateNomorMember();
    
    // 4. Simpan data user
    const userDoc = {
      uid: userCredential.user.uid,
      username: username,
      email: email,
      fullName: fullName,
      telepon: telepon,
      alamat: alamat,
      role: 'member',
      membership_plan: membership_plan,
      membership_price: membership_price,
      nomor_member: finalNomorMember,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', username), userDoc);
    
    // 5. Simpan data member
    const memberDoc = {
      uid: userCredential.user.uid,
      username: username,
      email: email,
      fullName: fullName,
      telepon: telepon,
      alamat: alamat,
      nomor_member: finalNomorMember,
      membership_plan: membership_plan,
      membership_price: membership_price,
      status: 'pending',
      tanggal_daftar: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'members', username), memberDoc);
    
    // 6. Backup dengan UID
    await setDoc(doc(db, 'users_by_uid', userCredential.user.uid), userDoc);
    
    console.log('✅ Client-side registration successful for:', username);
    
    return { 
      success: true, 
      user: userDoc,
      memberData: memberDoc
    };
  } catch (error) {
    console.error('❌ Client-side registration error:', error.message);
    return { 
      success: false, 
      error: getErrorMessage(error) 
    };
  }
};

// Login function dengan retry mechanism
export const loginUser = async (identifier, password) => {
  const MAX_RETRIES = 2;
  let lastError;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`🔄 Retry attempt ${attempt}/${MAX_RETRIES}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
      
      console.log('🔐 Attempting client-side login for:', identifier);
      
      // Check network connectivity
      if (typeof window !== 'undefined' && !navigator.onLine) {
        throw new Error('Tidak ada koneksi internet. Periksa koneksi Anda.');
      }
      
      let emailToUse = identifier;
      let username = identifier;
      let userRole = 'member';
      let userCollection = 'users';

      // Domain attempts untuk berbagai role
      const domainAttempts = [
        { domain: '@gym.com', role: 'member' },
        { domain: '@keuangan.com', role: 'keuangan' },
        { domain: '@operasional.com', role: 'operasional' },
        { domain: '@admin.com', role: 'admin' },
        { domain: '', role: 'member' }
      ];

      // Jika identifier adalah email
      if (identifier.includes('@')) {
        emailToUse = identifier;
        
        // Cari username berdasarkan email
        const usersQuery = query(
          collection(db, 'users'),
          where('email', '==', identifier)
        );
        const querySnapshot = await getDocs(usersQuery);
        
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          username = userData.username;
          userRole = userData.role || 'member';
          console.log('✅ Found user in users collection:', username, 'Role:', userRole);
        } else {
          // Cari di staff collection
          const staffQuery = query(
            collection(db, 'staff'),
            where('email', '==', identifier)
          );
          const staffSnapshot = await getDocs(staffQuery);
          
          if (!staffSnapshot.empty) {
            const staffData = staffSnapshot.docs[0].data();
            username = staffData.username;
            userRole = staffData.role;
            userCollection = 'staff';
            console.log('✅ Found user in staff collection:', username, 'Role:', userRole);
          }
        }
      } else {
        // Jika identifier adalah username
        let userFound = false;
        
        // Cari di users collection
        try {
          const userDoc = await getDoc(doc(db, 'users', identifier));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            emailToUse = userData.email;
            userRole = userData.role || 'member';
            userFound = true;
            console.log('✅ Found user in users collection by username');
          }
        } catch (error) {
          console.log('⚠️ User not found in users collection');
        }
        
        // Cari di staff collection
        if (!userFound) {
          try {
            const staffDoc = await getDoc(doc(db, 'staff', identifier));
            if (staffDoc.exists()) {
              const staffData = staffDoc.data();
              emailToUse = staffData.email;
              userRole = staffData.role;
              userCollection = 'staff';
              userFound = true;
              console.log('✅ Found user in staff collection by username');
            }
          } catch (error) {
            console.log('⚠️ User not found in staff collection');
          }
        }
        
        // Coba berbagai domain jika belum ketemu
        if (!userFound) {
          console.log('🔄 Trying domain combinations...');
          for (const attempt of domainAttempts) {
            const testEmail = attempt.domain ? `${identifier}${attempt.domain}` : identifier;
            try {
              await signInWithEmailAndPassword(auth, testEmail, password);
              emailToUse = testEmail;
              userRole = attempt.role;
              userFound = true;
              console.log('✅ Login successful with domain:', attempt.domain);
              break;
            } catch (error) {
              continue;
            }
          }
        }
        
        if (!userFound) {
          throw new Error('Username atau email tidak ditemukan');
        }
      }

      console.log('🔐 Final login attempt with email:', emailToUse);
      
      // Login dengan Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, emailToUse, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase auth successful, fetching user data...');

      // Fetch user data
      let userData = null;
      
      // Coba cari di users collection
      const userDoc = await getDoc(doc(db, 'users', username));
      if (userDoc.exists()) {
        userData = userDoc.data();
        userCollection = 'users';
        console.log('✅ User data found in users collection');
      } else {
        // Cari di staff collection
        const staffDoc = await getDoc(doc(db, 'staff', username));
        if (staffDoc.exists()) {
          userData = staffDoc.data();
          userCollection = 'staff';
          console.log('✅ User data found in staff collection');
        }
      }
      
      // Jika masih belum ketemu, cari berdasarkan UID
      if (!userData) {
        const usersByUidQuery = query(
          collection(db, 'users'),
          where('uid', '==', user.uid)
        );
        const uidSnapshot = await getDocs(usersByUidQuery);
        
        if (!uidSnapshot.empty) {
          userData = uidSnapshot.docs[0].data();
          username = userData.username;
          userRole = userData.role || 'member';
          console.log('✅ User data found by UID in users');
        } else {
          // Cari di staff by UID
          const staffByUidQuery = query(
            collection(db, 'staff'),
            where('uid', '==', user.uid)
          );
          const staffSnapshot = await getDocs(staffByUidQuery);
          
          if (!staffSnapshot.empty) {
            userData = staffSnapshot.docs[0].data();
            userCollection = 'staff';
            username = userData.username;
            userRole = userData.role;
            console.log('✅ User data found by UID in staff');
          } else {
            // Fallback: buat minimal user data
            userData = {
              username: user.email?.split('@')[0] || username,
              email: user.email,
              fullName: user.displayName || username,
              role: userRole,
              status: 'active'
            };
            console.log('✅ Created minimal user data from Firebase Auth');
          }
        }
      }
      
      // Update last login
      try {
        const collectionName = userCollection === 'staff' ? 'staff' : 'users';
        await setDoc(doc(db, collectionName, username), {
          lastLogin: serverTimestamp()
        }, { merge: true });
      } catch (updateError) {
        console.log('⚠️ Could not update last login:', updateError);
      }
      
      console.log('✅ Login successful for:', username, 'Role:', userRole);
      
      return { 
        success: true, 
        user: {
          uid: user.uid,
          email: user.email,
          username: username,
          role: userRole,
          fullName: userData.fullName || userData.nama || user.displayName || username,
          telepon: userData.telepon || '',
          alamat: userData.alamat || '',
          membership_plan: userData.membership_plan || '',
          membership_price: userData.membership_price || 0,
          nomor_member: userData.nomor_member || '',
          status: userData.status || 'active',
          collection: userCollection
        }
      };
    } catch (error) {
      lastError = error;
      console.error(`❌ Login attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt === MAX_RETRIES) {
        break;
      }
    }
  }
  
  console.error('❌ All login attempts failed');
  return { 
    success: false, 
    error: getErrorMessage(lastError) 
  };
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
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar';
    case 'auth/weak-password':
      return 'Password terlalu lemah (minimal 6 karakter)';
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Periksa koneksi Anda';
    case 'auth/invalid-credential':
      return 'Email atau password salah';
    case 'auth/invalid-login-credentials':
      return 'Kredensial login tidak valid';
    case 'unavailable':
      return 'Database tidak tersedia. Periksa koneksi internet Anda';
    default:
      return error.message || 'Terjadi kesalahan saat login';
  }
};

// Logout function
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
};

// Get user data by username
export const getUserData = async (username) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', username));
    if (userDoc.exists()) {
      return { success: true, data: userDoc.data() };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Get user data error:', error);
    return { success: false, error: error.message };
  }
};

export default app;