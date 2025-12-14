import {
  mysqlTable, varchar, text, timestamp, json, boolean, index
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
  triggeredBy: varchar('triggered_by', { length: 50 }).notNull().default('manual'), // manual, automation, webhook, api
  initialState: json('initial_state'), // Store initial state before execution
  finalState: json('final_state'), // Store final state after execution
  result: json('result'), // Store execution result
  error: text('error'), // Store error message if execution fails
  stackTrace: text('stack_trace'), // Store error stack trace if execution fails
  failedNodeId: varchar('failed_node_id', { length: 128 }), // Node that failed
  nodeLogs: json('node_logs'), // Store node execution logs
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  // Index for sorting by start time (most common query pattern)
  startedAtIdx: index('workflow_executions_started_at_idx').on(table.startedAt),
  // Index for filtering by workflow ID
  workflowIdIdx: index('workflow_executions_workflow_id_idx').on(table.workflowId),
  // Index for filtering by status
  statusIdx: index('workflow_executions_status_idx').on(table.status),
  // Composite index for workflow-specific queries with time ordering
  workflowStartedIdx: index('workflow_executions_workflow_started_idx').on(table.workflowId, table.startedAt),
}));

// Type exports for use in repositories
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type WorkflowExecution = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecution = typeof workflowExecutions.$inferInsert;
