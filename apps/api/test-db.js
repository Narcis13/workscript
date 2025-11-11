import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'q1w2e3r4',
  database: 'workscript',
};

async function test() {
  try {
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    
    const result = await connection.query('SELECT VERSION() as version');
    console.log('MySQL Version:', result[0][0].version);
    
    await connection.release();
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

test();
