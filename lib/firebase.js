// lib/firebase.js (UPDATE)
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  orderBy, 
  limit, 
  Timestamp,
  startAfter,
  endBefore,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.GYM_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.GYM_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GYM_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.GYM_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.GYM_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.GYM_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// ==================== HELPER FUNCTIONS ====================

/**
 * Real-time listener untuk collection
 */
export const subscribeToCollection = (collectionName, callback, filters = []) => {
  try {
    let q = query(collection(db, collectionName));
    
    if (filters.length > 0) {
      q = query(collection(db, collectionName), ...filters);
    }
    
    return onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to Date objects
          ...Object.fromEntries(
            Object.entries(doc.data()).map(([key, value]) => [
              key, 
              value?.toDate ? value.toDate() : value
            ])
          )
        }));
        callback({ data, source: 'realtime', timestamp: new Date() });
      },
      (error) => {
        console.error(`Error listening to ${collectionName}:`, error);
        callback({ error, data: [], source: 'error' });
      }
    );
  } catch (error) {
    console.error(`Error setting up ${collectionName} listener:`, error);
    return () => {}; // Return empty cleanup function
  }
};

/**
 * Get today's data with real-time updates
 */
export const getTodayRealtimeData = (callback) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const unsubscribeTransactions = subscribeToCollection(
    'transactions',
    (result) => {
      if (!result.error) {
        const todayData = result.data.filter(item => {
          const itemDate = item.tanggal instanceof Date ? item.tanggal : new Date(item.tanggal);
          return itemDate >= today && item.status === 'completed';
        });
        callback({ 
          type: 'transactions', 
          data: todayData,
          count: todayData.length,
          revenue: todayData.reduce((sum, t) => sum + (t.jumlah || 0), 0)
        });
      }
    },
    [
      where("tanggal", ">=", Timestamp.fromDate(today)),
      where("status", "==", "completed"),
      orderBy("tanggal", "desc")
    ]
  );
  
  const unsubscribeNonMember = subscribeToCollection(
    'non_member_transactions',
    (result) => {
      if (!result.error) {
        const todayData = result.data.filter(item => {
          const itemDate = item.tanggal instanceof Date ? item.tanggal : new Date(item.tanggal);
          return itemDate >= today && item.status === 'completed';
        });
        callback({ 
          type: 'non_member', 
          data: todayData,
          count: todayData.length,
          revenue: todayData.reduce((sum, t) => sum + (t.jumlah || 0), 0)
        });
      }
    },
    [
      where("tanggal", ">=", Timestamp.fromDate(today)),
      where("status", "==", "completed"),
      orderBy("tanggal", "desc")
    ]
  );
  
  const unsubscribeExpenses = subscribeToCollection(
    'expenses',
    (result) => {
      if (!result.error) {
        const todayData = result.data.filter(item => {
          const itemDate = item.date instanceof Date ? item.date : new Date(item.date);
          return itemDate >= today && item.status === 'completed';
        });
        callback({ 
          type: 'expenses', 
          data: todayData,
          count: todayData.length,
          amount: todayData.reduce((sum, e) => sum + (e.amount || 0), 0)
        });
      }
    },
    [
      where("date", ">=", Timestamp.fromDate(today)),
      where("status", "==", "completed"),
      orderBy("date", "desc")
    ]
  );
  
  // Return cleanup function
  return () => {
    unsubscribeTransactions();
    unsubscribeNonMember();
    unsubscribeExpenses();
  };
};

/**
 * Get pending payments with real-time updates
 */
export const getPendingPaymentsRealtime = (callback) => {
  return subscribeToCollection(
    'transactions',
    (result) => {
      if (!result.error) {
        const pending = result.data.filter(item => item.status === 'pending');
        callback({ 
          data: pending,
          count: pending.length,
          amount: pending.reduce((sum, p) => sum + (p.jumlah || 0), 0),
          timestamp: new Date()
        });
      }
    },
    [where("status", "==", "pending"), orderBy("tanggal", "desc")]
  );
};

/**
 * Get active members count with real-time updates
 */
export const getActiveMembersRealtime = (callback) => {
  return subscribeToCollection(
    'members',
    (result) => {
      if (!result.error) {
        const active = result.data.filter(member => {
          if (!member.masa_aktif) return false;
          const expiryDate = member.masa_aktif instanceof Date ? member.masa_aktif : new Date(member.masa_aktif);
          return expiryDate > new Date();
        });
        callback({ 
          data: active,
          count: active.length,
          expiringSoon: active.filter(m => {
            const expiryDate = m.masa_aktif instanceof Date ? m.masa_aktif : new Date(m.masa_aktif);
            const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
            return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
          }).length
        });
      }
    }
  );
};

/**
 * Helper untuk konversi date ke Firestore timestamp
 */
export const toFirestoreTimestamp = (date) => {
  if (date instanceof Date) {
    return Timestamp.fromDate(date);
  } else if (typeof date === 'string') {
    return Timestamp.fromDate(new Date(date));
  } else if (date && date.seconds) {
    return date; // Already a Firestore timestamp
  }
  return Timestamp.now();
};

/**
 * Helper untuk konversi Firestore timestamp ke Date
 */
export const fromFirestoreTimestamp = (timestamp) => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  } else if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return timestamp;
};

export default app;