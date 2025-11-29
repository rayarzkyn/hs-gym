import { NextResponse } from 'next/server';

// Comprehensive mock data untuk pending payments
const mockPendingPayments = [
  {
    id: 'pending_001',
    memberName: 'John Doe',
    amount: 500000,
    total: 500000,
    paymentMethod: 'transfer',
    metode_pembayaran: 'transfer',
    daysPending: 2,
    hari_pending: 2,
    description: 'Pembayaran membership premium - menunggu verifikasi',
    waktu_transaksi: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    memberId: 'Member_001',
    type: 'membership_payment',
    bukti_pembayaran: 'transfer_receipt_001.jpg',
    telepon: '081234567890'
  },
  {
    id: 'pending_002', 
    memberName: 'Jane Smith',
    amount: 300000,
    total: 300000,
    paymentMethod: 'cash',
    metode_pembayaran: 'cash',
    daysPending: 1,
    hari_pending: 1,
    description: 'Pembayaran membership regular - menunggu verifikasi',
    waktu_transaksi: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    memberId: 'Member_002',
    type: 'membership_payment',
    bukti_pembayaran: null,
    telepon: '081234567891'
  },
  {
    id: 'pending_003',
    memberName: 'Bob Wilson',
    amount: 400000,
    total: 400000,
    paymentMethod: 'qris',
    metode_pembayaran: 'qris',
    daysPending: 3,
    hari_pending: 3,
    description: 'Pembayaran personal training - menunggu verifikasi',
    waktu_transaksi: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    memberId: 'Member_003',
    type: 'personal_training',
    bukti_pembayaran: 'qris_screenshot_003.png',
    telepon: '081234567892'
  }
];

// Store untuk simulated database operations
let simulatedPayments = [...mockPendingPayments];

export async function GET(request) {
  try {
    console.log('📋 Pending payments API called');
    
    return NextResponse.json({
      success: true,
      data: simulatedPayments,
      total: simulatedPayments.length,
      lastUpdated: new Date().toISOString(),
      source: 'mock'
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('❌ Error in pending-payments API:', error);
    
    return NextResponse.json({
      success: true,
      data: mockPendingPayments,
      total: mockPendingPayments.length,
      lastUpdated: new Date().toISOString(),
      note: 'Using fallback data due to server error'
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function POST(request) {
  try {
    console.log('🔄 Processing payment action...');
    
    const { transactionId, action, adminId } = await request.json();

    if (!transactionId || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction ID dan action diperlukan' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Action harus "approve" atau "reject"' 
        },
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Find and update the payment
    const paymentIndex = simulatedPayments.findIndex(p => p.id === transactionId);
    
    if (paymentIndex === -1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction tidak ditemukan' 
        },
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const payment = simulatedPayments[paymentIndex];
    const newStatus = action === 'approve' ? 'completed' : 'failed';
    
    console.log(`🔄 Updating transaction ${transactionId} to status: ${newStatus}`);

    // Remove from pending payments (simulate database update)
    simulatedPayments = simulatedPayments.filter(p => p.id !== transactionId);

    const actionMessage = action === 'approve' ? 'disetujui' : 'ditolak';
    
    console.log(`✅ Transaction ${transactionId} ${actionMessage}`);

    return NextResponse.json({
      success: true,
      message: `Pembayaran berhasil ${actionMessage}`,
      transactionId: transactionId,
      status: newStatus,
      processedAt: new Date().toISOString(),
      remainingPending: simulatedPayments.length
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('❌ Error in pending-payments POST:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Terjadi kesalahan server',
        message: error.message
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Optional: Reset to initial mock data
export async function PUT(request) {
  try {
    const { action } = await request.json();
    
    if (action === 'reset') {
      simulatedPayments = [...mockPendingPayments];
      console.log('🔄 Reset pending payments to initial state');
      
      return NextResponse.json({
        success: true,
        message: 'Pending payments reset successfully',
        count: simulatedPayments.length
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('❌ Error in pending-payments PUT:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal reset data' },
      { status: 500 }
    );
  }
}