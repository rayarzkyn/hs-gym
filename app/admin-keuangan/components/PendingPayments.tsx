'use client';
import { useState, useEffect } from 'react';

interface PendingPaymentsProps {
  preview?: boolean;
  onAction?: (notification: any) => void;
}

export default function PendingPayments({ preview = false, onAction }: PendingPaymentsProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPendingPayments();
  }, []);

  const loadPendingPayments = async () => {
    try {
      const response = await fetch('/api/admin/pending-payments');
      const data = await response.json();
      
      if (data.success) {
        setPayments(preview ? data.data.slice(0, 5) : data.data);
      }
    } catch (error) {
      console.error('Error loading pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentAction = async (transactionId: number, action: 'approve' | 'reject') => {
    try {
      const userData = localStorage.getItem('user');
      const user = userData ? JSON.parse(userData) : null;

      const response = await fetch('/api/admin/pending-payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId,
          action,
          adminId: user?.id
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Remove from list
        setPayments(prev => prev.filter(p => p.id_transaksi !== transactionId));
        
        // Show notification
        if (onAction) {
          onAction({
            id: Date.now(),
            type: 'payment_processed',
            message: `Pembayaran #${transactionId} berhasil di${action === 'approve' ? 'setujui' : 'tolak'}`,
            timestamp: new Date()
          });
        }

        setShowModal(false);
      } else {
        alert('Gagal memproses pembayaran: ' + result.error);
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Terjadi kesalahan saat memproses pembayaran');
    }
  };

  const openPaymentDetail = (payment: any) => {
    setSelectedPayment(payment);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-white rounded-xl shadow-lg ${preview ? 'p-4' : 'p-6'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`font-bold ${preview ? 'text-lg' : 'text-2xl'}`}>
            Pembayaran Menunggu Verifikasi
            {!preview && payments.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-sm px-2 py-1 rounded-full">
                {payments.length}
              </span>
            )}
          </h2>
          {!preview && (
            <button
              onClick={loadPendingPayments}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Refresh
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎉</div>
            <p>Tidak ada pembayaran yang menunggu verifikasi</p>
          </div>
        ) : (
          <div className={`overflow-x-auto ${preview ? 'max-h-80' : ''}`}>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">ID Transaksi</th>
                  <th className="text-left py-3">Customer</th>
                  <th className="text-left py-3">Jumlah</th>
                  <th className="text-left py-3">Metode</th>
                  <th className="text-left py-3">Tanggal</th>
                  {!preview && <th className="text-left py-3">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id_transaksi} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-mono text-sm">
                      #{payment.id_transaksi}
                    </td>
                    <td className="py-3">
                      <div>
                        <div className="font-medium">
                          {payment.member_nama || 'Non-Member'}
                        </div>
                        {payment.ecard_code && (
                          <div className="text-sm text-gray-500">
                            {payment.ecard_code}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 font-bold">
                      Rp {payment.total.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3">
                      <span className="capitalize">{payment.metode_pembayaran}</span>
                    </td>
                    <td className="py-3">
                      <div>
                        {new Date(payment.waktu_transaksi).toLocaleDateString('id-ID')}
                        <div className="text-sm text-gray-500">
                          {payment.hari_pending} hari lalu
                        </div>
                      </div>
                    </td>
                    {!preview && (
                      <td className="py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openPaymentDetail(payment)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => handlePaymentAction(payment.id_transaksi, 'approve')}
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => handlePaymentAction(payment.id_transaksi, 'reject')}
                            className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                          >
                            Tolak
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {preview && payments.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => window.location.href = '/admin-keuangan?tab=payments'}
              className="text-blue-500 hover:text-blue-700 text-sm font-medium"
            >
              Lihat Semua ({payments.length})
            </button>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {showModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Detail Pembayaran</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600">ID Transaksi</label>
                    <p className="font-mono font-bold">#{selectedPayment.id_transaksi}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Tanggal</label>
                    <p>{new Date(selectedPayment.waktu_transaksi).toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600">Customer</label>
                  <p className="font-medium">
                    {selectedPayment.member_nama || 'Non-Member'}
                  </p>
                  {selectedPayment.ecard_code && (
                    <p className="text-sm text-gray-600">E-Card: {selectedPayment.ecard_code}</p>
                  )}
                  {selectedPayment.telepon && (
                    <p className="text-sm text-gray-600">Telp: {selectedPayment.telepon}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm text-gray-600">Detail Pembayaran</label>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between">
                      <span>Jumlah:</span>
                      <span className="font-bold text-lg">
                        Rp {selectedPayment.total.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span>Metode:</span>
                      <span className="capitalize">{selectedPayment.metode_pembayaran}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span>Jenis:</span>
                      <span>
                        {selectedPayment.jenis_pengunjung === 'member' ? 'Membership' : 'Day Pass'}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedPayment.bukti_pembayaran && (
                  <div>
                    <label className="text-sm text-gray-600">Bukti Pembayaran</label>
                    <div className="mt-2">
                      <img
                        src={selectedPayment.bukti_pembayaran}
                        alt="Bukti Pembayaran"
                        className="max-w-full h-auto rounded-lg border"
                      />
                    </div>
                  </div>
                )}

                <div className="flex space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handlePaymentAction(selectedPayment.id_transaksi, 'approve')}
                    className="flex-1 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium"
                  >
                    ✅ Setujui Pembayaran
                  </button>
                  <button
                    onClick={() => handlePaymentAction(selectedPayment.id_transaksi, 'reject')}
                    className="flex-1 bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 font-medium"
                  >
                    ❌ Tolak Pembayaran
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}