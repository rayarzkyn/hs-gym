'use client';
import { useState, useEffect } from 'react';

interface Payment {
  id: string;
  memberName?: string;
  amount?: number;
  total?: number;
  paymentMethod?: string;
  metode_pembayaran?: string;
  daysPending?: number;
  hari_pending?: number;
  description?: string;
  waktu_transaksi?: string;
  date?: string;
  status?: string;
  bukti_pembayaran?: string;
  telepon?: string;
  type?: string;
}

interface PendingPaymentsProps {
  preview?: boolean;
  onAction?: (notification: any) => void;
}

export default function PendingPayments({ preview = false, onAction }: PendingPaymentsProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingPayments();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadPendingPayments, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading pending payments...');
      const response = await fetch('/api/admin/pending-payments');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Pending payments data received:', data);
      
      if (data.success) {
        setPayments(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load data');
      }
    } catch (error) {
      console.error('❌ Error loading pending payments:', error);
      setError(error instanceof Error ? error.message : 'Terjadi kesalahan');
      
      if (onAction) {
        onAction({
          id: Date.now(),
          type: 'error',
          message: 'Gagal memuat data pembayaran pending',
          timestamp: new Date(),
          isError: true
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(paymentId);
      
      console.log(`🔄 Processing payment ${paymentId} with action: ${action}`);
      const response = await fetch('/api/admin/pending-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: paymentId,
          action: action,
          adminId: 'admin_keuangan'
        }),
      });

      const data = await response.json();
      console.log('📨 Payment action response:', data);

      if (data.success) {
        // Remove the payment from list
        setPayments(prev => prev.filter(p => p.id !== paymentId));
        
        // Show notification
        if (onAction) {
          onAction({
            id: Date.now(),
            type: 'payment_processed',
            message: data.message,
            timestamp: new Date(),
            paymentId: paymentId,
            action: action
          });
        }
        
        // Refresh data to get updated list
        setTimeout(loadPendingPayments, 1000);
      } else {
        throw new Error(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('❌ Error processing payment:', error);
      if (onAction) {
        onAction({
          id: Date.now(),
          type: 'error',
          message: 'Gagal memproses pembayaran',
          timestamp: new Date(),
          isError: true
        });
      }
    } finally {
      setProcessingId(null);
    }
  };

  const viewPaymentProof = (payment: Payment) => {
    if (payment.bukti_pembayaran) {
      // Open proof in new tab or show modal
      window.open(payment.bukti_pembayaran, '_blank');
    } else {
      alert('Tidak ada bukti pembayaran tersedia');
    }
  };

  // Safe amount formatting function
  const formatAmount = (amount: number | undefined) => {
    if (!amount) return 'Rp 0';
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Safe date formatting function
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Calculate days pending
  const calculateDaysPending = (payment: Payment) => {
    if (payment.daysPending !== undefined) return payment.daysPending;
    if (payment.hari_pending !== undefined) return payment.hari_pending;
    
    try {
      const transactionDate = new Date(payment.waktu_transaksi || payment.date || '');
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - transactionDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return 0;
    }
  };

  if (loading && payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Pembayaran Menunggu Verifikasi</h2>
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  if (error && payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Pembayaran Menunggu Verifikasi</h2>
        <div className="text-center text-red-600 py-8">
          <div className="text-4xl mb-2">⚠️</div>
          <p>{error}</p>
          <button
            onClick={loadPendingPayments}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (preview) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Pembayaran Menunggu</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadPendingPayments}
              className="p-1 text-gray-500 hover:text-gray-700 transition"
              title="Refresh data"
            >
              🔄
            </button>
            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              {payments.length} menunggu
            </span>
          </div>
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-medium">Tidak ada pembayaran yang menunggu</p>
            <p className="text-sm mt-1">Semua pembayaran telah diverifikasi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200 hover:bg-yellow-100 transition-colors">
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {payment.memberName || 'Unknown Member'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatAmount(payment.amount || payment.total)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {payment.paymentMethod || payment.metode_pembayaran}
                  </p>
                </div>
                <span className="text-sm text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  {calculateDaysPending(payment)} hari
                </span>
              </div>
            ))}
            
            {payments.length > 3 && (
              <button 
                onClick={() => window.location.href = '/admin-keuangan?tab=payments'}
                className="w-full text-center text-blue-600 hover:text-blue-700 font-medium py-2 flex items-center justify-center space-x-1"
              >
                <span>Lihat {payments.length - 3} lainnya</span>
                <span>→</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Verifikasi Pembayaran</h2>
          <p className="text-gray-600 mt-1">Kelola dan verifikasi pembayaran yang menunggu</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadPendingPayments}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2 transition-colors"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
          <span className="bg-yellow-100 text-yellow-800 px-3 py-2 rounded-full text-sm font-medium">
            {payments.length} pembayaran menunggu
          </span>
        </div>
      </div>

      {payments.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          <div className="text-6xl mb-4">🎉</div>
          <p className="text-lg font-medium">Tidak ada pembayaran yang menunggu verifikasi</p>
          <p className="text-sm mt-2">Semua pembayaran telah diproses dan diverifikasi</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Member</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Jumlah</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Metode</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Tanggal</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Status</th>
                <th className="py-3 px-4 text-left text-gray-700 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const daysPending = calculateDaysPending(payment);
                const isProcessing = processingId === payment.id;
                
                return (
                  <tr key={payment.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-800">
                          {payment.memberName || 'Unknown Member'}
                        </p>
                        <p className="text-sm text-gray-600">{payment.description}</p>
                        {payment.telepon && (
                          <p className="text-xs text-gray-500 mt-1">{payment.telepon}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-bold text-green-600">
                      {formatAmount(payment.amount || payment.total)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {payment.paymentMethod || payment.metode_pembayaran || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {formatDate(payment.waktu_transaksi || payment.date)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        daysPending > 3 
                          ? 'bg-red-100 text-red-800' 
                          : daysPending > 1
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {daysPending} hari menunggu
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        {payment.bukti_pembayaran && (
                          <button
                            onClick={() => viewPaymentProof(payment)}
                            className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600 transition text-sm font-medium flex items-center space-x-1"
                            title="Lihat bukti pembayaran"
                          >
                            <span>📎</span>
                            <span>Bukti</span>
                          </button>
                        )}
                        <button
                          onClick={() => handlePaymentAction(payment.id, 'approve')}
                          disabled={isProcessing}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center space-x-1"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <span>✓</span>
                          )}
                          <span>Setujui</span>
                        </button>
                        <button
                          onClick={() => handlePaymentAction(payment.id, 'reject')}
                          disabled={isProcessing}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center space-x-1"
                        >
                          {isProcessing ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          ) : (
                            <span>✕</span>
                          )}
                          <span>Tolak</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Info */}
      {payments.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-blue-600">{payments.length}</div>
              <div className="text-gray-600">Total Menunggu</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-orange-600">
                {payments.filter(p => calculateDaysPending(p) > 2).length}
              </div>
              <div className="text-gray-600"> Lebih dari 2 Hari</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600">
                Rp {payments.reduce((sum, p) => sum + (p.amount || p.total || 0), 0).toLocaleString('id-ID')}
              </div>
              <div className="text-gray-600">Total Nilai</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}