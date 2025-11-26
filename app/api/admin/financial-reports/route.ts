import { NextResponse } from 'next/server';

// Mock data - replace with actual database queries
const mockFinancialData = {
  monthly: {
    revenue: {
      total: 28500000,
      growth: 12.5,
      monthly: [
        { month: 'Jan', revenue: 22000000, target: 25000000 },
        { month: 'Feb', revenue: 24000000, target: 25000000 },
        { month: 'Mar', revenue: 26000000, target: 26000000 },
        { month: 'Apr', revenue: 28500000, target: 27000000 },
        { month: 'May', revenue: 27500000, target: 28000000 },
        { month: 'Jun', revenue: 30000000, target: 29000000 },
      ]
    },
    expenses: {
      total: 12500000,
      growth: -3.2,
      categories: [
        { name: 'Gaji Staff', amount: 7500000, percentage: 60 },
        { name: 'Operasional', amount: 3000000, percentage: 24 },
        { name: 'Pemeliharaan', amount: 1200000, percentage: 9.6 },
        { name: 'Lain-lain', amount: 800000, percentage: 6.4 },
      ]
    },
    profit: {
      total: 16000000,
      growth: 28.8,
      margin: 56.1
    },
    members: {
      total: 324,
      active: 287,
      newThisMonth: 42,
      growth: 8.7
    }
  },
  weekly: {
    revenue: {
      total: 6800000,
      growth: 5.2,
      weekly: [
        { week: 'Minggu 1', revenue: 1600000 },
        { week: 'Minggu 2', revenue: 1700000 },
        { week: 'Minggu 3', revenue: 1750000 },
        { week: 'Minggu 4', revenue: 1750000 },
      ]
    },
    expenses: {
      total: 2900000,
      growth: -1.5,
      categories: [
        { name: 'Gaji Staff', amount: 1800000 },
        { name: 'Operasional', amount: 700000 },
        { name: 'Pemeliharaan', amount: 300000 },
        { name: 'Lain-lain', amount: 100000 },
      ]
    },
    profit: {
      total: 3900000,
      growth: 12.8,
      margin: 57.4
    }
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'monthly';

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Validate period parameter
    if (period !== 'monthly' && period !== 'weekly') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid period parameter. Use "monthly" or "weekly"' 
        },
        { status: 400 }
      );
    }

    const data = mockFinancialData[period as keyof typeof mockFinancialData];

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Data not found for the specified period' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
      period: period,
      lastUpdated: new Date().toISOString()
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('Error in financial-reports API:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Handle POST requests for generating custom reports
    return NextResponse.json({
      success: true,
      message: 'Report generated successfully',
      data: body,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}