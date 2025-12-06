'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Components
import FinancialStats from './components/FinancialStats';
import PendingPayments from './components/PendingPayments';
import RevenueChart from './components/RevenueChart';
import ExpenseManager from './components/ExpenseManager';
import ExportPanel from './components/ExportPanel';
import NotificationCenter from './components/NotificationCenter';
import DashboardSkeleton from './components/DashboardSkeleton';

export default function AdminKeuangan() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [componentLoading, setComponentLoading] = useState({
    summary: true,
    chart: true,
    pending: true,
    export: true
  });

  // Cek authentication dengan optimization
  useEffect(() => {
    const checkAuth = () => {
      if (authChecked) return;

      const userData = localStorage.getItem('user');
      const staffUser = localStorage.getItem('staffUser');
      
      let userObj = null;
      
      // Check user data efficiently
      if (userData) {
        try {
          userObj = JSON.parse(userData);
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      } else if (staffUser) {
        try {
          userObj = JSON.parse(staffUser);
        } catch (e) {
          console.error('Error parsing staff data:', e);
        }
      }

      if (!userObj) {
        setAuthChecked(true);
        router.push('/login');
        return;
      }
      
      // Check role
      const allowedRoles = ['admin_keuangan', 'keuangan', 'admin'];
      if (!allowedRoles.includes(userObj.role)) {
        setAuthChecked(true);
        router.push('/login');
        return;
      }
      
      setUser(userObj);
      setAuthChecked(true);
      
      // Load data in background after auth check
      loadDashboardData();
    };

    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => checkAuth());
    } else {
      setTimeout(checkAuth, 0);
    }
  }, [router, authChecked]);

  // Refresh data only when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Small delay to ensure user interaction
        setTimeout(() => {
          loadDashboardData();
        }, 1000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Optimized loadDashboardData with parallel loading and independent states
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      setComponentLoading({
        summary: true,
        chart: true,
        pending: true,
        export: true
      });
      
      console.log('🔄 Loading dashboard data...');
      
      // PARALLEL REQUESTS with better error handling
      const [financialRes, pendingRes, chartRes, exportRes] = await Promise.allSettled([
        fetch('/api/admin/financial-reports?period=monthly&fields=summary,chart,basic'),
        fetch('/api/admin/pending-payments?limit=5&fields=id,amount,date,status'),
        fetch('/api/admin/chart-data?period=monthly&simplify=true'),
        fetch('/api/admin/export-options')
      ]);
      
      // Process financial data
      if (financialRes.status === 'fulfilled') {
        const response = financialRes.value;
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setFinancialData(data.data);
            setLastUpdate(new Date().toLocaleTimeString());
            setComponentLoading(prev => ({ ...prev, summary: false }));
            
            // Success notification
            addNotification({
              id: Date.now(),
              type: 'success',
              message: 'Data keuangan berhasil dimuat',
              timestamp: new Date(),
              autoClose: true,
              duration: 3000
            });
          }
        }
      }
      
      // Process pending payments
      if (pendingRes.status === 'fulfilled') {
        const response = pendingRes.value;
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.length > 0) {
            const hasExistingNotification = notifications.some(n => n.type === 'pending_payments');
            if (!hasExistingNotification) {
              addNotification({
                id: Date.now(),
                type: 'pending_payments',
                message: `${data.data.length} pembayaran menunggu verifikasi`,
                timestamp: new Date(),
                count: data.data.length,
                priority: 'high'
              });
            }
          }
          setComponentLoading(prev => ({ ...prev, pending: false }));
        }
      }
      
      // Process chart data
      if (chartRes.status === 'fulfilled') {
        setComponentLoading(prev => ({ ...prev, chart: false }));
      }
      
      // Process export data
      if (exportRes.status === 'fulfilled') {
        setComponentLoading(prev => ({ ...prev, export: false }));
      }
      
      // Check for errors
      const errors = [];
      if (financialRes.status === 'rejected') errors.push('Data keuangan');
      if (pendingRes.status === 'rejected') errors.push('Pembayaran pending');
      
      if (errors.length > 0) {
        throw new Error(`Gagal memuat: ${errors.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat data';
      setError(errorMessage);
      
      addNotification({
        id: Date.now(),
        type: 'error',
        message: errorMessage.substring(0, 100),
        timestamp: new Date(),
        isError: true
      });
      
      // Set all components as loaded to show UI
      setComponentLoading({
        summary: false,
        chart: false,
        pending: false,
        export: false
      });
    } finally {
      setLoading(false);
    }
  }, [user, notifications]);

  const handleRefreshData = () => {
    loadDashboardData();
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('staffUser');
    router.push('/');
  };

  const addNotification = useCallback((notification: any) => {
    setNotifications(prev => {
      // Prevent duplicates
      if (prev.some(n => n.message === notification.message && n.type === notification.type)) {
        return prev;
      }
      return [notification, ...prev.slice(0, 9)];
    });
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Quick auth loading
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center animate-fade-in">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-700">Memeriksa otorisasi...</div>
          <p className="text-sm text-gray-500 mt-2">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'payments', label: 'Verifikasi Pembayaran', icon: '💳' },
    { id: 'expenses', label: 'Pengeluaran', icon: '💰' },
    { id: 'reports', label: 'Laporan', icon: '📈' },
    { id: 'export', label: 'Export Data', icon: '📤' },
  ];

  const renderTabContent = () => {
    // Dashboard tab with optimized loading
    if (activeTab === 'dashboard') {
      if (loading && !financialData) {
        return <DashboardSkeleton />;
      }
      
      if (error) {
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center animate-fade-in">
            <div className="text-red-600 text-lg font-semibold mb-2">Error Memuat Data</div>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={loadDashboardData}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
              >
                Coba Lagi
              </button>
              <button
                onClick={() => setError(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        );
      }

      return financialData ? (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <FinancialStats 
                data={financialData} 
                lastUpdate={lastUpdate}
                isLoading={componentLoading.summary}
              />
            </div>
            <button
              onClick={handleRefreshData}
              className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2 transition-colors font-medium shadow-sm"
              title="Refresh data"
              disabled={loading}
            >
              <span className={loading ? 'animate-spin' : ''}>🔄</span>
              <span>{loading ? 'Memuat...' : 'Refresh'}</span>
            </button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart 
              data={financialData.chartData} 
              isLoading={componentLoading.chart}
            />
            <div className="space-y-6">
              <PendingPayments 
                preview 
                onAction={addNotification}
                isLoading={componentLoading.pending}
              />
              <ExportPanel 
                preview 
                isLoading={componentLoading.export}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 animate-fade-in">
          <div className="text-gray-500 text-lg mb-4">Data dashboard belum tersedia</div>
          <button
            onClick={loadDashboardData}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium shadow-md"
          >
            Muat Data Sekarang
          </button>
          <p className="text-sm text-gray-500 mt-4">
            Klik tombol di atas untuk memuat data dashboard
          </p>
        </div>
      );
    }

    // Other tabs
    switch (activeTab) {
      case 'payments':
        return <PendingPayments onAction={addNotification} />;

      case 'expenses':
        return <ExpenseManager userId={user.id} onAction={addNotification} />;

      case 'reports':
        return financialData ? (
          <div className="animate-fade-in">
            <FinancialStats data={financialData} detailed />
            <div className="mt-6">
              <RevenueChart data={financialData.chartData} detailed />
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-500">Data laporan belum tersedia</div>
            <button
              onClick={loadDashboardData}
              className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Muat Data
            </button>
          </div>
        );

      case 'export':
        return <ExportPanel detailed />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <nav className="bg-white shadow-lg sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">HS</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Admin Keuangan</h1>
                <p className="text-sm text-gray-600 truncate max-w-[200px] sm:max-w-none">
                  HS Gym Management System
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <NotificationCenter 
                notifications={notifications}
                onRemove={removeNotification}
                onClearAll={clearAllNotifications}
              />
              
              <div className="flex items-center justify-between w-full sm:w-auto space-x-3">
                <div className="text-right">
                  <span className="text-gray-700 block text-sm sm:text-base">
                    Halo, <strong>{user.nama || user.username}</strong>
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{user.role}</span>
                </div>
                <button 
                  onClick={logout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium text-sm sm:text-base whitespace-nowrap"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-4 flex overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex space-x-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.id 
                      ? 'bg-green-500 text-white shadow-md' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-4 md:p-6">
        {renderTabContent()}
      </div>

      {/* Global Styles */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}