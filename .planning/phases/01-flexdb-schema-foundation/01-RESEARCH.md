# Phase 1: FlexDB Schema Foundation - Research

**Researched:** 2026-01-23
**Domain:** Runtime database schema management, MySQL JSON columns, Drizzle ORM, TypeScript validation
**Confidence:** HIGH

## Summary

This phase implements FlexDB - a runtime database schema system that allows users to create tables dynamically without traditional database migrations. The research confirms that the optimal approach is a **JSON column pattern with indexed virtual columns**, not the older EAV (Entity-Attribute-Value) pattern which has severe performance issues.

The existing codebase uses Drizzle ORM 0.37.x with MySQL, Ajv 8.17.x for validation, and a well-established node pattern in `@workscript/nodes`. The FlexDB implementation will follow this established architecture: database schema in `/apps/api/src/plugins/workscript/schema/`, service layer for business logic, and a new `flex-table` workflow node.

**Primary recommendation:** Use a fixed schema with JSON `data` column + generated virtual columns for indexed fields (3 string, 2 numeric, 2 date slots). Store schema definitions in a `flex_tables` table with JSON `schema` column. Track version history in `flex_table_versions` table.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | 0.37.x | Database ORM | Already in project, type-safe MySQL operations |
| mysql2 | 3.11.x | MySQL driver | Already in project, native MySQL JSON support |
| Ajv | 8.17.x | JSON Schema validation | Already in project, fastest JSON validator, compile-time optimization |
| @paralleldrive/cuid2 | 2.2.x | ID generation | Already in project, collision-resistant unique IDs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 4.1.x | Date manipulation | ISO date parsing/formatting for date/datetime types |
| zod | 4.1.x | Runtime validation | Optional secondary validation layer for API inputs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON column | EAV pattern | EAV has 15000x slower queries, requires many JOINs, type casting overhead |
| Virtual columns | Stored columns | Virtual uses no storage, computed on read; stored doubles storage but faster writes |
| Ajv | Zod | Ajv is 5-18x faster for high-throughput validation, project already uses it |

**Installation:**
No new packages required. All dependencies already installed in the project.

## Architecture Patterns

### Recommended Project Structure
```
apps/api/src/
  plugins/workscript/
    schema/
      flexdb.schema.ts           # Drizzle schema for flex_tables, flex_records, flex_table_versions
    services/
      FlexDBService.ts           # Core service: createTable, updateSchema, version tracking
      FlexSchemaValidator.ts     # Ajv-based column validation
    repositories/
      flexTableRepository.ts     # Data access layer
packages/nodes/src/
  flexdb/
    FlexTableNode.ts             # Workflow node for schema operations
    FlexTableNode.test.ts        # Tests
```

### Pattern 1: Fixed Schema with JSON Data + Indexed Virtual Columns
**What:** Store all record data in a JSON column, but extract indexed fields to generated virtual columns
**When to use:** Runtime-defined schemas where you need both flexibility AND query performance
**Why:** JSON gives schema flexibility; virtual columns give MySQL index performance (25000x faster than unindexed JSON queries)

**Database Schema Design:**
```sql
-- flex_tables: Stores table definitions
CREATE TABLE flex_tables (
  id VARCHAR(128) PRIMARY KEY,
  application_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  schema JSON NOT NULL,              -- Column definitions with types, validation
  indexed_columns JSON,              -- Maps columns to index slots
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  UNIQUE KEY unique_app_table (application_id, name)
);

-- flex_records: Universal record storage
CREATE TABLE flex_records (
  id VARCHAR(128) PRIMARY KEY,
  table_id VARCHAR(128) NOT NULL,
  data JSON NOT NULL,                -- Actual record data
  -- Indexed value slots (virtual columns from JSON)
  idx_str_1 VARCHAR(255) GENERATED ALWAYS AS (JSON_UNQUOTE(JSON_EXTRACT(data, indexed_columns->'$.str_1'))) VIRTUAL,
  idx_str_2 VARCHAR(255) GENERATED ALWAYS AS (...) VIRTUAL,
  idx_str_3 VARCHAR(255) GENERATED ALWAYS AS (...) VIRTUAL,
  idx_num_1 DECIMAL(18,4) GENERATED ALWAYS AS (...) VIRTUAL,
  idx_num_2 DECIMAL(18,4) GENERATED ALWAYS AS (...) VIRTUAL,
  idx_date_1 DATE GENERATED ALWAYS AS (...) VIRTUAL,
  idx_date_2 DATE GENERATED ALWAYS AS (...) VIRTUAL,
  search_text TEXT,                  -- Full-text search column
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_table (table_id),
  INDEX idx_str_1 (idx_str_1),
  INDEX idx_str_2 (idx_str_2),
  INDEX idx_str_3 (idx_str_3),
  INDEX idx_num_1 (idx_num_1),
  INDEX idx_num_2 (idx_num_2),
  INDEX idx_date_1 (idx_date_1),
  INDEX idx_date_2 (idx_date_2),
  FULLTEXT idx_search (search_text)
);

-- flex_table_versions: Schema change history
CREATE TABLE flex_table_versions (
  id VARCHAR(128) PRIMARY KEY,
  table_id VARCHAR(128) NOT NULL,
  version INT NOT NULL,
  previous_schema JSON,
  new_schema JSON NOT NULL,
  changes JSON NOT NULL,             -- Array of {type, column, details}
  created_by VARCHAR(128),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_table_version (table_id, version)
);
```

### Pattern 2: Column Type Validation Schema
**What:** JSON Schema for validating column definitions at table creation time
**When to use:** When user provides column definitions via workflow node

**Schema Definition Type:**
```typescript
// Source: Based on requirements TYPE-01 to TYPE-10
interface FlexColumnDefinition {
  name: string;                      // Column name (snake_case, alphanumeric)
  dataType: FlexDataType;            // One of 9 supported types
  displayName?: string;              // Human-readable label
  required?: boolean;                // Default: false
  unique?: boolean;                  // Default: false
  indexed?: boolean;                 // Request placement in index slot
  defaultValue?: any;                // Default value for column
  validation?: FlexColumnValidation; // Type-specific validation rules
}

type FlexDataType =
  | 'string'    // TYPE-01: VARCHAR with maxLength (default 255)
  | 'text'      // TYPE-02: TEXT for long content
  | 'integer'   // TYPE-03: INT with min/max bounds
  | 'decimal'   // TYPE-04: DECIMAL(18,4)
  | 'boolean'   // TYPE-05: true/false only
  | 'date'      // TYPE-06: ISO YYYY-MM-DD
  | 'datetime'  // TYPE-07: ISO format with time
  | 'json'      // TYPE-08: Nested objects/arrays
  | 'reference';// TYPE-09: FK to another flex table

interface FlexColumnValidation {
  // String validations
  maxLength?: number;                // For string type, default 255
  minLength?: number;
  pattern?: string;                  // Regex pattern (TYPE-10)
  enum?: string[];                   // Allowed values (TYPE-10)

  // Numeric validations
  min?: number;                      // For integer/decimal
  max?: number;

  // Reference validations
  targetTable?: string;              // For reference type (TYPE-09)
  onDelete?: 'cascade' | 'set-null' | 'restrict';

  // Computed expression (TYPE-10)
  computed?: string;                 // Expression like "$.field1 + $.field2"
}
```

### Pattern 3: Workflow Node Pattern (Following Existing Conventions)
**What:** Extend WorkflowNode class with metadata and execute method
**When to use:** Creating the flex-table workflow node

**Example:**
```typescript
// Source: Based on existing node patterns in packages/nodes/src/
import { WorkflowNode } from '@workscript/engine';
import type { ExecutionContext, EdgeMap } from '@workscript/engine';

export class FlexTableNode extends WorkflowNode {
  metadata = {
    id: 'flex-table',
    name: 'FlexDB Table Operations',
    version: '1.0.0',
    description: 'Create, update, and manage FlexDB tables at runtime',
    inputs: ['operation', 'tableName', 'columns', 'tableId'],
    outputs: ['tableId', 'schema', 'version'],
    ai_hints: {
      purpose: 'Create and manage database tables dynamically at runtime',
      when_to_use: 'When you need to define data structures without traditional migrations',
      expected_edges: ['success', 'error', 'exists', 'not_found'],
      example_usage: '{"flex-table": {"operation": "create", "tableName": "customers", "columns": [...], "success?": "next"}}',
      example_config: '{"operation": "create|update|get|delete", "tableName": "string", "columns?": "[ColumnDefinition]"}',
      get_from_state: ['applicationId'],
      post_to_state: ['flexTable', 'flexTableId', 'flexTableSchema']
    }
  };

  async execute(context: ExecutionContext, config?: any): Promise<EdgeMap> {
    const { operation, tableName, columns, tableId } = config || {};
    // Implementation delegates to FlexDBService
  }
}
```

### Anti-Patterns to Avoid
- **Raw EAV pattern:** Do NOT create entity_id, attribute_name, attribute_value tables. Performance is catastrophic at scale.
- **Dynamic ALTER TABLE:** Do NOT run ALTER TABLE at runtime. Use the JSON column pattern instead.
- **Storing JSON as string:** Do NOT use VARCHAR for JSON data. Use native JSON column type for built-in functions.
- **Untyped JSON operations:** Do NOT skip TypeScript type annotations on JSON columns. Use `.$type<T>()` in Drizzle.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON Schema validation | Custom validator | Ajv with JSONSchemaType | Edge cases (formats, refs), 85M downloads, 50% faster than alternatives |
| ID generation | UUID/random string | @paralleldrive/cuid2 | Collision-resistant, sortable, URL-safe |
| Date parsing/formatting | new Date() + manual | date-fns | Handles ISO formats, timezone edge cases |
| JSON path extraction | Manual string parsing | MySQL JSON_EXTRACT | Native performance, handles edge cases |
| Index slot assignment | Manual tracking | Slot assignment algorithm | Need to track availability across schema changes |

**Key insight:** The JSON column approach with virtual indexed columns is the standard pattern for runtime schemas in MySQL. Rolling your own EAV or dynamic DDL will result in 1000-15000x slower queries and unmaintainable code.

## Common Pitfalls

### Pitfall 1: Exceeding Index Slot Limits
**What goes wrong:** User defines 4 string columns as indexed when only 3 slots available
**Why it happens:** No validation before slot assignment
**How to avoid:** Validate indexed column requests against available slots BEFORE creating table
**Warning signs:** Error messages about "too many indexed columns" at table creation

### Pitfall 2: Virtual Column JSON Path Mismatches
**What goes wrong:** Virtual column references wrong JSON path, queries return NULL
**Why it happens:** JSON path in GENERATED ALWAYS AS clause doesn't match actual data structure
**How to avoid:** Store the JSON path mapping in indexed_columns metadata; validate on schema change
**Warning signs:** Indexed queries returning no results when data exists

### Pitfall 3: Table Name Collisions Across Applications
**What goes wrong:** Two applications create table "customers", data leaks between apps
**Why it happens:** Missing application_id scoping in uniqueness check
**How to avoid:** UNIQUE constraint on (application_id, name); always include app ID in queries
**Warning signs:** Records appearing in wrong application's tables

### Pitfall 4: Schema Version Gaps on Concurrent Updates
**What goes wrong:** Two concurrent schema updates both use version 2, history is inconsistent
**Why it happens:** Race condition in version number assignment
**How to avoid:** Use SELECT FOR UPDATE or optimistic locking (version check in WHERE clause)
**Warning signs:** Duplicate version numbers in flex_table_versions

### Pitfall 5: Type Coercion in JSON Values
**What goes wrong:** Integer "42" becomes string "42" after JSON round-trip
**Why it happens:** JavaScript JSON.parse preserves types but user input may not
**How to avoid:** Validate and coerce types on INSERT based on column dataType
**Warning signs:** Type validation failures on records that "should" be valid

## Code Examples

Verified patterns from official sources and codebase:

### Drizzle Schema Definition with JSON and Type Annotations
```typescript
// Source: https://orm.drizzle.team/docs/column-types/mysql + existing auth.schema.ts
import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  json,
  index,
  unique
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

// FlexDB Column Definition Type
interface FlexColumnDef {
  name: string;
  dataType: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  validation?: Record<string, any>;
}

interface FlexTableSchema {
  columns: FlexColumnDef[];
  version: number;
}

export const flexTables = mysqlTable('flex_tables', {
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  applicationId: varchar('application_id', { length: 128 })
    .notNull(),

  name: varchar('name', { length: 255 })
    .notNull(),

  displayName: varchar('display_name', { length: 255 }),

  // Typed JSON column for schema
  schema: json('schema')
    .$type<FlexTableSchema>()
    .notNull(),

  // Maps column names to index slots
  indexedColumns: json('indexed_columns')
    .$type<Record<string, string>>()  // { "email": "str_1", "age": "num_1" }
    .default({}),

  version: int('version')
    .notNull()
    .default(1),

  isActive: boolean('is_active')
    .notNull()
    .default(true),

  createdAt: timestamp('created_at')
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .onUpdateNow(),

  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  appTableUnique: unique('flex_tables_app_name_unique')
    .on(table.applicationId, table.name),
  appIdx: index('flex_tables_app_idx')
    .on(table.applicationId),
}));
```

### Ajv Schema Validation for Column Definitions
```typescript
// Source: https://ajv.js.org/guide/typescript.html + existing ValidateDataNode.ts
import Ajv, { JSONSchemaType } from 'ajv';

interface FlexColumnInput {
  name: string;
  dataType: 'string' | 'text' | 'integer' | 'decimal' | 'boolean' | 'date' | 'datetime' | 'json' | 'reference';
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  validation?: {
    maxLength?: number;
    minLength?: number;
    pattern?: string;
    enum?: string[];
    min?: number;
    max?: number;
    targetTable?: string;
  };
}

const columnSchema: JSONSchemaType<FlexColumnInput> = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-z][a-z0-9_]*$',
      maxLength: 64
    },
    dataType: {
      type: 'string',
      enum: ['string', 'text', 'integer', 'decimal', 'boolean', 'date', 'datetime', 'json', 'reference']
    },
    required: { type: 'boolean', nullable: true },
    unique: { type: 'boolean', nullable: true },
    indexed: { type: 'boolean', nullable: true },
    validation: {
      type: 'object',
      nullable: true,
      properties: {
        maxLength: { type: 'integer', nullable: true },
        minLength: { type: 'integer', nullable: true },
        pattern: { type: 'string', nullable: true },
        enum: { type: 'array', items: { type: 'string' }, nullable: true },
        min: { type: 'number', nullable: true },
        max: { type: 'number', nullable: true },
        targetTable: { type: 'string', nullable: true }
      },
      additionalProperties: false
    }
  },
  required: ['name', 'dataType'],
  additionalProperties: false
};

// Compile validator once at startup
const ajv = new Ajv({ allErrors: true, useDefaults: true });
const validateColumn = ajv.compile(columnSchema);

// Usage - acts as type guard
export function validateColumnDefinition(data: unknown): data is FlexColumnInput {
  return validateColumn(data) as boolean;
}
```

### Version History Creation
```typescript
// Source: Best practices from schema versioning research
interface SchemaChange {
  type: 'add_column' | 'remove_column' | 'modify_column';
  column: string;
  details: {
    before?: any;
    after?: any;
  };
}

async function createVersionEntry(
  db: DrizzleDB,
  tableId: string,
  previousSchema: FlexTableSchema | null,
  newSchema: FlexTableSchema,
  changes: SchemaChange[],
  userId?: string
): Promise<void> {
  const id = createId();

  await db.insert(flexTableVersions).values({
    id,
    tableId,
    version: newSchema.version,
    previousSchema: previousSchema,
    newSchema: newSchema,
    changes: changes,
    createdBy: userId,
    createdAt: new Date()
  });
}

// Compute changes between schemas
function computeSchemaChanges(
  oldSchema: FlexTableSchema | null,
  newSchema: FlexTableSchema
): SchemaChange[] {
  const changes: SchemaChange[] = [];
  const oldColumns = new Map(oldSchema?.columns.map(c => [c.name, c]) ?? []);
  const newColumns = new Map(newSchema.columns.map(c => [c.name, c]));

  // Added columns
  for (const [name, col] of newColumns) {
    if (!oldColumns.has(name)) {
      changes.push({
        type: 'add_column',
        column: name,
        details: { after: col }
      });
    }
  }

  // Removed columns
  for (const [name, col] of oldColumns) {
    if (!newColumns.has(name)) {
      changes.push({
        type: 'remove_column',
        column: name,
        details: { before: col }
      });
    }
  }

  // Modified columns
  for (const [name, newCol] of newColumns) {
    const oldCol = oldColumns.get(name);
    if (oldCol && JSON.stringify(oldCol) !== JSON.stringify(newCol)) {
      changes.push({
        type: 'modify_column',
        column: name,
        details: { before: oldCol, after: newCol }
      });
    }
  }

  return changes;
}
```

### Index Slot Assignment Algorithm
```typescript
// Assigns indexed columns to available slots
interface IndexSlotAssignment {
  str_1?: string;
  str_2?: string;
  str_3?: string;
  num_1?: string;
  num_2?: string;
  date_1?: string;
  date_2?: string;
}

const SLOT_LIMITS = {
  string: 3,  // idx_str_1, idx_str_2, idx_str_3
  numeric: 2, // idx_num_1, idx_num_2 (integer, decimal)
  date: 2     // idx_date_1, idx_date_2 (date, datetime)
};

function assignIndexSlots(
  columns: FlexColumnInput[],
  existingAssignments: IndexSlotAssignment = {}
): { assignments: IndexSlotAssignment; errors: string[] } {
  const errors: string[] = [];
  const assignments = { ...existingAssignments };

  // Count used slots per type
  const usedSlots = {
    string: Object.keys(assignments).filter(k => k.startsWith('str_')).length,
    numeric: Object.keys(assignments).filter(k => k.startsWith('num_')).length,
    date: Object.keys(assignments).filter(k => k.startsWith('date_')).length,
  };

  for (const col of columns.filter(c => c.indexed)) {
    const slotType = getSlotType(col.dataType);

    if (usedSlots[slotType] >= SLOT_LIMITS[slotType]) {
      errors.push(`Cannot index column "${col.name}": all ${slotType} slots are used (max ${SLOT_LIMITS[slotType]})`);
      continue;
    }

    const slotIndex = usedSlots[slotType] + 1;
    const slotKey = `${slotType === 'string' ? 'str' : slotType === 'numeric' ? 'num' : 'date'}_${slotIndex}`;
    assignments[slotKey as keyof IndexSlotAssignment] = col.name;
    usedSlots[slotType]++;
  }

  return { assignments, errors };
}

function getSlotType(dataType: string): 'string' | 'numeric' | 'date' {
  switch (dataType) {
    case 'string':
    case 'text':
      return 'string';
    case 'integer':
    case 'decimal':
      return 'numeric';
    case 'date':
    case 'datetime':
      return 'date';
    default:
      return 'string'; // JSON, boolean, reference -> string slot
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| EAV tables | JSON columns + virtual indexes | MySQL 5.7+ (2015), mainstream 2020+ | 15000x faster queries |
| Dynamic ALTER TABLE | Fixed schema + JSON data | JSON column maturity ~2020 | No runtime DDL, safer |
| Manual JSON parsing | Native JSON_EXTRACT | MySQL 5.7 | Built-in functions, indexable |
| Runtime schema compilation | Pre-compiled Ajv validators | Ajv ~2018 | 10-100x faster validation |

**Deprecated/outdated:**
- **EAV pattern:** Still documented but widely considered an anti-pattern for dynamic schemas
- **mysql.escape():** Use parameterized queries via Drizzle instead
- **JSON stored in VARCHAR:** Use native JSON column type

## Open Questions

Things that couldn't be fully resolved:

1. **Virtual vs Stored Generated Columns Performance**
   - What we know: Virtual columns are computed on read, stored columns use disk space but computed on write
   - What's unclear: Performance difference for this specific use case (high read vs high write)
   - Recommendation: Start with VIRTUAL; benchmark and switch to STORED if writes dominate

2. **Reference Column Cascade Behavior**
   - What we know: TYPE-09 supports reference dataType with target table validation
   - What's unclear: How to implement cascade delete across flex_records table (all in same table)
   - Recommendation: Implement soft-delete cascade in application layer, not database triggers

3. **Full-Text Search Implementation**
   - What we know: search_text column planned for REC-03 (Phase 2)
   - What's unclear: Which columns to include in search_text, indexing strategy
   - Recommendation: Defer to Phase 2; document as Phase 1 prepares the column

## Sources

### Primary (HIGH confidence)
- Drizzle ORM MySQL documentation - JSON columns, `.$type<T>()` annotation
- MySQL 8.0 Reference Manual - Generated columns, JSON functions, secondary indexes
- Ajv documentation - TypeScript integration, JSONSchemaType, validation guards
- Existing codebase patterns:
  - `/apps/api/src/db/schema/auth.schema.ts` - Drizzle schema conventions
  - `/packages/nodes/src/DatabaseNode.ts` - Node implementation pattern
  - `/packages/nodes/src/data/ValidateDataNode.ts` - Ajv validation pattern

### Secondary (MEDIUM confidence)
- [PlanetScale Blog: Indexing JSON in MySQL](https://planetscale.com/blog/indexing-json-in-mysql) - Virtual column indexing
- [Leapcell: Storing Dynamic Attributes](https://leapcell.io/blog/storing-dynamic-attributes-sparse-columns-eav-and-jsonb-explained) - EAV vs JSON comparison
- [Medium: MySQL JSON Indexing Performance](https://medium.com/chat2db/optimizing-json-queries-with-advanced-indexing-in-mysql-8-0-392f2fdfd842) - Benchmarks

### Tertiary (LOW confidence)
- Various FlexDB GitHub implementations - Pattern validation only, not code reuse

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, verified with official docs
- Architecture: HIGH - Pattern is well-established (JSON + virtual columns), matches codebase conventions
- Pitfalls: MEDIUM - Based on community experience, some specific to this implementation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable technologies)
