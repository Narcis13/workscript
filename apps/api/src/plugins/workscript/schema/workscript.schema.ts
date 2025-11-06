import {
  mysqlTable, varchar, text, timestamp, json, boolean
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Workscript Plugin Schema
 *
 * This schema defines workflow-specific tables for the workscript plugin.
 * Automation tables are now shared and defined in /apps/api/src/db/schema/automations.schema.ts
 */

// Workflows Table - Workflow definitions
export const workflows = mysqlTable('workflows', {
  id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  definition: json('definition').notNull(), // Store the JSON workflow definition
  version: varchar('version', { length: 50 }).notNull().default('1.0.0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Workflow Executions Table - Track individual workflow runs
export const workflowExecutions = mysqlTable('workflow_executions', {
  id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
  workflowId: varchar('workflow_id', { length: 128 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, running, completed, failed
  result: json('result'), // Store execution result
  error: text('error'), // Store error message if execution fails
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Type exports for use in repositories
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
