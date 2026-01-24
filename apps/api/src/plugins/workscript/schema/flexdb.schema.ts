/**
 * FlexDB Database Schema
 *
 * This schema provides the foundation for runtime table creation and management.
 * FlexDB allows users to define custom tables without code or database migrations.
 *
 * Core tables:
 * - flex_tables: Stores table definitions with JSON schemas
 * - flex_table_versions: Tracks schema changes for audit trails
 *
 * @module flexdb.schema
 * @example
 * import { db } from '../index';
 * import { flexTables, eq } from 'drizzle-orm';
 *
 * // Find table by name within an application
 * const table = await db.query.flexTables.findFirst({
 *   where: and(
 *     eq(flexTables.applicationId, appId),
 *     eq(flexTables.name, 'customers')
 *   )
 * });
 */

import {
  mysqlTable,
  varchar,
  timestamp,
  boolean,
  int,
  json,
  index,
  unique,
  decimal,
  date,
  text,
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Supported data types for FlexDB columns
 *
 * Each type maps to specific MySQL storage and validation:
 * - string: VARCHAR(255) - short text, names, identifiers
 * - text: TEXT - long text, descriptions, content
 * - integer: INT - whole numbers
 * - decimal: DECIMAL(10,2) - currency, precise numbers
 * - boolean: TINYINT(1) - true/false flags
 * - date: DATE - dates without time
 * - datetime: DATETIME - dates with time
 * - json: JSON - nested objects, arrays
 * - reference: VARCHAR(128) - foreign key to another FlexDB table
 */
export type FlexDataType =
  | 'string'
  | 'text'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'json'
  | 'reference';

/**
 * Validation rules for FlexDB columns
 *
 * Applied during data insertion and updates:
 * - String constraints: maxLength, minLength, pattern (regex), enum
 * - Numeric constraints: min, max
 * - Reference constraints: targetTable, onDelete behavior
 * - Computed: Expression for calculated fields (future use)
 */
export interface FlexColumnValidation {
  /** Maximum string length (for string/text types) */
  maxLength?: number;
  /** Minimum string length (for string/text types) */
  minLength?: number;
  /** Regex pattern for string validation */
  pattern?: string;
  /** Allowed values (for enum-like constraints) */
  enum?: string[];
  /** Minimum numeric value (for integer/decimal types) */
  min?: number;
  /** Maximum numeric value (for integer/decimal types) */
  max?: number;
  /** Target table name for reference types */
  targetTable?: string;
  /** Behavior when referenced record is deleted */
  onDelete?: 'cascade' | 'set-null' | 'restrict';
  /** Expression for computed fields (future use) */
  computed?: string;
}

/**
 * Definition of a single column in a FlexDB table
 *
 * This is the core building block for table schemas.
 * Each column has a name, type, and optional metadata/constraints.
 */
export interface FlexColumnDefinition {
  /** Column name (snake_case, unique within table) */
  name: string;
  /** Data type for this column */
  dataType: FlexDataType;
  /** Human-readable display name */
  displayName?: string;
  /** Whether this column requires a value (NOT NULL) */
  required?: boolean;
  /** Whether values must be unique across all rows */
  unique?: boolean;
  /** Whether to create an index on this column for faster queries */
  indexed?: boolean;
  /** Default value for new rows (type depends on dataType) */
  defaultValue?: unknown;
  /** Validation rules for this column */
  validation?: FlexColumnValidation;
  /** Whether this is a system-managed column (id, created_at, etc.) */
  system?: boolean;
}

/**
 * Complete schema definition for a FlexDB table
 *
 * Contains all column definitions and a version number for tracking changes.
 */
export interface FlexTableSchema {
  /** Array of column definitions */
  columns: FlexColumnDefinition[];
  /** Schema version number (incremented on changes) */
  version: number;
}

/**
 * Describes a single change to a table schema
 *
 * Used in flex_table_versions to track what changed between versions.
 */
export interface SchemaChange {
  /** Type of change made */
  type: 'add_column' | 'remove_column' | 'modify_column';
  /** Name of the affected column */
  column: string;
  /** Before and after states */
  details: {
    /** Column definition before change (null for add_column) */
    before?: FlexColumnDefinition;
    /** Column definition after change (null for remove_column) */
    after?: FlexColumnDefinition;
  };
}

// =============================================================================
// FLEX_TABLES TABLE
// =============================================================================

/**
 * FlexDB Tables Registry
 *
 * Stores metadata and schema definitions for user-created tables.
 * Each record represents one "virtual" table that FlexDB manages.
 *
 * **Key Concepts:**
 * - applicationId: Scopes tables to specific applications (multi-tenancy)
 * - schema: JSON column containing FlexTableSchema with column definitions
 * - indexedColumns: Maps column names to physical index slots
 * - version: Incremented on each schema change for optimistic locking
 *
 * **Soft Delete:**
 * Tables are never hard-deleted. Setting deletedAt marks them as inactive.
 * This preserves audit trails and allows recovery.
 *
 * **Indexes:**
 * - Unique on (applicationId, name): Prevents duplicate table names per app
 * - Index on applicationId: Fast lookup of all tables in an app
 *
 * @example
 * // Creating a customers table
 * const schema: FlexTableSchema = {
 *   columns: [
 *     { name: 'name', dataType: 'string', required: true },
 *     { name: 'email', dataType: 'string', unique: true },
 *     { name: 'active', dataType: 'boolean', defaultValue: true }
 *   ],
 *   version: 1
 * };
 *
 * await db.insert(flexTables).values({
 *   applicationId: 'app_123',
 *   name: 'customers',
 *   displayName: 'Customers',
 *   schema
 * });
 */
export const flexTables = mysqlTable(
  'flex_tables',
  {
    // Primary identifier
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),

    // Application scope - enables multi-tenancy
    applicationId: varchar('application_id', { length: 128 }).notNull(),
    // Each application has its own namespace of tables
    // Tables with same name can exist in different applications

    // Table identification
    name: varchar('name', { length: 255 }).notNull(),
    // Technical name used in queries (snake_case recommended)
    // Must be unique within the application
    // Examples: 'customers', 'orders', 'invoice_items'

    displayName: varchar('display_name', { length: 255 }),
    // Human-readable name shown in UI
    // Examples: 'Customers', 'Order Items', 'Invoice Line Items'

    // Schema definition - the heart of FlexDB
    schema: json('schema').notNull().$type<FlexTableSchema>(),
    // Contains: { columns: FlexColumnDefinition[], version: number }
    // Defines all columns, their types, and constraints
    // Updated when table structure changes

    // Index mapping for querying
    indexedColumns: json('indexed_columns').$type<Record<string, string>>(),
    // Maps column names to physical index slot names
    // Example: { 'email': 'idx_1', 'status': 'idx_2' }
    // Used by query engine to route queries to correct indexes

    // Version control for optimistic locking
    version: int('version').notNull().default(1),
    // Incremented on each schema change
    // Clients include version in updates to detect conflicts
    // Prevents lost updates in concurrent modifications

    // Soft delete flag
    isActive: boolean('is_active').notNull().default(true),
    // False = table is "deleted" but preserved for audit
    // Queries should filter on isActive = true by default

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),

    deletedAt: timestamp('deleted_at'),
    // Set when table is soft-deleted
    // Null = active table
  },
  (table) => ({
    // **Unique constraint** - Table names must be unique within application
    applicationNameUnique: unique('flex_tables_app_name_unique').on(
      table.applicationId,
      table.name
    ),

    // **Application index** - Fast lookup of all tables in an app
    applicationIdx: index('flex_tables_application_idx').on(table.applicationId),

    // **Active filter** - Quick filtering of non-deleted tables
    isActiveIdx: index('flex_tables_is_active_idx').on(table.isActive),
  })
);

// =============================================================================
// FLEX_TABLE_VERSIONS TABLE
// =============================================================================

/**
 * FlexDB Schema Version History
 *
 * Tracks all schema changes for auditing and potential rollback.
 * Each record represents one schema modification.
 *
 * **Purpose:**
 * - Audit trail: Who changed what, when
 * - Debugging: Understand schema evolution
 * - Rollback: Potential future feature to revert changes
 * - Compliance: Meet data governance requirements
 *
 * **Key Fields:**
 * - tableId: Foreign key to flex_tables
 * - version: Version number this record represents
 * - previousSchema: Schema before this change (null for v1)
 * - newSchema: Schema after this change
 * - changes: Array of specific modifications made
 *
 * @example
 * // Recording a schema change
 * await db.insert(flexTableVersions).values({
 *   tableId: 'tbl_123',
 *   version: 2,
 *   previousSchema: oldSchema,
 *   newSchema: newSchema,
 *   changes: [
 *     {
 *       type: 'add_column',
 *       column: 'phone',
 *       details: { after: { name: 'phone', dataType: 'string' } }
 *     }
 *   ],
 *   createdBy: 'user_456'
 * });
 */
export const flexTableVersions = mysqlTable(
  'flex_table_versions',
  {
    // Primary identifier
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),

    // Foreign key to flex_tables
    tableId: varchar('table_id', { length: 128 }).notNull(),
    // References: flexTables.id
    // Which table this version record belongs to

    // Version number
    version: int('version').notNull(),
    // The version number this record represents
    // Matches flex_tables.version at time of change
    // v1 = initial creation, v2+ = subsequent changes

    // Schema snapshots
    previousSchema: json('previous_schema').$type<FlexTableSchema | null>(),
    // Schema before this change was applied
    // Null for version 1 (initial creation)
    // Enables understanding what changed and potential rollback

    newSchema: json('new_schema').notNull().$type<FlexTableSchema>(),
    // Schema after this change was applied
    // For version 1, this is the initial schema
    // For version 2+, shows result of modifications

    // Change details
    changes: json('changes').notNull().$type<SchemaChange[]>(),
    // Array of specific changes made
    // For version 1: [{ type: 'add_column', column: 'name', ... }, ...]
    // For modifications: Details of what was added/removed/modified

    // Audit information
    createdBy: varchar('created_by', { length: 128 }),
    // User ID who made this change (null for system changes)
    // Used for accountability and audit trails

    // Timestamp
    createdAt: timestamp('created_at').defaultNow().notNull(),
    // When this version was created
  },
  (table) => ({
    // **Version lookup** - Find version history for a table
    tableVersionIdx: index('flex_table_versions_table_version_idx').on(
      table.tableId,
      table.version
    ),

    // **Table history** - All versions for a specific table
    tableIdx: index('flex_table_versions_table_idx').on(table.tableId),
  })
);

// =============================================================================
// FLEX_RECORDS TABLE
// =============================================================================

/**
 * FlexDB Records Storage
 *
 * Stores all record data for FlexDB tables. Uses a JSON data column for
 * schema flexibility combined with indexed virtual columns for query performance.
 *
 * **Key Concepts:**
 * - data: JSON column containing all record fields
 * - idxStr1-3, idxNum1-2, idxDate1-2: Indexed slots populated from data
 * - searchText: Concatenated text fields for full-text search
 * - version: Optimistic locking counter for concurrent update safety
 *
 * **Index Slot Mapping:**
 * When a table has indexed columns, the indexedColumns mapping in flex_tables
 * defines which record fields populate which index slots. For example:
 * { 'str_1': 'email', 'num_1': 'age' } means the 'email' field populates
 * idxStr1 and 'age' populates idxNum1.
 *
 * **Full-Text Search:**
 * The searchText column is populated with concatenated string/text fields
 * from the record. FULLTEXT index must be created via raw SQL migration
 * since Drizzle doesn't support it natively:
 * CREATE FULLTEXT INDEX flex_records_search_idx ON flex_records(search_text);
 *
 * @example
 * // Inserting a record
 * await db.insert(flexRecords).values({
 *   tableId: 'tbl_123',
 *   applicationId: 'app_456',
 *   data: { name: 'John', email: 'john@example.com', age: 30 },
 *   idxStr1: 'john@example.com',  // email is indexed
 *   idxNum1: '30.0000',           // age is indexed
 *   searchText: 'John john@example.com',
 *   version: 1,
 * });
 */
export const flexRecords = mysqlTable(
  'flex_records',
  {
    // Primary identifier
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),

    // Foreign key to flex_tables
    tableId: varchar('table_id', { length: 128 }).notNull(),
    // References: flexTables.id
    // Identifies which FlexDB table this record belongs to

    // Application scope for multi-tenancy
    applicationId: varchar('application_id', { length: 128 }).notNull(),
    // Enables filtering records by application
    // Must match the applicationId of the parent table

    // JSON data column - stores all record fields
    data: json('data').notNull().$type<Record<string, unknown>>(),
    // Contains: All user-defined fields plus system fields (id, created_at, etc.)
    // Schema is defined by the parent table's schema.columns

    // Indexed string slots (populated based on table's indexedColumns mapping)
    idxStr1: varchar('idx_str_1', { length: 255 }),
    // First indexed string slot - mapped to a specific column via indexedColumns
    idxStr2: varchar('idx_str_2', { length: 255 }),
    // Second indexed string slot
    idxStr3: varchar('idx_str_3', { length: 255 }),
    // Third indexed string slot

    // Indexed numeric slots
    idxNum1: decimal('idx_num_1', { precision: 18, scale: 4 }),
    // First indexed numeric slot - supports integers and decimals
    idxNum2: decimal('idx_num_2', { precision: 18, scale: 4 }),
    // Second indexed numeric slot

    // Indexed date slots
    idxDate1: date('idx_date_1'),
    // First indexed date slot - DATE only, no time component
    idxDate2: date('idx_date_2'),
    // Second indexed date slot

    // Full-text search column
    searchText: text('search_text'),
    // Concatenated string/text fields for full-text search
    // Populated automatically on insert/update
    // FULLTEXT index required for MATCH AGAINST queries

    // Version for optimistic locking
    version: int('version').notNull().default(1),
    // Incremented on each update
    // Clients include version in updates to detect conflicts
    // Prevents lost updates in concurrent modifications

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),

    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),

    deletedAt: timestamp('deleted_at'),
    // Set when record is soft-deleted
    // Null = active record
    // Queries filter on deletedAt IS NULL by default
  },
  (table) => ({
    // **Table lookup** - Find all records for a specific FlexDB table
    tableIdx: index('flex_records_table_idx').on(table.tableId),

    // **Application lookup** - Find all records for an application
    appIdx: index('flex_records_app_idx').on(table.applicationId),

    // **String index slots** - Fast queries on indexed string fields
    str1Idx: index('flex_records_str_1_idx').on(table.idxStr1),
    str2Idx: index('flex_records_str_2_idx').on(table.idxStr2),
    str3Idx: index('flex_records_str_3_idx').on(table.idxStr3),

    // **Numeric index slots** - Fast queries on indexed numeric fields
    num1Idx: index('flex_records_num_1_idx').on(table.idxNum1),
    num2Idx: index('flex_records_num_2_idx').on(table.idxNum2),

    // **Date index slots** - Fast queries on indexed date fields
    date1Idx: index('flex_records_date_1_idx').on(table.idxDate1),
    date2Idx: index('flex_records_date_2_idx').on(table.idxDate2),

    // NOTE: FULLTEXT index on search_text requires raw SQL migration:
    // CREATE FULLTEXT INDEX flex_records_search_idx ON flex_records(search_text);
    // Drizzle doesn't support FULLTEXT indexes natively.
  })
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/**
 * Drizzle-inferred types for database operations
 *
 * Use these types throughout the application for type-safe database access:
 * - FlexTable: Result type from SELECT queries
 * - NewFlexTable: Input type for INSERT operations
 */

// FlexTable types
export type FlexTable = typeof flexTables.$inferSelect;
export type NewFlexTable = typeof flexTables.$inferInsert;

// FlexTableVersion types
export type FlexTableVersion = typeof flexTableVersions.$inferSelect;
export type NewFlexTableVersion = typeof flexTableVersions.$inferInsert;

// FlexRecord types
export type FlexRecord = typeof flexRecords.$inferSelect;
export type NewFlexRecord = typeof flexRecords.$inferInsert;
