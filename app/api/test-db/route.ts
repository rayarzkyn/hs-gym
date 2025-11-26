import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export async function GET() {
  try {
    // Cek struktur tabel
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'hs_gym_rancakihiyang'
    `);

    // Cek struktur setiap tabel
    const tableStructures: any = {};
    
    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      const structure = await query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'hs_gym_rancakihiyang' 
        AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]);
      
      tableStructures[tableName] = structure;
    }

    // Cek data sample dari setiap tabel (dengan syntax yang benar)
    const sampleData: any = {};
    
    for (const table of tables as any[]) {
      const tableName = table.TABLE_NAME;
      try {
        const data = await query(`SELECT * FROM ${tableName} LIMIT 3`, []);
        sampleData[tableName] = data;
      } catch (error) {
        sampleData[tableName] = { error: (error as Error).message };
      }
    }

    return NextResponse.json({
      success: true,
      tables: (tables as any[]).map(t => t.TABLE_NAME),
      tableStructures,
      sampleData
    });

  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      tables: []
    }, { status: 500 });
  }
}