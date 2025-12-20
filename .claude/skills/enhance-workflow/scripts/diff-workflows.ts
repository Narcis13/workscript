#!/usr/bin/env bun
/**
 * Workflow Diff Script
 *
 * Compares two workflow JSON files and reports differences.
 *
 * Usage: bun diff-workflows.ts <original.json> <enhanced.json>
 *
 * Exit codes:
 *   0 - Diff complete (with or without differences)
 *   1 - File not found or invalid JSON
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

interface DiffResult {
  original: string;
  enhanced: string;
  summary: {
    versionChange: string | null;
    nodeCountChange: number;
    depthChange: number;
    guardChanges: string[];
  };
  changes: Change[];
  metrics: {
    original: WorkflowMetrics;
    enhanced: WorkflowMetrics;
  };
}

interface WorkflowMetrics {
  nodeCount: number;
  maxDepth: number;
  flatNodes: number;
  nestedNodes: number;
  errorEdges: number;
  hasInputValidation: boolean;
  hasAIValidation: boolean;
  hasArrayGuards: boolean;
  loops: number;
  conditionals: number;
}

interface Change {
  type: 'added' | 'removed' | 'modified';
  path: string;
  description: string;
}

function loadWorkflow(filePath: string): any | null {
  if (!existsSync(filePath)) {
    console.error(`\x1b[31mError: File not found: ${filePath}\x1b[0m`);
    return null;
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`\x1b[31mError parsing ${filePath}: ${(e as Error).message}\x1b[0m`);
    return null;
  }
}

function getMetrics(workflow: any): WorkflowMetrics {
  const metrics: WorkflowMetrics = {
    nodeCount: 0,
    maxDepth: 0,
    flatNodes: 0,
    nestedNodes: 0,
    errorEdges: 0,
    hasInputValidation: false,
    hasAIValidation: false,
    hasArrayGuards: false,
    loops: 0,
    conditionals: 0,
  };

  function analyze(obj: any, depth: number): void {
    if (typeof obj !== 'object' || obj === null) return;

    if (depth > metrics.maxDepth) {
      metrics.maxDepth = depth;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => analyze(item, depth));
      return;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('?')) {
        if (key === 'error?') {
          metrics.errorEdges++;
        }
        if (value !== null && typeof value === 'object') {
          analyze(value, depth + 1);
        }
        continue;
      }

      const nodeType = key.replace(/\.\.\.?$/, '');

      // Count nodes
      if (typeof value === 'object' && value !== null && !key.startsWith('$.')) {
        metrics.nodeCount++;
        if (depth === 0) {
          metrics.flatNodes++;
        } else {
          metrics.nestedNodes++;
        }
      }

      // Check patterns
      if (key.endsWith('...')) {
        metrics.loops++;
      }

      if (nodeType === 'logic' && !key.endsWith('...')) {
        metrics.conditionals++;
      }

      // Check guards
      if (nodeType === 'validateData') {
        const config = value as any;
        if (config?.validationType === 'required_fields') {
          metrics.hasInputValidation = true;
        }
        if (config?.validationType === 'json') {
          metrics.hasAIValidation = true;
        }
      }

      if (nodeType === 'logic') {
        const config = value as any;
        if (
          config?.operation === 'greater' &&
          JSON.stringify(config?.values || []).includes('.length')
        ) {
          metrics.hasArrayGuards = true;
        }
      }

      if (typeof value === 'object' && value !== null) {
        analyze(value, depth + 1);
      }
    }
  }

  if (Array.isArray(workflow.workflow)) {
    workflow.workflow.forEach((step: any) => analyze(step, 0));
  }

  return metrics;
}

function findChanges(original: any, enhanced: any): Change[] {
  const changes: Change[] = [];

  function compare(orig: any, enh: any, path: string): void {
    // Handle null/undefined
    if (orig === null && enh !== null) {
      changes.push({ type: 'added', path, description: 'Added new content' });
      return;
    }
    if (orig !== null && enh === null) {
      changes.push({ type: 'removed', path, description: 'Removed content' });
      return;
    }

    // Handle type differences
    if (typeof orig !== typeof enh) {
      changes.push({
        type: 'modified',
        path,
        description: `Changed type from ${typeof orig} to ${typeof enh}`,
      });
      return;
    }

    // Handle arrays
    if (Array.isArray(orig) && Array.isArray(enh)) {
      if (orig.length !== enh.length) {
        changes.push({
          type: 'modified',
          path,
          description: `Array length changed from ${orig.length} to ${enh.length}`,
        });
      }
      const maxLen = Math.max(orig.length, enh.length);
      for (let i = 0; i < maxLen; i++) {
        compare(orig[i], enh[i], `${path}[${i}]`);
      }
      return;
    }

    // Handle objects
    if (typeof orig === 'object' && typeof enh === 'object') {
      const allKeys = new Set([...Object.keys(orig || {}), ...Object.keys(enh || {})]);

      for (const key of allKeys) {
        if (!(key in orig)) {
          // Identify what was added
          let desc = 'Added new property';
          if (key.endsWith('?')) {
            desc = `Added ${key} edge`;
          } else if (key === 'validateData') {
            desc = 'Added validation node';
          }
          changes.push({ type: 'added', path: `${path}.${key}`, description: desc });
        } else if (!(key in enh)) {
          changes.push({
            type: 'removed',
            path: `${path}.${key}`,
            description: 'Removed property',
          });
        } else if (JSON.stringify(orig[key]) !== JSON.stringify(enh[key])) {
          compare(orig[key], enh[key], `${path}.${key}`);
        }
      }
      return;
    }

    // Handle primitives
    if (orig !== enh) {
      changes.push({
        type: 'modified',
        path,
        description: `Changed from "${orig}" to "${enh}"`,
      });
    }
  }

  compare(original, enhanced, 'root');

  // Simplify paths
  return changes.map((c) => ({
    ...c,
    path: c.path.replace(/^root\.?/, '') || 'root',
  }));
}

function diffWorkflows(originalPath: string, enhancedPath: string): DiffResult | null {
  const original = loadWorkflow(originalPath);
  const enhanced = loadWorkflow(enhancedPath);

  if (!original || !enhanced) {
    return null;
  }

  const origMetrics = getMetrics(original);
  const enhMetrics = getMetrics(enhanced);
  const changes = findChanges(original, enhanced);

  // Identify guard changes
  const guardChanges: string[] = [];
  if (!origMetrics.hasInputValidation && enhMetrics.hasInputValidation) {
    guardChanges.push('Added input validation');
  }
  if (!origMetrics.hasAIValidation && enhMetrics.hasAIValidation) {
    guardChanges.push('Added AI response validation');
  }
  if (!origMetrics.hasArrayGuards && enhMetrics.hasArrayGuards) {
    guardChanges.push('Added array length guards');
  }
  if (enhMetrics.errorEdges > origMetrics.errorEdges) {
    guardChanges.push(
      `Added ${enhMetrics.errorEdges - origMetrics.errorEdges} error edge(s)`
    );
  }

  return {
    original: basename(originalPath),
    enhanced: basename(enhancedPath),
    summary: {
      versionChange:
        original.version !== enhanced.version
          ? `${original.version} -> ${enhanced.version}`
          : null,
      nodeCountChange: enhMetrics.nodeCount - origMetrics.nodeCount,
      depthChange: enhMetrics.maxDepth - origMetrics.maxDepth,
      guardChanges,
    },
    changes,
    metrics: {
      original: origMetrics,
      enhanced: enhMetrics,
    },
  };
}

function printDiff(result: DiffResult): void {
  console.log('\n\x1b[36m=== Workflow Diff ===\x1b[0m\n');

  console.log(`Original: ${result.original}`);
  console.log(`Enhanced: ${result.enhanced}`);

  // Summary
  console.log('\n\x1b[1mSummary\x1b[0m');
  if (result.summary.versionChange) {
    console.log(`  Version: ${result.summary.versionChange}`);
  }
  const nodeChange = result.summary.nodeCountChange;
  const nodeColor = nodeChange > 0 ? '\x1b[32m+' : nodeChange < 0 ? '\x1b[31m' : '';
  console.log(
    `  Nodes: ${result.metrics.original.nodeCount} -> ${result.metrics.enhanced.nodeCount} (${nodeColor}${nodeChange}\x1b[0m)`
  );

  const depthChange = result.summary.depthChange;
  const depthColor = depthChange < 0 ? '\x1b[32m' : depthChange > 0 ? '\x1b[33m' : '';
  console.log(
    `  Max depth: ${result.metrics.original.maxDepth} -> ${result.metrics.enhanced.maxDepth} (${depthColor}${depthChange >= 0 ? '+' : ''}${depthChange}\x1b[0m)`
  );

  // Guard changes
  if (result.summary.guardChanges.length > 0) {
    console.log('\n\x1b[1mGuard Improvements\x1b[0m');
    result.summary.guardChanges.forEach((g) => {
      console.log(`  \x1b[32m+\x1b[0m ${g}`);
    });
  }

  // Structure comparison
  console.log('\n\x1b[1mStructure Comparison\x1b[0m');
  const origFlat = result.metrics.original.flatNodes;
  const origNested = result.metrics.original.nestedNodes;
  const enhFlat = result.metrics.enhanced.flatNodes;
  const enhNested = result.metrics.enhanced.nestedNodes;
  const origRatio =
    origFlat + origNested > 0
      ? Math.round((origFlat / (origFlat + origNested)) * 100)
      : 0;
  const enhRatio =
    enhFlat + enhNested > 0
      ? Math.round((enhFlat / (enhFlat + enhNested)) * 100)
      : 0;

  console.log(
    `  Flat ratio: ${origRatio}% -> ${enhRatio}% (${enhRatio >= origRatio ? '\x1b[32m' : '\x1b[33m'}${enhRatio - origRatio >= 0 ? '+' : ''}${enhRatio - origRatio}%\x1b[0m)`
  );

  // Detailed changes
  if (result.changes.length > 0) {
    console.log('\n\x1b[1mChanges Detail\x1b[0m');

    const added = result.changes.filter((c) => c.type === 'added');
    const removed = result.changes.filter((c) => c.type === 'removed');
    const modified = result.changes.filter((c) => c.type === 'modified');

    if (added.length > 0) {
      console.log(`\n  \x1b[32mAdded (${added.length}):\x1b[0m`);
      added.slice(0, 10).forEach((c) => {
        console.log(`    + ${c.path}: ${c.description}`);
      });
      if (added.length > 10) {
        console.log(`    ... and ${added.length - 10} more`);
      }
    }

    if (removed.length > 0) {
      console.log(`\n  \x1b[31mRemoved (${removed.length}):\x1b[0m`);
      removed.slice(0, 10).forEach((c) => {
        console.log(`    - ${c.path}: ${c.description}`);
      });
      if (removed.length > 10) {
        console.log(`    ... and ${removed.length - 10} more`);
      }
    }

    if (modified.length > 0) {
      console.log(`\n  \x1b[33mModified (${modified.length}):\x1b[0m`);
      modified.slice(0, 10).forEach((c) => {
        console.log(`    ~ ${c.path}: ${c.description}`);
      });
      if (modified.length > 10) {
        console.log(`    ... and ${modified.length - 10} more`);
      }
    }
  } else {
    console.log('\n  No structural changes detected.');
  }

  // Assessment
  console.log('\n\x1b[1mAssessment\x1b[0m');
  let score = 0;
  const notes: string[] = [];

  if (result.summary.guardChanges.length > 0) {
    score += result.summary.guardChanges.length;
    notes.push('Guards improved');
  }

  if (result.metrics.enhanced.maxDepth < result.metrics.original.maxDepth) {
    score++;
    notes.push('Reduced nesting');
  }

  if (enhRatio > origRatio) {
    score++;
    notes.push('Improved flat structure');
  }

  if (
    result.metrics.enhanced.errorEdges > result.metrics.original.errorEdges
  ) {
    score++;
    notes.push('Better error handling');
  }

  if (score === 0) {
    console.log('  \x1b[33mNo measurable improvement detected.\x1b[0m');
  } else {
    console.log(
      `  \x1b[32mEnhancement score: +${score} (${notes.join(', ')})\x1b[0m`
    );
  }

  console.log('');
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
Workflow Diff Script

Usage: bun diff-workflows.ts <original.json> <enhanced.json>

Options:
  --help, -h    Show this help message
  --json        Output as JSON

Example:
  bun diff-workflows.ts original.json enhanced.json
`);
  process.exit(0);
}

const originalPath = resolve(args[0]);
const enhancedPath = resolve(args[1]);
const outputJson = args.includes('--json');

const result = diffWorkflows(originalPath, enhancedPath);

if (!result) {
  process.exit(1);
}

if (outputJson) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printDiff(result);
}

process.exit(0);
