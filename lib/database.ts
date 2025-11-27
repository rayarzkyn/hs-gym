import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
};

let pool: mysql.Pool | null = null;

function createPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

export async function query(sql: string, params: any[] = []): Promise<any[]> {
  // Skip database operations during build
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('Skipping database query during build:', sql);
    return [];
  }

  const connectionPool = createPool();
  let connection;
  
  try {
    connection = await connectionPool.getConnection();
    const [results] = await connection.execute(sql, params);
    return results as any[];
  } catch (error: any) {
    console.error('Database query error:', error.message);
    
    // Return empty array instead of throwing error during build
    if (process.env.NODE_ENV === 'production') {
      return [];
    }
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export default createPool();