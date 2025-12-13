#!/usr/bin/env bun
/**
 * Workflow Validation Script
 *
 * Validates workflow JSON against schema and performs semantic checks.
 *
 * Usage: bun validate-workflow.ts <workflow.json>
 *
 * Exit codes:
 *   0 - Valid workflow
 *   1 - Invalid JSON or schema errors
 *   2 - Semantic errors (unknown nodes, invalid state paths)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';

// Known node types (45 total from @workscript/nodes)
const KNOWN_NODES = new Set([
  // Core (6)
  'math',
  'logic',
  'transform',
  'log',
  'empty',
  '__state_setter__',

  // AI (1)
  'ask-ai',

  // Orchestration (1)
  'runWorkflow',

  // Data Manipulation - Array (9)
  'filter',
  'sort',
  'aggregate',
  'splitOut',
  'limit',
  'removeDuplicates',
  'arrayUtilities',
  'everyArrayItem',
  'range',
  'while',

  // Data Manipulation - Transform (3)
  'editFields',
  'summarize',
  'transformObject',

  // Data Manipulation - Parse (3)
  'jsonExtract',
  'stringOperations',
  'extractText',

  // Data Manipulation - HTTP (1)
  'fetchApi',

  // Data Manipulation - Resource (4)
  'resource-read',
  'resource-write',
  'resource-list',
  'resource-interpolate',

  // Data Manipulation - Filter/Compare (3)
  'switch',
  'compareDatasets',

  // Data Manipulation - Calculate (2)
  'calculateField',
  'mathOperations',

  // Data Manipulation - Date (1)
  'dateTime',

  // Data Manipulation - Validate (1)
  'validateData',

  // Data Manipulation - Object (1)
  'objectUtilities',

  // Server (3)
  'filesystem',
  'database',
  'auth',

  // Custom - Gmail (3)
  'google-connect',
  'send-email',
  'list-emails',

  // Custom - Zoca (3)
  'toateContactele',
  'fiecareElement',
  'aplicaFiltre',
]);

// Validation result interface
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// Workflow interface
interface Workflow {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  initialState?: Record<string, unknown>;
  workflow?: unknown[];
}

/**
 * Validate workflow structure and semantics
 */
function validateWorkflow(filePath: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check file exists
  if (!existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`], warnings: [] };
  }

  // 2. Parse JSON
  let workflow: Workflow;
  let rawContent: string;

  try {
    rawContent = readFileSync(filePath, 'utf-8');
  } catch (e) {
    return {
      valid: false,
      errors: [`Cannot read file: ${(e as Error).message}`],
      warnings: [],
    };
  }

  try {
    workflow = JSON.parse(rawContent);
  } catch (e) {
    return {
      valid: false,
      errors: [`Invalid JSON: ${(e as Error).message}`],
      warnings: [],
    };
  }

  // 3. Schema validation - Required fields
  if (!workflow.id) {
    errors.push('Missing required field: id');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(workflow.id)) {
    errors.push(`Invalid id format: "${workflow.id}" (must match /^[a-zA-Z0-9_-]+$/)`);
  }

  if (!workflow.name) {
    errors.push('Missing required field: name');
  } else if (workflow.name.length < 1) {
    errors.push('Field "name" must have at least 1 character');
  }

  if (!workflow.version) {
    errors.push('Missing required field: version');
  } else if (!/^\d+\.\d+\.\d+$/.test(workflow.version)) {
    errors.push(
      `Invalid version format: "${workflow.version}" (must match X.Y.Z, e.g., "1.0.0")`
    );
  }

  if (!workflow.workflow) {
    errors.push('Missing required field: workflow');
  } else if (!Array.isArray(workflow.workflow)) {
    errors.push('Field "workflow" must be an array');
  } else if (workflow.workflow.length < 1) {
    errors.push('Field "workflow" must have at least 1 item');
  }

  // If basic structure is invalid, return early
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }

  // 4. Semantic validation - Check node types and state paths
  const checkNodeTypes = (obj: unknown, path: string): void => {
    if (typeof obj !== 'object' || obj === null) return;

    if (Array.isArray(obj)) {
      obj.forEach((item, i) => checkNodeTypes(item, `${path}[${i}]`));
      return;
    }

    const record = obj as Record<string, unknown>;

    for (const [key, value] of Object.entries(record)) {
      // Skip edge names (ending with ?)
      if (key.endsWith('?')) {
        if (value !== null && typeof value === 'object') {
          checkNodeTypes(value, `${path}.${key}`);
        }
        continue;
      }

      // Check if this is a state setter
      if (key.startsWith('$.')) {
        validateStatePath(key, path);
        continue;
      }

      // Check if this is a node type (strip loop suffix ...)
      const nodeType = key.replace(/\.\.\.?$/, '');

      // Skip if it looks like a config parameter (lowercase single word without special meaning)
      const configParams = [
        'operation',
        'values',
        'items',
        'conditions',
        'field',
        'dataType',
        'value',
        'mode',
        'type',
        'message',
        'path',
        'content',
        'data',
        'table',
        'query',
        'userPrompt',
        'model',
        'systemPrompt',
        'workflowId',
        'initialState',
        'timeout',
        'fieldsToSet',
        'fieldsToSortBy',
        'fieldsToSummarize',
        'fieldsToSplitBy',
        'requiredFields',
        'validationType',
        'matchMode',
        'compareMode',
        'fieldsToCompare',
        'includeOtherFields',
        'stopOnError',
        'patternValidations',
        'pattern',
        'errorMessage',
        'name',
        'order',
        'fieldName',
        'fieldToAggregate',
        'aggregation',
        'outputFieldName',
        'outputKey',
        'rules',
        'fallbackOutput',
        'expression',
        'item',
        'maxItems',
        'keepFrom',
        'url',
        'method',
        'headers',
        'body',
      ];

      if (configParams.includes(key)) {
        if (typeof value === 'object' && value !== null) {
          checkNodeTypes(value, `${path}.${key}`);
        }
        continue;
      }

      // Check if it's a recognized node type
      if (
        nodeType &&
        !nodeType.includes('.') &&
        /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(nodeType)
      ) {
        if (!KNOWN_NODES.has(nodeType)) {
          // Only error if it looks like it should be a node (has edges or is at workflow level)
          const hasEdges = Object.keys(record).some((k) => k.endsWith('?'));
          const isTopLevel = path.match(/^workflow\[\d+\]$/);

          if (hasEdges || isTopLevel) {
            errors.push(`Unknown node type: "${nodeType}" at ${path}`);
            suggestSimilarNode(nodeType, warnings);
          }
        }
      }

      // Recurse into value
      if (typeof value === 'object' && value !== null) {
        checkNodeTypes(value, `${path}.${key}`);
      }
    }
  };

  const validateStatePath = (key: string, path: string): void => {
    const pathPart = key.slice(2); // Remove $.

    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(pathPart)) {
      errors.push(
        `Invalid state path: "${key}" at ${path} (must be $.identifier or $.path.to.key)`
      );
    }
  };

  const suggestSimilarNode = (nodeType: string, warnings: string[]): void => {
    const suggestions: string[] = [];
    const lowerNodeType = nodeType.toLowerCase();

    for (const known of KNOWN_NODES) {
      const lowerKnown = known.toLowerCase();

      // Check for similar names
      if (
        lowerKnown.includes(lowerNodeType) ||
        lowerNodeType.includes(lowerKnown)
      ) {
        suggestions.push(known);
      }
      // Check for edit distance (simple)
      else if (
        Math.abs(known.length - nodeType.length) <= 2 &&
        levenshteinDistance(lowerNodeType, lowerKnown) <= 3
      ) {
        suggestions.push(known);
      }
    }

    if (suggestions.length > 0) {
      warnings.push(`  Did you mean: ${suggestions.slice(0, 3).join(', ')}?`);
    }
  };

  // Simple Levenshtein distance
  const levenshteinDistance = (a: string, b: string): number => {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // Run semantic validation
  if (workflow.workflow) {
    workflow.workflow.forEach((step, i) => {
      checkNodeTypes(step, `workflow[${i}]`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Workflow Validation Script

Usage: bun validate-workflow.ts <workflow.json>

Options:
  --help, -h    Show this help message

Exit codes:
  0 - Valid workflow
  1 - Schema validation errors
  2 - Semantic validation errors (unknown nodes, invalid paths)

Example:
  bun validate-workflow.ts my-workflow.json
`);
  process.exit(0);
}

const filePath = resolve(args[0]);
const result = validateWorkflow(filePath);

if (result.valid) {
  console.log('\x1b[32m%s\x1b[0m', '✓ Workflow is valid');
  process.exit(0);
} else {
  console.log('\x1b[31m%s\x1b[0m', '✗ Validation failed');
  console.log('');

  if (result.errors.length > 0) {
    console.log('\x1b[31mErrors:\x1b[0m');
    result.errors.forEach((e) => console.log(`  - ${e}`));
  }

  if (result.warnings.length > 0) {
    console.log('');
    console.log('\x1b[33mSuggestions:\x1b[0m');
    result.warnings.forEach((w) => console.log(w));
  }

  // Determine exit code
  const hasSchemaErrors = result.errors.some(
    (e) =>
      e.includes('Missing required') ||
      e.includes('Invalid') ||
      e.includes('must be') ||
      e.includes('must have')
  );

  process.exit(hasSchemaErrors ? 1 : 2);
}
