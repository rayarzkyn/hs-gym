import { NextResponse } from 'next/server';

export async function GET() {
  const startTime = Date.now();
  console.log('💸 Today expenses summary API');
  
  const today = new Date().toISOString().split('T')[0];
  
  // Mock data for instant response
  const mockSummary = {
    total: 1250000,
    count: 8,
    date: today,
    average: 156250,
    byCategory: {
      'Operasional': 450000,
      'Peralatan': 300000,
      'Gaji': 500000
    },
    largestExpense: 250000
  };
  
  const responseTime = Date.now() - startTime;
  
  return NextResponse.json({
    success: true,
    data: mockSummary,
    responseTime: `${responseTime}ms`
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
    }
  });
}