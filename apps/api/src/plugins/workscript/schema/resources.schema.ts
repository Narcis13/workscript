import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  boolean,
  json,
  index,
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Resources Schema
 *
 * Defines the database tables for the sandboxed file management system.
 * Resources enable workflows, automations, and users to create, read, update,
 * and delete files within a secure, curated environment.
 *
 * @see /apps/sandbox/ - Physical file storage location
 * @see requirements.md#requirement-12 - Resource Database Schema requirements
 * @see requirements.md#requirement-13 - Resource Operations Audit Log requirements
 */

// ============================================================================
// RESOURCES TABLE
// ============================================================================

/**
 * Resource Types
 * - prompt: AI prompt templates (.md files)
 * - image: Visual assets (.png, .jpg, .jpeg, .gif, .webp)
 * - audio: Audio files (.mp3, .wav)
 * - document: Documents (.pdf, .md, .txt)
 * - data: Data files (.json, .csv)
 */
export type ResourceType = 'prompt' | 'image' | 'audio' | 'document' | 'data';

/**
 * Author Types
 * - user: Created by a human user via admin panel
 * - workflow: Created by a workflow execution
 * - automation: Created by a scheduled automation
 * - system: Created by the system (e.g., initialization)
 */
export type AuthorType = 'user' | 'workflow' | 'automation' | 'system';

/**
 * Resources table - stores metadata about files in the sandbox
 *
 * Files are physically stored in /apps/sandbox/resources/{tenant-id}/
 * This table tracks metadata, ownership, and enables querying.
 */
export const resources = mysqlTable(
  'resources',
  {
    // Primary key - CUID2 for globally unique IDs
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),

    // File identification
    name: varchar('name', { length: 255 }).notNull(),
    path: varchar('path', { length: 512 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // prompt, image, audio, document, data
    mimeType: varchar('mime_type', { length: 100 }).notNull(),

    // File properties
    size: int('size').notNull(), // File size in bytes
    checksum: varchar('checksum', { length: 64 }), // SHA-256 hash

    // Authorship tracking
    authorType: varchar('author_type', { length: 50 }).notNull(), // user, workflow, automation, system
    authorId: varchar('author_id', { length: 128 }), // ID of the author (user/workflow/etc.)

    // Multi-tenancy
    tenantId: varchar('tenant_id', { length: 128 }),
    pluginId: varchar('plugin_id', { length: 128 }).notNull().default('workscript'),

    // Metadata
    description: text('description'),
    tags: json('tags').$type<string[]>().default([]),
    metadata: json('metadata').$type<Record<string, unknown>>(),

    // Status flags
    isActive: boolean('is_active').notNull().default(true),
    isPublic: boolean('is_public').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
    deletedAt: timestamp('deleted_at'), // Nullable for soft delete
  },
  (table) => ({
    // Index for looking up resources by path (unique constraint)
    pathIdx: index('resources_path_idx').on(table.path),

    // Composite index for tenant-scoped queries by type
    tenantTypeIdx: index('resources_tenant_type_idx').on(
      table.tenantId,
      table.type
    ),

    // Composite index for querying by author
    authorIdx: index('resources_author_idx').on(
      table.authorType,
      table.authorId
    ),

    // Index for plugin isolation
    pluginIdx: index('resources_plugin_idx').on(table.pluginId),
  })
);

// ============================================================================
// RESOURCE OPERATIONS TABLE (AUDIT LOG)
// ============================================================================

/**
 * Operation Types
 * - create: Resource was created
 * - read: Resource content was read/downloaded
 * - update: Resource metadata or content was updated
 * - delete: Resource was deleted (soft delete)
 * - interpolate: Template was interpolated with state
 * - copy: Resource was copied to a new location
 */
export type OperationType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'interpolate'
  | 'copy';

/**
 * Actor Types
 * - user: Human user via admin panel
 * - workflow: Workflow execution
 * - automation: Scheduled automation
 * - system: System process
 */
export type ActorType = 'user' | 'workflow' | 'automation' | 'system';

/**
 * Operation Status
 * - success: Operation completed successfully
 * - failed: Operation failed
 */
export type OperationStatus = 'success' | 'failed';

/**
 * Resource Operations table - audit log for all resource operations
 *
 * Tracks who did what, when, and in what context.
 * Enables security auditing and debugging workflow issues.
 */
export const resourceOperations = mysqlTable(
  'resource_operations',
  {
    // Primary key
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),

    // Reference to the resource
    resourceId: varchar('resource_id', { length: 128 }).notNull(),

    // Operation details
    operation: varchar('operation', { length: 50 }).notNull(), // create, read, update, delete, interpolate, copy

    // Actor information
    actorType: varchar('actor_type', { length: 50 }).notNull(), // user, workflow, automation, system
    actorId: varchar('actor_id', { length: 128 }),

    // Workflow context (optional - populated when operation triggered by workflow)
    workflowId: varchar('workflow_id', { length: 128 }),
    executionId: varchar('execution_id', { length: 128 }),
    nodeId: varchar('node_id', { length: 128 }),

    // Operation-specific data (e.g., interpolation state, source ID for copy)
    details: json('details').$type<Record<string, unknown>>(),

    // Checksum tracking for content updates
    previousChecksum: varchar('previous_checksum', { length: 64 }),
    newChecksum: varchar('new_checksum', { length: 64 }),

    // Status and error handling
    status: varchar('status', { length: 50 }).notNull(), // success, failed
    errorMessage: text('error_message'),

    // Performance tracking
    durationMs: int('duration_ms'),

    // Timestamp
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Index for querying operations by resource
    resourceIdx: index('resource_ops_resource_idx').on(table.resourceId),

    // Composite index for querying by actor
    actorIdx: index('resource_ops_actor_idx').on(table.actorType, table.actorId),

    // Index for querying workflow-related operations
    workflowIdx: index('resource_ops_workflow_idx').on(table.workflowId),

    // Index for time-based queries (recent operations)
    createdAtIdx: index('resource_ops_created_at_idx').on(table.createdAt),
  })
);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Resource type - represents a row from the resources table
 */
export type Resource = typeof resources.$inferSelect;

/**
 * NewResource type - represents data needed to insert a new resource
 */
export type NewResource = typeof resources.$inferInsert;

/**
 * ResourceOperation type - represents a row from the resource_operations table
 */
export type ResourceOperation = typeof resourceOperations.$inferSelect;

/**
 * NewResourceOperation type - represents data needed to insert a new operation log
 */
export type NewResourceOperation = typeof resourceOperations.$inferInsert;
