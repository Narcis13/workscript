/**
 * FlexDB Schema Validator
 *
 * Provides Ajv-based validation for FlexDB column definitions and table names.
 * Handles index slot assignment for optimized querying.
 *
 * @module FlexSchemaValidator
 */

import Ajv from 'ajv';
import type { FlexColumnDefinition, FlexDataType } from '../schema/flexdb.schema';

// =============================================================================
// AJV SETUP
// =============================================================================

const ajv = new Ajv({ allErrors: true, useDefaults: true });

// =============================================================================
// COLUMN VALIDATION SCHEMA
// =============================================================================

/**
 * All supported FlexDB data types
 */
const FLEX_DATA_TYPES: readonly FlexDataType[] = [
  'string',
  'text',
  'integer',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'json',
  'reference',
] as const;

/**
 * JSON Schema for FlexColumnDefinition validation
 *
 * Note: Using plain object schema instead of JSONSchemaType to avoid
 * TypeScript complexity with `unknown` defaultValue field.
 *
 * Validates:
 * - name: snake_case alphanumeric, 1-64 chars
 * - dataType: one of 9 supported types
 * - optional fields with correct types
 */
const columnSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-z][a-z0-9_]*$',
      maxLength: 64,
      minLength: 1,
    },
    dataType: {
      type: 'string',
      enum: FLEX_DATA_TYPES,
    },
    displayName: {
      type: 'string',
    },
    required: {
      type: 'boolean',
    },
    unique: {
      type: 'boolean',
    },
    indexed: {
      type: 'boolean',
    },
    defaultValue: {
      // Allow any type for default value
    },
    system: {
      type: 'boolean',
    },
    validation: {
      type: 'object',
      properties: {
        maxLength: { type: 'number' },
        minLength: { type: 'number' },
        pattern: { type: 'string' },
        enum: {
          type: 'array',
          items: { type: 'string' },
        },
        min: { type: 'number' },
        max: { type: 'number' },
        targetTable: { type: 'string' },
        onDelete: {
          type: 'string',
          enum: ['cascade', 'set-null', 'restrict'],
        },
        computed: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  required: ['name', 'dataType'],
  additionalProperties: true, // Allow 'system' flag and future extensions
} as const;

/**
 * Compiled Ajv validator for column definitions
 */
const validateColumnInternal = ajv.compile(columnSchema);

// =============================================================================
// TABLE NAME VALIDATION
// =============================================================================

/**
 * Pattern for valid table names (snake_case alphanumeric)
 */
const TABLE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Validates a table name
 *
 * Rules:
 * - Must start with lowercase letter
 * - Only lowercase letters, numbers, underscores allowed
 * - Length 1-64 characters
 *
 * @param name - Table name to validate
 * @returns Validation result with optional error message
 *
 * @example
 * validateTableName('customers')       // { valid: true }
 * validateTableName('My Table')        // { valid: false, error: '...' }
 * validateTableName('123_invalid')     // { valid: false, error: '...' }
 */
export function validateTableName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Table name is required and must be a string' };
  }

  if (name.length < 1 || name.length > 64) {
    return { valid: false, error: 'Table name must be 1-64 characters long' };
  }

  if (!TABLE_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error:
        'Table name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores (snake_case)',
    };
  }

  return { valid: true };
}

// =============================================================================
// COLUMN VALIDATION
// =============================================================================

/**
 * Result type for column validation
 */
type ColumnValidationResult =
  | { valid: true; data: FlexColumnDefinition }
  | { valid: false; errors: string[] };

/**
 * Validates a column definition against the JSON schema
 *
 * @param data - Unknown data to validate as column definition
 * @returns Typed result with validated data or error messages
 *
 * @example
 * const result = validateColumnDefinition({ name: 'email', dataType: 'string' });
 * if (result.valid) {
 *   console.log(result.data.name); // 'email'
 * } else {
 *   console.error(result.errors); // ['...']
 * }
 */
export function validateColumnDefinition(data: unknown): ColumnValidationResult {
  const valid = validateColumnInternal(data);

  if (valid) {
    return { valid: true, data: data as FlexColumnDefinition };
  }

  // Extract human-readable error messages from Ajv errors
  const errors: string[] = (validateColumnInternal.errors || []).map((err) => {
    const path = err.instancePath ? `${err.instancePath}: ` : '';
    const message = err.message || 'Unknown validation error';

    // Enhance specific error messages
    if (err.keyword === 'enum' && err.params?.allowedValues) {
      return `${path}${message}. Allowed values: ${(err.params.allowedValues as string[]).join(', ')}`;
    }
    if (err.keyword === 'pattern') {
      return `${path}${message}. Must be snake_case (lowercase letters, numbers, underscores, starting with letter)`;
    }

    return `${path}${message}`;
  });

  return { valid: false, errors };
}

// =============================================================================
// INDEX SLOT ASSIGNMENT
// =============================================================================

/**
 * Mapping of column names to index slot names
 */
export interface IndexSlotAssignment {
  str_1?: string;
  str_2?: string;
  str_3?: string;
  num_1?: string;
  num_2?: string;
  date_1?: string;
  date_2?: string;
}

/**
 * Index slot limits per type
 *
 * - String slots: 3 (str_1, str_2, str_3) - for string, text, boolean, json, reference
 * - Numeric slots: 2 (num_1, num_2) - for integer, decimal
 * - Date slots: 2 (date_1, date_2) - for date, datetime
 */
const SLOT_LIMITS = {
  string: 3, // str_1, str_2, str_3
  numeric: 2, // num_1, num_2
  date: 2, // date_1, date_2
};

/**
 * Slot names by type
 */
const SLOT_NAMES = {
  string: ['str_1', 'str_2', 'str_3'] as const,
  numeric: ['num_1', 'num_2'] as const,
  date: ['date_1', 'date_2'] as const,
};

/**
 * Maps a FlexDB data type to its corresponding slot type
 *
 * Mapping:
 * - string, text -> string slots (stored as strings)
 * - integer, decimal -> numeric slots (stored as numbers)
 * - date, datetime -> date slots (stored as dates)
 * - boolean, json, reference -> string slots (cast to string for indexing)
 *
 * @param dataType - FlexDB data type
 * @returns Slot type category
 */
export function getSlotType(dataType: FlexDataType): 'string' | 'numeric' | 'date' {
  switch (dataType) {
    case 'string':
    case 'text':
    case 'boolean':
    case 'json':
    case 'reference':
      return 'string';
    case 'integer':
    case 'decimal':
      return 'numeric';
    case 'date':
    case 'datetime':
      return 'date';
    default:
      return 'string'; // Default fallback
  }
}

/**
 * Result of index slot assignment
 */
interface SlotAssignmentResult {
  assignments: IndexSlotAssignment;
  errors: string[];
}

/**
 * Assigns indexed columns to physical index slots
 *
 * FlexDB uses a fixed set of index slots in the flex_data table:
 * - 3 string slots (str_1, str_2, str_3) for text-like data
 * - 2 numeric slots (num_1, num_2) for numbers
 * - 2 date slots (date_1, date_2) for dates
 *
 * Columns marked with `indexed: true` are assigned to slots based on their data type.
 * Returns errors if slot limits are exceeded.
 *
 * @param columns - Array of column definitions to process
 * @param existingAssignments - Previously assigned slots (for schema updates)
 * @returns Slot assignments and any errors
 *
 * @example
 * const result = assignIndexSlots([
 *   { name: 'email', dataType: 'string', indexed: true },
 *   { name: 'status', dataType: 'string', indexed: true },
 *   { name: 'age', dataType: 'integer', indexed: true },
 * ]);
 * // result.assignments = { str_1: 'email', str_2: 'status', num_1: 'age' }
 */
export function assignIndexSlots(
  columns: FlexColumnDefinition[],
  existingAssignments: IndexSlotAssignment = {}
): SlotAssignmentResult {
  const errors: string[] = [];
  const assignments: IndexSlotAssignment = { ...existingAssignments };

  // Track which slots are used
  const usedSlots = new Set<string>(Object.keys(existingAssignments));

  // Track columns already assigned (from existing assignments)
  const assignedColumns = new Set<string>(Object.values(existingAssignments).filter(Boolean) as string[]);

  // Count used slots by type
  const slotCounts = {
    string: Object.keys(existingAssignments).filter((k) => k.startsWith('str_')).length,
    numeric: Object.keys(existingAssignments).filter((k) => k.startsWith('num_')).length,
    date: Object.keys(existingAssignments).filter((k) => k.startsWith('date_')).length,
  };

  // Process indexed columns
  for (const column of columns) {
    // Skip non-indexed columns
    if (!column.indexed) continue;

    // Skip already assigned columns
    if (assignedColumns.has(column.name)) continue;

    const slotType = getSlotType(column.dataType);
    const limit = SLOT_LIMITS[slotType];
    const slotNames = SLOT_NAMES[slotType];

    // Check if limit exceeded
    if (slotCounts[slotType] >= limit) {
      errors.push(
        `Cannot index column '${column.name}' (${column.dataType}): ` +
          `all ${limit} ${slotType} index slots are in use`
      );
      continue;
    }

    // Find next available slot
    const availableSlot = slotNames.find((slot) => !usedSlots.has(slot));
    if (availableSlot) {
      assignments[availableSlot] = column.name;
      usedSlots.add(availableSlot);
      assignedColumns.add(column.name);
      slotCounts[slotType]++;
    }
  }

  return { assignments, errors };
}

// =============================================================================
// CLASS EXPORT (for DI)
// =============================================================================

/**
 * FlexSchemaValidator class for dependency injection scenarios
 *
 * Wraps the pure functions in a class for easier mocking and DI.
 */
export class FlexSchemaValidator {
  validateColumn = validateColumnDefinition;
  validateTableName = validateTableName;
  assignIndexSlots = assignIndexSlots;
  getSlotType = getSlotType;
}

/**
 * Singleton instance for convenience
 */
export const flexSchemaValidator = new FlexSchemaValidator();
