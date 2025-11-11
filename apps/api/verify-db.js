import mysql from 'mysql2/promise';

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'q1w2e3r4',
  database: 'workscript',
};

async function verify() {
  try {
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    // Check tables
    const tables = await connection.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'workscript'
    `);

    console.log('✅ Database Tables:\n');
    tables[0].forEach(row => {
      console.log(`  - ${row.TABLE_NAME}`);
    });

    // Check automations table structure
    console.log('\n📋 Automations Table Structure:\n');
    const automationsStructure = await connection.query('DESCRIBE automations');
    automationsStructure[0].forEach(col => {
      const nullable = col.Null === 'NO' ? ' NOT NULL' : '';
      console.log(`  ${col.Field}: ${col.Type}${nullable}`);
    });

    // Check automation_executions table structure
    console.log('\n📋 Automation Executions Table Structure:\n');
    const execStructure = await connection.query('DESCRIBE automation_executions');
    execStructure[0].forEach(col => {
      const nullable = col.Null === 'NO' ? ' NOT NULL' : '';
      console.log(`  ${col.Field}: ${col.Type}${nullable}`);
    });

    await connection.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
