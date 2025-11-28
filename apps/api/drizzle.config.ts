import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: [
    './src/db/schema/automations.schema.ts',
    './src/db/schema/auth.schema.ts',
    './src/db/schema/integrations.schema.ts',
    './src/db/schema/ai.schema.ts',
    './src/plugins/workscript/schema/workscript.schema.ts'
  ],
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'workscript_dev',
  },
  verbose: true,
  strict: true,
});
