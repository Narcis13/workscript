import mysql from 'mysql2/promise';
import fs from 'fs/promises';

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'q1w2e3r4',
  database: 'workscript',
};

async function runMigration() {
  try {
    const pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();

    const sql = await fs.readFile('/Users/narcisbrindusescu/teste/bhvr/workscript/apps/api/drizzle/0000_spooky_rhino.sql', 'utf-8');

    // Split by statement breakpoint and filter empty statements
    const statements = sql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('-->'));

    console.log(`Executing ${statements.length} statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim();
      if (stmt) {
        console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`);
        try {
          await connection.query(stmt);
          console.log('✓ Success\n');
        } catch (err) {
          console.error(`✗ Error: ${err.message}\n`);
          throw err;
        }
      }
    }

    console.log('✅ All migrations executed successfully!');

    // Verify tables exist
    const tables = await connection.query('SHOW TABLES;');
    console.log('\n📊 Tables created:');
    tables[0].forEach(row => {
      const tableName = row[Object.keys(row)[0]];
      console.log(`  - ${tableName}`);
    });

    await connection.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
