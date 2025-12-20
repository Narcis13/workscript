#!/usr/bin/env bun
/**
 * Workflow Analysis Script
 *
 * Analyzes workflow JSON for structure, guards, patterns, and improvement opportunities.
 *
 * Usage: bun analyze-workflow.ts <workflow.json>
 *
 * Exit codes:
 *   0 - Analysis complete
 *   1 - File not found or invalid JSON
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

// Analysis result interface
interface AnalysisResult {
  filename: string;
  summary: {
    id: string;
    name: string;
    version: string;
    nodeCount: number;
    maxDepth: number;
    hasInitialState: boolean;
  };
  structure: {
    flatNodes: number;
    nestedNodes: number;
    flatRatio: number;
    nestingLevels: Record<number, number>;
  };
  guards: {
    hasInputValidation: boolean;
    hasAIValidation: boolean;
    hasArrayGuards: boolean;
    errorEdgeCount: number;
    nodesWithoutErrorEdges: string[];
  };
  patterns: {
    loops: number;
    conditionals: number;
    switchRoutes: number;
    databaseOps: number;
    aiCalls: number;
    apiCalls: number;
  };
  state: {
    keysRead: string[];
    keysWritten: string[];
    potentialConflicts: string[];
  };
  opportunities: string[];
}

// Known nodes that can fail and need error? edges
const FALLIBLE_NODES = new Set([
  'database',
  'filesystem',
  'fetchApi',
  'ask-ai',
  'auth',
  'runWorkflow',
  'validateData',
  'google-connect',
  'send-email',
  'list-emails',
  'resource-read',
  'resource-write',
]);

// Nodes that write to state
const STATE_WRITERS: Record<string, string[]> = {
  math: ['mathResult'],
  logic: ['logicResult'],
  filter: ['filterPassed', 'filterFiltered', 'filterStats'],
  sort: ['sortedItems'],
  validateData: ['validationResult', 'validationErrors', 'parsedJson'],
  editFields: ['editFieldsResult', 'fieldsModified'],
  database: ['dbInserted', 'dbRecord', 'dbUpdated', 'dbDeleted', 'dbRecords'],
  filesystem: ['fileContent', 'fileExists', 'fileWritten'],
  log: ['lastLoggedMessage'],
  'ask-ai': ['aiResponse', 'aiResponseData'],
  switch: ['switchResult', 'selectedEdge', 'matchedRule'],
  transform: ['transformResult'],
  aggregate: ['aggregateResult'],
  summarize: ['summarizeResult', 'summarizeGroups'],
  fetchApi: ['apiResponse', 'apiStatus'],
};

function analyzeWorkflow(filePath: string): AnalysisResult | null {
  // Check file exists
  if (!existsSync(filePath)) {
    console.error(`\x1b[31mError: File not found: ${filePath}\x1b[0m`);
    return null;
  }

  // Parse JSON
  let workflow: any;
  try {
    const content = readFileSync(filePath, 'utf-8');
    workflow = JSON.parse(content);
  } catch (e) {
    console.error(`\x1b[31mError: Invalid JSON: ${(e as Error).message}\x1b[0m`);
    return null;
  }

  const result: AnalysisResult = {
    filename: basename(filePath),
    summary: {
      id: workflow.id || 'unknown',
      name: workflow.name || 'Unknown',
      version: workflow.version || '0.0.0',
      nodeCount: 0,
      maxDepth: 0,
      hasInitialState: !!workflow.initialState,
    },
    structure: {
      flatNodes: 0,
      nestedNodes: 0,
      flatRatio: 0,
      nestingLevels: {},
    },
    guards: {
      hasInputValidation: false,
      hasAIValidation: false,
      hasArrayGuards: false,
      errorEdgeCount: 0,
      nodesWithoutErrorEdges: [],
    },
    patterns: {
      loops: 0,
      conditionals: 0,
      switchRoutes: 0,
      databaseOps: 0,
      aiCalls: 0,
      apiCalls: 0,
    },
    state: {
      keysRead: [],
      keysWritten: [],
      potentialConflicts: [],
    },
    opportunities: [],
  };

  // Track state references
  const stateReads = new Set<string>();
  const stateWrites = new Set<string>();
  const seenFallibleNodes: string[] = [];

  // Recursive analysis
  function analyzeNode(obj: any, depth: number, path: string): void {
    if (typeof obj !== 'object' || obj === null) return;

    // Track max depth
    if (depth > result.summary.maxDepth) {
      result.summary.maxDepth = depth;
    }

    // Track nesting levels
    result.structure.nestingLevels[depth] =
      (result.structure.nestingLevels[depth] || 0) + 1;

    if (Array.isArray(obj)) {
      obj.forEach((item, i) => analyzeNode(item, depth, `${path}[${i}]`));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      // Check for state references in values
      if (typeof value === 'string') {
        if (value.startsWith('$.')) {
          stateReads.add(value);
        }
        const templates = value.match(/\{\{\$\.[\w.]+\}\}/g) || [];
        templates.forEach((t: string) => stateReads.add(t.slice(2, -2)));
      }

      // Check for state setters
      if (key.startsWith('$.')) {
        stateWrites.add(key);
      }

      // Skip edge names for node counting
      if (key.endsWith('?')) {
        // Track error edges
        if (key === 'error?') {
          result.guards.errorEdgeCount++;
        }

        // Check for guards
        if (key === 'valid?' || key === 'invalid?') {
          // Check if this is validating AI response
          if (path.includes('ask-ai') || path.includes('aiResponse')) {
            result.guards.hasAIValidation = true;
          }
        }

        if (value !== null && typeof value === 'object') {
          analyzeNode(value, depth + 1, `${path}.${key}`);
        }
        continue;
      }

      // Identify node types
      const nodeType = key.replace(/\.\.\.?$/, '');
      const isLoop = key.endsWith('...');

      // Check for input validation at entry
      if (
        nodeType === 'validateData' &&
        path.match(/^workflow\[0\]/)
      ) {
        const config = value as any;
        if (
          config?.validationType === 'required_fields' &&
          config?.data?.toString().includes('$.input')
        ) {
          result.guards.hasInputValidation = true;
        }
      }

      // Check for array guards
      if (nodeType === 'logic') {
        const config = value as any;
        if (
          config?.operation === 'greater' &&
          JSON.stringify(config?.values || []).includes('.length')
        ) {
          result.guards.hasArrayGuards = true;
        }
      }

      // Count patterns
      if (isLoop) {
        result.patterns.loops++;
      }

      if (nodeType === 'logic' && !isLoop) {
        result.patterns.conditionals++;
      }

      if (nodeType === 'switch') {
        result.patterns.switchRoutes++;
      }

      if (nodeType === 'database') {
        result.patterns.databaseOps++;
      }

      if (nodeType === 'ask-ai') {
        result.patterns.aiCalls++;
      }

      if (nodeType === 'fetchApi') {
        result.patterns.apiCalls++;
      }

      // Track fallible nodes
      if (FALLIBLE_NODES.has(nodeType)) {
        seenFallibleNodes.push(`${nodeType} at ${path}`);

        // Check if it has error? edge
        const config = value as Record<string, any>;
        if (!config['error?']) {
          result.guards.nodesWithoutErrorEdges.push(`${nodeType} at ${path}`);
        }
      }

      // Track state written by nodes
      if (STATE_WRITERS[nodeType]) {
        STATE_WRITERS[nodeType].forEach((key) => stateWrites.add(`$.${key}`));
      }

      // Count nodes at this level
      if (
        typeof value === 'object' &&
        value !== null &&
        !key.endsWith('?')
      ) {
        result.summary.nodeCount++;

        if (depth === 0) {
          result.structure.flatNodes++;
        } else {
          result.structure.nestedNodes++;
        }
      }

      // Recurse
      if (typeof value === 'object' && value !== null) {
        analyzeNode(value, depth + 1, `${path}.${key}`);
      }
    }
  }

  // Analyze workflow array
  if (Array.isArray(workflow.workflow)) {
    workflow.workflow.forEach((step: any, i: number) => {
      analyzeNode(step, 0, `workflow[${i}]`);
    });
  }

  // Calculate flat ratio
  const totalNodes = result.structure.flatNodes + result.structure.nestedNodes;
  result.structure.flatRatio =
    totalNodes > 0 ? result.structure.flatNodes / totalNodes : 0;

  // Set state tracking
  result.state.keysRead = Array.from(stateReads).sort();
  result.state.keysWritten = Array.from(stateWrites).sort();

  // Find potential conflicts (reads before writes)
  const conflicts: string[] = [];
  for (const read of stateReads) {
    const normalized = read.replace(/^\$\./, '');
    let isWritten = false;
    for (const write of stateWrites) {
      if (write.includes(normalized)) {
        isWritten = true;
        break;
      }
    }
    if (!isWritten && !workflow.initialState?.[normalized.split('.')[0]]) {
      conflicts.push(read);
    }
  }
  result.state.potentialConflicts = conflicts;

  // Generate opportunities
  generateOpportunities(result, workflow);

  return result;
}

function generateOpportunities(result: AnalysisResult, workflow: any): void {
  const opportunities = result.opportunities;

  // Structure opportunities
  if (result.structure.flatRatio < 0.3 && result.summary.nodeCount > 3) {
    opportunities.push(
      `FLATTEN: Low flat ratio (${Math.round(result.structure.flatRatio * 100)}%). Consider converting sequential success? chains to flat workflow array.`
    );
  }

  if (result.summary.maxDepth > 5) {
    opportunities.push(
      `NESTING: Max depth is ${result.summary.maxDepth}. Consider reducing nesting for readability.`
    );
  }

  // Guard opportunities
  if (!result.guards.hasInputValidation && workflow.initialState) {
    opportunities.push(
      'GUARD: No input validation detected. Add validateData at entry point to validate initialState.'
    );
  }

  if (result.patterns.aiCalls > 0 && !result.guards.hasAIValidation) {
    opportunities.push(
      'GUARD: AI calls detected without JSON validation. Add validateData after ask-ai nodes.'
    );
  }

  if (result.patterns.loops > 0 && !result.guards.hasArrayGuards) {
    opportunities.push(
      'GUARD: Loops detected without array length guards. Add logic node to check array.length > 0.'
    );
  }

  if (result.guards.nodesWithoutErrorEdges.length > 0) {
    opportunities.push(
      `ERROR: ${result.guards.nodesWithoutErrorEdges.length} fallible node(s) missing error? edges: ${result.guards.nodesWithoutErrorEdges.slice(0, 3).join(', ')}`
    );
  }

  // State opportunities
  if (result.state.potentialConflicts.length > 0) {
    opportunities.push(
      `STATE: ${result.state.potentialConflicts.length} state key(s) read but not written or in initialState: ${result.state.potentialConflicts.slice(0, 3).join(', ')}`
    );
  }

  // Pattern-specific opportunities
  if (result.patterns.databaseOps > 2) {
    opportunities.push(
      'PATTERN: Multiple database operations. Consider consolidating or using transactions.'
    );
  }

  if (result.patterns.aiCalls > 3) {
    opportunities.push(
      'PATTERN: Many AI calls detected. Consider batching or chaining prompts.'
    );
  }

  if (opportunities.length === 0) {
    opportunities.push('No obvious improvement opportunities detected.');
  }
}

function printAnalysis(result: AnalysisResult): void {
  console.log('\n\x1b[36m=== Workflow Analysis ===\x1b[0m\n');

  // Summary
  console.log('\x1b[1mSummary\x1b[0m');
  console.log(`  File: ${result.filename}`);
  console.log(`  ID: ${result.summary.id}`);
  console.log(`  Name: ${result.summary.name}`);
  console.log(`  Version: ${result.summary.version}`);
  console.log(`  Nodes: ${result.summary.nodeCount}`);
  console.log(`  Max Depth: ${result.summary.maxDepth}`);
  console.log(`  Has Initial State: ${result.summary.hasInitialState ? 'Yes' : 'No'}`);

  // Structure
  console.log('\n\x1b[1mStructure\x1b[0m');
  console.log(`  Flat nodes: ${result.structure.flatNodes}`);
  console.log(`  Nested nodes: ${result.structure.nestedNodes}`);
  console.log(
    `  Flat ratio: ${Math.round(result.structure.flatRatio * 100)}%`
  );

  // Guards
  console.log('\n\x1b[1mDefensive Guards\x1b[0m');
  console.log(
    `  Input validation: ${result.guards.hasInputValidation ? '\x1b[32mYes\x1b[0m' : '\x1b[33mNo\x1b[0m'}`
  );
  console.log(
    `  AI response validation: ${result.guards.hasAIValidation ? '\x1b[32mYes\x1b[0m' : '\x1b[33mNo\x1b[0m'}`
  );
  console.log(
    `  Array length guards: ${result.guards.hasArrayGuards ? '\x1b[32mYes\x1b[0m' : '\x1b[33mNo\x1b[0m'}`
  );
  console.log(`  Error edges: ${result.guards.errorEdgeCount}`);
  if (result.guards.nodesWithoutErrorEdges.length > 0) {
    console.log(
      `  \x1b[33mMissing error edges: ${result.guards.nodesWithoutErrorEdges.length}\x1b[0m`
    );
  }

  // Patterns
  console.log('\n\x1b[1mPatterns Detected\x1b[0m');
  console.log(`  Loops: ${result.patterns.loops}`);
  console.log(`  Conditionals: ${result.patterns.conditionals}`);
  console.log(`  Switch routes: ${result.patterns.switchRoutes}`);
  console.log(`  Database ops: ${result.patterns.databaseOps}`);
  console.log(`  AI calls: ${result.patterns.aiCalls}`);
  console.log(`  API calls: ${result.patterns.apiCalls}`);

  // State
  console.log('\n\x1b[1mState Management\x1b[0m');
  console.log(`  Keys read: ${result.state.keysRead.length}`);
  console.log(`  Keys written: ${result.state.keysWritten.length}`);
  if (result.state.potentialConflicts.length > 0) {
    console.log(
      `  \x1b[33mPotential conflicts: ${result.state.potentialConflicts.length}\x1b[0m`
    );
  }

  // Opportunities
  console.log('\n\x1b[1mImprovement Opportunities\x1b[0m');
  result.opportunities.forEach((opp) => {
    const color = opp.startsWith('GUARD') || opp.startsWith('ERROR')
      ? '\x1b[33m'
      : opp.startsWith('FLATTEN') || opp.startsWith('NESTING')
        ? '\x1b[36m'
        : '\x1b[0m';
    console.log(`  ${color}${opp}\x1b[0m`);
  });

  console.log('');
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Workflow Analysis Script

Usage: bun analyze-workflow.ts <workflow.json>

Options:
  --help, -h    Show this help message
  --json        Output as JSON

Example:
  bun analyze-workflow.ts my-workflow.json
`);
  process.exit(0);
}

const filePath = resolve(args[0]);
const outputJson = args.includes('--json');

const result = analyzeWorkflow(filePath);

if (!result) {
  process.exit(1);
}

if (outputJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printAnalysis(result);
}

process.exit(0);
