import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as automationsSchema from './schema/automations.schema';
import * as authSchema from './schema/auth.schema';
import * as integrationsSchema from './schema/integrations.schema';
import * as aiSchema from './schema/ai.schema';
import * as resourcesSchema from '../plugins/workscript/schema/resources.schema';
import * as flexdbSchema from '../plugins/workscript/schema/flexdb.schema';

// Combine all schemas
const schema = {
  ...automationsSchema,
  ...authSchema,
  ...integrationsSchema,
  ...aiSchema,
  ...resourcesSchema,
  ...flexdbSchema,
};

// Database connection configuration
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'workscript_dev',
};

// Create the connection pool
export const connection = mysql.createPool(connectionConfig);

// Create the Drizzle database instance
export const db = drizzle(connection, { schema, mode: 'default' });

// Export schemas for use in plugins and services
export * from './schema/automations.schema';
export * from './schema/auth.schema';
export * from './schema/integrations.schema';
export * from './schema/ai.schema';
export * from '../plugins/workscript/schema/resources.schema';
export * from '../plugins/workscript/schema/flexdb.schema';
