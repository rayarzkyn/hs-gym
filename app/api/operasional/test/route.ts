import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Operational API is working',
    timestamp: new Date().toISOString()
  });
}