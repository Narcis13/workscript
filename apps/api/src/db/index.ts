import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as automationsSchema from './schema/automations.schema';
import * as authSchema from './schema/auth.schema';

// Combine all schemas
const schema = {
  ...automationsSchema,
  ...authSchema,
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
