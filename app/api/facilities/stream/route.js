// app/api/facilities/stream/route.js
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-client';
import { collection, onSnapshot } from 'firebase/firestore';
import { addSSEClient, removeSSEClient } from '@/lib/sse-broadcast';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userType = searchParams.get('userType') || 'operasional';
    
    console.log(`🔗 Starting SSE connection for: ${userType}`);
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        console.log(`✅ SSE client connected: ${userType}`);
        
        // ✅ PERBAIKAN: Tambahkan controller ke clients set
        addSSEClient(controller);
        
        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'connected',
            message: 'SSE Connected',
            userType,
            timestamp: new Date().toISOString()
          })}\n\n`)
        );

        // Track if stream is active
        let isActive = true;

        // Setup Firebase real-time listener
        const unsubscribe = onSnapshot(
          collection(db, 'facilities'),
          (snapshot) => {
            if (!isActive) return;
            
            try {
              const facilities = snapshot.docs.map((doc) => {
                const data = doc.data();
                const currentMembers = data.currentMembers || 0;
                const capacity = data.capacity || 25;
                const usagePercentage = capacity > 0 
                  ? Math.min(100, Math.round((currentMembers / capacity) * 100))
                  : 0;
                
                return {
                  id: doc.id,
                  name: data.name || 'Unknown Facility',
                  status: data.status || 'available',
                  capacity: capacity,
                  currentMembers: currentMembers,
                  currentUsage: data.currentUsage || 0,
                  equipment: Array.isArray(data.equipment) ? data.equipment : [],
                  peakHours: Array.isArray(data.peakHours) 
                    ? data.peakHours 
                    : ['07:00-09:00', '17:00-19:00'],
                  lastMaintenance: data.lastMaintenance || '',
                  nextMaintenance: data.nextMaintenance || '',
                  activeMembers: data.activeMembers || [],
                  updatedAt: data.updatedAt || new Date().toISOString(),
                  usagePercentage: usagePercentage,
                  isAvailable: data.status === 'available' && usagePercentage < 90
                };
              });

              // Send data to client
              if (isActive) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({
                    type: 'update',
                    data: facilities,
                    timestamp: new Date().toISOString(),
                    count: facilities.length
                  })}\n\n`)
                );
                
                console.log(`📦 Sent ${facilities.length} facilities via SSE`);
              }
            } catch (error) {
              console.error('Error processing facilities:', error);
            }
          },
          (error) => {
            console.error('Firebase listener error:', error);
            if (isActive) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({
                  type: 'error',
                  error: 'Failed to fetch facilities',
                  timestamp: new Date().toISOString()
                })}\n\n`)
              );
            }
          }
        );

        // Keep-alive ping every 15 seconds
        const keepAliveInterval = setInterval(() => {
          if (isActive) {
            controller.enqueue(encoder.encode(': ping\n\n'));
          }
        }, 15000);

        // Handle client disconnect
        request.signal.addEventListener('abort', () => {
          console.log('🔌 Client disconnected');
          isActive = false;
          clearInterval(keepAliveInterval);
          unsubscribe();
          
          // ✅ PERBAIKAN: Hapus controller dari clients set
          removeSSEClient(controller);
          
          try {
            controller.close();
          } catch (error) {
            // Ignore close errors
          }
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error) {
    console.error('SSE Setup Error:', error);
    return NextResponse.json({ 
      error: 'Failed to establish SSE connection',
      details: error.message 
    }, { status: 500 });
  }
}