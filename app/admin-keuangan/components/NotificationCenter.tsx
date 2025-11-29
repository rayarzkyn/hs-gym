'use client';
import { useState, useRef, useEffect } from 'react';

interface NotificationCenterProps {
  notifications: any[];
  onRemove: (id: number) => void;
  onClearAll: () => void;
}

interface Notification {
  id: number;
  type: string;
  message: string;
  timestamp: Date;
  isError?: boolean;
  priority?: 'low' | 'medium' | 'high';
  autoClose?: boolean;
  paymentId?: string;
  action?: string;
  count?: number;
}

export default function NotificationCenter({ notifications, onRemove, onClearAll }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [autoCloseTimers, setAutoCloseTimers] = useState<{[key: number]: NodeJS.Timeout}>({});
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

  // Auto-close notifications
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.autoClose && !autoCloseTimers[notification.id]) {
        const timer = setTimeout(() => {
          onRemove(notification.id);
          setAutoCloseTimers(prev => {
            const newTimers = { ...prev };
            delete newTimers[notification.id];
            return newTimers;
          });
        }, 5000); // Auto close after 5 seconds

        setAutoCloseTimers(prev => ({
          ...prev,
          [notification.id]: timer
        }));
      }
    });

    return () => {
      Object.values(autoCloseTimers).forEach(timer => clearTimeout(timer));
    };
  }, [notifications, onRemove, autoCloseTimers]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pending_payments':
        return '💳';
      case 'payment_processed':
        return '✅';
      case 'payment_approved':
        return '👍';
      case 'payment_rejected':
        return '👎';
      case 'expense_added':
        return '💸';
      case 'data_updated':
        return '🔄';
      case 'export_completed':
        return '📤';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'success':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (notification: Notification) => {
    if (notification.isError) {
      return 'text-red-500 bg-red-100 border-red-200';
    }
    
    switch (notification.type) {
      case 'pending_payments':
        return 'text-orange-500 bg-orange-100 border-orange-200';
      case 'payment_processed':
      case 'payment_approved':
        return 'text-green-500 bg-green-100 border-green-200';
      case 'payment_rejected':
        return 'text-red-500 bg-red-100 border-red-200';
      case 'expense_added':
        return 'text-blue-500 bg-blue-100 border-blue-200';
      case 'export_completed':
        return 'text-purple-500 bg-purple-100 border-purple-200';
      case 'data_updated':
        return 'text-cyan-500 bg-cyan-100 border-cyan-200';
      case 'warning':
        return 'text-yellow-500 bg-yellow-100 border-yellow-200';
      default:
        return 'text-gray-500 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <span className="bg-red-500 text-white px-1 py-0.5 rounded text-xs">Penting</span>;
      case 'medium':
        return <span className="bg-yellow-500 text-white px-1 py-0.5 rounded text-xs">Normal</span>;
      default:
        return null;
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes}m yang lalu`;
    if (hours < 24) return `${hours}j yang lalu`;
    if (days < 7) return `${days}h yang lalu`;
    return new Date(timestamp).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    });
  };

  const handleNotificationAction = (notification: Notification) => {
    switch (notification.type) {
      case 'pending_payments':
        window.location.href = '/admin-keuangan?tab=payments';
        setIsOpen(false);
        break;
      case 'expense_added':
        window.location.href = '/admin-keuangan?tab=expenses';
        setIsOpen(false);
        break;
      case 'export_completed':
        // Could open export history or trigger download
        break;
      default:
        break;
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(n => 
      n.type === 'pending_payments' || 
      n.priority === 'high' || 
      n.isError
    ).length;
  };

  const unreadCount = getUnreadCount();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
        title="Notifikasi"
      >
        <span className="text-2xl transition-transform group-hover:scale-110">🔔</span>
        
        {/* Notification Badge */}
        {notifications.length > 0 && (
          <span className={`absolute -top-1 -right-1 text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold border-2 border-white ${
            unreadCount > 0 
              ? 'bg-red-500 text-white animate-pulse' 
              : 'bg-blue-500 text-white'
          }`}>
            {unreadCount > 9 ? '9+' : unreadCount > 0 ? unreadCount : notifications.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[480px] overflow-hidden transform transition-all duration-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Notifikasi</h3>
                <p className="text-sm text-gray-600">
                  {notifications.length} notifikasi • {unreadCount} belum dibaca
                </p>
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-sm text-blue-500 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Bersihkan Semua
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="text-6xl mb-4">🎉</div>
                <p className="font-medium">Tidak ada notifikasi</p>
                <p className="text-sm mt-2">Semua notifikasi sudah ditangani!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-all group ${
                      notification.priority === 'high' || notification.isError
                        ? 'bg-red-50 hover:bg-red-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex space-x-3">
                      {/* Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2 ${getNotificationColor(notification)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center space-x-2">
                            <p className={`text-sm font-medium leading-tight ${
                              notification.isError ? 'text-red-800' : 'text-gray-800'
                            }`}>
                              {notification.message}
                            </p>
                            {notification.priority && getPriorityBadge(notification.priority)}
                          </div>
                          {notification.autoClose && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                        
                        <p className="text-xs text-gray-500 mb-2">
                          {formatTime(notification.timestamp)}
                        </p>

                        {/* Additional Info */}
                        {notification.count && (
                          <div className="text-xs text-gray-600 bg-gray-200 px-2 py-1 rounded inline-block">
                            {notification.count} items
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-2 mt-2">
                          {notification.type === 'pending_payments' && (
                            <button
                              onClick={() => handleNotificationAction(notification)}
                              className="bg-blue-500 text-white py-1 px-3 rounded text-xs hover:bg-blue-600 transition font-medium"
                            >
                              Lihat Pembayaran
                            </button>
                          )}
                          
                          {notification.type === 'expense_added' && (
                            <button
                              onClick={() => handleNotificationAction(notification)}
                              className="bg-green-500 text-white py-1 px-3 rounded text-xs hover:bg-green-600 transition font-medium"
                            >
                              Lihat Pengeluaran
                            </button>
                          )}

                          {(notification.type === 'payment_approved' || notification.type === 'payment_rejected') && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              notification.type === 'payment_approved' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {notification.type === 'payment_approved' ? 'Disetujui' : 'Ditolak'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Close Button */}
                      <button
                        onClick={() => onRemove(notification.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity p-1 h-6 w-6 flex items-center justify-center rounded hover:bg-gray-200"
                        title="Tutup notifikasi"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>
                  {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
                </span>
                <span>
                  Terakhir update: {new Date().toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto-close progress bars (optional) */}
      {isOpen && notifications.some(n => n.autoClose) && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
          {notifications
            .filter(n => n.autoClose)
            .map((notification, index) => (
              <div
                key={notification.id}
                className="h-full bg-blue-500 transition-all duration-5000 ease-linear"
                style={{
                  width: '100%',
                  animation: `shrink 5s linear forwards`,
                  animationDelay: `${index * 100}ms`
                }}
              />
            ))
          }
        </div>
      )}

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}