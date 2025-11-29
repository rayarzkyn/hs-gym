import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test connection
    const testResult = await query('SELECT 1 as test_value');
    console.log('✅ Database connection test:', testResult);

    // Test members table
    const members = await query('SELECT COUNT(*) as count FROM members');
    console.log('✅ Members count:', members);

    // Test non_member_daily table  
    const nonMembers = await query('SELECT COUNT(*) as count FROM non_member_daily WHERE expired_at > NOW()');
    console.log('✅ Active non-members count:', nonMembers);

    // Test users table
    const users = await query('SELECT username, role FROM users');
    console.log('✅ Users:', users);

    return NextResponse.json({
      success: true,
      database: 'Connected',
      members: members[0],
      nonMembers: nonMembers[0],
      users: users
    });

  } catch (error: any) {
    console.error('❌ Database test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      database: 'Connection failed'
    }, { status: 500 });
  }
}