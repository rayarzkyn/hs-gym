// app/member-dashboard/components/PendingExtension.tsx
'use client';

interface PendingExtensionProps {
  transactionId?: string;
  plan?: string;
  price?: number;
  onViewDetails?: () => void;
}

export default function PendingExtension({ 
  transactionId, 
  plan, 
  price, 
  onViewDetails 
}: PendingExtensionProps) {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!transactionId) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-400/30 rounded-xl p-4 mb-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center mb-2">
            <span className="text-yellow-600 mr-2">🔄</span>
            <h3 className="font-semibold text-yellow-700">Perpanjangan Pending</h3>
          </div>
          <p className="text-yellow-600 text-sm mb-1">
            Anda memiliki permintaan perpanjangan yang menunggu pembayaran
          </p>
          <div className="text-sm text-yellow-700 space-y-1">
            <div className="flex">
              <span className="w-24">Paket:</span>
              <span className="font-medium">{plan}</span>
            </div>
            <div className="flex">
              <span className="w-24">Jumlah:</span>
              <span className="font-medium">{price ? formatCurrency(price) : '-'}</span>
            </div>
            <div className="flex">
              <span className="w-24">ID Transaksi:</span>
              <span className="font-mono text-xs">{transactionId}</span>
            </div>
          </div>
        </div>
        
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Lanjutkan Pembayaran
          </button>
        )}
      </div>
      
      <div className="mt-3 p-2 bg-yellow-500/10 rounded-lg">
        <p className="text-yellow-600 text-xs">
          Silakan selesaikan pembayaran untuk mengaktifkan perpanjangan membership Anda.
        </p>
      </div>
    </div>
  );
}