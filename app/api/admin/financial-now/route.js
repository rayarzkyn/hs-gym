// api/admin/financial-now/route.js
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';

export async function GET(request) {
  try {
    console.log('🔥 REAL-TIME API Called at:', new Date().toLocaleTimeString());

    // Set cache control headers
    const headers = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache'
    };

    // Get today's date (Jakarta time)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = Timestamp.fromDate(today);

    // Get last 30 days for comparison
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    console.log('📅 Today:', today.toLocaleDateString('id-ID'), 'Timestamp:', todayTimestamp);

    // PERBAIKAN: Gunakan query sederhana TANPA composite index
    // Ambil semua data completed, filter tanggal di JavaScript

    // 1. GET ALL COMPLETED TRANSACTIONS
    const completedTransactionsQuery = query(
      collection(db, "transactions"),
      where("status", "==", "completed")
    );

    // 2. GET ALL COMPLETED NON-MEMBER TRANSACTIONS
    const completedNonMemberQuery = query(
      collection(db, "non_member_transactions"),
      where("status", "==", "completed")
    );

    // 3. GET ALL COMPLETED EXPENSES
    const completedExpensesQuery = query(
      collection(db, "expenses"),
      where("status", "==", "completed")
    );

    // 4. GET ALL MEMBERS
    const membersQuery = query(collection(db, "members"));

    // 5. GET PENDING PAYMENTS (simple single-field query)
    const pendingQuery = query(
      collection(db, "transactions"),
      where("status", "==", "pending"),
      limit(20)
    );

    // Execute ALL queries in parallel
    console.log('🚀 Executing parallel queries...');

    const [
      completedTransactionsSnap,
      completedNonMemberSnap,
      completedExpensesSnap,
      membersSnap,
      pendingSnap
    ] = await Promise.all([
      getDocs(completedTransactionsQuery),
      getDocs(completedNonMemberQuery),
      getDocs(completedExpensesQuery),
      getDocs(membersQuery),
      getDocs(pendingQuery)
    ]);

    console.log('✅ Queries completed');

    // Process data - convert timestamps
    const allCompletedTransactions = completedTransactionsSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      tanggal: doc.data().tanggal?.toDate ? doc.data().tanggal.toDate() : doc.data().tanggal
    }));

    const allCompletedNonMember = completedNonMemberSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      tanggal: doc.data().tanggal?.toDate ? doc.data().tanggal.toDate() : doc.data().tanggal
    }));

    const allCompletedExpenses = completedExpensesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate ? doc.data().date.toDate() : doc.data().date
    }));

    const allMembers = membersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt,
      masa_aktif: doc.data().masa_aktif?.toDate ? doc.data().masa_aktif.toDate() : doc.data().masa_aktif
    }));

    const pendingPayments = pendingSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      tanggal: doc.data().tanggal?.toDate ? doc.data().tanggal.toDate() : doc.data().tanggal
    }));

    // FILTER DATA BY DATE IN JAVASCRIPT
    const todayTransactions = allCompletedTransactions.filter(t => {
      if (!t.tanggal) return false;
      const txDate = t.tanggal instanceof Date ? t.tanggal : new Date(t.tanggal);
      return txDate >= today;
    });

    const recentTransactions = allCompletedTransactions.filter(t => {
      if (!t.tanggal) return false;
      const txDate = t.tanggal instanceof Date ? t.tanggal : new Date(t.tanggal);
      return txDate >= last30Days;
    });

    const todayNonMember = allCompletedNonMember.filter(t => {
      if (!t.tanggal) return false;
      const txDate = t.tanggal instanceof Date ? t.tanggal : new Date(t.tanggal);
      return txDate >= today;
    });

    const recentNonMember = allCompletedNonMember.filter(t => {
      if (!t.tanggal) return false;
      const txDate = t.tanggal instanceof Date ? t.tanggal : new Date(t.tanggal);
      return txDate >= last30Days;
    });

    const todayExpenses = allCompletedExpenses.filter(e => {
      if (!e.date) return false;
      const expDate = e.date instanceof Date ? e.date : new Date(e.date);
      return expDate >= today;
    });

    // Calculate TODAY totals
    const todayMemberRevenue = todayTransactions.reduce((sum, t) => sum + (t.jumlah || 0), 0);
    const todayNonMemberRevenue = todayNonMember.reduce((sum, t) => sum + (t.jumlah || 0), 0);
    const todayTotalRevenue = todayMemberRevenue + todayNonMemberRevenue;
    const todayTotalExpenses = todayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const todayNetIncome = todayTotalRevenue - todayTotalExpenses;

    // Calculate MONTH totals (last 30 days)
    const monthMemberRevenue = recentTransactions.reduce((sum, t) => sum + (t.jumlah || 0), 0);
    const monthNonMemberRevenue = recentNonMember.reduce((sum, t) => sum + (t.jumlah || 0), 0);
    const monthTotalRevenue = monthMemberRevenue + monthNonMemberRevenue;

    // Calculate active members
    const activeMembers = allMembers.filter(member => {
      if (!member.masa_aktif) return false;
      const expiryDate = member.masa_aktif instanceof Date ? member.masa_aktif : new Date(member.masa_aktif);
      return expiryDate > new Date();
    });

    // Calculate expired/expiring soon members
    const expiringSoon = allMembers.filter(member => {
      if (!member.masa_aktif) return false;
      const expiryDate = member.masa_aktif instanceof Date ? member.masa_aktif : new Date(member.masa_aktif);
      const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry > 0 && daysUntilExpiry <= 7;
    });

    // Calculate conversion rate (if we have registration dates)
    const newMembersThisMonth = allMembers.filter(member => {
      if (!member.createdAt) return false;
      const createdDate = member.createdAt instanceof Date ? member.createdAt : new Date(member.createdAt);
      return createdDate > last30Days;
    });

    // Prepare detailed stats
    const detailedStats = {
      byPaymentMethod: {
        qris: todayTransactions.filter(t => t.metode_pembayaran === 'qris').length +
          todayNonMember.filter(t => t.metode_pembayaran === 'qris').length,
        transfer: todayTransactions.filter(t => t.metode_pembayaran === 'transfer').length +
          todayNonMember.filter(t => t.metode_pembayaran === 'transfer').length,
        cash: todayTransactions.filter(t => t.metode_pembayaran === 'cash').length +
          todayNonMember.filter(t => t.metode_pembayaran === 'cash').length,
        edc: todayTransactions.filter(t => t.metode_pembayaran === 'edc').length +
          todayNonMember.filter(t => t.metode_pembayaran === 'edc').length
      },
      byPackage: {
        bulanan: todayTransactions.filter(t => t.paket === 'Bulanan').length,
        triwulan: todayTransactions.filter(t => t.paket === 'Triwulan').length,
        semester: todayTransactions.filter(t => t.paket === 'Semester').length,
        tahunan: todayTransactions.filter(t => t.paket === 'Tahunan').length
      },
      topMembers: activeMembers
        .sort((a, b) => {
          // Sort by spending (if we have transaction history)
          const aSpent = recentTransactions
            .filter(t => t.memberId === a.id || t.member_id === a.id)
            .reduce((sum, t) => sum + (t.jumlah || 0), 0);
          const bSpent = recentTransactions
            .filter(t => t.memberId === b.id || t.member_id === b.id)
            .reduce((sum, t) => sum + (t.jumlah || 0), 0);
          return bSpent - aSpent;
        })
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          nama: m.nama || m.nama_member || 'Unknown',
          membershipType: m.tipe_membership || 'Regular',
          expiry: m.masa_aktif,
          totalSpent: recentTransactions
            .filter(t => t.memberId === m.id || t.member_id === m.id)
            .reduce((sum, t) => sum + (t.jumlah || 0), 0)
        }))
    };

    // Prepare response
    const responseData = {
      success: true,
      data: {
        summary: {
          // PERBAIKAN: Tambahkan field yang kompatibel dengan FinancialStats component
          // Field utama yang diharapkan FinancialStats
          totalRevenue: todayTotalRevenue,
          totalExpenses: todayTotalExpenses,
          netProfit: todayNetIncome,
          totalTransactions: todayTransactions.length + todayNonMember.length,

          // Today data (original fields)
          todayRevenue: todayTotalRevenue,
          todayMemberRevenue,
          todayNonMemberRevenue,
          todayExpenses: todayTotalExpenses,
          todayNetIncome,
          todayTransactions: todayTransactions.length + todayNonMember.length,
          todayMemberTransactions: todayTransactions.length,
          todayDailyPassTransactions: todayNonMember.length,

          // Month data
          monthRevenue: monthTotalRevenue,
          monthMemberRevenue,
          monthNonMemberRevenue,
          monthTransactions: recentTransactions.length + recentNonMember.length,

          // Members
          activeMembers: activeMembers.length,
          totalMembers: allMembers.length,
          newMembersThisMonth: newMembersThisMonth.length,
          expiringSoon: expiringSoon.length,

          // Averages
          avgDailyRevenue: monthTotalRevenue / 30,
          avgTransactionValue: monthTotalRevenue / (recentTransactions.length + recentNonMember.length) || 0,

          // Pending
          pendingPayments: pendingPayments.length,
          pendingAmount: pendingPayments.reduce((sum, p) => sum + (p.jumlah || 0), 0)
        },
        // PERBAIKAN: Tambahkan revenue dan transactions objects untuk FinancialStats
        revenue: {
          total: todayTotalRevenue,
          membership: todayMemberRevenue,
          dailyPass: todayNonMemberRevenue,
          monthlyDailyPass: monthNonMemberRevenue,
          other: 0
        },
        transactions: {
          total: todayTransactions.length + todayNonMember.length,
          membership: todayTransactions.length,
          dailyPass: todayNonMember.length,
          monthlyDailyPass: recentNonMember.length,
          date: new Date().toISOString().split('T')[0]
        },
        members: {
          active: activeMembers.length,
          pending: pendingPayments.length,
          total: allMembers.length,
          recentPayments: todayTransactions.length
        },
        details: detailedStats,
        rawData: {
          todayTransactions: todayTransactions.length,
          todayNonMemberTransactions: todayNonMember.length,
          recentTransactions: recentTransactions.length,
          recentNonMemberTransactions: recentNonMember.length,
          todayExpenses: todayExpenses.length,
          allMembers: allMembers.length,
          pendingPayments: pendingPayments.length
        },
        timestamp: new Date().toISOString(),
        serverTime: new Date().toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' }),
        isRealTime: true,
        source: 'firestore-live',
        cacheStatus: 'bypassed'
      }
    };

    console.log('📊 REAL-TIME Stats:', {
      todayRevenue: todayTotalRevenue.toLocaleString('id-ID'),
      todayTransactions: responseData.data.summary.todayTransactions,
      activeMembers: activeMembers.length,
      pending: pendingPayments.length,
      isRealTime: true
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('❌ REAL-TIME API Error:', error);

    // Detailed error logging
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      code: error.code,
      details: 'Failed to fetch real-time data from Firestore',
      data: null,
      isRealTime: false,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Tambahkan HEAD method untuk CORS
export async function HEAD(request) {
  return new Response(null, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    }
  });
}