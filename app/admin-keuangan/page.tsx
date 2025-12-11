'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// Components
import FinancialStats from './components/FinancialStats';
import PendingPayments from './components/PendingPayments';
import RecentTransactions from './components/RecentTransactions';
import RevenueChart from './components/RevenueChart';
import ExpenseManager from './components/ExpenseManager';
import ExportPanel from './components/ExportPanel';
import NotificationCenter from './components/NotificationCenter';
import DashboardSkeleton from './components/DashboardSkeleton';

// Firebase real-time helpers
import {
  getTodayRealtimeData,
  getPendingPaymentsRealtime,
  getActiveMembersRealtime
} from '@/lib/firebase';

// Cache configuration
const CACHE_KEY = 'financial_dashboard_cache';

export default function AdminKeuangan() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [financialData, setFinancialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [isRealTime, setIsRealTime] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [liveUpdates, setLiveUpdates] = useState<any[]>([]);
  const [realtimeMode, setRealtimeMode] = useState<'firestore' | 'polling' | 'none'>('none');

  // Refs untuk tracking - PENTING: gunakan refs untuk menghindari render loop
  const hasLoadedFromCacheRef = useRef(false);
  const isMountedRef = useRef(true);
  const realtimeCleanupRef = useRef<(() => void)[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadRef = useRef(false);
  const authCheckedRef = useRef(false);

  // PERBAIKAN: Tambahkan refs untuk state yang berubah-ubah
  const isRefreshingRef = useRef(false);
  const financialDataRef = useRef<any>(null);
  const userRef = useRef<any>(null);

  // Sync refs dengan state
  isRefreshingRef.current = isRefreshing;
  financialDataRef.current = financialData;
  userRef.current = user;

  // ================================
  // 1. CACHE FUNCTIONS
  // ================================
  const loadCachedData = useCallback(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) {
        console.log('📦 No cache found');
        return null;
      }

      const { data, timestamp } = JSON.parse(cached);
      const now = Date.now();
      const age = now - timestamp;

      console.log(`📦 Cache found, age: ${Math.round(age / 1000)}s`);

      return data;

    } catch (error) {
      console.error('❌ Cache load error:', error);
      return null;
    }
  }, []);

  const saveToCache = useCallback((data: any) => {
    console.log('💾 Saving to cache...');
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('✅ Cache saved');
    } catch (error) {
      console.error('❌ Cache save error:', error);
    }
  }, []);

  // ================================
  // 2. REAL-TIME DATA LOADER (API)
  // ================================
  const loadRealTimeData = useCallback(async (isManualRefresh = false, skipUserCheck = false) => {
    // PERBAIKAN: Gunakan refs untuk cek kondisi, bukan state
    // skipUserCheck digunakan saat dipanggil langsung setelah setUser
    if (!skipUserCheck && !userRef.current) {
      return;
    }

    if (isRefreshingRef.current && !isManualRefresh) {
      return;
    }

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (!financialDataRef.current && !hasLoadedFromCacheRef.current) {
      setLoading(true);
    }

    try {
      setConnectionStatus('connecting');
      if (!isManualRefresh) {
        setError(null);
      }

      const apiStartTime = Date.now();

      const response = await fetch('/api/admin/financial-now', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      const apiTime = Date.now() - apiStartTime;

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data?.summary) {
        console.log('⚠️ Invalid data received');

        const cachedData = loadCachedData();
        if (cachedData) {
          console.log('🔄 Falling back to cached data');
          setFinancialData(cachedData);
          setLastUpdate(new Date(cachedData.timestamp || Date.now()).toLocaleTimeString('id-ID'));
          setIsRealTime(cachedData.source === 'real-time-api');
          setRealtimeMode(cachedData.realtimeMode || 'none');
          setLoading(false);
          setIsRefreshing(false);
          return;
        }

        throw new Error(result.error || 'Data tidak valid dari API');
      }

      const freshData = {
        ...result.data,
        timestamp: new Date().toISOString(),
        apiResponseTime: apiTime,
        source: 'real-time-api',
        realtimeMode: 'firestore',
        fetchedAt: Date.now()
      };

      setFinancialData(freshData);
      setIsRealTime(true);
      setRealtimeMode('firestore');
      setConnectionStatus('connected');
      saveToCache(freshData);

      const updateTime = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      setLastUpdate(updateTime);

      if (isManualRefresh) {
        setRefreshCount(prev => prev + 1);
        addNotification({
          id: Date.now(),
          type: 'success',
          message: `Data berhasil diperbarui (${updateTime})`,
          timestamp: new Date(),
          autoClose: true,
          duration: 3000
        });
      }

      // Load chart data
      setTimeout(async () => {
        try {
          const chartResponse = await fetch(`/api/admin/financial-reports/chart?days=7&_t=${Date.now()}`, {
            cache: 'no-store'
          });

          if (chartResponse.ok) {
            const chartResult = await chartResponse.json();
            if (chartResult.success && chartResult.data?.length > 0) {
              setFinancialData((prev: any) => ({
                ...prev,
                chartData: chartResult.data,
                chartLoadedAt: Date.now()
              }));

              saveToCache({
                ...freshData,
                chartData: chartResult.data
              });
            }
          }
        } catch (error) {
          // Chart data load failed silently
        }
      }, 300);

    } catch (error) {
      console.error('❌ REAL-TIME load error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';

      setConnectionStatus('disconnected');
      setIsRealTime(false);
      setRealtimeMode('none');

      if (!isManualRefresh) {
        setError(errorMessage);
        // PERBAIKAN: Set loading false agar error state bisa ditampilkan
        setLoading(false);

        const cachedData = loadCachedData();
        // PERBAIKAN: Gunakan ref untuk cek kondisi
        if (cachedData && !financialDataRef.current) {
          setFinancialData(cachedData);
          financialDataRef.current = cachedData;
          setLastUpdate(new Date(cachedData.timestamp || Date.now()).toLocaleTimeString('id-ID'));
          setIsRealTime(cachedData.source === 'real-time-api');
          setRealtimeMode(cachedData.realtimeMode || 'none');
          setLoading(false);
        }
      }

      if (isManualRefresh) {
        addNotification({
          id: Date.now(),
          type: 'error',
          message: `Gagal memuat data: ${errorMessage.substring(0, 50)}...`,
          timestamp: new Date(),
          isError: true,
          autoClose: true,
          duration: 5000
        });
      }

      // Setup polling fallback
      if (!pollIntervalRef.current) {
        console.log('🔄 Setting up polling as fallback');
        setupPollingFallback();
      }

    } finally {
      setTimeout(() => {
        if (isMountedRef.current) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }, 200);
    }
    // PERBAIKAN: Hapus semua state dari dependencies karena sudah gunakan refs
  }, [loadCachedData, saveToCache]);

  // ================================
  // 3. CLEANUP FUNCTIONS (dipindahkan ke atas agar bisa digunakan di setupRealtimeListeners)
  // ================================
  const cleanupRealtimeListeners = useCallback(() => {
    realtimeCleanupRef.current.forEach(cleanup => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    });
    realtimeCleanupRef.current = [];

    if (updateDebounceRef.current) {
      clearTimeout(updateDebounceRef.current);
      updateDebounceRef.current = null;
    }
  }, []);

  const clearPollingInterval = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ================================
  // 4. SETUP REAL-TIME LISTENERS
  // ================================
  const setupRealtimeListeners = useCallback(() => {
    // PERBAIKAN: Gunakan refs untuk cek kondisi
    if (!userRef.current || !financialDataRef.current) {
      return;
    }

    cleanupRealtimeListeners();

    try {
      // Listen to today's transactions
      const cleanupToday = getTodayRealtimeData((update: { type: string | number; count: number; revenue: any; amount: number; }) => {
        if (!isMountedRef.current) return;

        if (updateDebounceRef.current) {
          clearTimeout(updateDebounceRef.current);
        }

        updateDebounceRef.current = setTimeout(() => {
          const liveUpdate = {
            id: Date.now(),
            type: update.type,
            count: update.count,
            amount: update.revenue || update.amount || 0,
            timestamp: new Date()
          };

          setLiveUpdates(prev => [liveUpdate, ...prev.slice(0, 9)]);

          setFinancialData((prev: any) => {
            if (!prev) return prev;

            const newData = { ...prev };
            const now = new Date();

            switch (update.type) {
              case 'transactions':
                newData.summary.todayMemberRevenue = update.revenue;
                newData.summary.todayMemberTransactions = update.count;
                newData.summary.todayRevenue =
                  update.revenue +
                  (prev.summary?.todayNonMemberRevenue || 0);
                newData.summary.todayTransactions =
                  update.count +
                  (prev.summary?.todayDailyPassTransactions || 0);
                break;

              case 'non_member':
                newData.summary.todayNonMemberRevenue = update.revenue;
                newData.summary.todayDailyPassTransactions = update.count;
                newData.summary.todayRevenue =
                  (prev.summary?.todayMemberRevenue || 0) + update.revenue;
                newData.summary.todayTransactions =
                  (prev.summary?.todayMemberTransactions || 0) + update.count;
                break;

              case 'expenses':
                newData.summary.todayExpenses = update.amount;
                newData.summary.todayNetIncome =
                  (prev.summary?.todayRevenue || 0) - update.amount;
                break;
            }

            newData.timestamp = now.toISOString();
            newData.lastRealtimeUpdate = now.getTime();
            newData.isRealTime = true;

            setLastUpdate(now.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            }));

            return newData;
          });

          if (update.count > 0) {
            const typeLabels: Record<string, string> = {
              transactions: 'Membership',
              non_member: 'Daily Pass',
              expenses: 'Pengeluaran'
            };

            addNotification({
              id: Date.now(),
              type: 'info',
              message: `${typeLabels[update.type] || update.type}: ${update.count} baru`,
              description: `Rp${(update.revenue || update.amount || 0).toLocaleString('id-ID')}`,
              timestamp: new Date(),
              autoClose: true,
              duration: 4000
            });
          }
        }, 500);
      });

      realtimeCleanupRef.current.push(() => {
        if (cleanupToday) cleanupToday();
        if (updateDebounceRef.current) {
          clearTimeout(updateDebounceRef.current);
        }
      });

      setConnectionStatus('connected');

    } catch (error) {
      console.error('Failed to setup real-time listeners:', error);
      setConnectionStatus('disconnected');
      setupPollingFallback();
    }
    // PERBAIKAN: Hapus state dari dependencies
  }, [cleanupRealtimeListeners]);

  // ================================
  // 4. POLLING FALLBACK
  // ================================
  const setupPollingFallback = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    setRealtimeMode('polling');

    pollIntervalRef.current = setInterval(() => {
      // PERBAIKAN: Gunakan refs
      if (!isMountedRef.current || !userRef.current) return;

      loadRealTimeData(false).catch(() => { });

      setConnectionStatus(prev => prev === 'disconnected' ? 'connecting' : 'connected');

    }, 30000);
    // PERBAIKAN: Tidak ada dependencies untuk menghindari recreation
  }, [loadRealTimeData]);

  // ================================
  // 6. SINGLE AUTH CHECK + DATA LOAD
  // ================================
  useEffect(() => {
    console.log('🔐 INITIAL AUTH CHECK useEffect running...');

    // Skip jika sudah pernah dijalankan
    if (authCheckedRef.current) {
      console.log('⏸️ Auth already checked, skipping');
      return;
    }

    authCheckedRef.current = true;

    const checkAuthAndLoad = async () => {
      console.log('🔍 Starting auth check...');

      try {
        // 1. Check localStorage for user
        const userData = localStorage.getItem('user') || localStorage.getItem('staffUser');
        console.log('📋 User data from localStorage:', userData ? 'exists' : 'not found');

        if (!userData) {
          console.log('❌ No user data found, redirecting to login');
          router.push('/login');
          return;
        }

        const userObj = JSON.parse(userData);
        console.log('👤 Parsed user object:', {
          username: userObj.username,
          role: userObj.role
        });

        const allowedRoles = ['admin_keuangan', 'keuangan', 'admin'];

        if (!allowedRoles.includes(userObj.role)) {
          console.log(`❌ Unauthorized role: ${userObj.role}, redirecting`);
          router.push('/login');
          return;
        }

        console.log('✅ Auth successful, setting user state');
        setUser(userObj);
        // PERBAIKAN: Update ref secara langsung agar tersedia untuk loadRealTimeData
        userRef.current = userObj;

        // 2. Load cached data FIRST for instant display
        const cachedData = loadCachedData();
        console.log('📦 Cached data:', cachedData ? 'found' : 'not found');

        if (cachedData && !hasLoadedFromCacheRef.current) {
          console.log('🚀 Showing cached data immediately');
          hasLoadedFromCacheRef.current = true;

          setFinancialData(cachedData);
          // PERBAIKAN: Update ref secara langsung
          financialDataRef.current = cachedData;
          setLastUpdate(new Date(cachedData.timestamp || Date.now()).toLocaleTimeString('id-ID'));
          setIsRealTime(cachedData.source === 'real-time-api');
          setRealtimeMode(cachedData.realtimeMode || 'none');
          setLoading(false);
          console.log('✅ Cached data displayed, loading set to false');
        } else {
          console.log('📭 No cache available, will load fresh data');
        }

        // 3. Load fresh real-time data in background
        console.log('🔄 Starting background data load...');
        setTimeout(() => {
          // PERBAIKAN: Pass skipUserCheck=true karena kita tahu user sudah ada
          loadRealTimeData(false, true).then(() => {
            console.log('✅ Background data load completed');
          }).catch(err => {
            console.error('❌ Background data load failed:', err);
          });
        }, 100);

        // 4. Setup real-time listeners (delayed to ensure data is loaded)
        console.log('⏳ Scheduling real-time listeners setup...');
        setTimeout(() => {
          if (isMountedRef.current && userObj) {
            setupRealtimeListeners();
          }
        }, 2000);

      } catch (error) {
        console.error('❌ Auth/load error:', error);
        setError('Gagal memuat data. Silakan refresh halaman.');
        setLoading(false);
      }
    };

    // Start the process
    checkAuthAndLoad();

    // Cleanup function
    return () => {
      console.log('🧼 Component unmounting, cleanup...');
      isMountedRef.current = false;
      cleanupRealtimeListeners();
      clearPollingInterval();
    };
  }, []); // Empty deps - run once on mount

  // ================================
  // 7. ACTION HANDLERS
  // ================================
  const handleRefreshData = useCallback(() => {
    console.log('🎯 Manual refresh triggered');

    localStorage.removeItem(CACHE_KEY);
    hasLoadedFromCacheRef.current = false;

    addNotification({
      id: Date.now(),
      type: 'info',
      message: 'Memuat data terbaru...',
      timestamp: new Date(),
      loading: true
    });

    loadRealTimeData(true);
  }, [loadRealTimeData]);

  const handleClearCache = useCallback(() => {
    console.log('🗑️ Clearing ALL cache');
    localStorage.removeItem(CACHE_KEY);
    hasLoadedFromCacheRef.current = false;

    addNotification({
      id: Date.now(),
      type: 'info',
      message: 'Cache dibersihkan',
      timestamp: new Date(),
      autoClose: true,
      duration: 2000
    });

    setFinancialData(null);
    setIsRealTime(false);
    setRealtimeMode('none');
    setLoading(true);

    setTimeout(() => {
      loadRealTimeData(true);
    }, 100);
  }, [loadRealTimeData]);

  const handleReconnect = useCallback(() => {
    console.log('🔌 Manual reconnect requested');

    cleanupRealtimeListeners();
    clearPollingInterval();

    setConnectionStatus('connecting');
    setRealtimeMode('none');

    setTimeout(() => {
      if (user && financialData) {
        setupRealtimeListeners();
      } else {
        loadRealTimeData(true);
      }
    }, 500);
  }, [user, financialData, setupRealtimeListeners, loadRealTimeData]);

  const logout = () => {
    console.log('👋 Logging out');
    localStorage.clear();
    router.push('/');
  };

  const addNotification = useCallback((notification: any) => {
    console.log('📩 Adding notification:', notification.type);
    setNotifications(prev => {
      const exists = prev.some(n =>
        n.message === notification.message && n.type === notification.type
      );
      if (exists) return prev;
      return [notification, ...prev.slice(0, 19)];
    });
  }, []);

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ================================
  // 8. CONNECTION STATUS INDICATOR
  // ================================
  const ConnectionStatusIndicator = () => {
    if (connectionStatus === 'connected') {
      return (
        <div className="flex items-center bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
          <span className="text-sm font-medium">
            {realtimeMode === 'firestore' ? '🟢 Live Connected' : '🔄 Polling'}
          </span>
        </div>
      );
    }

    if (connectionStatus === 'connecting') {
      return (
        <div className="flex items-center bg-gradient-to-r from-amber-500 to-yellow-500 text-white px-3 py-1.5 rounded-full">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
          <span className="text-sm font-medium">🟡 Connecting...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center bg-gradient-to-r from-rose-500 to-pink-500 text-white px-3 py-1.5 rounded-full">
        <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
        <span className="text-sm font-medium">🔴 Disconnected</span>
      </div>
    );
  };

  // ================================
  // 9. LOADING & RENDER STATES
  // ================================
  if (loading && !financialData && !hasLoadedFromCacheRef.current && !error) {
    return <DashboardSkeleton />;
  }

  if (error && !financialData && !loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
          <div className="text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-rose-100 to-pink-100 rounded-full mx-auto flex items-center justify-center">
                <div className="text-4xl">⚠️</div>
              </div>
              <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-r from-amber-400 to-yellow-400 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-lg">!</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Gagal Memuat Data</h2>
            <p className="text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  loadRealTimeData(true, true);
                }}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl active:scale-95"
              >
                <span className="flex items-center justify-center">
                  <span className="mr-2">🔄</span>
                  Coba Lagi
                </span>
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-gradient-to-r from-gray-300 to-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:from-gray-400 hover:to-gray-300 transition-all duration-300 font-medium shadow hover:shadow-md"
              >
                <span className="flex items-center justify-center">
                  <span className="mr-2">←</span>
                  Kembali ke Login
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && user && !financialData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
        <nav className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-2xl">
          <div className="container mx-auto px-4 sm:px-6 py-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">HS</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Admin Keuangan</h1>
                  <p className="text-sm text-emerald-100">HS Gym Management System</p>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-6">
          <div className="text-center py-16">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full flex items-center justify-center animate-spin shadow-lg">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-t-4 border-white rounded-full animate-spin"></div>
              </div>
            </div>
            <p className="text-gray-600 mt-6 text-lg font-medium">Memuat dashboard...</p>
            <p className="text-gray-500 text-sm mt-2">Siapkan data keuangan Anda</p>
          </div>
        </main>
      </div>
    );
  }

  if (!user && !loading) {
    console.log('🚫 No user after loading, redirect handled by useEffect');
    return null;
  }

  // ================================
  // 10. TAB CONFIGURATION
  // ================================
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', color: 'from-emerald-500 to-teal-500' },
    { id: 'payments', label: 'Transaksi', icon: '💳', color: 'from-blue-500 to-cyan-500' },
    { id: 'expenses', label: 'Pengeluaran', icon: '💰', color: 'from-amber-500 to-yellow-500' },
    { id: 'reports', label: 'Laporan', icon: '📈', color: 'from-purple-500 to-pink-500' },
    { id: 'export', label: 'Export', icon: '📤', color: 'from-indigo-500 to-violet-500' },
  ];

  // ================================
  // 11. TAB CONTENT RENDERER
  // ================================
  const renderTabContent = () => {
    console.log(`🎨 Rendering tab: ${activeTab}`);

    if (activeTab === 'dashboard') {
      if (error && !financialData && !loading) {
        return (
          <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 rounded-2xl p-8 text-center shadow-lg">
            <div className="inline-block p-4 bg-gradient-to-r from-rose-100 to-pink-100 rounded-full mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="text-rose-600 text-xl font-bold mb-2">Gagal Memuat Data</div>
            <p className="text-rose-700 mb-6 bg-white/50 p-3 rounded-lg">{error}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={handleRefreshData}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Memuat...
                  </span>
                ) : 'Coba Lagi'}
              </button>
              <button
                onClick={handleReconnect}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center">
                  <span className="mr-2">🔌</span>
                  Reconnect
                </span>
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* Connection Status Bar */}
          <div className={`rounded-2xl p-6 border shadow-lg ${connectionStatus === 'connected'
            ? 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
            : connectionStatus === 'connecting'
              ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
              : 'bg-gradient-to-r from-rose-50 to-pink-50 border-rose-200'
            }`}>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className={`w-3 h-8 rounded-full mr-3 ${connectionStatus === 'connected'
                    ? 'bg-gradient-to-b from-emerald-400 to-teal-400'
                    : connectionStatus === 'connecting'
                      ? 'bg-gradient-to-b from-amber-400 to-yellow-400'
                      : 'bg-gradient-to-b from-rose-400 to-pink-400'
                    }`}></div>
                  <h2 className="text-2xl font-bold text-gray-800">Dashboard Keuangan</h2>
                </div>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 mt-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-white/70 px-3 py-1.5 rounded-lg">
                      <span className="text-gray-500 mr-2">🕒</span>
                      <span className="text-sm text-gray-700">
                        {lastUpdate ? `Update: ${lastUpdate}` : 'Menyiapkan...'}
                      </span>
                    </div>
                    {refreshCount > 0 && (
                      <div className="flex items-center bg-gradient-to-r from-blue-50 to-cyan-50 px-3 py-1.5 rounded-lg">
                        <span className="text-blue-500 mr-2">🔄</span>
                        <span className="text-sm text-blue-700">Refresh: {refreshCount}x</span>
                      </div>
                    )}
                  </div>
                  <ConnectionStatusIndicator />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {connectionStatus !== 'connected' && (
                  <button
                    onClick={handleReconnect}
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2.5 rounded-xl hover:from-blue-600 hover:to-cyan-600 flex items-center space-x-2 transition-all duration-300 font-medium shadow-md hover:shadow-lg"
                  >
                    <span>🔌</span>
                    <span>Reconnect</span>
                  </button>
                )}

                <button
                  onClick={handleRefreshData}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2.5 rounded-xl hover:from-emerald-600 hover:to-teal-600 flex items-center space-x-2 transition-all duration-300 font-medium shadow-md hover:shadow-lg disabled:opacity-50"
                  disabled={isRefreshing}
                >
                  <span className={isRefreshing ? 'animate-spin' : ''}>🔄</span>
                  <span>{isRefreshing ? 'Memuat...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {liveUpdates.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200/50">
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <span className="animate-pulse mr-2">🔴</span>
                  <span className="font-medium bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Live Updates</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {liveUpdates.slice(0, 3).map((update) => (
                    <div
                      key={update.id}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm ${update.type === 'expenses'
                        ? 'bg-gradient-to-r from-rose-100 to-pink-100 text-rose-800 border border-rose-200'
                        : update.type === 'non_member'
                          ? 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border border-amber-200'
                          : 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 border border-blue-200'
                        }`}
                    >
                      <span className="font-bold">
                        {update.type === 'transactions' ? '💰 Member' :
                          update.type === 'non_member' ? '🎫 Daily Pass' :
                            '💸 Expense'}
                      </span>
                      <span className="mx-2">•</span>
                      <span>{update.count} transaksi</span>
                      <span className="mx-2">•</span>
                      <span className="font-bold">
                        Rp{(update.amount || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {financialData ? (
            <>
              <FinancialStats
                data={financialData}
                lastUpdate={lastUpdate}
                isRealTime={isRealTime}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RevenueChart
                  data={financialData.chartData || []}
                  loading={loading && !financialData.chartData}
                  isRealTime={isRealTime}
                />
                <div className="space-y-6">
                  <RecentTransactions preview />
                  <ExportPanel preview />
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border border-gray-100">
              <div className="w-20 h-20 bg-gradient-to-r from-emerald-200 to-teal-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-gray-500 mb-4 text-lg">Mengambil data...</p>
              <button
                onClick={handleRefreshData}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 font-medium shadow-lg hover:shadow-xl disabled:opacity-50"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">⟳</span>
                    Memuat...
                  </span>
                ) : 'Refresh Data'}
              </button>
            </div>
          )}
        </div>
      );
    }

    switch (activeTab) {
      case 'payments':
        return (
          <RecentTransactions limit={50} />
        );

      case 'expenses':
        return (
          <ExpenseManager
            userId={user?.id}
            onAction={addNotification}
          />
        );

      case 'reports':
        return financialData ? (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Laporan Detail</h3>
                  <p className="text-gray-600">Analisis lengkap performa keuangan</p>
                </div>
                <div className="flex items-center space-x-3">
                  <ConnectionStatusIndicator />
                  <button
                    onClick={handleRefreshData}
                    className="bg-gradient-to-r from-gray-200 to-gray-100 hover:from-gray-300 hover:to-gray-200 text-gray-700 px-4 py-2 rounded-xl transition-all duration-300 font-medium shadow-sm"
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>
              <FinancialStats data={financialData} detailed />
            </div>

            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-3 h-8 bg-gradient-to-b from-purple-400 to-pink-400 rounded-full mr-3"></div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Grafik Pendapatan</h3>
              </div>
              <RevenueChart
                data={financialData.chartData || []}
                detailed
                isRealTime={isRealTime}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📈</span>
            </div>
            <p className="text-gray-500 mb-4">Data belum dimuat</p>
            <button
              onClick={handleRefreshData}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 font-medium shadow-lg"
            >
              📥 Muat Data
            </button>
          </div>
        );

      case 'export':
        return (
          <ExportPanel detailed />
        );

      default:
        return null;
    }
  };

  // ================================
  // 12. MAIN RENDER
  // ================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50">
      {/* Header */}
      <nav className="bg-gradient-to-r from-emerald-600 to-teal-600 shadow-2xl sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-white to-gray-100 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">HS</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Keuangan</h1>
                <p className="text-sm text-emerald-100">HS Gym Management System</p>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
              <NotificationCenter
                notifications={notifications}
                onRemove={removeNotification}
                onClearAll={clearAllNotifications}
              />

              <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.nama?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </div>
                <div className="text-right">
                  <div className="text-white font-bold">{user?.nama || user?.username || '...'}</div>
                  <div className="text-xs text-emerald-100 bg-white/10 px-2 py-0.5 rounded-full capitalize">
                    {user?.role || '...'}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition-all duration-300 font-medium shadow-lg hover:shadow-xl ml-2"
                >
                  <span className="flex items-center">
                    <span className="mr-2">🚪</span>
                    Logout
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 flex overflow-x-auto pb-1">
            <div className="flex space-x-2">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-5 py-3 rounded-xl transition-all duration-300 whitespace-nowrap flex-shrink-0 ${isActive
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-xl transform scale-105`
                      : 'bg-white/10 hover:bg-white/20 text-white/90 backdrop-blur-sm'
                      }`}
                  >
                    <span className="text-lg">{tab.icon}</span>
                    <span className="font-bold">{tab.label}</span>
                    {isActive && (
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="animate-fadeIn">
          {renderTabContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 mb-4">
        <div className="container mx-auto px-4">
          <div className="text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} HS Gym Management System • Dashboard Keuangan v1.0</p>
            <p className="mt-1">Terakhir diupdate: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      {isRefreshing && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-2xl flex items-center space-x-4 border border-gray-100">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-t-4 border-white rounded-full animate-spin"></div>
              </div>
            </div>
            <div>
              <span className="text-gray-700 font-medium">Memperbarui data...</span>
              <p className="text-gray-500 text-sm mt-1">Harap tunggu sebentar</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button for Quick Actions */}
      <div className="fixed bottom-6 right-6 flex flex-col space-y-3 z-40">
        <button
          onClick={handleRefreshData}
          className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-full shadow-2xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 hover:scale-110"
          title="Refresh Data"
        >
          <span className={`text-xl ${isRefreshing ? 'animate-spin' : ''}`}>🔄</span>
        </button>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-3 rounded-full shadow-2xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 hover:scale-110"
          title="Kembali ke Atas"
        >
          <span className="text-xl">⬆️</span>
        </button>
      </div>

      {/* Custom CSS untuk animasi */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #10b981, #0d9488);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #059669, #0f766e);
        }
      `}</style>
    </div>
  );
}