/**
 * FlexDB Query Builder
 *
 * Translates FlexDB query DSL into Drizzle ORM conditions.
 * Handles both indexed column queries (fast path) and JSON_EXTRACT queries.
 *
 * Supports:
 * - Simple equality filters: { field: value }
 * - Operator filters: { field: 'status', eq: 'active' }
 * - Logic operators: AND, OR, NOT with nesting
 * - Full-text search via MATCH AGAINST
 *
 * @module FlexQueryBuilder
 */

import {
  eq,
  gt,
  gte,
  lt,
  lte,
  like,
  between,
  inArray,
  isNull,
  isNotNull,
  and,
  or,
  not,
  sql,
  asc,
  desc,
} from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { flexRecords } from '../schema/flexdb.schema';
import type { FlexTableSchema } from '../schema/flexdb.schema';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Filter condition for a single field
 *
 * Use one operator per condition. Multiple operators will be ignored.
 */
export interface FlexFilterCondition {
  /** Field name to filter on */
  field: string;
  /** Equals */
  eq?: unknown;
  /** Not equals */
  ne?: unknown;
  /** Greater than (numeric comparison) */
  gt?: number;
  /** Greater than or equal (numeric comparison) */
  gte?: number;
  /** Less than (numeric comparison) */
  lt?: number;
  /** Less than or equal (numeric comparison) */
  lte?: number;
  /** Value is in array */
  in?: unknown[];
  /** String contains */
  contains?: string;
  /** String starts with */
  startsWith?: string;
  /** String ends with */
  endsWith?: string;
  /** Value is between two values (inclusive) */
  between?: [unknown, unknown];
  /** Value is null (true) or not null (false) */
  isNull?: boolean;
  /** Full-text search query (uses MATCH AGAINST) */
  search?: string;
}

/**
 * Advanced filter with logic operators
 *
 * Supports recursive nesting of conditions.
 */
export interface FlexAdvancedFilter {
  /** All conditions must match */
  AND?: (FlexFilterCondition | FlexAdvancedFilter)[];
  /** At least one condition must match */
  OR?: (FlexFilterCondition | FlexAdvancedFilter)[];
  /** Condition must not match */
  NOT?: FlexFilterCondition | FlexAdvancedFilter;
}

/**
 * Query parameters for findMany operations
 */
export interface FlexQueryParams {
  /** FlexDB table ID to query */
  tableId: string;
  /** Filter conditions (simple or advanced) */
  filter?: Record<string, unknown> | FlexAdvancedFilter;
  /** Order by clauses */
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  /** Maximum records to return (default 50, max 100) */
  limit?: number;
  /** Records to skip for pagination */
  offset?: number;
  /** Include soft-deleted records */
  includeDeleted?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Map slot name format to database column name
 *
 * @param slotName - Slot name like 'str_1', 'num_2', 'date_1'
 * @returns Database column name like 'idxStr1', 'idxNum2', 'idxDate1'
 */
export function slotNameToDbColumn(slotName: string): string {
  const match = slotName.match(/^(str|num|date)_(\d+)$/);
  if (!match) {
    throw new Error(`Invalid slot name format: ${slotName}`);
  }

  const [, type, number] = match;
  const typeMap: Record<string, string> = {
    str: 'idxStr',
    num: 'idxNum',
    date: 'idxDate',
  };

  return `${typeMap[type]}${number}`;
}

/**
 * Get the index slot name for a field if it's indexed
 *
 * @param field - Field name to check
 * @param indexedColumns - Mapping from slot names to field names
 * @returns Slot name if indexed, undefined otherwise
 */
export function getIndexSlotForField(
  field: string,
  indexedColumns: Record<string, string>
): string | undefined {
  for (const [slotName, columnName] of Object.entries(indexedColumns)) {
    if (columnName === field) {
      return slotName;
    }
  }
  return undefined;
}

/**
 * Get the Drizzle column reference for an index slot
 *
 * @param slotName - Slot name like 'str_1'
 * @returns Drizzle column reference
 */
export function getIndexedColumnRef(slotName: string) {
  const dbColumn = slotNameToDbColumn(slotName);

  const columnMap: Record<string, typeof flexRecords.idxStr1> = {
    idxStr1: flexRecords.idxStr1,
    idxStr2: flexRecords.idxStr2,
    idxStr3: flexRecords.idxStr3,
    idxNum1: flexRecords.idxNum1,
    idxNum2: flexRecords.idxNum2,
    idxDate1: flexRecords.idxDate1,
    idxDate2: flexRecords.idxDate2,
  };

  const column = columnMap[dbColumn];
  if (!column) {
    throw new Error(`Unknown index slot: ${slotName} (resolved to ${dbColumn})`);
  }

  return column;
}

// =============================================================================
// CONDITION BUILDERS
// =============================================================================

/**
 * Build a SQL condition for a single filter
 *
 * Uses indexed columns for fast queries when available,
 * falls back to JSON_EXTRACT for non-indexed fields.
 *
 * @param condition - Filter condition
 * @param schema - Table schema (for column type lookup)
 * @param indexedColumns - Mapping from slot names to field names
 * @returns SQL condition or undefined
 */
export function buildSingleCondition(
  condition: FlexFilterCondition,
  schema: FlexTableSchema,
  indexedColumns: Record<string, string>
): SQL | undefined {
  const {
    field,
    eq: eqVal,
    ne,
    gt: gtVal,
    gte: gteVal,
    lt: ltVal,
    lte: lteVal,
    in: inVal,
    contains,
    startsWith,
    endsWith,
    between: betweenVal,
    isNull: isNullVal,
    search,
  } = condition;

  // Handle full-text search first - uses searchText column, not field-specific
  if (search !== undefined) {
    return sql`MATCH(${flexRecords.searchText}) AGAINST(${search} IN BOOLEAN MODE)`;
  }

  // Check if field is indexed
  const indexSlot = getIndexSlotForField(field, indexedColumns);

  if (indexSlot) {
    // Use indexed column for fast queries
    const column = getIndexedColumnRef(indexSlot);

    if (eqVal !== undefined) return eq(column, eqVal as string);
    if (ne !== undefined) return sql`${column} <> ${ne}`;
    if (gtVal !== undefined) return gt(column, String(gtVal));
    if (gteVal !== undefined) return gte(column, String(gteVal));
    if (ltVal !== undefined) return lt(column, String(ltVal));
    if (lteVal !== undefined) return lte(column, String(lteVal));
    if (inVal !== undefined) return inArray(column, inVal as string[]);
    if (contains !== undefined) return like(column, `%${contains}%`);
    if (startsWith !== undefined) return like(column, `${startsWith}%`);
    if (endsWith !== undefined) return like(column, `%${endsWith}`);
    if (betweenVal !== undefined)
      return between(column, betweenVal[0] as string, betweenVal[1] as string);
    if (isNullVal === true) return isNull(column);
    if (isNullVal === false) return isNotNull(column);
  }

  // Use JSON_EXTRACT for non-indexed fields
  const jsonPath = `$.${field}`;

  if (eqVal !== undefined) {
    return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) = ${String(eqVal)}`;
  }
  if (ne !== undefined) {
    return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) <> ${String(ne)}`;
  }
  if (gtVal !== undefined) {
    return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) > ${gtVal}`;
  }
  if (gteVal !== undefined) {
    return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) >= ${gteVal}`;
  }
  if (ltVal !== undefined) {
    return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) < ${ltVal}`;
  }
  if (lteVal !== undefined) {
    return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) <= ${lteVal}`;
  }
  if (inVal !== undefined) {
    // Build IN clause for JSON values
    const values = inVal.map((v) => String(v));
    const placeholders = values.map(() => '?').join(', ');
    return sql.raw(
      `JSON_UNQUOTE(JSON_EXTRACT(\`data\`, '${jsonPath}')) IN (${placeholders})`,
      values
    );
  }
  if (contains !== undefined) {
    return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`%${contains}%`}`;
  }
  if (startsWith !== undefined) {
    return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`${startsWith}%`}`;
  }
  if (endsWith !== undefined) {
    return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`%${endsWith}`}`;
  }
  if (betweenVal !== undefined) {
    return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) BETWEEN ${betweenVal[0]} AND ${betweenVal[1]}`;
  }
  if (isNullVal === true) {
    return sql`JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) IS NULL`;
  }
  if (isNullVal === false) {
    return sql`JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) IS NOT NULL`;
  }

  // No operator specified - return undefined
  return undefined;
}

/**
 * Check if an object is an advanced filter with logic operators
 */
function isAdvancedFilter(
  filter: Record<string, unknown> | FlexAdvancedFilter
): filter is FlexAdvancedFilter {
  return 'AND' in filter || 'OR' in filter || 'NOT' in filter;
}

/**
 * Check if an object is a filter condition (has 'field' property)
 */
function isFilterCondition(
  obj: FlexFilterCondition | FlexAdvancedFilter
): obj is FlexFilterCondition {
  return 'field' in obj;
}

/**
 * Build filter conditions from a filter object
 *
 * Handles:
 * - Simple equality: { field: value }
 * - Advanced filters with AND/OR/NOT
 * - Recursive nesting
 *
 * @param filter - Filter object (simple or advanced)
 * @param schema - Table schema
 * @param indexedColumns - Mapping from slot names to field names
 * @returns Combined SQL condition or undefined
 */
export function buildFilterConditions(
  filter: Record<string, unknown> | FlexAdvancedFilter,
  schema: FlexTableSchema,
  indexedColumns: Record<string, string>
): SQL | undefined {
  // Simple equality filter: { field: value }
  if (!isAdvancedFilter(filter)) {
    const conditions: (SQL | undefined)[] = [];

    for (const [field, value] of Object.entries(filter)) {
      // Skip undefined values
      if (value === undefined) continue;

      // Build equality condition
      conditions.push(
        buildSingleCondition({ field, eq: value }, schema, indexedColumns)
      );
    }

    const validConditions = conditions.filter(Boolean) as SQL[];
    return validConditions.length > 0 ? and(...validConditions) : undefined;
  }

  // Advanced filter with logic operators
  const advanced = filter;

  if (advanced.AND) {
    const andConditions = advanced.AND.map((c) => {
      // Recursively handle nested filters
      if (!isFilterCondition(c)) {
        return buildFilterConditions(c, schema, indexedColumns);
      }
      return buildSingleCondition(c, schema, indexedColumns);
    }).filter(Boolean) as SQL[];

    return andConditions.length > 0 ? and(...andConditions) : undefined;
  }

  if (advanced.OR) {
    const orConditions = advanced.OR.map((c) => {
      if (!isFilterCondition(c)) {
        return buildFilterConditions(c, schema, indexedColumns);
      }
      return buildSingleCondition(c, schema, indexedColumns);
    }).filter(Boolean) as SQL[];

    return orConditions.length > 0 ? or(...orConditions) : undefined;
  }

  if (advanced.NOT) {
    const notTarget = advanced.NOT;
    let notCondition: SQL | undefined;

    if (!isFilterCondition(notTarget)) {
      notCondition = buildFilterConditions(notTarget, schema, indexedColumns);
    } else {
      notCondition = buildSingleCondition(notTarget, schema, indexedColumns);
    }

    return notCondition ? not(notCondition) : undefined;
  }

  return undefined;
}

/**
 * Build ORDER BY clause for a query
 *
 * Uses indexed columns when available for better performance.
 *
 * @param orderBy - Array of order specifications
 * @param indexedColumns - Mapping from slot names to field names
 * @returns Array of Drizzle order expressions
 */
export function buildOrderBy(
  orderBy: { field: string; direction: 'asc' | 'desc' }[],
  indexedColumns: Record<string, string>
): SQL[] {
  return orderBy.map(({ field, direction }) => {
    const indexSlot = getIndexSlotForField(field, indexedColumns);

    if (indexSlot) {
      // Use indexed column for ordering
      const column = getIndexedColumnRef(indexSlot);
      return direction === 'asc' ? asc(column) : desc(column);
    }

    // Fall back to JSON_EXTRACT for non-indexed fields
    const jsonPath = `$.${field}`;
    return direction === 'asc'
      ? sql`JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) ASC`
      : sql`JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) DESC`;
  });
}

// =============================================================================
// FLEXQUERYBUILDER CLASS
// =============================================================================

/**
 * FlexDB Query Builder
 *
 * Provides an object-oriented interface for building FlexDB queries.
 * Wraps the pure functions for convenience.
 */
export class FlexQueryBuilder {
  private schema: FlexTableSchema;
  private indexedColumns: Record<string, string>;

  constructor(schema: FlexTableSchema, indexedColumns: Record<string, string>) {
    this.schema = schema;
    this.indexedColumns = indexedColumns;
  }

  /**
   * Build a single filter condition
   */
  buildCondition(condition: FlexFilterCondition): SQL | undefined {
    return buildSingleCondition(condition, this.schema, this.indexedColumns);
  }

  /**
   * Build filter conditions from a filter object
   */
  buildFilter(
    filter: Record<string, unknown> | FlexAdvancedFilter
  ): SQL | undefined {
    return buildFilterConditions(filter, this.schema, this.indexedColumns);
  }

  /**
   * Build ORDER BY clause
   */
  buildOrderBy(
    orderBy: { field: string; direction: 'asc' | 'desc' }[]
  ): SQL[] {
    return buildOrderBy(orderBy, this.indexedColumns);
  }

  /**
   * Get the index slot for a field
   */
  getIndexSlot(field: string): string | undefined {
    return getIndexSlotForField(field, this.indexedColumns);
  }

  /**
   * Check if a field is indexed
   */
  isFieldIndexed(field: string): boolean {
    return this.getIndexSlot(field) !== undefined;
  }
}
