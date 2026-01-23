/**
 * FlexDB Service
 *
 * Core service for FlexDB table operations.
 * Handles table creation, retrieval, and management with:
 * - Column validation before persistence
 * - Duplicate table name prevention per application
 * - Automatic metadata columns (id, created_at, updated_at, deleted_at)
 * - Version tracking integration
 *
 * @module FlexDBService
 */

import { db } from '../../../db';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import type {
  FlexColumnDefinition,
  FlexTableSchema,
  FlexTable,
} from '../schema/flexdb.schema';
import { flexTables } from '../schema/flexdb.schema';
import {
  validateColumnDefinition,
  validateTableName,
  assignIndexSlots,
} from './FlexSchemaValidator';
import { flexVersionService } from './FlexVersionService';

// =============================================================================
// SERVICE RESULT TYPES
// =============================================================================

/**
 * Error codes for FlexDB operations
 */
export type FlexDBErrorCode =
  | 'VALIDATION_ERROR'
  | 'DUPLICATE'
  | 'NOT_FOUND'
  | 'INTERNAL';

/**
 * Result type for FlexDB service operations
 *
 * Uses discriminated union for type-safe error handling.
 */
export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: FlexDBErrorCode };

// =============================================================================
// SYSTEM COLUMNS
// =============================================================================

/**
 * System-managed columns added to every FlexDB table
 *
 * These columns are automatically added and managed by FlexDB:
 * - id: Unique identifier for each row
 * - created_at: Timestamp when row was created
 * - updated_at: Timestamp when row was last modified
 * - deleted_at: Soft delete timestamp (null = not deleted)
 */
const SYSTEM_COLUMNS: FlexColumnDefinition[] = [
  {
    name: 'id',
    dataType: 'string',
    displayName: 'ID',
    required: true,
    unique: true,
    system: true,
  },
  {
    name: 'created_at',
    dataType: 'datetime',
    displayName: 'Created At',
    required: true,
    system: true,
  },
  {
    name: 'updated_at',
    dataType: 'datetime',
    displayName: 'Updated At',
    required: true,
    system: true,
  },
  {
    name: 'deleted_at',
    dataType: 'datetime',
    displayName: 'Deleted At',
    required: false,
    system: true,
  },
];

// =============================================================================
// FLEXDB SERVICE CLASS
// =============================================================================

/**
 * Service for FlexDB table operations
 *
 * Provides methods for:
 * - Creating tables with validated schemas
 * - Retrieving tables by ID or name
 * - Listing tables for an application
 */
export class FlexDBService {
  /**
   * Creates a new FlexDB table
   *
   * This method:
   * 1. Validates the table name (snake_case)
   * 2. Validates each column definition
   * 3. Checks for duplicate table names within the application
   * 4. Assigns index slots for indexed columns
   * 5. Adds system columns (id, created_at, updated_at, deleted_at)
   * 6. Inserts the table record
   * 7. Creates a version history entry
   *
   * @param applicationId - ID of the application owning this table
   * @param name - Table name (must be snake_case)
   * @param columns - Array of column definitions
   * @param options - Optional settings (displayName, createdBy)
   * @returns Created table or error
   *
   * @example
   * const result = await flexDBService.createTable(
   *   'app_123',
   *   'customers',
   *   [
   *     { name: 'name', dataType: 'string', required: true },
   *     { name: 'email', dataType: 'string', unique: true, indexed: true }
   *   ],
   *   { displayName: 'Customers', createdBy: 'user_456' }
   * );
   *
   * if (result.success) {
   *   console.log('Created table:', result.data.id);
   * } else {
   *   console.error(result.error, result.code);
   * }
   */
  async createTable(
    applicationId: string,
    name: string,
    columns: FlexColumnDefinition[],
    options?: { displayName?: string; createdBy?: string }
  ): Promise<ServiceResult<FlexTable>> {
    // 1. Validate table name
    const nameValidation = validateTableName(name);
    if (!nameValidation.valid) {
      return {
        success: false,
        error: nameValidation.error || 'Invalid table name',
        code: 'VALIDATION_ERROR',
      };
    }

    // 2. Validate each column definition
    const validatedColumns: FlexColumnDefinition[] = [];
    for (let i = 0; i < columns.length; i++) {
      const colResult = validateColumnDefinition(columns[i]);
      if (!colResult.valid) {
        return {
          success: false,
          error: `Column ${i + 1} validation failed: ${colResult.errors.join(', ')}`,
          code: 'VALIDATION_ERROR',
        };
      }
      validatedColumns.push(colResult.data);
    }

    // 3. Check for duplicate column names
    const columnNames = new Set<string>();
    for (const col of validatedColumns) {
      if (columnNames.has(col.name)) {
        return {
          success: false,
          error: `Duplicate column name: '${col.name}'`,
          code: 'VALIDATION_ERROR',
        };
      }
      columnNames.add(col.name);
    }

    // Check for conflicts with system column names
    const systemColumnNames = SYSTEM_COLUMNS.map((c) => c.name);
    for (const col of validatedColumns) {
      if (systemColumnNames.includes(col.name)) {
        return {
          success: false,
          error: `Column name '${col.name}' is reserved for system use`,
          code: 'VALIDATION_ERROR',
        };
      }
    }

    // 4. Check for duplicate table name in same application
    const existing = await db.query.flexTables.findFirst({
      where: and(
        eq(flexTables.applicationId, applicationId),
        eq(flexTables.name, name),
        eq(flexTables.isActive, true)
      ),
    });

    if (existing) {
      return {
        success: false,
        error: `Table '${name}' already exists in this application`,
        code: 'DUPLICATE',
      };
    }

    // 5. Assign index slots for indexed columns
    const slotResult = assignIndexSlots(validatedColumns);
    if (slotResult.errors.length > 0) {
      return {
        success: false,
        error: `Index slot assignment failed: ${slotResult.errors.join(', ')}`,
        code: 'VALIDATION_ERROR',
      };
    }

    // 6. Combine user columns with system columns
    const allColumns: FlexColumnDefinition[] = [
      ...validatedColumns,
      ...SYSTEM_COLUMNS,
    ];

    // 7. Create schema object
    const schema: FlexTableSchema = {
      columns: allColumns,
      version: 1,
    };

    // 8. Generate ID and insert
    const id = createId();

    try {
      // Convert IndexSlotAssignment to Record<string, string> for Drizzle
      const indexedColumnsRecord: Record<string, string> = {};
      for (const [key, value] of Object.entries(slotResult.assignments)) {
        if (value !== undefined) {
          indexedColumnsRecord[key] = value;
        }
      }

      await db.insert(flexTables).values({
        id,
        applicationId,
        name,
        displayName: options?.displayName ?? null,
        schema,
        indexedColumns: indexedColumnsRecord,
        version: 1,
        isActive: true,
      });

      // 9. Create version entry for audit trail
      await flexVersionService.createVersionEntry(
        id,
        null, // previousSchema is null for new table
        schema,
        options?.createdBy
      );

      // 10. Retrieve and return the created table
      const created = await db.query.flexTables.findFirst({
        where: eq(flexTables.id, id),
      });

      if (!created) {
        return {
          success: false,
          error: 'Table created but could not be retrieved',
          code: 'INTERNAL',
        };
      }

      return { success: true, data: created };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Failed to create table: ${message}`,
        code: 'INTERNAL',
      };
    }
  }

  /**
   * Retrieves a table by its ID
   *
   * @param tableId - The table's unique identifier
   * @returns The table or NOT_FOUND error
   *
   * @example
   * const result = await flexDBService.getTable('tbl_abc123');
   * if (result.success) {
   *   console.log('Table name:', result.data.name);
   * }
   */
  async getTable(tableId: string): Promise<ServiceResult<FlexTable>> {
    const table = await db.query.flexTables.findFirst({
      where: and(eq(flexTables.id, tableId), eq(flexTables.isActive, true)),
    });

    if (!table) {
      return {
        success: false,
        error: `Table with ID '${tableId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    return { success: true, data: table };
  }

  /**
   * Retrieves a table by application ID and table name
   *
   * @param applicationId - The application's identifier
   * @param name - The table's name
   * @returns The table or NOT_FOUND error
   *
   * @example
   * const result = await flexDBService.getTableByName('app_123', 'customers');
   */
  async getTableByName(
    applicationId: string,
    name: string
  ): Promise<ServiceResult<FlexTable>> {
    const table = await db.query.flexTables.findFirst({
      where: and(
        eq(flexTables.applicationId, applicationId),
        eq(flexTables.name, name),
        eq(flexTables.isActive, true)
      ),
    });

    if (!table) {
      return {
        success: false,
        error: `Table '${name}' not found in application`,
        code: 'NOT_FOUND',
      };
    }

    return { success: true, data: table };
  }

  /**
   * Lists all active tables for an application
   *
   * @param applicationId - The application's identifier
   * @returns Array of tables (may be empty)
   *
   * @example
   * const tables = await flexDBService.listTables('app_123');
   * console.log(`Found ${tables.length} tables`);
   */
  async listTables(applicationId: string): Promise<FlexTable[]> {
    const tables = await db.query.flexTables.findMany({
      where: and(
        eq(flexTables.applicationId, applicationId),
        eq(flexTables.isActive, true)
      ),
    });

    return tables;
  }

  /**
   * Soft-deletes a table by setting isActive to false
   *
   * This preserves the table data for audit trails and potential recovery.
   *
   * @param tableId - The table's unique identifier
   * @returns Success or error
   */
  async deleteTable(tableId: string): Promise<ServiceResult<{ deleted: true }>> {
    const existing = await db.query.flexTables.findFirst({
      where: and(eq(flexTables.id, tableId), eq(flexTables.isActive, true)),
    });

    if (!existing) {
      return {
        success: false,
        error: `Table with ID '${tableId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    await db
      .update(flexTables)
      .set({
        isActive: false,
        deletedAt: new Date(),
      })
      .where(eq(flexTables.id, tableId));

    return { success: true, data: { deleted: true } };
  }
}

/**
 * Singleton instance for convenience
 */
export const flexDBService = new FlexDBService();
