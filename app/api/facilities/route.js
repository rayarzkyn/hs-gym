// app/api/facilities/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') || 'member';
    
    console.log(`🔍 Fetching facilities for ${userType}...`);
    
    // Ambil data dari Firebase
    const facilitiesSnapshot = await getDocs(collection(db, 'facilities'));
    
    if (facilitiesSnapshot.empty) {
      return NextResponse.json({
        success: true,
        data: getFallbackFacilities(userType),
        timestamp: new Date().toISOString(),
        message: 'Using fallback data'
      });
    }

    const facilities = facilitiesSnapshot.docs.map((doc) => {
      const data = doc.data();
      const currentMembers = data.currentMembers || data.currentUsage || 0;
      const capacity = data.capacity || 25;
      const usagePercentage = Math.min(100, Math.round((currentMembers / capacity) * 100));
      
      // Format dasar yang sama untuk semua user
      const baseFacility = {
        id: doc.id,
        name: data.name || 'Unknown Facility',
        status: data.status || 'available',
        capacity: capacity,
        currentMembers: currentMembers,
        currentUsage: data.currentUsage || 0,
        equipment: Array.isArray(data.equipment) ? data.equipment : [],
        peakHours: Array.isArray(data.peakHours) ? data.peakHours : ['07:00-09:00', '17:00-19:00'],
        lastMaintenance: data.lastMaintenance || '2024-01-01',
        nextMaintenance: data.nextMaintenance || '2024-02-01',
        maintenanceHistory: data.maintenanceHistory || [],
        createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
        updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
        usagePercentage: usagePercentage
      };

      // Tambahkan informasi status berdasarkan user type
      if (userType === 'member') {
        const statusInfo = getFacilityStatusForMember(baseFacility);
        return {
          ...baseFacility,
          ...statusInfo
        };
      } else {
        // Untuk operasional, tampilkan semua data tanpa status tambahan
        return baseFacility;
      }
    });

    console.log(`✅ Found ${facilities.length} facilities for ${userType}`);
    
    return NextResponse.json({
      success: true,
      data: facilities,
      timestamp: new Date().toISOString(),
      total: facilities.length,
      userType: userType
    });

  } catch (error) {
    console.error('❌ Error fetching facilities:', error);
    
    // Fallback data jika error
    return NextResponse.json({
      success: true,
      data: getFallbackFacilities('member'),
      timestamp: new Date().toISOString(),
      error: error.message || 'Unknown error',
      message: 'Using fallback data due to error'
    });
  }
}

// Helper function untuk menentukan status fasilitas (untuk member)
function getFacilityStatusForMember(facility) {
  const usagePercentage = facility.usagePercentage;
  
  let statusText = 'Sejuk';
  let statusColor = 'green';
  let isAvailable = true;
  
  if (facility.status === 'maintenance') {
    statusText = 'Maintenance';
    statusColor = 'gray';
    isAvailable = false;
  } else if (usagePercentage >= 90) {
    statusText = 'Penuh';
    statusColor = 'red';
    isAvailable = false;
  } else if (usagePercentage >= 70) {
    statusText = 'Ramai';
    statusColor = 'yellow';
  } else if (usagePercentage >= 40) {
    statusText = 'Sedang';
    statusColor = 'blue';
  }
  
  return {
    statusText,
    statusColor,
    isAvailable,
    displayStatus: `${facility.currentMembers}/${facility.capacity} orang • ${statusText}`
  };
}

// Fallback data
function getFallbackFacilities(userType) {
  const baseFacilities = [
    {
      id: 'facility_001',
      name: 'Area Cardio',
      status: 'available',
      capacity: 25,
      currentMembers: 8,
      currentUsage: 8,
      equipment: [
        { name: 'Treadmill', count: 8, status: 'good' },
        { name: 'Stationary Bike', count: 6, status: 'good' },
        { name: 'Elliptical Trainer', count: 4, status: 'good' }
      ],
      peakHours: ['07:00-08:00', '18:00-19:00'],
      lastMaintenance: '2024-01-10',
      nextMaintenance: '2024-02-10',
      usagePercentage: 32
    },
    {
      id: 'facility_002',
      name: 'Area Weight Training',
      status: 'available',
      capacity: 35,
      currentMembers: 15,
      currentUsage: 15,
      equipment: [
        { name: 'Dumbbells', count: 15, status: 'good' },
        { name: 'Barbells', count: 8, status: 'good' },
        { name: 'Weight Plates', count: 40, status: 'good' }
      ],
      peakHours: ['17:00-18:00', '19:00-20:00'],
      lastMaintenance: '2024-01-15',
      nextMaintenance: '2024-02-15',
      usagePercentage: 43
    },
    {
      id: 'facility_003',
      name: 'Studio Yoga & Kelas',
      status: 'available',
      capacity: 30,
      currentMembers: 12,
      currentUsage: 12,
      equipment: [
        { name: 'Yoga Mat', count: 25, status: 'good' },
        { name: 'Resistance Bands', count: 15, status: 'good' },
        { name: 'Exercise Ball', count: 10, status: 'good' }
      ],
      peakHours: ['08:00-09:00', '17:00-18:00'],
      lastMaintenance: '2024-01-05',
      nextMaintenance: '2024-02-05',
      usagePercentage: 40
    }
  ];

  if (userType === 'member') {
    return baseFacilities.map(facility => ({
      ...facility,
      ...getFacilityStatusForMember(facility)
    }));
  }

  return baseFacilities;
}