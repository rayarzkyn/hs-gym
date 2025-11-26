'use client';
import { useState, useRef, useEffect } from 'react';

interface NotificationCenterProps {
  notifications: any[];
  onRemove: (id: number) => void;
  onClearAll: () => void;
}

export default function NotificationCenter({ notifications, onRemove, onClearAll }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending_payments':
        return '💳';
      case 'payment_processed':
        return '✅';
      case 'expense_added':
        return '💸';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'pending_payments':
        return 'text-orange-500 bg-orange-100';
      case 'payment_processed':
        return 'text-green-500 bg-green-100';
      case 'expense_added':
        return 'text-blue-500 bg-blue-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes}m yang lalu`;
    if (hours < 24) return `${hours}j yang lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
      >
        <span className="text-2xl">🔔</span>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Notifikasi</h3>
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium"
                >
                  Bersihkan Semua
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <div className="text-4xl mb-2">🎉</div>
                <p>Tidak ada notifikasi</p>
                <p className="text-sm mt-1">Semua sudah ditangani!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 transition group"
                  >
                    <div className="flex space-x-3">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 leading-tight">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatTime(notification.timestamp)}
                        </p>
                      </div>

                      {/* Close Button */}
                      <button
                        onClick={() => onRemove(notification.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Action Buttons for specific notifications */}
                    {notification.type === 'pending_payments' && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={() => {
                            window.location.href = '/admin-keuangan?tab=payments';
                            setIsOpen(false);
                          }}
                          className="flex-1 bg-blue-500 text-white py-1 px-3 rounded text-xs hover:bg-blue-600 transition"
                        >
                          Lihat Pembayaran
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-600 text-center">
                {notifications.length} notifikasi
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}