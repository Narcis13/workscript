#!/usr/bin/env bun
/**
 * Enhancement Validation Script
 *
 * Validates that an enhanced workflow maintains original capabilities
 * while adding requested improvements.
 *
 * Usage: bun validate-enhancement.ts <enhanced.json> --original <original.json> --request "<enhancement request>"
 *
 * Exit codes:
 *   0 - Enhancement valid
 *   1 - File errors
 *   2 - Enhancement regressions detected
 *   3 - Enhancement request not fulfilled
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

interface ValidationResult {
  valid: boolean;
  regressions: string[];
  improvements: string[];
  requestFulfilled: boolean;
  requestAnalysis: string;
}

interface EnhancementRequest {
  addGuards: boolean;
  addInputValidation: boolean;
  addAIValidation: boolean;
  addArrayGuards: boolean;
  addErrorHandling: boolean;
  flatten: boolean;
  reduceNesting: boolean;
  other: string | null;
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

function parseEnhancementRequest(request: string): EnhancementRequest {
  const lower = request.toLowerCase();
  return {
    addGuards: /guard|defensive|robust|safe/i.test(lower),
    addInputValidation: /input\s*valid|validate\s*input|entry\s*valid/i.test(lower),
    addAIValidation: /ai\s*valid|json\s*valid|ask-ai|validate.*ai/i.test(lower),
    addArrayGuards: /array\s*guard|length\s*check|loop\s*guard|empty\s*array/i.test(lower),
    addErrorHandling: /error\s*handl|error\s*edge|handle\s*error/i.test(lower),
    flatten: /flatten|flat\s*struct|reduce\s*nest|less\s*nest/i.test(lower),
    reduceNesting: /nest|depth|simplif/i.test(lower),
    other: request.length > 0 ? request : null,
  };
}

function getWorkflowMetrics(workflow: any): Record<string, any> {
  const metrics: Record<string, any> = {
    nodeCount: 0,
    maxDepth: 0,
    flatNodes: 0,
    nestedNodes: 0,
    errorEdges: 0,
    hasInputValidation: false,
    hasAIValidation: false,
    hasArrayGuards: false,
    nodeTypes: new Set<string>(),
    stateKeys: new Set<string>(),
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
      // Track state keys
      if (key.startsWith('$.')) {
        metrics.stateKeys.add(key);
      }

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
        metrics.nodeTypes.add(nodeType);

        if (depth === 0) {
          metrics.flatNodes++;
        } else {
          metrics.nestedNodes++;
        }
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

function validateEnhancement(
  enhancedPath: string,
  originalPath: string | null,
  request: string
): ValidationResult {
  const enhanced = loadWorkflow(enhancedPath);
  if (!enhanced) {
    return {
      valid: false,
      regressions: ['Failed to load enhanced workflow'],
      improvements: [],
      requestFulfilled: false,
      requestAnalysis: 'Could not analyze - file error',
    };
  }

  const enhMetrics = getWorkflowMetrics(enhanced);
  const enhRequest = parseEnhancementRequest(request);
  const regressions: string[] = [];
  const improvements: string[] = [];

  // If we have original, check for regressions
  if (originalPath) {
    const original = loadWorkflow(originalPath);
    if (original) {
      const origMetrics = getWorkflowMetrics(original);

      // Check for lost node types
      const origNodeTypes = origMetrics.nodeTypes as Set<string>;
      const enhNodeTypes = enhMetrics.nodeTypes as Set<string>;

      for (const nodeType of origNodeTypes) {
        if (!enhNodeTypes.has(nodeType)) {
          regressions.push(`Lost node type: ${nodeType}`);
        }
      }

      // Check for lost state keys
      const origStateKeys = origMetrics.stateKeys as Set<string>;
      const enhStateKeys = enhMetrics.stateKeys as Set<string>;

      for (const key of origStateKeys) {
        if (!enhStateKeys.has(key)) {
          // Only report if it seems intentional
          // regressions.push(`Lost state key: ${key}`);
        }
      }

      // Track improvements
      if (enhMetrics.errorEdges > origMetrics.errorEdges) {
        improvements.push(
          `Added ${enhMetrics.errorEdges - origMetrics.errorEdges} error edge(s)`
        );
      }

      if (!origMetrics.hasInputValidation && enhMetrics.hasInputValidation) {
        improvements.push('Added input validation');
      }

      if (!origMetrics.hasAIValidation && enhMetrics.hasAIValidation) {
        improvements.push('Added AI response validation');
      }

      if (!origMetrics.hasArrayGuards && enhMetrics.hasArrayGuards) {
        improvements.push('Added array length guards');
      }

      if (enhMetrics.maxDepth < origMetrics.maxDepth) {
        improvements.push(
          `Reduced max depth from ${origMetrics.maxDepth} to ${enhMetrics.maxDepth}`
        );
      }

      const origFlatRatio =
        origMetrics.flatNodes / (origMetrics.flatNodes + origMetrics.nestedNodes || 1);
      const enhFlatRatio =
        enhMetrics.flatNodes / (enhMetrics.flatNodes + enhMetrics.nestedNodes || 1);

      if (enhFlatRatio > origFlatRatio + 0.1) {
        improvements.push(
          `Improved flat ratio from ${Math.round(origFlatRatio * 100)}% to ${Math.round(enhFlatRatio * 100)}%`
        );
      }
    }
  }

  // Check if enhancement request was fulfilled
  const requestAnalysis: string[] = [];
  let requestFulfilled = true;

  if (enhRequest.addGuards) {
    if (
      enhMetrics.hasInputValidation ||
      enhMetrics.hasAIValidation ||
      enhMetrics.hasArrayGuards
    ) {
      requestAnalysis.push('Guards: Added');
    } else {
      requestAnalysis.push('Guards: NOT ADDED');
      requestFulfilled = false;
    }
  }

  if (enhRequest.addInputValidation) {
    if (enhMetrics.hasInputValidation) {
      requestAnalysis.push('Input validation: Added');
    } else {
      requestAnalysis.push('Input validation: NOT ADDED');
      requestFulfilled = false;
    }
  }

  if (enhRequest.addAIValidation) {
    if (enhMetrics.hasAIValidation) {
      requestAnalysis.push('AI validation: Added');
    } else {
      requestAnalysis.push('AI validation: NOT ADDED');
      requestFulfilled = false;
    }
  }

  if (enhRequest.addArrayGuards) {
    if (enhMetrics.hasArrayGuards) {
      requestAnalysis.push('Array guards: Added');
    } else {
      requestAnalysis.push('Array guards: NOT ADDED');
      requestFulfilled = false;
    }
  }

  if (enhRequest.addErrorHandling) {
    if (enhMetrics.errorEdges > 0) {
      requestAnalysis.push('Error handling: Present');
    } else {
      requestAnalysis.push('Error handling: NOT ADDED');
      requestFulfilled = false;
    }
  }

  if (enhRequest.flatten || enhRequest.reduceNesting) {
    const flatRatio =
      enhMetrics.flatNodes / (enhMetrics.flatNodes + enhMetrics.nestedNodes || 1);
    if (flatRatio >= 0.5 || enhMetrics.maxDepth <= 3) {
      requestAnalysis.push('Structure: Flattened');
    } else {
      requestAnalysis.push('Structure: Still nested');
      requestFulfilled = false;
    }
  }

  if (requestAnalysis.length === 0 && request.length > 0) {
    requestAnalysis.push('Custom request - manual verification needed');
    requestFulfilled = true; // Assume fulfilled for custom requests
  }

  return {
    valid: regressions.length === 0,
    regressions,
    improvements,
    requestFulfilled,
    requestAnalysis: requestAnalysis.join('\n'),
  };
}

function printResult(result: ValidationResult): void {
  console.log('\n\x1b[36m=== Enhancement Validation ===\x1b[0m\n');

  // Regressions
  if (result.regressions.length > 0) {
    console.log('\x1b[31mRegressions Detected:\x1b[0m');
    result.regressions.forEach((r) => {
      console.log(`  - ${r}`);
    });
    console.log('');
  }

  // Improvements
  if (result.improvements.length > 0) {
    console.log('\x1b[32mImprovements:\x1b[0m');
    result.improvements.forEach((i) => {
      console.log(`  + ${i}`);
    });
    console.log('');
  }

  // Request fulfillment
  console.log('\x1b[1mRequest Analysis:\x1b[0m');
  console.log(
    result.requestAnalysis
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n')
  );
  console.log('');

  // Final verdict
  if (result.valid && result.requestFulfilled) {
    console.log('\x1b[32mResult: VALID - Enhancement successful\x1b[0m');
  } else if (!result.valid) {
    console.log('\x1b[31mResult: INVALID - Regressions detected\x1b[0m');
  } else if (!result.requestFulfilled) {
    console.log('\x1b[33mResult: PARTIAL - Request not fully fulfilled\x1b[0m');
  }

  console.log('');
}

// Parse command line arguments
function parseArgs(args: string[]): {
  enhanced: string | null;
  original: string | null;
  request: string;
  help: boolean;
  json: boolean;
} {
  const result = {
    enhanced: null as string | null,
    original: null as string | null,
    request: '',
    help: false,
    json: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--json') {
      result.json = true;
    } else if (arg === '--original' || arg === '-o') {
      result.original = args[++i];
    } else if (arg === '--request' || arg === '-r') {
      result.request = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!result.enhanced) {
        result.enhanced = arg;
      }
    }
  }

  return result;
}

// Main execution
const parsedArgs = parseArgs(process.argv.slice(2));

if (parsedArgs.help || !parsedArgs.enhanced) {
  console.log(`
Enhancement Validation Script

Usage: bun validate-enhancement.ts <enhanced.json> [options]

Options:
  --original, -o <file>    Original workflow to compare against
  --request, -r <text>     Enhancement request to verify
  --json                   Output as JSON
  --help, -h               Show this help message

Exit codes:
  0 - Enhancement valid
  1 - File errors
  2 - Regressions detected
  3 - Request not fulfilled

Examples:
  bun validate-enhancement.ts enhanced.json --original original.json
  bun validate-enhancement.ts enhanced.json --request "add defensive guards"
  bun validate-enhancement.ts enhanced.json -o original.json -r "flatten and add error handling"
`);
  process.exit(parsedArgs.help ? 0 : 1);
}

const enhancedPath = resolve(parsedArgs.enhanced);
const originalPath = parsedArgs.original ? resolve(parsedArgs.original) : null;
const request = parsedArgs.request || '';

const result = validateEnhancement(enhancedPath, originalPath, request);

if (parsedArgs.json) {
  console.log(JSON.stringify(result, null, 2));
} else {
  printResult(result);
}

// Exit code
if (!result.valid) {
  process.exit(2);
} else if (!result.requestFulfilled && request.length > 0) {
  process.exit(3);
} else {
  process.exit(0);
}
