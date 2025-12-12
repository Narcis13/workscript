/**
 * Introspection Builder Utilities
 *
 * Functions for building deep introspection data for nodes including:
 * - Input schema extraction from metadata
 * - Edge conditions parsing
 * - State interactions mapping
 * - Complexity calculation
 * - Operations extraction for operation-based nodes
 *
 * These utilities are used by the nodes routes to enrich node metadata
 * with detailed introspection information for AI agents.
 */

import type { NodeMetadata, AIHints } from '@workscript/engine';
import type {
  InputSchemaEntry,
  EdgeConditionInfo,
  StateInteractionInfo,
  OperationsByType,
  OperationInfo,
  ComplexityLevel,
} from '../types/reflection.types';

// ============================================================================
// INPUT SCHEMA BUILDING
// ============================================================================

/**
 * Common input type patterns found in example_config strings
 */
const TYPE_PATTERNS: Record<string, InputSchemaEntry['type']> = {
  'string': 'string',
  'number': 'number',
  'boolean': 'boolean',
  'array': 'array',
  'object': 'object',
  'any': 'any',
  '[': 'array',
  '{': 'object',
};

/**
 * Build input schema from node metadata
 *
 * Parses ai_hints.example_config to extract type information for each input.
 * Falls back to 'any' type if type cannot be determined.
 *
 * @param metadata - Node metadata containing inputs and ai_hints
 * @returns Record mapping input names to their schema entries
 */
export function buildInputSchema(metadata: NodeMetadata): Record<string, InputSchemaEntry> {
  const schema: Record<string, InputSchemaEntry> = {};
  const { inputs, ai_hints } = metadata;

  if (!inputs || !Array.isArray(inputs)) {
    return schema;
  }

  // Parse example_config if available to extract type hints
  const typeHints = parseExampleConfig(ai_hints?.example_config);

  for (const inputName of inputs) {
    const typeHint = typeHints[inputName];
    schema[inputName] = buildInputSchemaEntry(inputName, typeHint);
  }

  return schema;
}

/**
 * Parse example_config string to extract type hints for each field
 *
 * Example formats:
 * - '{"field": "string", "count": "number"}'
 * - '{"items": "[object, ...]", "operation": "add|subtract|multiply"}'
 */
function parseExampleConfig(exampleConfig?: string): Record<string, string> {
  const hints: Record<string, string> = {};

  if (!exampleConfig) {
    return hints;
  }

  try {
    // Handle JSON-like format
    // Remove outer braces and split by comma (handling nested structures)
    const content = exampleConfig.trim();
    if (!content.startsWith('{') || !content.endsWith('}')) {
      return hints;
    }

    // Extract field: type pairs using regex
    // Matches: "fieldName": "typeValue" or "fieldName?": "typeValue"
    const fieldPattern = /"(\w+)\??":\s*"([^"]+)"/g;
    let match: RegExpExecArray | null;

    while ((match = fieldPattern.exec(content)) !== null) {
      const fieldName = match[1];
      const typeValue = match[2];
      if (fieldName && typeValue) {
        hints[fieldName] = typeValue;
      }
    }
  } catch {
    // If parsing fails, return empty hints
  }

  return hints;
}

/**
 * Build a single input schema entry from a type hint string
 */
function buildInputSchemaEntry(inputName: string, typeHint?: string): InputSchemaEntry {
  const entry: InputSchemaEntry = {
    type: 'any',
    required: !inputName.endsWith('?'),
    description: generateInputDescription(inputName),
  };

  if (!typeHint) {
    return entry;
  }

  // Check for enum-like values (e.g., "add|subtract|multiply")
  if (typeHint.includes('|') && !typeHint.startsWith('[')) {
    entry.type = 'string';
    entry.enum = typeHint.split('|').map(v => v.trim());
    entry.description = `One of: ${entry.enum.join(', ')}`;
    return entry;
  }

  // Check for array type (e.g., "[object, ...]" or "[string, ...]")
  if (typeHint.startsWith('[')) {
    entry.type = 'array';
    // Try to extract item type
    const itemTypeMatch = typeHint.match(/\[(\w+)/);
    if (itemTypeMatch && itemTypeMatch[1]) {
      entry.itemSchema = {
        type: mapTypeString(itemTypeMatch[1]),
        required: true,
        description: `Item of type ${itemTypeMatch[1]}`,
      };
    }
    return entry;
  }

  // Check for object type
  if (typeHint.startsWith('{')) {
    entry.type = 'object';
    return entry;
  }

  // Map simple type strings
  entry.type = mapTypeString(typeHint);

  return entry;
}

/**
 * Map a type string to InputSchemaEntry type
 */
function mapTypeString(typeStr: string): InputSchemaEntry['type'] {
  const normalized = typeStr.toLowerCase().trim();
  return TYPE_PATTERNS[normalized] || 'any';
}

/**
 * Generate a human-readable description for an input parameter
 */
function generateInputDescription(inputName: string): string {
  // Convert camelCase to readable format
  const readable = inputName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();

  // Add context based on common patterns
  if (inputName.includes('items') || inputName.includes('array')) {
    return `${readable} - array of items to process`;
  }
  if (inputName.includes('field') || inputName.includes('Field')) {
    return `${readable} - name of the field to operate on`;
  }
  if (inputName.includes('operation')) {
    return `${readable} - the operation to perform`;
  }
  if (inputName.includes('condition') || inputName.includes('Condition')) {
    return `${readable} - condition(s) to evaluate`;
  }
  if (inputName.includes('value') || inputName.includes('Value')) {
    return `${readable} - value to use in the operation`;
  }
  if (inputName.includes('output') || inputName.includes('Output')) {
    return `${readable} - where to store the result`;
  }

  return readable;
}

// ============================================================================
// EDGE CONDITIONS BUILDING
// ============================================================================

/**
 * Build edge condition information from node metadata
 *
 * Parses ai_hints.expected_edges and ai_hints.post_to_state to determine
 * what triggers each edge and what data is returned.
 *
 * @param metadata - Node metadata containing ai_hints
 * @returns Record mapping edge names to their condition info
 */
export function buildEdgeConditions(metadata: NodeMetadata): Record<string, EdgeConditionInfo> {
  const conditions: Record<string, EdgeConditionInfo> = {};
  const { ai_hints, id } = metadata;

  if (!ai_hints?.expected_edges) {
    // Provide default edges for nodes without explicit hints
    return {
      success: {
        condition: 'Operation completed successfully',
        dataReturned: { result: 'Operation result data' },
      },
      error: {
        condition: 'An error occurred during execution',
        dataReturned: { error: 'Error message', nodeId: 'Node that produced the error' },
      },
    };
  }

  const postToState = ai_hints.post_to_state || [];

  for (const edge of ai_hints.expected_edges) {
    conditions[edge] = buildEdgeConditionInfo(edge, id, postToState);
  }

  return conditions;
}

/**
 * Build condition info for a single edge
 */
function buildEdgeConditionInfo(
  edge: string,
  nodeId: string,
  postToState: string[]
): EdgeConditionInfo {
  // Generate condition description based on edge name
  const condition = generateEdgeConditionDescription(edge, nodeId);

  // Determine what data is returned based on edge and node type
  const dataReturned = generateEdgeDataReturned(edge, postToState);

  return { condition, dataReturned };
}

/**
 * Generate a human-readable description of when an edge is taken
 */
function generateEdgeConditionDescription(edge: string, nodeId: string): string {
  const edgeLower = edge.toLowerCase();

  // Common edge patterns
  const edgeDescriptions: Record<string, string> = {
    'success': 'Operation completed successfully',
    'error': 'An error occurred during execution',
    'passed': 'Items matched the filter conditions',
    'filtered': 'Items did not match the filter conditions',
    'found': 'Requested data was found',
    'not_found': 'Requested data was not found',
    'valid': 'Data passed validation',
    'invalid': 'Data failed validation',
    'true': 'Condition evaluated to true',
    'false': 'Condition evaluated to false',
    'default': 'No other conditions matched (fallback)',
    'empty': 'Result set is empty',
    'done': 'Processing completed',
    'continue': 'Loop should continue to next iteration',
    'break': 'Loop should terminate',
    'exists': 'Resource exists',
    'created': 'Resource was created',
    'updated': 'Resource was updated',
    'deleted': 'Resource was deleted',
  };

  if (edgeDescriptions[edgeLower]) {
    return edgeDescriptions[edgeLower];
  }

  // Handle dynamic edges (indicated by <dynamic> in expected_edges)
  if (edge === '<dynamic>' || edge.startsWith('<')) {
    return `Dynamic edge determined at runtime based on ${nodeId} node configuration`;
  }

  // Generate description from edge name
  return `Edge taken when ${edge.replace(/_/g, ' ')} condition is met`;
}

/**
 * Generate the schema of data returned when an edge is taken
 */
function generateEdgeDataReturned(edge: string, postToState: string[]): Record<string, string> {
  const dataReturned: Record<string, string> = {};

  const edgeLower = edge.toLowerCase();

  // Common patterns for edge return data
  switch (edgeLower) {
    case 'error':
      dataReturned['error'] = 'Error message describing what went wrong';
      dataReturned['nodeId'] = 'ID of the node that produced the error';
      break;

    case 'passed':
    case 'filtered':
      dataReturned['items'] = 'Array of items that matched/did not match';
      dataReturned['passedCount'] = 'Number of items that passed';
      dataReturned['filteredCount'] = 'Number of items that were filtered';
      dataReturned['totalCount'] = 'Total number of items processed';
      break;

    case 'found':
    case 'success':
      // Add state keys that this edge writes
      for (const stateKey of postToState) {
        dataReturned[stateKey] = `Value written to state.${stateKey}`;
      }
      if (Object.keys(dataReturned).length === 0) {
        dataReturned['result'] = 'Operation result';
      }
      break;

    case 'not_found':
      dataReturned['message'] = 'Message indicating what was not found';
      break;

    case 'valid':
      dataReturned['data'] = 'The validated data';
      break;

    case 'invalid':
      dataReturned['errors'] = 'Array of validation errors';
      dataReturned['data'] = 'The data that failed validation';
      break;

    default:
      // For unknown edges, provide generic return info
      dataReturned['result'] = 'Edge-specific result data';
  }

  return dataReturned;
}

// ============================================================================
// STATE INTERACTIONS BUILDING
// ============================================================================

/**
 * Build state interaction information from node metadata
 *
 * Extracts which state keys a node reads from (get_from_state) and
 * writes to (post_to_state), plus schemas for written values.
 *
 * @param metadata - Node metadata containing ai_hints
 * @returns State interaction info with reads, writes, and write schemas
 */
export function buildStateInteractions(metadata: NodeMetadata): StateInteractionInfo {
  const { ai_hints, id } = metadata;

  const reads = ai_hints?.get_from_state || [];
  const writes = ai_hints?.post_to_state || [];

  // Build write schema based on common patterns and node type
  const writeSchema = buildWriteSchema(writes, id);

  return { reads, writes, writeSchema };
}

/**
 * Build schema for values written to state
 */
function buildWriteSchema(writes: string[], nodeId: string): Record<string, any> {
  const schema: Record<string, any> = {};

  for (const stateKey of writes) {
    schema[stateKey] = inferWriteSchemaForKey(stateKey, nodeId);
  }

  return schema;
}

/**
 * Infer the schema for a state key based on naming patterns
 */
function inferWriteSchemaForKey(stateKey: string, nodeId: string): any {
  const keyLower = stateKey.toLowerCase();

  // Common patterns for state key schemas
  if (keyLower.includes('passed') || keyLower.includes('filtered')) {
    return { type: 'array', items: 'object', description: 'Array of items' };
  }

  if (keyLower.includes('stats') || keyLower.includes('metrics')) {
    return {
      type: 'object',
      properties: {
        count: 'number',
        total: 'number',
      },
      description: 'Statistics object',
    };
  }

  if (keyLower.includes('result')) {
    return { type: 'any', description: `Result from ${nodeId} operation` };
  }

  if (keyLower.includes('error')) {
    return { type: 'string', description: 'Error message' };
  }

  if (keyLower.includes('record') || keyLower.includes('data')) {
    return { type: 'object', description: 'Data object' };
  }

  if (keyLower.includes('count') || keyLower.includes('total') || keyLower.includes('index')) {
    return { type: 'number', description: 'Numeric value' };
  }

  if (keyLower.includes('valid') || keyLower.includes('success') || keyLower.includes('found')) {
    return { type: 'boolean', description: 'Boolean flag' };
  }

  // Default schema
  return { type: 'any', description: `Value written by ${nodeId}` };
}

// ============================================================================
// COMPLEXITY CALCULATION
// ============================================================================

/**
 * Calculate node complexity level based on source code lines
 *
 * Complexity levels:
 * - simple: < 100 non-empty, non-comment lines
 * - medium: 100-300 lines
 * - complex: > 300 lines
 *
 * @param source - Node source code
 * @returns Complexity level
 */
export function calculateComplexity(source: string): ComplexityLevel {
  const lines = source.split('\n');
  let codeLines = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
      codeLines++;
    }
  }

  if (codeLines < 100) {
    return 'simple';
  } else if (codeLines <= 300) {
    return 'medium';
  } else {
    return 'complex';
  }
}

// ============================================================================
// OPERATIONS EXTRACTION
// ============================================================================

/**
 * Known operations for specific node types
 * This provides comprehensive operation listings for operation-based nodes
 */
const NODE_OPERATIONS: Record<string, OperationsByType> = {
  filter: {
    string: [
      { name: 'equals', description: 'String equals the specified value', exampleConfig: { operation: 'equals', value: 'active' } },
      { name: 'notEquals', description: 'String does not equal the specified value', exampleConfig: { operation: 'notEquals', value: 'inactive' } },
      { name: 'contains', description: 'String contains the specified substring', exampleConfig: { operation: 'contains', value: 'admin' } },
      { name: 'notContains', description: 'String does not contain the specified substring', exampleConfig: { operation: 'notContains', value: 'test' } },
      { name: 'startsWith', description: 'String starts with the specified value', exampleConfig: { operation: 'startsWith', value: 'Mr.' } },
      { name: 'endsWith', description: 'String ends with the specified value', exampleConfig: { operation: 'endsWith', value: '.com' } },
      { name: 'regex', description: 'String matches the specified regex pattern', exampleConfig: { operation: 'regex', value: '^[a-z]+$' } },
      { name: 'isEmpty', description: 'String is empty or null/undefined', exampleConfig: { operation: 'isEmpty' } },
      { name: 'isNotEmpty', description: 'String is not empty', exampleConfig: { operation: 'isNotEmpty' } },
    ],
    number: [
      { name: 'equals', description: 'Number equals the specified value', exampleConfig: { operation: 'equals', value: 100 } },
      { name: 'notEquals', description: 'Number does not equal the specified value', exampleConfig: { operation: 'notEquals', value: 0 } },
      { name: 'gt', description: 'Number is greater than the specified value', exampleConfig: { operation: 'gt', value: 50 } },
      { name: 'gte', description: 'Number is greater than or equal to the specified value', exampleConfig: { operation: 'gte', value: 50 } },
      { name: 'lt', description: 'Number is less than the specified value', exampleConfig: { operation: 'lt', value: 100 } },
      { name: 'lte', description: 'Number is less than or equal to the specified value', exampleConfig: { operation: 'lte', value: 100 } },
      { name: 'between', description: 'Number is between two values (inclusive)', exampleConfig: { operation: 'between', value: 10, value2: 50 } },
    ],
    boolean: [
      { name: 'true', description: 'Value is true', exampleConfig: { operation: 'true' } },
      { name: 'false', description: 'Value is false', exampleConfig: { operation: 'false' } },
    ],
    date: [
      { name: 'before', description: 'Date is before the specified date', exampleConfig: { operation: 'before', value: '2024-01-01' } },
      { name: 'after', description: 'Date is after the specified date', exampleConfig: { operation: 'after', value: '2024-01-01' } },
      { name: 'equals', description: 'Date equals the specified date', exampleConfig: { operation: 'equals', value: '2024-06-15' } },
      { name: 'between', description: 'Date is between two dates (inclusive)', exampleConfig: { operation: 'between', value: '2024-01-01', value2: '2024-12-31' } },
    ],
    array: [
      { name: 'contains', description: 'Array contains the specified value', exampleConfig: { operation: 'contains', value: 'admin' } },
      { name: 'notContains', description: 'Array does not contain the specified value', exampleConfig: { operation: 'notContains', value: 'guest' } },
      { name: 'isEmpty', description: 'Array is empty', exampleConfig: { operation: 'isEmpty' } },
      { name: 'isNotEmpty', description: 'Array is not empty', exampleConfig: { operation: 'isNotEmpty' } },
    ],
    object: [
      { name: 'isEmpty', description: 'Object has no properties', exampleConfig: { operation: 'isEmpty' } },
      { name: 'isNotEmpty', description: 'Object has at least one property', exampleConfig: { operation: 'isNotEmpty' } },
    ],
  },

  switch: {
    comparison: [
      { name: 'equals', description: 'Value equals the specified value', exampleConfig: { operation: 'equals', value: 'premium' } },
      { name: 'notEquals', description: 'Value does not equal the specified value', exampleConfig: { operation: 'notEquals', value: 'inactive' } },
      { name: 'gt', description: 'Value is greater than the specified value', exampleConfig: { operation: 'gt', value: 100 } },
      { name: 'gte', description: 'Value is greater than or equal', exampleConfig: { operation: 'gte', value: 100 } },
      { name: 'lt', description: 'Value is less than the specified value', exampleConfig: { operation: 'lt', value: 50 } },
      { name: 'lte', description: 'Value is less than or equal', exampleConfig: { operation: 'lte', value: 50 } },
      { name: 'contains', description: 'String contains the specified substring', exampleConfig: { operation: 'contains', value: 'admin' } },
      { name: 'startsWith', description: 'String starts with the specified value', exampleConfig: { operation: 'startsWith', value: 'VIP' } },
      { name: 'endsWith', description: 'String ends with the specified value', exampleConfig: { operation: 'endsWith', value: '@company.com' } },
      { name: 'regex', description: 'String matches the regex pattern', exampleConfig: { operation: 'regex', value: '^[A-Z]' } },
      { name: 'isEmpty', description: 'Value is empty/null/undefined', exampleConfig: { operation: 'isEmpty' } },
      { name: 'isNotEmpty', description: 'Value is not empty', exampleConfig: { operation: 'isNotEmpty' } },
    ],
  },

  stringOperations: {
    case: [
      { name: 'uppercase', description: 'Convert string to uppercase', exampleConfig: { operation: 'uppercase', field: 'name' } },
      { name: 'lowercase', description: 'Convert string to lowercase', exampleConfig: { operation: 'lowercase', field: 'email' } },
      { name: 'capitalize', description: 'Capitalize first character', exampleConfig: { operation: 'capitalize', field: 'title' } },
      { name: 'titleCase', description: 'Capitalize first character of each word', exampleConfig: { operation: 'titleCase', field: 'fullName' } },
    ],
    manipulation: [
      { name: 'trim', description: 'Remove whitespace from both ends', exampleConfig: { operation: 'trim', field: 'input' } },
      { name: 'replace', description: 'Replace first occurrence', exampleConfig: { operation: 'replace', field: 'text', searchValue: 'old', replaceValue: 'new' } },
      { name: 'replaceAll', description: 'Replace all occurrences', exampleConfig: { operation: 'replaceAll', field: 'text', searchValue: 'old', replaceValue: 'new' } },
      { name: 'replaceRegex', description: 'Replace using regex pattern', exampleConfig: { operation: 'replaceRegex', field: 'text', searchValue: '\\d+', replaceValue: 'X' } },
    ],
    extraction: [
      { name: 'substring', description: 'Extract substring by start/end indices', exampleConfig: { operation: 'substring', field: 'text', start: 0, end: 10 } },
      { name: 'slice', description: 'Extract portion of string', exampleConfig: { operation: 'slice', field: 'text', start: 5 } },
      { name: 'split', description: 'Split string into array', exampleConfig: { operation: 'split', field: 'csv', separator: ',' } },
    ],
    formatting: [
      { name: 'concat', description: 'Concatenate multiple strings', exampleConfig: { operation: 'concat', values: ['$.firstName', ' ', '$.lastName'] } },
      { name: 'pad', description: 'Pad string to specified length', exampleConfig: { operation: 'pad', field: 'id', length: 10, padChar: '0', side: 'left' } },
      { name: 'stripHTML', description: 'Remove HTML tags from string', exampleConfig: { operation: 'stripHTML', field: 'content' } },
      { name: 'slugify', description: 'Convert to URL-friendly slug', exampleConfig: { operation: 'slugify', field: 'title' } },
    ],
  },

  math: {
    arithmetic: [
      { name: 'add', description: 'Add numbers together', exampleConfig: { operation: 'add', values: [10, 20, 30] } },
      { name: 'subtract', description: 'Subtract numbers (left to right)', exampleConfig: { operation: 'subtract', values: [100, 30, 10] } },
      { name: 'multiply', description: 'Multiply numbers together', exampleConfig: { operation: 'multiply', values: [5, 10] } },
      { name: 'divide', description: 'Divide numbers (left to right)', exampleConfig: { operation: 'divide', values: [100, 2] } },
    ],
    advanced: [
      { name: 'modulo', description: 'Get remainder of division', exampleConfig: { operation: 'modulo', values: [17, 5] } },
      { name: 'power', description: 'Raise to power', exampleConfig: { operation: 'power', values: [2, 8] } },
      { name: 'sqrt', description: 'Square root', exampleConfig: { operation: 'sqrt', values: [16] } },
      { name: 'abs', description: 'Absolute value', exampleConfig: { operation: 'abs', values: [-42] } },
      { name: 'round', description: 'Round to nearest integer', exampleConfig: { operation: 'round', values: [3.7] } },
      { name: 'floor', description: 'Round down', exampleConfig: { operation: 'floor', values: [3.9] } },
      { name: 'ceil', description: 'Round up', exampleConfig: { operation: 'ceil', values: [3.1] } },
    ],
    aggregation: [
      { name: 'min', description: 'Minimum value', exampleConfig: { operation: 'min', values: [5, 2, 8, 1, 9] } },
      { name: 'max', description: 'Maximum value', exampleConfig: { operation: 'max', values: [5, 2, 8, 1, 9] } },
      { name: 'sum', description: 'Sum of values', exampleConfig: { operation: 'sum', values: [1, 2, 3, 4, 5] } },
      { name: 'average', description: 'Average of values', exampleConfig: { operation: 'average', values: [10, 20, 30] } },
    ],
  },

  logic: {
    comparison: [
      { name: 'equal', description: 'Check if values are equal', exampleConfig: { operation: 'equal', values: ['$.status', 'active'] } },
      { name: 'notEqual', description: 'Check if values are not equal', exampleConfig: { operation: 'notEqual', values: ['$.status', 'deleted'] } },
      { name: 'greater', description: 'Check if first > second', exampleConfig: { operation: 'greater', values: ['$.score', 50] } },
      { name: 'greaterOrEqual', description: 'Check if first >= second', exampleConfig: { operation: 'greaterOrEqual', values: ['$.age', 18] } },
      { name: 'less', description: 'Check if first < second', exampleConfig: { operation: 'less', values: ['$.balance', 0] } },
      { name: 'lessOrEqual', description: 'Check if first <= second', exampleConfig: { operation: 'lessOrEqual', values: ['$.attempts', 3] } },
    ],
    logical: [
      { name: 'and', description: 'Logical AND of all values', exampleConfig: { operation: 'and', values: ['$.isActive', '$.isVerified'] } },
      { name: 'or', description: 'Logical OR of all values', exampleConfig: { operation: 'or', values: ['$.isAdmin', '$.isModerator'] } },
      { name: 'not', description: 'Logical NOT of value', exampleConfig: { operation: 'not', values: ['$.isDeleted'] } },
    ],
    existence: [
      { name: 'isNull', description: 'Check if value is null', exampleConfig: { operation: 'isNull', values: ['$.optionalField'] } },
      { name: 'isNotNull', description: 'Check if value is not null', exampleConfig: { operation: 'isNotNull', values: ['$.requiredField'] } },
      { name: 'isEmpty', description: 'Check if value is empty', exampleConfig: { operation: 'isEmpty', values: ['$.list'] } },
      { name: 'isNotEmpty', description: 'Check if value is not empty', exampleConfig: { operation: 'isNotEmpty', values: ['$.items'] } },
    ],
  },

  mathOperations: {
    field: [
      { name: 'add', description: 'Add value to field', exampleConfig: { operation: 'add', field: 'price', value: 10 } },
      { name: 'subtract', description: 'Subtract value from field', exampleConfig: { operation: 'subtract', field: 'stock', value: 1 } },
      { name: 'multiply', description: 'Multiply field by value', exampleConfig: { operation: 'multiply', field: 'quantity', value: 2 } },
      { name: 'divide', description: 'Divide field by value', exampleConfig: { operation: 'divide', field: 'total', value: 100 } },
      { name: 'round', description: 'Round field value', exampleConfig: { operation: 'round', field: 'average', precision: 2 } },
      { name: 'abs', description: 'Absolute value of field', exampleConfig: { operation: 'abs', field: 'difference' } },
    ],
  },

  aggregate: {
    basic: [
      { name: 'count', description: 'Count items', exampleConfig: { operation: 'count' } },
      { name: 'sum', description: 'Sum of field values', exampleConfig: { operation: 'sum', field: 'amount' } },
      { name: 'avg', description: 'Average of field values', exampleConfig: { operation: 'avg', field: 'score' } },
      { name: 'min', description: 'Minimum field value', exampleConfig: { operation: 'min', field: 'price' } },
      { name: 'max', description: 'Maximum field value', exampleConfig: { operation: 'max', field: 'price' } },
    ],
    grouping: [
      { name: 'groupBy', description: 'Group by field values', exampleConfig: { operation: 'groupBy', groupField: 'category' } },
    ],
  },
};

/**
 * Extract operations available for a node
 *
 * For operation-based nodes (filter, switch, stringOperations, etc.),
 * returns all available operations grouped by type.
 *
 * @param nodeId - The node ID to get operations for
 * @param source - Optional source code to parse for additional operations
 * @returns Operations grouped by type, or undefined if node has no operations
 */
export function extractOperations(nodeId: string, source?: string): OperationsByType | undefined {
  // Check for known operations
  const knownOps = NODE_OPERATIONS[nodeId];
  if (knownOps) {
    return knownOps;
  }

  // For unknown nodes, try to extract operations from source code
  if (source) {
    return extractOperationsFromSource(nodeId, source);
  }

  return undefined;
}

/**
 * Extract operations from source code using pattern matching
 */
function extractOperationsFromSource(nodeId: string, source: string): OperationsByType | undefined {
  const operations: OperationsByType = {};

  // Look for switch statements on operation type
  const switchMatch = source.match(/switch\s*\(\s*operation\s*\)\s*\{([^}]+)\}/);
  if (switchMatch && switchMatch[1]) {
    const caseBlock = switchMatch[1];
    const caseRegex = /case\s*['"](\w+)['"]/g;
    const foundOps: OperationInfo[] = [];

    let match: RegExpExecArray | null;
    while ((match = caseRegex.exec(caseBlock)) !== null) {
      const opName = match[1];
      if (opName && opName !== 'default') {
        foundOps.push({
          name: opName,
          description: `${opName} operation`,
          exampleConfig: { operation: opName },
        });
      }
    }

    if (foundOps.length > 0) {
      operations['operations'] = foundOps;
      return operations;
    }
  }

  // Look for operation validation arrays
  const validOpsMatch = source.match(/(?:validOperations|operations)\s*(?:=|:)\s*\[([^\]]+)\]/);
  if (validOpsMatch && validOpsMatch[1]) {
    const opsStr = validOpsMatch[1];
    const ops = opsStr.match(/['"](\w+)['"]/g);

    if (ops && ops.length > 0) {
      const foundOps: OperationInfo[] = ops.map(op => {
        const name = op.replace(/['"]/g, '');
        return {
          name,
          description: `${name} operation`,
          exampleConfig: { operation: name },
        };
      });

      operations['operations'] = foundOps;
      return operations;
    }
  }

  return Object.keys(operations).length > 0 ? operations : undefined;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  buildInputSchema,
  buildEdgeConditions,
  buildStateInteractions,
  calculateComplexity,
  extractOperations,
};
