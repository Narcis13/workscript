import {
  mysqlTable, varchar, text, timestamp, json, boolean, int, mysqlEnum, index
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Shared Automations Schema - Multi-tenant support for all plugins
 *
 * This schema supports automation across different plugins (workscript, formflow, docflow, etc.)
 * by including a pluginId column to isolate automation data per plugin.
 */

// Automations Table - Multi-tenant automation definitions
export const automations = mysqlTable('automations', {
  id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),

  // **NEW: Plugin isolation**
  pluginId: varchar('plugin_id', { length: 128 }).notNull().default('workscript'),

  // Agency reference (for CRM/EstateFlow integration)
  // Made optional to support non-agency plugins
  agencyId: varchar('agency_id', { length: 128 }),

  // Basic Information
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  meta:text('meta'),
  // Trigger Configuration
  triggerType: mysqlEnum('trigger_type', ['immediate', 'cron', 'webhook']).notNull(),
  triggerConfig: json('trigger_config').notNull(), // Store trigger-specific configuration

  // Workflow Reference
  workflowId: varchar('workflow_id', { length: 128 }).notNull(),

  // Status & Control
  enabled: boolean('enabled').default(true).notNull(),

  // Execution Tracking
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'), // For scheduled automations
  runCount: int('run_count').default(0).notNull(),
  successCount: int('success_count').default(0).notNull(),
  failureCount: int('failure_count').default(0).notNull(),

  // Error Handling
  lastError: text('last_error'),
  lastErrorAt: timestamp('last_error_at'),

  // Metadata
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  // **NEW: Plugin index for fast filtering**
  pluginIdx: index('automations_plugin_idx').on(table.pluginId),
  agencyIdx: index('automations_agency_idx').on(table.agencyId),
  workflowIdx: index('automations_workflow_idx').on(table.workflowId),
  triggerTypeIdx: index('automations_trigger_type_idx').on(table.triggerType),
  enabledIdx: index('automations_enabled_idx').on(table.enabled),
  nextRunIdx: index('automations_next_run_idx').on(table.nextRunAt),
  nameIdx: index('automations_name_idx').on(table.name),
  // Composite index for plugin + agency queries
  pluginAgencyIdx: index('automations_plugin_agency_idx').on(table.pluginId, table.agencyId),
}));

// Automation Executions Table - Track individual automation runs
export const automationExecutions = mysqlTable('automation_executions', {
  id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
  automationId: varchar('automation_id', { length: 128 }).notNull(),

  // **NEW: Plugin isolation for execution tracking**
  pluginId: varchar('plugin_id', { length: 128 }).notNull().default('workscript'),

  workflowExecutionId: varchar('workflow_execution_id', { length: 128 }),

  // Execution Details
  status: mysqlEnum('status', ['pending', 'running', 'completed', 'failed']).notNull().default('pending'),
  triggerData: json('trigger_data'), // Data that triggered this execution
  initialState: json('initial_state'), // Initial state before workflow execution
  finalState: json('final_state'), // Final state after workflow execution
  result: json('result'), // Execution result
  error: text('error'), // Error message if execution fails

  // Timing
  startedAt: timestamp('started_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
  duration: int('duration'), // Execution duration in milliseconds

  // Metadata
  triggerSource: varchar('trigger_source', { length: 100 }), // What triggered this execution
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  automationIdx: index('automation_executions_automation_idx').on(table.automationId),
  // **NEW: Plugin index**
  pluginIdx: index('automation_executions_plugin_idx').on(table.pluginId),
  statusIdx: index('automation_executions_status_idx').on(table.status),
  createdAtIdx: index('automation_executions_created_at_idx').on(table.createdAt),
}));

// Type exports for use in repositories
export type Automation = typeof automations.$inferSelect;
export type NewAutomation = typeof automations.$inferInsert;
export type AutomationExecution = typeof automationExecutions.$inferSelect;
export type NewAutomationExecution = typeof automationExecutions.$inferInsert;
