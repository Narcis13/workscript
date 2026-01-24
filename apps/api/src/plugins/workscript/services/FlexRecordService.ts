/**
 * FlexDB Record Service
 *
 * Core service for FlexDB record operations.
 * Handles CRUD operations with:
 * - Data validation against table schema
 * - Index slot population for fast queries
 * - Search text generation for full-text search
 * - Optimistic locking for concurrent updates
 * - Soft delete support
 *
 * @module FlexRecordService
 */

import { db } from '../../../db';
import { eq, and, isNull, sql, asc, desc } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { flexRecords, flexTables } from '../schema/flexdb.schema';
import type {
  FlexRecord,
  FlexTableSchema,
  FlexColumnDefinition,
} from '../schema/flexdb.schema';
import {
  buildFilterConditions,
  buildOrderBy,
  slotNameToDbColumn,
} from './FlexQueryBuilder';
import type { FlexQueryParams, FlexAdvancedFilter } from './FlexQueryBuilder';

// =============================================================================
// SERVICE RESULT TYPES
// =============================================================================

/**
 * Error codes for FlexRecord operations
 */
export type FlexRecordErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'REFERENCE_ERROR'
  | 'CONFLICT'
  | 'INTERNAL';

/**
 * Result type for FlexRecord service operations
 *
 * Uses discriminated union for type-safe error handling.
 */
export type RecordServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: FlexRecordErrorCode };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract indexed values from record data
 *
 * Populates the idx_* columns based on the table's indexedColumns mapping.
 *
 * @param data - Record data
 * @param tableSchema - Table schema
 * @param indexedColumns - Mapping from slot names to field names
 * @returns Object with indexed column values
 */
export function extractIndexedValues(
  data: Record<string, unknown>,
  tableSchema: FlexTableSchema,
  indexedColumns: Record<string, string>
): Partial<typeof flexRecords.$inferInsert> {
  const values: Record<string, unknown> = {};

  for (const [slotName, columnName] of Object.entries(indexedColumns)) {
    const value = data[columnName];
    const column = tableSchema.columns.find((c) => c.name === columnName);

    if (value !== undefined && value !== null && column) {
      const dbColumnName = slotNameToDbColumn(slotName);
      values[dbColumnName] = coerceValueForSlot(value, column.dataType, slotName);
    }
  }

  return values;
}

/**
 * Coerce a value to match the expected slot type
 *
 * @param value - Value to coerce
 * @param dataType - Column data type
 * @param slotName - Slot name (str_1, num_1, date_1, etc.)
 * @returns Coerced value
 */
function coerceValueForSlot(
  value: unknown,
  dataType: string,
  slotName: string
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  // String slots
  if (slotName.startsWith('str_')) {
    return String(value);
  }

  // Numeric slots - store as string (DECIMAL column stores as string)
  if (slotName.startsWith('num_')) {
    const num = Number(value);
    if (isNaN(num)) {
      return null;
    }
    return num.toFixed(4);
  }

  // Date slots - store as YYYY-MM-DD string
  if (slotName.startsWith('date_')) {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'string') {
      // Try to parse as date
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }
    return null;
  }

  return String(value);
}

/**
 * Build search text from record data
 *
 * Concatenates all string/text fields for full-text search.
 * Excludes system columns.
 *
 * @param data - Record data
 * @param tableSchema - Table schema
 * @returns Concatenated search text (max 60KB)
 */
export function buildSearchText(
  data: Record<string, unknown>,
  tableSchema: FlexTableSchema
): string {
  const MAX_SEARCH_TEXT_SIZE = 60 * 1024; // 60KB to stay under TEXT limit

  const searchableFields = tableSchema.columns.filter(
    (col) =>
      (col.dataType === 'string' || col.dataType === 'text') && !col.system
  );

  const textParts = searchableFields
    .map((col) => {
      const value = data[col.name];
      if (value === null || value === undefined) {
        return '';
      }
      return String(value);
    })
    .filter(Boolean);

  const fullText = textParts.join(' ');

  // Truncate if too long
  if (fullText.length > MAX_SEARCH_TEXT_SIZE) {
    return fullText.substring(0, MAX_SEARCH_TEXT_SIZE);
  }

  return fullText;
}

/**
 * Validate record data against table schema
 *
 * Checks required fields and basic type compatibility.
 *
 * @param data - Record data to validate
 * @param tableSchema - Table schema
 * @returns Validation result
 */
function validateRecordData(
  data: Record<string, unknown>,
  tableSchema: FlexTableSchema
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required fields (excluding system columns)
  for (const col of tableSchema.columns) {
    if (col.system) continue;
    if (!col.required) continue;

    const value = data[col.name];
    if (value === null || value === undefined || value === '') {
      errors.push(`Required field '${col.name}' is missing`);
    }
  }

  // Basic type validation
  for (const col of tableSchema.columns) {
    if (col.system) continue;

    const value = data[col.name];
    if (value === null || value === undefined) continue;

    switch (col.dataType) {
      case 'integer':
        if (typeof value !== 'number' || !Number.isInteger(value)) {
          // Allow numeric strings
          if (typeof value === 'string' && !isNaN(parseInt(value, 10))) {
            break;
          }
          errors.push(`Field '${col.name}' must be an integer`);
        }
        break;

      case 'decimal':
        if (typeof value !== 'number') {
          // Allow numeric strings
          if (typeof value === 'string' && !isNaN(parseFloat(value))) {
            break;
          }
          errors.push(`Field '${col.name}' must be a number`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          // Allow boolean strings
          if (value === 'true' || value === 'false' || value === '1' || value === '0') {
            break;
          }
          errors.push(`Field '${col.name}' must be a boolean`);
        }
        break;

      case 'date':
      case 'datetime':
        if (!(value instanceof Date)) {
          if (typeof value === 'string') {
            const parsed = new Date(value);
            if (isNaN(parsed.getTime())) {
              errors.push(`Field '${col.name}' must be a valid date`);
            }
          } else {
            errors.push(`Field '${col.name}' must be a date`);
          }
        }
        break;

      case 'json':
        if (typeof value !== 'object') {
          errors.push(`Field '${col.name}' must be an object or array`);
        }
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

// =============================================================================
// FLEXRECORDSERVICE CLASS
// =============================================================================

/**
 * Service for FlexDB record operations
 *
 * Provides methods for:
 * - Inserting records with validation
 * - Finding records by ID or query
 * - Updating records with optimistic locking
 * - Deleting records (soft or hard)
 */
export class FlexRecordService {
  /**
   * Insert a new record into a FlexDB table
   *
   * @param tableId - ID of the table to insert into
   * @param data - Record data
   * @param userId - Optional user ID for audit
   * @returns Created record or error
   */
  async insertRecord(
    tableId: string,
    data: Record<string, unknown>,
    userId?: string
  ): Promise<RecordServiceResult<FlexRecord>> {
    // 1. Get table schema
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

    // 2. Validate data against schema
    const validation = validateRecordData(data, table.schema);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR',
      };
    }

    // 3. Extract indexed values
    const indexedValues = extractIndexedValues(
      data,
      table.schema,
      table.indexedColumns || {}
    );

    // 4. Build search text
    const searchText = buildSearchText(data, table.schema);

    // 5. Generate ID and timestamps
    const id = createId();
    const now = new Date();

    // 6. Build full data with system fields
    const fullData: Record<string, unknown> = {
      ...data,
      id,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      deleted_at: null,
    };

    // 7. Insert record
    try {
      await db.insert(flexRecords).values({
        id,
        tableId,
        applicationId: table.applicationId,
        data: fullData,
        searchText: searchText || null,
        version: 1,
        ...indexedValues,
      });

      // 8. Fetch and return
      const created = await db.query.flexRecords.findFirst({
        where: eq(flexRecords.id, id),
      });

      if (!created) {
        return {
          success: false,
          error: 'Record created but could not be retrieved',
          code: 'INTERNAL',
        };
      }

      return { success: true, data: created };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Failed to insert record: ${message}`,
        code: 'INTERNAL',
      };
    }
  }

  /**
   * Find a single record by ID
   *
   * @param recordId - Record ID
   * @returns Record or NOT_FOUND error
   */
  async findOne(recordId: string): Promise<RecordServiceResult<FlexRecord>> {
    const record = await db.query.flexRecords.findFirst({
      where: and(
        eq(flexRecords.id, recordId),
        isNull(flexRecords.deletedAt)
      ),
    });

    if (!record) {
      return {
        success: false,
        error: `Record with ID '${recordId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    return { success: true, data: record };
  }

  /**
   * Find multiple records with filtering, ordering, and pagination
   *
   * @param params - Query parameters
   * @returns Array of records
   */
  async findMany(
    params: FlexQueryParams
  ): Promise<RecordServiceResult<FlexRecord[]>> {
    const {
      tableId,
      filter,
      orderBy,
      limit = 50,
      offset = 0,
      includeDeleted = false,
    } = params;

    // 1. Get table for schema and indexed columns
    const table = await db.query.flexTables.findFirst({
      where: eq(flexTables.id, tableId),
    });

    if (!table) {
      return {
        success: false,
        error: `Table with ID '${tableId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    // 2. Build base conditions
    const conditions: SQL[] = [eq(flexRecords.tableId, tableId)];

    if (!includeDeleted) {
      conditions.push(isNull(flexRecords.deletedAt));
    }

    // 3. Build filter conditions
    if (filter) {
      const filterCondition = buildFilterConditions(
        filter as Record<string, unknown> | FlexAdvancedFilter,
        table.schema,
        table.indexedColumns || {}
      );
      if (filterCondition) {
        conditions.push(filterCondition);
      }
    }

    // 4. Build query
    try {
      let query = db
        .select()
        .from(flexRecords)
        .where(and(...conditions))
        .$dynamic();

      // 5. Apply ordering
      if (orderBy && orderBy.length > 0) {
        const orderClauses = buildOrderBy(orderBy, table.indexedColumns || {});
        // Apply each order clause
        for (const clause of orderClauses) {
          query = query.orderBy(clause);
        }
      } else {
        // Default ordering by created_at desc
        query = query.orderBy(desc(flexRecords.createdAt));
      }

      // 6. Apply pagination
      const effectiveLimit = Math.min(limit, 100);
      query = query.limit(effectiveLimit).offset(offset);

      // 7. Execute
      const records = await query;

      return { success: true, data: records };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Failed to query records: ${message}`,
        code: 'INTERNAL',
      };
    }
  }

  /**
   * Update a record with optimistic locking
   *
   * @param recordId - Record ID
   * @param updates - Fields to update
   * @param expectedVersion - Expected current version (for conflict detection)
   * @returns Updated record or error
   */
  async updateRecord(
    recordId: string,
    updates: Record<string, unknown>,
    expectedVersion: number
  ): Promise<RecordServiceResult<FlexRecord>> {
    // 1. Get current record to fetch table info
    const existing = await db.query.flexRecords.findFirst({
      where: and(
        eq(flexRecords.id, recordId),
        isNull(flexRecords.deletedAt)
      ),
    });

    if (!existing) {
      return {
        success: false,
        error: `Record with ID '${recordId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    // 2. Get table schema
    const table = await db.query.flexTables.findFirst({
      where: eq(flexTables.id, existing.tableId),
    });

    if (!table) {
      return {
        success: false,
        error: 'Table for this record not found',
        code: 'NOT_FOUND',
      };
    }

    // 3. Merge updates with existing data
    const existingData = existing.data as Record<string, unknown>;
    const now = new Date();
    const mergedData: Record<string, unknown> = {
      ...existingData,
      ...updates,
      updated_at: now.toISOString(),
    };

    // 4. Validate merged data
    const validation = validateRecordData(mergedData, table.schema);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(', '),
        code: 'VALIDATION_ERROR',
      };
    }

    // 5. Re-extract indexed values
    const indexedValues = extractIndexedValues(
      mergedData,
      table.schema,
      table.indexedColumns || {}
    );

    // 6. Rebuild search text
    const searchText = buildSearchText(mergedData, table.schema);

    // 7. Update with version check (optimistic locking)
    try {
      const result = await db
        .update(flexRecords)
        .set({
          data: mergedData,
          searchText: searchText || null,
          version: sql`${flexRecords.version} + 1`,
          ...indexedValues,
        })
        .where(
          and(
            eq(flexRecords.id, recordId),
            eq(flexRecords.version, expectedVersion),
            isNull(flexRecords.deletedAt)
          )
        );

      // Check affected rows via separate query
      const updated = await db.query.flexRecords.findFirst({
        where: eq(flexRecords.id, recordId),
      });

      if (!updated) {
        return {
          success: false,
          error: 'Record not found after update',
          code: 'INTERNAL',
        };
      }

      // If version didn't change, it was a conflict
      if (updated.version === expectedVersion) {
        // Version conflict - record exists but version didn't match
        return {
          success: false,
          error: `Version conflict: expected version ${expectedVersion}, current version is ${existing.version}`,
          code: 'CONFLICT',
        };
      }

      return { success: true, data: updated };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Failed to update record: ${message}`,
        code: 'INTERNAL',
      };
    }
  }

  /**
   * Delete a record (soft delete by default)
   *
   * @param recordId - Record ID
   * @param hardDelete - If true, permanently delete; otherwise soft delete
   * @returns Success or error
   */
  async deleteRecord(
    recordId: string,
    hardDelete = false
  ): Promise<RecordServiceResult<{ deleted: true }>> {
    if (hardDelete) {
      // Hard delete - permanently remove
      const existing = await db.query.flexRecords.findFirst({
        where: eq(flexRecords.id, recordId),
      });

      if (!existing) {
        return {
          success: false,
          error: `Record with ID '${recordId}' not found`,
          code: 'NOT_FOUND',
        };
      }

      await db.delete(flexRecords).where(eq(flexRecords.id, recordId));

      return { success: true, data: { deleted: true } };
    }

    // Soft delete - set deletedAt
    const existing = await db.query.flexRecords.findFirst({
      where: and(
        eq(flexRecords.id, recordId),
        isNull(flexRecords.deletedAt)
      ),
    });

    if (!existing) {
      return {
        success: false,
        error: `Record with ID '${recordId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    // Update data to include deleted_at
    const existingData = existing.data as Record<string, unknown>;
    const now = new Date();
    const updatedData = {
      ...existingData,
      deleted_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    await db
      .update(flexRecords)
      .set({
        deletedAt: now,
        data: updatedData,
      })
      .where(eq(flexRecords.id, recordId));

    return { success: true, data: { deleted: true } };
  }

  /**
   * Count records matching a filter
   *
   * @param tableId - Table ID
   * @param filter - Optional filter conditions
   * @param includeDeleted - Include soft-deleted records
   * @returns Record count
   */
  async countRecords(
    tableId: string,
    filter?: Record<string, unknown> | FlexAdvancedFilter,
    includeDeleted = false
  ): Promise<RecordServiceResult<number>> {
    // Get table for schema
    const table = await db.query.flexTables.findFirst({
      where: eq(flexTables.id, tableId),
    });

    if (!table) {
      return {
        success: false,
        error: `Table with ID '${tableId}' not found`,
        code: 'NOT_FOUND',
      };
    }

    // Build conditions
    const conditions: SQL[] = [eq(flexRecords.tableId, tableId)];

    if (!includeDeleted) {
      conditions.push(isNull(flexRecords.deletedAt));
    }

    if (filter) {
      const filterCondition = buildFilterConditions(
        filter,
        table.schema,
        table.indexedColumns || {}
      );
      if (filterCondition) {
        conditions.push(filterCondition);
      }
    }

    try {
      const result = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(flexRecords)
        .where(and(...conditions));

      const count = result[0]?.count ?? 0;
      return { success: true, data: Number(count) };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred';
      return {
        success: false,
        error: `Failed to count records: ${message}`,
        code: 'INTERNAL',
      };
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const flexRecordService = new FlexRecordService();
