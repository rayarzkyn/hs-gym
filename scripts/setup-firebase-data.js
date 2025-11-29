const { db } = require('../lib/firebase-auth.js');
const { doc, setDoc } = require('firebase/firestore');

// Data users dengan role
const users = [
  { 
    username: 'admin', 
    password: 'password', 
    role: 'admin_operasional',
    fullName: 'Administrator Operasional',
    email: 'admin@gym.com',
    phone: '081234567890',
    createdAt: new Date()
  },
  { 
    username: 'manager', 
    password: 'password', 
    role: 'manager',
    fullName: 'Manager Gym',
    email: 'manager@gym.com', 
    phone: '081234567891',
    createdAt: new Date()
  },
  { 
    username: 'keuangan', 
    password: 'password', 
    role: 'admin_keuangan',
    fullName: 'Admin Keuangan',
    email: 'keuangan@gym.com',
    phone: '081234567892',
    createdAt: new Date()
  },
  { 
    username: 'operasional', 
    password: 'password', 
    role: 'admin_operasional',
    fullName: 'Admin Operasional',
    email: 'operasional@gym.com',
    phone: '081234567893',
    createdAt: new Date()
  },
  { 
    username: 'Member_001', 
    password: 'qwerty123', 
    role: 'member',
    fullName: 'John Doe',
    email: 'member001@gym.com',
    phone: '081234567894',
    membership_plan: 'Triwulan',
    membership_price: 300000,
    createdAt: new Date()
  },
  { 
    username: 'Member_002', 
    password: 'qwerty123', 
    role: 'member',
    fullName: 'Jane Smith',
    email: 'member002@gym.com',
    phone: '081234567895',
    membership_plan: 'Bulanan',
    membership_price: 120000,
    createdAt: new Date()
  },
  { 
    username: 'Member_003', 
    password: 'qwerty123', 
    role: 'member',
    fullName: 'Bob Wilson',
    email: 'member003@gym.com',
    phone: '081234567896',
    membership_plan: 'Tahunan',
    membership_price: 1000000,
    createdAt: new Date()
  }
];

// Sample members data dengan struktur baru
const members = [
  {
    id: 'Member_001',
    nomor_member: 'M001',
    nama: 'John Doe',
    email: 'member001@gym.com',
    telepon: '081234567894',
    alamat: 'Jl. Contoh No. 123, Jakarta Selatan',
    tanggal_daftar: new Date('2024-01-15').toISOString(),
    masa_aktif: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 hari dari sekarang
    status: 'active',
    membership_type: 'premium',
    membership_plan: 'Triwulan',
    membership_price: 300000,
    totalVisits: 12,
    lastCheckin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 hari yang lalu
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date()
  },
  {
    id: 'Member_002', 
    nomor_member: 'M002',
    nama: 'Jane Smith',
    email: 'member002@gym.com',
    telepon: '081234567895',
    alamat: 'Jl. Sample No. 456, Jakarta Pusat',
    tanggal_daftar: new Date('2024-02-20').toISOString(),
    masa_aktif: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 hari dari sekarang
    status: 'active',
    membership_type: 'regular',
    membership_plan: 'Bulanan',
    membership_price: 120000,
    totalVisits: 8,
    lastCheckin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 hari yang lalu
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date()
  },
  {
    id: 'Member_003',
    nomor_member: 'M003',
    nama: 'Bob Wilson',
    email: 'member003@gym.com',
    telepon: '081234567896',
    alamat: 'Jl. Test No. 789, Jakarta Barat',
    tanggal_daftar: new Date('2024-03-10').toISOString(),
    masa_aktif: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000).toISOString(), // 200 hari dari sekarang
    status: 'active',
    membership_type: 'premium',
    membership_plan: 'Tahunan',
    membership_price: 1000000,
    totalVisits: 25,
    lastCheckin: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(), // 12 jam yang lalu
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date()
  }
];

// Sample transactions dengan struktur baru
const transactions = [
  {
    id: 'trans_001',
    memberId: 'Member_001',
    memberName: 'John Doe',
    tanggal: new Date('2024-11-01').toISOString(),
    jenis: 'Membership Payment - Triwulan',
    paket: 'Triwulan',
    jumlah: 300000,
    status: 'completed',
    metode_pembayaran: 'QRIS',
    createdAt: new Date('2024-11-01')
  },
  {
    id: 'trans_002',
    memberId: 'Member_002',
    memberName: 'Jane Smith', 
    tanggal: new Date('2024-11-05').toISOString(),
    jenis: 'Membership Payment - Bulanan',
    paket: 'Bulanan',
    jumlah: 120000,
    status: 'completed',
    metode_pembayaran: 'Transfer Bank',
    createdAt: new Date('2024-11-05')
  },
  {
    id: 'trans_003',
    memberId: 'Member_003',
    memberName: 'Bob Wilson',
    tanggal: new Date('2024-10-15').toISOString(),
    jenis: 'Membership Payment - Tahunan',
    paket: 'Tahunan',
    jumlah: 1000000,
    status: 'completed',
    metode_pembayaran: 'Credit Card',
    createdAt: new Date('2024-10-15')
  }
];

// Sample visits data
const visits = [
  // Visits untuk Member_001 (John Doe)
  {
    id: 'visit_001',
    memberId: 'Member_001',
    memberName: 'John Doe',
    checkinTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 hari lalu
    location: 'Main Gym Area',
    status: 'completed',
    duration: '2 jam',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'visit_002',
    memberId: 'Member_001',
    memberName: 'John Doe',
    checkinTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 hari lalu
    location: 'Cardio Area',
    status: 'completed',
    duration: '1.5 jam',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'visit_003',
    memberId: 'Member_001',
    memberName: 'John Doe',
    checkinTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 hari lalu
    location: 'Weight Training Area',
    status: 'completed',
    duration: '2.5 jam',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  },
  
  // Visits untuk Member_002 (Jane Smith)
  {
    id: 'visit_004',
    memberId: 'Member_002',
    memberName: 'Jane Smith',
    checkinTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 hari lalu
    location: 'Yoga Studio',
    status: 'completed',
    duration: '1 jam',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'visit_005',
    memberId: 'Member_002',
    memberName: 'Jane Smith',
    checkinTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 hari lalu
    location: 'Main Gym Area',
    status: 'completed',
    duration: '1.5 jam',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  },
  
  // Visits untuk Member_003 (Bob Wilson)
  {
    id: 'visit_006',
    memberId: 'Member_003',
    memberName: 'Bob Wilson',
    checkinTime: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(), // 12 jam lalu
    location: 'Weight Training Area',
    status: 'completed',
    duration: '2 jam',
    createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'visit_007',
    memberId: 'Member_003',
    memberName: 'Bob Wilson',
    checkinTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 hari lalu
    location: 'Cardio Area',
    status: 'completed',
    duration: '1 jam',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  },
  {
    id: 'visit_008',
    memberId: 'Member_003',
    memberName: 'Bob Wilson',
    checkinTime: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 hari lalu
    location: 'Main Gym Area',
    status: 'completed',
    duration: '3 jam',
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
  }
];

// Sample expenses
const expenses = [
  {
    id: 'exp_001',
    description: 'Pembayaran listrik bulan November',
    amount: 2500000,
    category: 'utilities',
    date: new Date(),
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Pembayaran via bank transfer',
    createdAt: new Date()
  },
  {
    id: 'exp_002',
    description: 'Gaji trainer bulan November',
    amount: 5000000,
    category: 'salary',
    date: new Date(),
    paymentMethod: 'cash',
    status: 'completed',
    notes: 'Gaji 2 trainer',
    createdAt: new Date()
  },
  {
    id: 'exp_003',
    description: 'Pembelian suplemen dan minuman',
    amount: 1500000,
    category: 'inventory',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    paymentMethod: 'transfer',
    status: 'completed',
    notes: 'Stock untuk bulan November',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  }
];

// Sample pending transactions
const pendingTransactions = [
  {
    id: 'pending_001',
    memberId: 'Member_004',
    memberName: 'Alice Johnson',
    tanggal: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    jenis: 'Membership Payment - Bulanan',
    paket: 'Bulanan',
    jumlah: 120000,
    status: 'pending',
    metode_pembayaran: 'Transfer Bank',
    description: 'Pembayaran membership regular - menunggu verifikasi',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  }
];

const nonMembers = [
  {
    daily_code: "NM281125001",
    nama: "Budi Santoso",
    email: "budi@gmail.com",
    telepon: "081234567801",
    harga: 25000,
    payment_method: "qris",
    status: "active",
    tanggal_daftar: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 jam yang lalu
    expired_at: new Date(Date.now() + 22 * 60 * 60 * 1000), // 22 jam lagi
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    daily_code: "NM281125002", 
    nama: "Sari Dewi",
    email: "sari@gmail.com",
    telepon: "081234567802",
    harga: 25000,
    payment_method: "cash",
    status: "active",
    tanggal_daftar: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 jam yang lalu
    expired_at: new Date(Date.now() + 19 * 60 * 60 * 1000), // 19 jam lagi
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    daily_code: "NM281125003",
    nama: "Ahmad Fauzi",
    email: "ahmad@gmail.com",
    telepon: "081234567803",
    harga: 25000,
    payment_method: "transfer",
    status: "expired", // sudah expired
    tanggal_daftar: new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 jam yang lalu
    expired_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 jam yang lalu expired
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
  }
];

// Sample non_member_transactions
const nonMemberTransactions = [
  {
    transaction_id: "TXN_NM_001",
    daily_code: "NM281125001",
    nama: "Budi Santoso",
    jumlah: 25000,
    metode_pembayaran: "qris",
    status: "completed",
    tanggal: new Date(Date.now() - 2 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    transaction_id: "TXN_NM_002",
    daily_code: "NM281125002", 
    nama: "Sari Dewi",
    jumlah: 25000,
    metode_pembayaran: "cash",
    status: "completed",
    tanggal: new Date(Date.now() - 5 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000)
  },
  {
    transaction_id: "TXN_NM_003",
    daily_code: "NM281125003",
    nama: "Ahmad Fauzi",
    jumlah: 25000,
    metode_pembayaran: "transfer",
    status: "completed", 
    tanggal: new Date(Date.now() - 26 * 60 * 60 * 1000),
    created_at: new Date(Date.now() - 26 * 60 * 60 * 1000)
  }
];

// Sample non_member_visits
const nonMemberVisits = [
  {
    visit_id: "VISIT_NM_001",
    daily_code: "NM281125001",
    nama: "Budi Santoso",
    checkin_time: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 jam yang lalu
    checkout_time: null, // masih di gym
    location: "Main Gym Area",
    status: "active",
    duration: null,
    created_at: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
  },
  {
    visit_id: "VISIT_NM_002",
    daily_code: "NM281125002",
    nama: "Sari Dewi", 
    checkin_time: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 jam yang lalu
    checkout_time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 jam yang lalu checkout
    location: "Cardio Area",
    status: "completed",
    duration: "2 hours",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000)
  },
  {
    visit_id: "VISIT_NM_003",
    daily_code: "NM281125003", 
    nama: "Ahmad Fauzi",
    checkin_time: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 jam yang lalu
    checkout_time: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 jam yang lalu
    location: "Weight Training",
    status: "completed",
    duration: "2 hours",
    created_at: new Date(Date.now() - 25 * 60 * 60 * 1000)
  }
];

// Sample non_member_daily_stats
const nonMemberDailyStats = [
  {
    date: "2025-11-28",
    total_visitors: 3,
    total_revenue: 75000,
    transactions: [
      { daily_code: "NM281125001", amount: 25000, time: new Date(Date.now() - 2 * 60 * 60 * 1000) },
      { daily_code: "NM281125002", amount: 25000, time: new Date(Date.now() - 5 * 60 * 60 * 1000) },
      { daily_code: "NM281125003", amount: 25000, time: new Date(Date.now() - 26 * 60 * 60 * 1000) }
    ],
    visits: [
      { daily_code: "NM281125001", checkin_time: new Date(Date.now() - 1.5 * 60 * 60 * 1000) },
      { daily_code: "NM281125002", checkin_time: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      { daily_code: "NM281125003", checkin_time: new Date(Date.now() - 25 * 60 * 60 * 1000) }
    ],
    updated_at: new Date()
  },
  {
    date: "2025-11-27", 
    total_visitors: 2,
    total_revenue: 50000,
    transactions: [
      { daily_code: "NM271125001", amount: 25000, time: new Date(Date.now() - 30 * 60 * 60 * 1000) },
      { daily_code: "NM271125002", amount: 25000, time: new Date(Date.now() - 28 * 60 * 60 * 1000) }
    ],
    visits: [
      { daily_code: "NM271125001", checkin_time: new Date(Date.now() - 29 * 60 * 60 * 1000) },
      { daily_code: "NM271125002", checkin_time: new Date(Date.now() - 27 * 60 * 60 * 1000) }
    ],
    updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000)
  }
];

const facilities = [
  {
    id: 'facility_001',
    name: 'Area Cardio',
    status: 'available',
    capacity: 25,
    currentUsage: 8,
    lastMaintenance: '2024-01-10',
    nextMaintenance: '2024-02-10',
    equipment: [
      { name: 'Treadmill', status: 'good', count: 8 },
      { name: 'Stationary Bike', status: 'good', count: 6 },
      { name: 'Elliptical Trainer', status: 'good', count: 4 }
    ],
    currentMembers: 8,
    peakHours: ['18:00-19:00', '07:00-08:00'],
    maintenanceHistory: [
      { date: '2024-01-10', type: 'routine', description: 'Pembersihan dan pengecekan rutin' },
      { date: '2023-12-15', type: 'repair', description: 'Perbaikan treadmill unit 3' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'facility_002',
    name: 'Area Weight Training',
    status: 'available',
    capacity: 35,
    currentUsage: 15,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-02-15',
    equipment: [
      { name: 'Dumbbells', status: 'good', count: 15 },
      { name: 'Barbells', status: 'good', count: 8 },
      { name: 'Weight Plates', status: 'good', count: 40 },
      { name: 'Bench Press', status: 'needs_maintenance', count: 4 }
    ],
    currentMembers: 15,
    peakHours: ['19:00-20:00', '17:00-18:00'],
    maintenanceHistory: [
      { date: '2024-01-15', type: 'routine', description: 'Pengecekan semua equipment' },
      { date: '2023-12-20', type: 'replacement', description: 'Penggantian dumbbell rubber' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'facility_003',
    name: 'Studio Yoga & Kelas',
    status: 'available',
    capacity: 20,
    currentUsage: 12,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-02-05',
    equipment: [
      { name: 'Yoga Mat', status: 'good', count: 25 },
      { name: 'Resistance Bands', status: 'good', count: 15 },
      { name: 'Exercise Ball', status: 'good', count: 10 }
    ],
    currentMembers: 12,
    peakHours: ['08:00-09:00', '17:00-18:00'],
    maintenanceHistory: [
      { date: '2024-01-05', type: 'cleaning', description: 'Deep cleaning studio' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'facility_004',
    name: 'Kolam Renang',
    status: 'maintenance',
    capacity: 15,
    currentUsage: 0,
    lastMaintenance: '2024-01-25',
    nextMaintenance: '2024-01-30',
    equipment: [
      { name: 'Pool Equipment', status: 'maintenance', count: 1 }
    ],
    currentMembers: 0,
    peakHours: ['10:00-11:00', '16:00-17:00'],
    maintenanceHistory: [
      { date: '2024-01-25', type: 'chemical', description: 'Penggantian air dan chemical treatment' }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Sample attendance records untuk admin operasional
const attendanceRecords = [
  // Hari ini
  {
    id: 'att_today_001',
    userId: 'Member_001',
    userName: 'John Doe',
    type: 'member',
    checkInTime: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 jam lalu
    checkOutTime: null, // Masih di gym
    date: new Date().toISOString().split('T')[0],
    facility: 'Area Cardio',
    duration: null,
    status: 'checked_in',
    photo: null,
    notes: '',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: 'att_today_002',
    userId: 'Member_003',
    userName: 'Bob Wilson',
    type: 'member',
    checkInTime: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 jam lalu
    checkOutTime: null,
    date: new Date().toISOString().split('T')[0],
    facility: 'Area Weight Training',
    duration: null,
    status: 'checked_in',
    photo: null,
    notes: '',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
  },
  {
    id: 'att_today_003',
    userId: 'non_member_001',
    userName: 'Budi Santoso',
    type: 'non_member',
    checkInTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 1.5 jam lalu
    checkOutTime: null,
    date: new Date().toISOString().split('T')[0],
    facility: 'Studio Yoga & Kelas',
    duration: null,
    status: 'checked_in',
    photo: null,
    notes: 'Daily pass - NM281125001',
    createdAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000)
  },
  // Kemarin
  {
    id: 'att_yesterday_001',
    userId: 'Member_001',
    userName: 'John Doe',
    type: 'member',
    checkInTime: new Date(Date.now() - 26 * 60 * 60 * 1000),
    checkOutTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    facility: 'Area Weight Training',
    duration: 120, // 2 jam
    status: 'checked_out',
    photo: null,
    notes: '',
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: 'att_yesterday_002',
    userId: 'Member_002',
    userName: 'Jane Smith',
    type: 'member',
    checkInTime: new Date(Date.now() - 27 * 60 * 60 * 1000),
    checkOutTime: new Date(Date.now() - 25 * 60 * 60 * 1000),
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    facility: 'Studio Yoga & Kelas',
    duration: 120,
    status: 'checked_out',
    photo: null,
    notes: 'Kelas yoga pagi',
    createdAt: new Date(Date.now() - 27 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000)
  }
];

// Sample operational reports
const operationalReports = [
  {
    id: 'report_001',
    title: 'Laporan Harian Operasional',
    type: 'daily',
    period: new Date().toISOString().split('T')[0],
    data: {
      totalVisitors: 45,
      memberCheckins: 32,
      nonMemberCheckins: 13,
      peakHour: '18:00-19:00',
      facilityUsage: 68,
      revenue: 1565000,
      issues: [
        { type: 'equipment', description: 'Bench Press unit 2 perlu perbaikan', priority: 'medium' },
        { type: 'facility', description: 'AC di Area Cardio kurang dingin', priority: 'low' }
      ]
    },
    generatedBy: 'admin',
    createdAt: new Date(),
    status: 'completed'
  },
  {
    id: 'report_002',
    title: 'Laporan Bulanan Fasilitas',
    type: 'monthly',
    period: '2024-01',
    data: {
      facilityUsage: {
        'Area Cardio': 72,
        'Area Weight Training': 85,
        'Studio Yoga & Kelas': 60,
        'Kolam Renang': 45
      },
      maintenance: {
        completed: 8,
        pending: 2,
        scheduled: 4
      },
      equipmentStatus: {
        good: 45,
        needs_maintenance: 3,
        broken: 1
      }
    },
    generatedBy: 'admin',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    status: 'completed'
  }
];

async function setupFirebaseData() {
  console.log('🚀 Setting up Firebase data dengan struktur baru...');
  
  try {
    // Setup users
    console.log('👥 Creating users...');
    for (const user of users) {
      await setDoc(doc(db, 'users', user.username), user);
      console.log(`✅ User ${user.username} created`);
    }
    
    // Setup members dengan struktur baru
    console.log('💪 Creating members...');
    for (const member of members) {
      await setDoc(doc(db, 'members', member.id), member);
      console.log(`✅ Member ${member.id} (${member.nama}) created`);
    }
    
    // Setup transactions dengan struktur baru
    console.log('💰 Creating transactions...');
    for (const transaction of transactions) {
      await setDoc(doc(db, 'transactions', transaction.id), transaction);
      console.log(`✅ Transaction ${transaction.id} created for ${transaction.memberName}`);
    }
    
    // Setup visits
    console.log('🏃 Creating visits data...');
    for (const visit of visits) {
      await setDoc(doc(db, 'visits', visit.id), visit);
      console.log(`✅ Visit ${visit.id} created for ${visit.memberName}`);
    }
    
    // Setup expenses
    console.log('💸 Creating expenses...');
    for (const expense of expenses) {
      await setDoc(doc(db, 'expenses', expense.id), expense);
      console.log(`✅ Expense ${expense.id} created`);
    }
    
    // Setup pending transactions
    console.log('⏳ Creating pending transactions...');
    for (const transaction of pendingTransactions) {
      await setDoc(doc(db, 'transactions', transaction.id), transaction);
      console.log(`✅ Pending transaction ${transaction.id} created`);
    }
    
    // ==================== SETUP NON-MEMBER DAILY ====================
    console.log('🎫 Creating non-member daily data...');
    
    // Setup non_members
    console.log('   👤 Creating non-members...');
    for (const nonMember of nonMembers) {
      await setDoc(doc(db, 'non_members', nonMember.daily_code), nonMember);
      console.log(`   ✅ Non-member ${nonMember.daily_code} (${nonMember.nama}) created`);
    }
    
    // Setup non_member_transactions
    console.log('   💰 Creating non-member transactions...');
    for (const transaction of nonMemberTransactions) {
      await setDoc(doc(db, 'non_member_transactions', transaction.transaction_id), transaction);
      console.log(`   ✅ Non-member transaction ${transaction.transaction_id} created`);
    }
    
    // Setup non_member_visits
    console.log('   🏃 Creating non-member visits...');
    for (const visit of nonMemberVisits) {
      await setDoc(doc(db, 'non_member_visits', visit.visit_id), visit);
      console.log(`   ✅ Non-member visit ${visit.visit_id} created`);
    }
    
    // Setup non_member_daily_stats
    console.log('   📊 Creating non-member daily stats...');
    for (const stat of nonMemberDailyStats) {
      await setDoc(doc(db, 'non_member_daily_stats', stat.date), stat);
      console.log(`   ✅ Non-member stats for ${stat.date} created`);
    }
    
    // ==================== SETUP ADMIN OPERASIONAL DATA ====================
    console.log('🏢 Creating operational facilities data...');
    for (const facility of facilities) {
      await setDoc(doc(db, 'facilities', facility.id), facility);
      console.log(`✅ Facility ${facility.name} created`);
    }
    
    console.log('📝 Creating attendance records...');
    for (const attendance of attendanceRecords) {
      await setDoc(doc(db, 'attendance', attendance.id), attendance);
      console.log(`✅ Attendance record for ${attendance.userName} created`);
    }
    
    console.log('📊 Creating operational reports...');
    for (const report of operationalReports) {
      await setDoc(doc(db, 'operational_reports', report.id), report);
      console.log(`✅ Report ${report.title} created`);
    }
    
    console.log('🎉 Firebase data setup completed!');
    console.log('📊 Summary:');
    console.log(`   - ${users.length} users created`);
    console.log(`   - ${members.length} members created`); 
    console.log(`   - ${transactions.length} transactions created`);
    console.log(`   - ${visits.length} visits created`);
    console.log(`   - ${expenses.length} expenses created`);
    console.log(`   - ${pendingTransactions.length} pending transactions created`);
    console.log(`   - ${nonMembers.length} non-members created`);
    console.log(`   - ${nonMemberTransactions.length} non-member transactions created`);
    console.log(`   - ${nonMemberVisits.length} non-member visits created`);
    console.log(`   - ${nonMemberDailyStats.length} non-member daily stats created`);
    console.log(`   - ${facilities.length} facilities created`);
    console.log(`   - ${attendanceRecords.length} attendance records created`);
    console.log(`   - ${operationalReports.length} operational reports created`);
    
    console.log('\n🔑 Login Credentials:');
    console.log('   Member_001 / qwerty123 - Paket Triwulan');
    console.log('   Member_002 / qwerty123 - Paket Bulanan'); 
    console.log('   Member_003 / qwerty123 - Paket Tahunan');
    console.log('   admin / password - Admin Operasional');
    console.log('   manager / password - Manager');
    console.log('   keuangan / password - Admin Keuangan');
    console.log('   operasional / password - Admin Operasional');
    
    console.log('\n🎫 Non-Member Daily Codes:');
    console.log('   NM281125001 - Budi Santoso (Active - expires in 22 hours)');
    console.log('   NM281125002 - Sari Dewi (Active - expires in 19 hours)');
    console.log('   NM281125003 - Ahmad Fauzi (Expired - for testing)');
    
    console.log('\n📱 Untuk testing non-member:');
    console.log('   1. Gunakan kode di atas untuk login di /non-member-login');
    console.log('   2. NM281125001 masih aktif dan bisa digunakan');
    console.log('   3. NM281125003 sudah expired untuk testing error handling');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    console.log('💡 Tips: Pastikan:');
    console.log('   1. File .env sudah dibuat dengan konfigurasi Firebase yang benar');
    console.log('   2. Firebase project sudah mengaktifkan Firestore Database');
    console.log('   3. API Key Firebase valid dan tidak dibatasi domain');
    console.log('   4. Firestore Database sudah dibuat di Firebase Console');
  }
}

// Run the setup
setupFirebaseData();