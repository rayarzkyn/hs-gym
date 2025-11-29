import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';

export async function POST(request) {
  try {
    const { username } = await request.json();
    console.log('🔍 API: Getting role for user:', username);

    // Log environment variables (without sensitive data)
    console.log('📊 API: DB Config:', {
      host: process.env.DB_HOST ? '✅ Set' : '❌ Missing',
      user: process.env.DB_USER ? '✅ Set' : '❌ Missing',
      database: process.env.DB_NAME ? '✅ Set' : '❌ Missing'
    });

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hs_gym_rancakihiyang',
    });

    console.log('✅ API: Database connected successfully');

    const [rows] = await connection.execute(
      'SELECT role FROM users WHERE username = ?',
      [username]
    );

    await connection.end();

    console.log('📋 API: Query result -', rows.length, 'rows found');

    if (rows.length > 0) {
      console.log('✅ API: Role found:', rows[0].role);
      return NextResponse.json({ 
        success: true, 
        role: rows[0].role 
      });
    } else {
      console.log('❌ API: User not found in database');
      return NextResponse.json({ 
        success: false, 
        error: 'User not found in database' 
      });
    }
  } catch (error) {
    console.error('❌ API Error:', error.message);
    return NextResponse.json({ 
      success: false, 
      error: 'Database error: ' + error.message 
    });
  }
}