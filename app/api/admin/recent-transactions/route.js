// File: app/api/admin/recent-transactions/route.js
// API untuk mengambil transaksi terbaru (completed) dari Firebase
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { db } from '@/lib/firebase-client';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit
} from 'firebase/firestore';

export async function GET(request) {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const maxLimit = parseInt(searchParams.get('limit')) || 20;

        console.log('📋 Recent transactions API called, limit:', maxLimit);

        // Get completed member transactions
        const memberTxQuery = query(
            collection(db, 'transactions'),
            where('status', '==', 'completed'),
            limit(maxLimit)
        );

        // Get completed non-member (daily pass) transactions
        const dailyPassTxQuery = query(
            collection(db, 'non_member_transactions'),
            where('status', '==', 'completed'),
            limit(maxLimit)
        );

        const [memberTxSnap, dailyPassTxSnap] = await Promise.all([
            getDocs(memberTxQuery),
            getDocs(dailyPassTxQuery)
        ]);

        // Process member transactions
        const memberTransactions = memberTxSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: 'member',
                nama: data.nama_member || data.memberName || data.nama || 'Member',
                memberName: data.nama_member || data.memberName || data.nama,
                jumlah: data.jumlah || 0,
                metode_pembayaran: data.metode_pembayaran || 'cash',
                tanggal: data.tanggal?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || null,
                created_at: data.createdAt?.toDate?.()?.toISOString() || null,
                status: data.status,
                paket: data.paket || data.jenis || 'Membership',
                jenis: data.jenis || data.paket
            };
        });

        // Process daily pass transactions
        const dailyPassTransactions = dailyPassTxSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                type: 'daily_pass',
                nama: data.nama || 'Guest',
                jumlah: data.jumlah || 0,
                metode_pembayaran: data.metode_pembayaran || 'cash',
                tanggal: data.tanggal?.toDate?.()?.toISOString() || data.created_at?.toDate?.()?.toISOString() || null,
                created_at: data.created_at?.toDate?.()?.toISOString() || null,
                status: data.status,
                paket: 'Daily Pass',
                jenis: 'Daily Pass'
            };
        });

        // Combine and sort by date (newest first)
        const allTransactions = [...memberTransactions, ...dailyPassTransactions]
            .sort((a, b) => {
                const dateA = new Date(a.tanggal || a.created_at || 0);
                const dateB = new Date(b.tanggal || b.created_at || 0);
                return dateB.getTime() - dateA.getTime();
            })
            .slice(0, maxLimit);

        const responseTime = Date.now() - startTime;
        console.log(`✅ Recent transactions loaded: ${allTransactions.length} items in ${responseTime}ms`);
        console.log(`   - Member: ${memberTransactions.length}`);
        console.log(`   - Daily Pass: ${dailyPassTransactions.length}`);

        return NextResponse.json({
            success: true,
            data: allTransactions,
            summary: {
                total: allTransactions.length,
                member: memberTransactions.length,
                dailyPass: dailyPassTransactions.length,
                totalAmount: allTransactions.reduce((sum, tx) => sum + (tx.jumlah || 0), 0)
            },
            responseTime: `${responseTime}ms`
        });

    } catch (error) {
        console.error('❌ Recent transactions API error:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            data: []
        }, { status: 500 });
    }
}
