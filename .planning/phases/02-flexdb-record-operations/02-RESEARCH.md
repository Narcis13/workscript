# Phase 2: FlexDB Record Operations - Research

**Researched:** 2026-01-24
**Domain:** CRUD operations, dynamic query building, JSON column indexing, full-text search, referential integrity
**Confidence:** HIGH

## Summary

This phase implements full CRUD operations for FlexDB records, a dynamic query language supporting 15+ filter operations, relationship handling with referential integrity, and full-text search. The research confirms that **Drizzle ORM's dynamic query building with the `$dynamic()` method and SQL template literals** is the optimal approach for translating FlexDB's query DSL into MySQL queries.

The `flex_records` table schema was designed in Phase 1 but not implemented. This phase creates the table with JSON data column + indexed virtual columns, implements the FlexRecordService for all record operations, and creates a `flex-record` workflow node following the established FlexTableNode pattern.

**Primary recommendation:** Use Drizzle ORM's `sql` template literal for JSON_EXTRACT queries on the data column, leverage pre-existing index slots (idx_str_1-3, idx_num_1-2, idx_date_1-2) for filtered queries, and implement optimistic locking with version column for concurrent update safety.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.37.x | Query building, CRUD | Already in project, type-safe MySQL operations, `$dynamic()` for conditional queries |
| mysql2 | 3.11.x | MySQL driver | Already in project, native JSON functions, FULLTEXT support |
| Ajv | 8.17.x | Record data validation | Already in project, validates records against table schema |
| @paralleldrive/cuid2 | 2.2.x | ID generation | Already in project, collision-resistant unique IDs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.x | Date parsing | Parsing ISO date strings for date/datetime columns |
| drizzle-orm operators | 0.37.x | Filter conditions | eq, gt, gte, lt, lte, like, between, inArray, isNull, and, or, not |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dynamic SQL building | Raw SQL strings | Drizzle provides parameterization, type safety; raw SQL has injection risks |
| Application-layer joins | DB JOINs on same table | Same-table self-joins for relationships are complex; application-layer is simpler and more flexible |
| Full-text with Drizzle | Raw MATCH AGAINST | Drizzle lacks native fulltext support; raw SQL via `sql` template is the only option |

**Installation:**
No new packages required. All dependencies already installed in the project.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
  plugins/workscript/
    schema/
      flexdb.schema.ts           # Add flex_records table
    services/
      FlexDBService.ts           # Existing table operations
      FlexRecordService.ts       # NEW: Record CRUD + query engine
      FlexSchemaValidator.ts     # Add record validation
      FlexQueryBuilder.ts        # NEW: Query DSL -> Drizzle translation
      FlexRelationshipService.ts # NEW: Relationship enforcement
packages/nodes/src/
  flexdb/
    FlexTableNode.ts             # Existing table operations
    FlexRecordNode.ts            # NEW: Record operations node
    FlexRecordNode.test.ts       # NEW: Tests
```

### Pattern 1: flex_records Table Schema
**What:** Universal record storage with JSON data + indexed virtual columns
**When to use:** All FlexDB record storage
**Why:** JSON provides schema flexibility; virtual columns provide query performance

**Database Schema:**
```typescript
// Source: Phase 1 Research + MySQL documentation
import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  json,
  decimal,
  date,
  index,
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

export const flexRecords = mysqlTable(
  'flex_records',
  {
    // Primary identifier
    id: varchar('id', { length: 128 })
      .primaryKey()
      .$defaultFn(() => createId()),

    // Foreign key to flex_tables
    tableId: varchar('table_id', { length: 128 }).notNull(),

    // Application scope for multi-tenancy
    applicationId: varchar('application_id', { length: 128 }).notNull(),

    // JSON data column - stores all record fields
    data: json('data').notNull().$type<Record<string, unknown>>(),

    // Indexed string slots (populated based on table's indexedColumns mapping)
    idxStr1: varchar('idx_str_1', { length: 255 }),
    idxStr2: varchar('idx_str_2', { length: 255 }),
    idxStr3: varchar('idx_str_3', { length: 255 }),

    // Indexed numeric slots
    idxNum1: decimal('idx_num_1', { precision: 18, scale: 4 }),
    idxNum2: decimal('idx_num_2', { precision: 18, scale: 4 }),

    // Indexed date slots
    idxDate1: date('idx_date_1'),
    idxDate2: date('idx_date_2'),

    // Full-text search column
    searchText: text('search_text'),

    // Version for optimistic locking
    version: int('version').notNull().default(1),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    // Table lookup index
    tableIdx: index('flex_records_table_idx').on(table.tableId),
    // Application index
    appIdx: index('flex_records_app_idx').on(table.applicationId),
    // String index slots
    str1Idx: index('flex_records_str_1_idx').on(table.idxStr1),
    str2Idx: index('flex_records_str_2_idx').on(table.idxStr2),
    str3Idx: index('flex_records_str_3_idx').on(table.idxStr3),
    // Numeric index slots
    num1Idx: index('flex_records_num_1_idx').on(table.idxNum1),
    num2Idx: index('flex_records_num_2_idx').on(table.idxNum2),
    // Date index slots
    date1Idx: index('flex_records_date_1_idx').on(table.idxDate1),
    date2Idx: index('flex_records_date_2_idx').on(table.idxDate2),
    // Full-text index - must be created via raw SQL migration
    // CREATE FULLTEXT INDEX flex_records_search_idx ON flex_records(search_text);
  })
);
```

### Pattern 2: Dynamic Query Building with Drizzle
**What:** Translate FlexDB query DSL into Drizzle queries with conditional filters
**When to use:** findMany with filters, pagination, sorting

**Example:**
```typescript
// Source: https://orm.drizzle.team/docs/dynamic-query-building
import { eq, gt, gte, lt, lte, like, between, inArray, isNull, and, or, not, sql, SQL } from 'drizzle-orm';
import type { MySqlSelect } from 'drizzle-orm/mysql-core';

interface FlexFilter {
  field: string;
  op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'startsWith' | 'endsWith' | 'between' | 'isNull' | 'search';
  value?: unknown;
  value2?: unknown; // For between
}

interface FlexQuery {
  filters?: FlexFilter[];
  logic?: 'AND' | 'OR';
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
}

function buildWhereConditions(
  tableSchema: FlexTableSchema,
  indexedColumns: Record<string, string>,
  query: FlexQuery
): SQL | undefined {
  if (!query.filters || query.filters.length === 0) return undefined;

  const conditions: SQL[] = [];

  for (const filter of query.filters) {
    const condition = buildFilterCondition(filter, tableSchema, indexedColumns);
    if (condition) conditions.push(condition);
  }

  if (conditions.length === 0) return undefined;
  return query.logic === 'OR' ? or(...conditions) : and(...conditions);
}

function buildFilterCondition(
  filter: FlexFilter,
  tableSchema: FlexTableSchema,
  indexedColumns: Record<string, string>
): SQL | undefined {
  const { field, op, value, value2 } = filter;

  // Determine which column to query: indexed slot or JSON extract
  const indexSlot = Object.entries(indexedColumns).find(([slot, col]) => col === field)?.[0];

  if (indexSlot) {
    // Use indexed column for fast queries
    const column = getIndexedColumn(indexSlot);
    return buildOperatorCondition(column, op, value, value2);
  } else {
    // Use JSON_EXTRACT for non-indexed fields
    return buildJsonCondition(field, op, value, value2);
  }
}

function buildJsonCondition(field: string, op: string, value: unknown, value2?: unknown): SQL {
  // Source: https://github.com/drizzle-team/drizzle-orm/discussions/938
  const jsonPath = `$.${field}`;

  switch (op) {
    case 'eq':
      return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) = ${value}`;
    case 'contains':
      return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`%${value}%`}`;
    case 'search':
      return sql`MATCH(${flexRecords.searchText}) AGAINST(${value} IN BOOLEAN MODE)`;
    // ... other operations
  }
}
```

### Pattern 3: Optimistic Locking for Updates
**What:** Prevent lost updates from concurrent modifications
**When to use:** All record update operations

**Example:**
```typescript
// Source: https://medium.com/@sumit-s/optimistic-locking-concurrency-control-with-a-version-column-2e3db2a8120d
async function updateRecord(
  recordId: string,
  updates: Record<string, unknown>,
  expectedVersion: number
): Promise<ServiceResult<FlexRecord>> {
  // Update with version check in WHERE clause
  const result = await db
    .update(flexRecords)
    .set({
      data: updates,
      version: sql`${flexRecords.version} + 1`,
    })
    .where(
      and(
        eq(flexRecords.id, recordId),
        eq(flexRecords.version, expectedVersion),
        isNull(flexRecords.deletedAt)
      )
    );

  // Check affected rows
  if ((result as any).affectedRows === 0) {
    // Could be not found OR version conflict
    const existing = await db.query.flexRecords.findFirst({
      where: eq(flexRecords.id, recordId),
    });

    if (!existing) {
      return { success: false, error: 'Record not found', code: 'NOT_FOUND' };
    }
    return { success: false, error: 'Version conflict', code: 'CONFLICT' };
  }

  return fetchRecord(recordId);
}
```

### Pattern 4: Index Slot Population on Insert/Update
**What:** Extract indexed values from JSON data and populate index columns
**When to use:** Every insert and update operation

**Example:**
```typescript
// Source: Phase 1 indexedColumns mapping
function extractIndexedValues(
  data: Record<string, unknown>,
  tableSchema: FlexTableSchema,
  indexedColumns: Record<string, string>
): Partial<typeof flexRecords.$inferInsert> {
  const values: Record<string, unknown> = {};

  for (const [slotName, columnName] of Object.entries(indexedColumns)) {
    const value = data[columnName];
    const column = tableSchema.columns.find(c => c.name === columnName);

    if (value !== undefined && column) {
      const dbColumnName = slotNameToDbColumn(slotName); // 'str_1' -> 'idxStr1'
      values[dbColumnName] = coerceValueForSlot(value, column.dataType);
    }
  }

  return values;
}

function buildSearchText(
  data: Record<string, unknown>,
  tableSchema: FlexTableSchema
): string {
  // Concatenate all string/text fields for full-text search
  const searchableFields = tableSchema.columns
    .filter(c => c.dataType === 'string' || c.dataType === 'text')
    .filter(c => !c.system);

  return searchableFields
    .map(col => String(data[col.name] || ''))
    .filter(Boolean)
    .join(' ');
}
```

### Pattern 5: Relationship Validation (Application Layer)
**What:** Validate referenced records exist before insert
**When to use:** Columns with dataType: 'reference'

**Example:**
```typescript
// Source: Application-layer referential integrity patterns
async function validateReferences(
  data: Record<string, unknown>,
  tableSchema: FlexTableSchema,
  applicationId: string
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const referenceColumns = tableSchema.columns.filter(
    col => col.dataType === 'reference' && col.validation?.targetTable
  );

  for (const col of referenceColumns) {
    const refValue = data[col.name];
    if (!refValue && !col.required) continue;

    if (refValue) {
      // Validate referenced record exists
      const targetTable = await flexDBService.getTableByName(
        applicationId,
        col.validation!.targetTable!
      );

      if (!targetTable.success) {
        errors.push(`Reference column '${col.name}' targets non-existent table '${col.validation!.targetTable}'`);
        continue;
      }

      const referencedRecord = await db.query.flexRecords.findFirst({
        where: and(
          eq(flexRecords.id, String(refValue)),
          eq(flexRecords.tableId, targetTable.data!.id),
          isNull(flexRecords.deletedAt)
        ),
      });

      if (!referencedRecord) {
        errors.push(`Referenced record '${refValue}' not found for column '${col.name}'`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Anti-Patterns to Avoid
- **Querying JSON without index columns:** Always use indexed slots when filtering on fields marked `indexed: true`. JSON_EXTRACT on unindexed fields is 1000x+ slower.
- **Ignoring optimistic locking:** Never update records without version check. Lost updates cause data inconsistency.
- **Silently failing referential integrity:** Always validate references before insert. Return clear errors when references are invalid.
- **Building SQL strings manually:** Always use Drizzle's `sql` template or operators. Manual string concatenation risks SQL injection.
- **Multiple `.where()` calls:** Drizzle only applies the last `.where()`. Use `and()` to combine conditions.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Query DSL parsing | Custom parser | Type-safe interface + switch/case | DSL is simple enough; parser overkill |
| JSON path extraction | Manual string parsing | MySQL JSON_EXTRACT via `sql` | Native performance, handles edge cases |
| Full-text search | LIKE queries | MySQL FULLTEXT + MATCH AGAINST | 10-100x faster, relevance ranking |
| Optimistic locking | Manual version tracking | Version column in WHERE clause | Standard pattern, race-condition safe |
| Date handling | new Date() | date-fns parseISO | Handles ISO formats, timezone edge cases |
| Pagination | Manual offset calc | Drizzle .limit().offset() | Clean API, type-safe |

**Key insight:** The query language requirements (QRY-01 through QRY-09) map directly to Drizzle ORM operators. Don't build a custom query engine - translate the DSL to Drizzle operations.

## Common Pitfalls

### Pitfall 1: Wrong Column for Filtered Queries
**What goes wrong:** Querying JSON_EXTRACT when field has an index slot assigned
**Why it happens:** Not checking indexedColumns mapping before building query
**How to avoid:** Always lookup field in indexedColumns first; use index column if available
**Warning signs:** Slow queries on fields that should be fast, EXPLAIN showing no index use

### Pitfall 2: Version Conflicts Returning Wrong Error
**What goes wrong:** Update returns NOT_FOUND when it's actually a version conflict
**Why it happens:** Only checking affected rows, not distinguishing between cases
**How to avoid:** After 0 affected rows, fetch record to determine if NOT_FOUND or CONFLICT
**Warning signs:** Users unable to save changes, reporting "not found" for records they're viewing

### Pitfall 3: Full-Text Index Not Created
**What goes wrong:** MATCH AGAINST query fails with "Can't find FULLTEXT index"
**Why it happens:** Drizzle schema doesn't create FULLTEXT index automatically
**How to avoid:** Create FULLTEXT index via migration or raw SQL separately
**Warning signs:** Full-text search queries throwing errors in production

### Pitfall 4: Reference Validation on Soft-Deleted Records
**What goes wrong:** Insert succeeds referencing a soft-deleted record
**Why it happens:** Not filtering `deleted_at IS NULL` in reference validation
**How to avoid:** Always include `isNull(flexRecords.deletedAt)` in reference checks
**Warning signs:** Records referencing "deleted" data, broken relationships

### Pitfall 5: Index Slot Type Mismatch
**What goes wrong:** Indexed values stored as wrong type, queries return no results
**Why it happens:** Not coercing values to match slot type (string to VARCHAR, number to DECIMAL)
**How to avoid:** Type-coerce values in extractIndexedValues based on dataType
**Warning signs:** Indexed queries returning empty when data exists, type casting errors

### Pitfall 6: AND vs OR Logic Inversion
**What goes wrong:** Filters combined with wrong logic, too many/few results
**Why it happens:** Default AND when user expects OR, or vice versa
**How to avoid:** Make logic operator explicit in query interface, default to AND
**Warning signs:** Users reporting "filter doesn't work", query results inconsistent

## Code Examples

Verified patterns from official sources and codebase:

### FlexRecordService Insert with Index Population
```typescript
// Source: Codebase patterns + Phase 1 research
import { db } from '../../../db';
import { eq, and, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { flexRecords, flexTables } from '../schema/flexdb.schema';

interface InsertResult<T> {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  code: 'NOT_FOUND' | 'VALIDATION_ERROR' | 'REFERENCE_ERROR' | 'INTERNAL';
}

async function insertRecord(
  tableId: string,
  data: Record<string, unknown>,
  userId?: string
): Promise<InsertResult<FlexRecord>> {
  // 1. Get table schema
  const table = await db.query.flexTables.findFirst({
    where: and(eq(flexTables.id, tableId), eq(flexTables.isActive, true)),
  });

  if (!table) {
    return { success: false, error: 'Table not found', code: 'NOT_FOUND' };
  }

  // 2. Validate data against schema
  const validation = validateRecordData(data, table.schema);
  if (!validation.valid) {
    return { success: false, error: validation.errors.join(', '), code: 'VALIDATION_ERROR' };
  }

  // 3. Validate references
  const refValidation = await validateReferences(data, table.schema, table.applicationId);
  if (!refValidation.valid) {
    return { success: false, error: refValidation.errors.join(', '), code: 'REFERENCE_ERROR' };
  }

  // 4. Extract indexed values
  const indexedValues = extractIndexedValues(
    data,
    table.schema,
    table.indexedColumns || {}
  );

  // 5. Build search text
  const searchText = buildSearchText(data, table.schema);

  // 6. Insert record
  const id = createId();
  const now = new Date();

  const fullData = {
    ...data,
    id,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
  };

  await db.insert(flexRecords).values({
    id,
    tableId,
    applicationId: table.applicationId,
    data: fullData,
    searchText,
    version: 1,
    ...indexedValues,
  });

  // 7. Fetch and return
  const created = await db.query.flexRecords.findFirst({
    where: eq(flexRecords.id, id),
  });

  return { success: true, data: created! };
}
```

### FlexQueryBuilder for findMany
```typescript
// Source: https://orm.drizzle.team/docs/dynamic-query-building + https://orm.drizzle.team/docs/operators
import { eq, gt, gte, lt, lte, like, between, inArray, isNull, isNotNull, and, or, not, sql, asc, desc, SQL } from 'drizzle-orm';

interface FlexQueryParams {
  tableId: string;
  filter?: Record<string, unknown> | FlexAdvancedFilter;
  orderBy?: { field: string; direction: 'asc' | 'desc' }[];
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
}

interface FlexAdvancedFilter {
  AND?: FlexFilterCondition[];
  OR?: FlexFilterCondition[];
  NOT?: FlexFilterCondition;
}

interface FlexFilterCondition {
  field: string;
  eq?: unknown;
  ne?: unknown;
  gt?: number;
  gte?: number;
  lt?: number;
  lte?: number;
  in?: unknown[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  between?: [unknown, unknown];
  isNull?: boolean;
  search?: string;
}

async function findMany(params: FlexQueryParams): Promise<FlexRecord[]> {
  const { tableId, filter, orderBy, limit = 50, offset = 0, includeDeleted = false } = params;

  // Get table for schema and indexed columns
  const table = await db.query.flexTables.findFirst({
    where: eq(flexTables.id, tableId),
  });
  if (!table) throw new Error('Table not found');

  // Base conditions
  const conditions: SQL[] = [
    eq(flexRecords.tableId, tableId),
  ];

  if (!includeDeleted) {
    conditions.push(isNull(flexRecords.deletedAt));
  }

  // Build filter conditions
  if (filter) {
    const filterCondition = buildFilterConditions(filter, table.schema, table.indexedColumns || {});
    if (filterCondition) conditions.push(filterCondition);
  }

  // Build query with $dynamic() for type safety
  let query = db
    .select()
    .from(flexRecords)
    .where(and(...conditions))
    .$dynamic();

  // Apply ordering
  if (orderBy && orderBy.length > 0) {
    const orderClauses = orderBy.map(({ field, direction }) => {
      const indexSlot = getIndexSlotForField(field, table.indexedColumns || {});
      if (indexSlot) {
        const column = getIndexedColumnRef(indexSlot);
        return direction === 'asc' ? asc(column) : desc(column);
      }
      // For non-indexed fields, order by JSON_EXTRACT
      return direction === 'asc'
        ? sql`JSON_EXTRACT(${flexRecords.data}, ${`$.${field}`}) ASC`
        : sql`JSON_EXTRACT(${flexRecords.data}, ${`$.${field}`}) DESC`;
    });
    query = query.orderBy(...orderClauses);
  }

  // Apply pagination
  query = query.limit(Math.min(limit, 100)).offset(offset);

  return query;
}

function buildFilterConditions(
  filter: Record<string, unknown> | FlexAdvancedFilter,
  schema: FlexTableSchema,
  indexedColumns: Record<string, string>
): SQL | undefined {
  // Simple equality filter: { field: value }
  if (!('AND' in filter) && !('OR' in filter) && !('NOT' in filter)) {
    const conditions = Object.entries(filter).map(([field, value]) =>
      buildSingleCondition({ field, eq: value }, schema, indexedColumns)
    );
    return conditions.length > 0 ? and(...conditions) : undefined;
  }

  // Advanced filter with logic operators
  const advanced = filter as FlexAdvancedFilter;

  if (advanced.AND) {
    const andConditions = advanced.AND.map(c => buildSingleCondition(c, schema, indexedColumns));
    return and(...andConditions);
  }

  if (advanced.OR) {
    const orConditions = advanced.OR.map(c => buildSingleCondition(c, schema, indexedColumns));
    return or(...orConditions);
  }

  if (advanced.NOT) {
    const notCondition = buildSingleCondition(advanced.NOT, schema, indexedColumns);
    return not(notCondition!);
  }

  return undefined;
}

function buildSingleCondition(
  condition: FlexFilterCondition,
  schema: FlexTableSchema,
  indexedColumns: Record<string, string>
): SQL {
  const { field, eq: eqVal, ne, gt: gtVal, gte: gteVal, lt: ltVal, lte: lteVal,
          in: inVal, contains, startsWith, endsWith, between: betweenVal, isNull: isNullVal, search } = condition;

  // Check if field is indexed
  const indexSlot = getIndexSlotForField(field, indexedColumns);

  if (indexSlot) {
    // Use indexed column
    const column = getIndexedColumnRef(indexSlot);

    if (eqVal !== undefined) return eq(column, eqVal);
    if (ne !== undefined) return sql`${column} <> ${ne}`;
    if (gtVal !== undefined) return gt(column, gtVal);
    if (gteVal !== undefined) return gte(column, gteVal);
    if (ltVal !== undefined) return lt(column, ltVal);
    if (lteVal !== undefined) return lte(column, lteVal);
    if (inVal !== undefined) return inArray(column, inVal);
    if (contains !== undefined) return like(column, `%${contains}%`);
    if (startsWith !== undefined) return like(column, `${startsWith}%`);
    if (endsWith !== undefined) return like(column, `%${endsWith}`);
    if (betweenVal !== undefined) return between(column, betweenVal[0], betweenVal[1]);
    if (isNullVal === true) return isNull(column);
    if (isNullVal === false) return isNotNull(column);
  }

  // Use JSON_EXTRACT for non-indexed fields
  const jsonPath = `$.${field}`;

  if (eqVal !== undefined) return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) = ${eqVal}`;
  if (ne !== undefined) return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) <> ${ne}`;
  if (gtVal !== undefined) return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) > ${gtVal}`;
  if (gteVal !== undefined) return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) >= ${gteVal}`;
  if (ltVal !== undefined) return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) < ${ltVal}`;
  if (lteVal !== undefined) return sql`CAST(JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) AS DECIMAL) <= ${lteVal}`;
  if (contains !== undefined) return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`%${contains}%`}`;
  if (startsWith !== undefined) return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`${startsWith}%`}`;
  if (endsWith !== undefined) return sql`JSON_UNQUOTE(JSON_EXTRACT(${flexRecords.data}, ${jsonPath})) LIKE ${`%${endsWith}`}`;
  if (search !== undefined) return sql`MATCH(${flexRecords.searchText}) AGAINST(${search} IN BOOLEAN MODE)`;
  if (isNullVal === true) return sql`JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) IS NULL`;
  if (isNullVal === false) return sql`JSON_EXTRACT(${flexRecords.data}, ${jsonPath}) IS NOT NULL`;

  throw new Error(`Unsupported filter condition for field: ${field}`);
}
```

### FlexRecordNode (Workflow Node)
```typescript
// Source: FlexTableNode pattern from codebase
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class FlexRecordNode extends WorkflowNode {
  metadata = {
    id: 'flex-record',
    name: 'FlexDB Record Operations',
    version: '1.0.0',
    description: 'Create, read, update, and delete FlexDB records with query support',
    inputs: ['operation', 'tableId', 'tableName', 'recordId', 'data', 'filter', 'orderBy', 'limit', 'offset', 'include'],
    outputs: ['record', 'records', 'count', 'deleted', 'version'],
    edgeDescriptions: {
      success: 'Operation completed successfully',
      found: 'Record(s) found',
      not_found: 'Record not found',
      empty: 'Query returned no results',
      conflict: 'Version conflict during update',
      error: 'Operation failed - check error message',
    },
    ai_hints: {
      purpose: 'Perform CRUD operations on FlexDB records with filtering and relationships',
      when_to_use: 'When you need to insert, find, update, or delete records in a FlexDB table',
      expected_edges: ['success', 'found', 'not_found', 'empty', 'conflict', 'error'],
      example_usage: '{"flex-record": {"operation": "insert", "tableId": "$.flexTableId", "data": {"name": "John"}, "success?": {...}}}',
      example_config: '{"operation": "insert|findOne|findMany|update|delete", "tableId": "string", "data?": "object", "filter?": "object", "orderBy?": "[{field, direction}]"}',
      get_from_state: ['applicationId', 'flexTableId'],
      post_to_state: ['flexRecord', 'flexRecords', 'flexRecordId', 'flexRecordCount'],
    },
  };

  async execute(context: ExecutionContext, config?: Record<string, unknown>): Promise<EdgeMap> {
    const { operation, tableId, tableName, recordId, data, filter, orderBy, limit, offset, include } = config || {};

    // Get service from context
    const flexRecordService = (context as any).services?.flexRecord;
    if (!flexRecordService) {
      return { error: () => ({ error: 'FlexRecordService not available', code: 'SERVICE_UNAVAILABLE' }) };
    }

    // Resolve table ID from state or config
    const resolvedTableId = tableId || context.state.flexTableId;
    if (!resolvedTableId && operation !== 'findByTableName') {
      return { error: () => ({ error: 'tableId is required', code: 'MISSING_TABLE_ID' }) };
    }

    switch (operation) {
      case 'insert':
        return this.handleInsert(context, flexRecordService, resolvedTableId as string, data as Record<string, unknown>);
      case 'findOne':
        return this.handleFindOne(context, flexRecordService, resolvedTableId as string, recordId as string);
      case 'findMany':
        return this.handleFindMany(context, flexRecordService, resolvedTableId as string, filter, orderBy, limit, offset, include);
      case 'update':
        return this.handleUpdate(context, flexRecordService, recordId as string, data as Record<string, unknown>);
      case 'delete':
        return this.handleDelete(context, flexRecordService, recordId as string, config?.hardDelete as boolean);
      default:
        return { error: () => ({ error: `Unknown operation: ${operation}`, code: 'UNKNOWN_OPERATION' }) };
    }
  }

  // ... handler methods follow FlexTableNode pattern
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw SQL string building | Drizzle `sql` template literal | Drizzle 0.29+ (2024) | Type-safe, parameterized queries |
| Single `.where()` chaining | `and()`/`or()` with condition arrays | Always in Drizzle | Correct filter combination |
| Manual JSON path access | JSON_EXTRACT in `sql` template | MySQL 5.7+ native | Clean, performant JSON queries |
| Database triggers for RI | Application-layer validation | Microservices era | More flexible, testable |
| Pessimistic locking | Optimistic locking with version | Modern web apps | Better concurrency, UX |

**Deprecated/outdated:**
- **EAV tables for dynamic schemas:** Superseded by JSON columns
- **Native MySQL fulltext in Drizzle:** Still requires raw SQL; PR #1030 not merged
- **Multiple `.where()` calls:** Never supported in Drizzle; last call wins

## Open Questions

Things that couldn't be fully resolved:

1. **Full-Text Index Creation in Drizzle**
   - What we know: Drizzle doesn't have built-in FULLTEXT index support
   - What's unclear: Best way to create index - migration file or raw SQL in service
   - Recommendation: Create via db:push migration with raw SQL statement

2. **Include Related Records Performance**
   - What we know: REL-03 requires including related records in query results
   - What's unclear: Performance implications of application-layer "joins" vs single query
   - Recommendation: Start with application-layer approach (multiple queries); optimize if needed

3. **Cascade Delete Implementation**
   - What we know: REL-04 requires onDelete behavior (cascade, set-null, restrict)
   - What's unclear: How to efficiently cascade across potentially many records
   - Recommendation: Implement in FlexRecordService delete method; batch updates for cascade

4. **Search Text Column Size**
   - What we know: TEXT column has 65KB limit
   - What's unclear: Whether records with many text fields could exceed limit
   - Recommendation: Truncate search_text at 60KB; log warning if truncated

## Sources

### Primary (HIGH confidence)
- [Drizzle ORM - Dynamic Query Building](https://orm.drizzle.team/docs/dynamic-query-building) - `$dynamic()` method, condition arrays
- [Drizzle ORM - Operators](https://orm.drizzle.team/docs/operators) - eq, gt, gte, lt, lte, like, between, inArray, isNull, and, or, not
- [Drizzle ORM - MySQL Column Types](https://orm.drizzle.team/docs/column-types/mysql) - JSON column, `$type<T>()` annotation
- Existing codebase patterns:
  - `/apps/api/src/plugins/workscript/services/FlexDBService.ts` - Service pattern, error handling
  - `/apps/api/src/plugins/workscript/resources/ResourceRepository.ts` - Dynamic query building with conditions array
  - `/packages/nodes/src/flexdb/FlexTableNode.ts` - Workflow node pattern
  - `/packages/nodes/src/data/FilterNode.ts` - Query operation patterns

### Secondary (MEDIUM confidence)
- [GitHub: Drizzle ORM JSON query discussion](https://github.com/drizzle-team/drizzle-orm/discussions/938) - JSON_EXTRACT via sql template
- [GitHub: MySQL fulltext search PR](https://github.com/drizzle-team/drizzle-orm/pull/1030/files) - MATCH AGAINST implementation (not merged)
- [Optimistic Locking with Version Column](https://medium.com/@sumit-s/optimistic-locking-concurrency-control-with-a-version-column-2e3db2a8120d) - Pattern for concurrent updates
- [Application Layer Referential Integrity](https://www.linkedin.com/pulse/referential-integrity-solution-pattern-world-document-addepalli) - Patterns for validation

### Tertiary (LOW confidence)
- MySQL 8.0 fulltext documentation for BOOLEAN MODE specifics (needs verification for Drizzle integration)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, verified with official docs
- Architecture: HIGH - Patterns verified from official Drizzle docs and codebase
- Query building: HIGH - `$dynamic()` and operators well-documented
- Pitfalls: HIGH - Based on codebase examples and official Drizzle gotchas
- Full-text search: MEDIUM - Requires raw SQL, native support pending

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable technologies)
