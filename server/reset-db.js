import { connection } from './src/db/index';
async function resetDatabase() {
    console.log('🗑️  Dropping all existing tables...');
    try {
        // Disable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
        // Drop tables in correct order (children first, then parents)
        const tablesToDrop = [
            'whatsapp_messages',
            'whatsapp_conversations',
            'email_templates',
            'client_property_matches',
            'property_valuations',
            'ai_lead_scores',
            'activities',
            'client_requests',
            'properties',
            'contacts',
            'agents',
            'agencies',
            'workflow_executions',
            'workflows',
            'users'
        ];
        for (const table of tablesToDrop) {
            try {
                await connection.execute(`DROP TABLE IF EXISTS \`${table}\``);
                console.log(`✅ Dropped table: ${table}`);
            }
            catch (error) {
                console.log(`⚠️  Table ${table} doesn't exist or couldn't be dropped`);
            }
        }
        // Re-enable foreign key checks
        await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✨ Database reset complete! You can now run: bun run db:push');
    }
    catch (error) {
        console.error('❌ Error resetting database:', error);
    }
    finally {
        await connection.end();
    }
}
resetDatabase();
