/**
 * FlexDB Version Service
 *
 * Tracks schema changes for auditing and potential rollback.
 * Each table modification creates a version entry with:
 * - Previous and new schema snapshots
 * - Array of specific changes (add/remove/modify columns)
 * - User attribution for audit trails
 *
 * @module FlexVersionService
 */

import { db } from '../../../db';
import { eq, desc } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import type {
  FlexTableSchema,
  FlexColumnDefinition,
  SchemaChange,
  FlexTableVersion,
} from '../schema/flexdb.schema';
import { flexTableVersions } from '../schema/flexdb.schema';

// =============================================================================
// SCHEMA CHANGE DETECTION
// =============================================================================

/**
 * Computes the differences between two schema versions
 *
 * Detects three types of changes:
 * - add_column: Column exists in new but not in old
 * - remove_column: Column exists in old but not in new
 * - modify_column: Column exists in both but has different properties
 *
 * @param oldSchema - Previous schema state (null for initial creation)
 * @param newSchema - New schema state
 * @returns Array of schema changes
 *
 * @example
 * const changes = computeSchemaChanges(
 *   { columns: [{ name: 'name', dataType: 'string' }], version: 1 },
 *   { columns: [
 *     { name: 'name', dataType: 'string' },
 *     { name: 'email', dataType: 'string' }
 *   ], version: 2 }
 * );
 * // [{ type: 'add_column', column: 'email', details: { after: {...} } }]
 */
export function computeSchemaChanges(
  oldSchema: FlexTableSchema | null,
  newSchema: FlexTableSchema
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  // Create lookup maps for efficient comparison
  const oldColumns = new Map<string, FlexColumnDefinition>(
    oldSchema?.columns.map((col) => [col.name, col]) ?? []
  );
  const newColumns = new Map<string, FlexColumnDefinition>(
    newSchema.columns.map((col) => [col.name, col])
  );

  // Find added columns (in new, not in old)
  for (const [name, column] of newColumns) {
    if (!oldColumns.has(name)) {
      changes.push({
        type: 'add_column',
        column: name,
        details: {
          after: column,
        },
      });
    }
  }

  // Find removed columns (in old, not in new)
  for (const [name, column] of oldColumns) {
    if (!newColumns.has(name)) {
      changes.push({
        type: 'remove_column',
        column: name,
        details: {
          before: column,
        },
      });
    }
  }

  // Find modified columns (in both, but properties differ)
  for (const [name, newColumn] of newColumns) {
    const oldColumn = oldColumns.get(name);
    if (oldColumn) {
      // Compare serialized versions to detect any property changes
      const oldJson = JSON.stringify(oldColumn);
      const newJson = JSON.stringify(newColumn);

      if (oldJson !== newJson) {
        changes.push({
          type: 'modify_column',
          column: name,
          details: {
            before: oldColumn,
            after: newColumn,
          },
        });
      }
    }
  }

  return changes;
}

// =============================================================================
// VERSION SERVICE CLASS
// =============================================================================

/**
 * Service for managing FlexDB schema version history
 *
 * Provides methods for:
 * - Creating version entries when schemas change
 * - Retrieving version history for tables
 * - Computing schema differences
 */
export class FlexVersionService {
  /**
   * Creates a new version entry for a table schema change
   *
   * This method should be called whenever a table's schema is modified.
   * It computes the changes automatically and stores the complete audit trail.
   *
   * @param tableId - ID of the flex_table being modified
   * @param previousSchema - Schema before this change (null for new tables)
   * @param newSchema - Schema after this change
   * @param userId - Optional user ID for audit attribution
   * @returns The created version entry
   *
   * @example
   * await flexVersionService.createVersionEntry(
   *   'tbl_abc123',
   *   null,  // First version
   *   { columns: [...], version: 1 },
   *   'user_xyz'
   * );
   */
  async createVersionEntry(
    tableId: string,
    previousSchema: FlexTableSchema | null,
    newSchema: FlexTableSchema,
    userId?: string
  ): Promise<FlexTableVersion> {
    // Compute what changed
    const changes = computeSchemaChanges(previousSchema, newSchema);

    // Generate unique ID
    const id = createId();

    // Insert version record
    await db.insert(flexTableVersions).values({
      id,
      tableId,
      version: newSchema.version,
      previousSchema,
      newSchema,
      changes,
      createdBy: userId,
    });

    // Return the created record
    const created = await db.query.flexTableVersions.findFirst({
      where: eq(flexTableVersions.id, id),
    });

    // Should never be null since we just inserted it
    return created!;
  }

  /**
   * Retrieves the complete version history for a table
   *
   * Returns versions in descending order (newest first).
   *
   * @param tableId - ID of the table to get history for
   * @returns Array of version entries, newest first
   *
   * @example
   * const history = await flexVersionService.getVersionHistory('tbl_abc123');
   * console.log(`${history.length} versions found`);
   * console.log(`Current version: ${history[0].version}`);
   */
  async getVersionHistory(tableId: string): Promise<FlexTableVersion[]> {
    const versions = await db.query.flexTableVersions.findMany({
      where: eq(flexTableVersions.tableId, tableId),
      orderBy: [desc(flexTableVersions.version)],
    });

    return versions;
  }

  /**
   * Retrieves a specific version entry for a table
   *
   * @param tableId - ID of the table
   * @param version - Version number to retrieve
   * @returns Version entry or null if not found
   *
   * @example
   * const v1 = await flexVersionService.getVersion('tbl_abc123', 1);
   * if (v1) {
   *   console.log('Initial schema:', v1.newSchema);
   * }
   */
  async getVersion(tableId: string, version: number): Promise<FlexTableVersion | null> {
    const entry = await db.query.flexTableVersions.findFirst({
      where: (versions, { and, eq }) =>
        and(eq(versions.tableId, tableId), eq(versions.version, version)),
    });

    return entry ?? null;
  }

  /**
   * Gets the latest version entry for a table
   *
   * @param tableId - ID of the table
   * @returns Latest version entry or null if table has no versions
   */
  async getLatestVersion(tableId: string): Promise<FlexTableVersion | null> {
    const entry = await db.query.flexTableVersions.findFirst({
      where: eq(flexTableVersions.tableId, tableId),
      orderBy: [desc(flexTableVersions.version)],
    });

    return entry ?? null;
  }
}

/**
 * Singleton instance for convenience
 */
export const flexVersionService = new FlexVersionService();
