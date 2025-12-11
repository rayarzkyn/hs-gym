// api/admin/pending-payments/count/route.js
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

export async function GET(request) {
  try {
    console.log('⏳ Pending payments count API called');
    
    // Query for pending transactions (both member and non-member)
    const memberPendingQuery = query(
      collection(db, "transactions"),
      where("status", "==", "pending"),
      orderBy("tanggal", "desc")
    );
    
    const nonMemberPendingQuery = query(
      collection(db, "non_member_transactions"),
      where("status", "==", "pending"),
      orderBy("tanggal", "desc")
    );
    
    const [memberPendingSnap, nonMemberPendingSnap] = await Promise.all([
      getDocs(memberPendingQuery),
      getDocs(nonMemberPendingQuery)
    ]);
    
    const memberPending = memberPendingSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      tanggal: doc.data().tanggal?.toDate ? doc.data().tanggal.toDate() : doc.data().tanggal,
      type: 'member'
    }));
    
    const nonMemberPending = nonMemberPendingSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      tanggal: doc.data().tanggal?.toDate ? doc.data().tanggal.toDate() : doc.data().tanggal,
      type: 'non-member'
    }));
    
    const allPending = [...memberPending, ...nonMemberPending]
      .sort((a, b) => b.tanggal - a.tanggal)
      .slice(0, 20); // Limit to 20 most recent
    
    // Calculate totals
    const totalCount = allPending.length;
    const totalAmount = allPending.reduce((sum, p) => sum + (p.jumlah || 0), 0);
    
    // Group by payment method
    const byPaymentMethod = allPending.reduce((acc, payment) => {
      const method = payment.metode_pembayaran || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {});
    
    // Group by type (member/non-member)
    const byType = {
      member: memberPending.length,
      nonMember: nonMemberPending.length
    };
    
    // Calculate time since creation
    const now = new Date();
    const pendingWithAge = allPending.map(payment => {
      const created = payment.tanggal instanceof Date ? payment.tanggal : new Date(payment.tanggal);
      const ageInHours = Math.floor((now - created) / (1000 * 60 * 60));
      const ageInDays = Math.floor(ageInHours / 24);
      
      return {
        ...payment,
        ageInHours,
        ageInDays,
        isOld: ageInHours > 24, // More than 24 hours old
        isVeryOld: ageInHours > 72 // More than 3 days old
      };
    });
    
    const oldPayments = pendingWithAge.filter(p => p.isOld);
    const veryOldPayments = pendingWithAge.filter(p => p.isVeryOld);
    
    return new Response(JSON.stringify({
      success: true,
      data: {
        count: totalCount,
        amount: totalAmount,
        payments: allPending,
        pendingWithAge,
        summary: {
          total: totalCount,
          totalAmount,
          byPaymentMethod,
          byType,
          oldPayments: oldPayments.length,
          veryOldPayments: veryOldPayments.length,
          averageAmount: totalCount > 0 ? totalAmount / totalCount : 0
        },
        timestamp: new Date().toISOString(),
        isRealTime: true
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, max-age=0'
      }
    });
    
  } catch (error) {
    console.error('❌ Pending payments API error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      data: {
        count: 0,
        amount: 0,
        payments: [],
        summary: {},
        timestamp: new Date().toISOString(),
        isRealTime: false
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}