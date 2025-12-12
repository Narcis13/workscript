/**
 * PatternLibrary Service
 *
 * Manages workflow patterns for the Reflection API.
 * This service provides a library of common workflow patterns that AI agents
 * can use to understand and generate standard workflow structures.
 *
 * Key features:
 * - 6+ predefined workflow patterns (ETL, conditional, loop, AI, error handling, parallel)
 * - Pattern detection in existing workflows
 * - Workflow generation from pattern templates with parameter substitution
 * - Pattern variations for common use cases
 */

import type {
  Pattern,
  DetectedPattern,
  PatternDetectionResponse,
  PatternGenerationResponse,
  ComplexityLevel,
} from '../types/reflection.types';
import type { WorkflowDefinition } from '@workscript/engine';

// Note: Pattern templates use workflow JSON syntax which includes null for exit edges
// We cast these to WorkflowDefinition since the types don't fully capture workflow syntax
type PatternWithAnyTemplate = Omit<Pattern, 'template'> & { template: any };

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

/**
 * ETL Pipeline Pattern
 * Extract data from a source, transform it, and load to destination
 */
const ETL_PIPELINE_PATTERN: PatternWithAnyTemplate = {
  id: 'etl-pipeline',
  name: 'ETL Pipeline',
  description: 'Extract-Transform-Load pattern for data processing. Retrieves data from a source, applies transformations (filtering, mapping, validation), and stores results.',
  category: 'data-processing',
  complexity: 'medium',
  structure: {
    stages: ['extract', 'transform', 'load'],
    nodeSequence: ['database', 'filter', 'editFields', 'database'],
    typicalEdgeFlow: 'found? -> passed? -> success? -> success',
  },
  template: {
    id: 'etl-pipeline-workflow',
    name: 'ETL Pipeline Workflow',
    version: '1.0.0',
    initialState: {
      sourceTable: '{{sourceTable}}',
      targetTable: '{{targetTable}}',
    },
    workflow: [
      {
        'database': {
          operation: 'findMany',
          table: '{{sourceTable}}',
          query: '{{filterConditions}}',
          'found?': {
            'filter': {
              items: '$.dbRecords',
              conditions: '{{transformConditions}}',
              matchMode: 'all',
              'passed?': {
                'editFields': {
                  mode: 'manual_mapping',
                  fieldsToSet: '{{transformations}}',
                  'success?': {
                    'database': {
                      operation: 'createMany',
                      table: '{{targetTable}}',
                      data: '$.editedData',
                      'success?': {
                        'log': {
                          message: 'ETL complete: {{$.dbRecords.length}} records processed',
                        },
                      },
                      'error?': {
                        'log': {
                          message: 'ETL failed at load stage: {{$.error}}',
                          level: 'error',
                        },
                      },
                    },
                  },
                },
              },
              'filtered?': {
                'log': {
                  message: 'No records passed filter criteria',
                },
              },
            },
          },
          'not_found?': {
            'log': {
              message: 'No records found in source table',
            },
          },
        },
      },
    ],
  },
  variations: [
    {
      name: 'with-validation',
      description: 'Adds data validation before loading',
      changes: {
        insertBefore: 'database[load]',
        node: {
          'validateData': {
            validationType: 'required_fields',
            requiredFields: '{{requiredFields}}',
          },
        },
      },
    },
    {
      name: 'with-deduplication',
      description: 'Removes duplicate records before loading',
      changes: {
        insertAfter: 'filter',
        node: {
          'removeDuplicates': {
            fields: '{{uniqueFields}}',
            keepStrategy: 'first',
          },
        },
      },
    },
  ],
};

/**
 * Conditional Branching Pattern
 * Route workflow execution based on conditions
 */
const CONDITIONAL_BRANCHING_PATTERN: PatternWithAnyTemplate = {
  id: 'conditional-branching',
  name: 'Conditional Branching',
  description: 'Route workflow execution based on conditions. Uses logic node to evaluate conditions and take different paths.',
  category: 'control-flow',
  complexity: 'simple',
  structure: {
    stages: ['evaluate', 'branch-true', 'branch-false'],
    nodeSequence: ['logic', 'node-true', 'node-false'],
    typicalEdgeFlow: 'true? -> success, false? -> success',
  },
  template: {
    id: 'conditional-branching-workflow',
    name: 'Conditional Branching Workflow',
    version: '1.0.0',
    initialState: {
      conditionValue: '{{conditionValue}}',
    },
    workflow: [
      {
        'logic': {
          operation: '{{operation}}',
          values: ['$.conditionValue', '{{compareValue}}'],
          'true?': {
            'editFields': {
              mode: 'manual_mapping',
              fieldsToSet: [
                { name: 'branch', value: 'true', type: 'string' },
              ],
              'success?': {
                'log': {
                  message: 'Condition was TRUE: {{$.conditionValue}} {{operation}} {{compareValue}}',
                },
              },
            },
          },
          'false?': {
            'editFields': {
              mode: 'manual_mapping',
              fieldsToSet: [
                { name: 'branch', value: 'false', type: 'string' },
              ],
              'success?': {
                'log': {
                  message: 'Condition was FALSE: {{$.conditionValue}} {{operation}} {{compareValue}}',
                },
              },
            },
          },
        },
      },
    ],
  },
  variations: [
    {
      name: 'with-switch',
      description: 'Multi-way branching using switch node for multiple conditions',
      changes: {
        replaceNode: 'logic',
        node: {
          'switch': {
            dataToCompare: '$.conditionValue',
            mode: 'rules',
            rules: '{{switchRules}}',
          },
        },
      },
    },
    {
      name: 'nested-conditions',
      description: 'Nested conditional logic for complex decision trees',
      changes: {
        nestedConditions: true,
      },
    },
  ],
};

/**
 * Loop with Counter Pattern
 * Iterate with a counter until a condition is met
 */
const LOOP_WITH_COUNTER_PATTERN: PatternWithAnyTemplate = {
  id: 'loop-with-counter',
  name: 'Loop with Counter',
  description: 'Iterate a fixed number of times or until a condition is met. Uses logic... (loop) syntax with counter variable.',
  category: 'control-flow',
  complexity: 'medium',
  structure: {
    stages: ['initialize', 'check-condition', 'execute-body', 'increment', 'exit'],
    nodeSequence: ['editFields', 'logic...', 'body-nodes', 'editFields[increment]'],
    typicalEdgeFlow: 'true? -> [body] -> continue, false? -> null',
  },
  template: {
    id: 'loop-with-counter-workflow',
    name: 'Loop with Counter Workflow',
    version: '1.0.0',
    initialState: {
      items: '{{items}}',
      index: 0,
      maxIterations: '{{maxIterations}}',
      results: [],
    },
    workflow: [
      {
        'logic...': {
          operation: 'less',
          values: ['$.index', '$.maxIterations'],
          'true?': [
            {
              'log': {
                message: 'Processing iteration {{$.index}}',
              },
            },
            {
              'editFields': {
                mode: 'manual_mapping',
                fieldsToSet: [
                  { name: 'index', value: '$.index + 1', type: 'number' },
                ],
              },
            },
          ],
          'false?': null,
        },
      },
      {
        'log': {
          message: 'Loop completed after {{$.index}} iterations',
        },
      },
    ],
  },
  variations: [
    {
      name: 'foreach-item',
      description: 'Loop through each item in an array',
      changes: {
        useArrayLength: true,
        accessCurrentItem: '$.items[$.index]',
      },
    },
    {
      name: 'with-break-condition',
      description: 'Loop with early exit on custom condition',
      changes: {
        addBreakCondition: true,
      },
    },
  ],
};

/**
 * AI Processing Pipeline Pattern
 * Process data through AI with extraction and validation
 */
const AI_PROCESSING_PIPELINE_PATTERN: PatternWithAnyTemplate = {
  id: 'ai-processing-pipeline',
  name: 'AI Processing Pipeline',
  description: 'Send data to AI for processing, then extract and validate the response. Ideal for LLM-based transformations.',
  category: 'integration',
  complexity: 'medium',
  structure: {
    stages: ['prepare', 'ai-call', 'extract-response', 'validate', 'store'],
    nodeSequence: ['editFields', 'ask-ai', 'jsonExtract', 'validateData', 'database'],
    typicalEdgeFlow: 'success? -> success? -> success? -> valid? -> success',
  },
  template: {
    id: 'ai-processing-pipeline-workflow',
    name: 'AI Processing Pipeline Workflow',
    version: '1.0.0',
    initialState: {
      inputData: '{{inputData}}',
      aiModel: '{{aiModel}}',
    },
    workflow: [
      {
        'editFields': {
          mode: 'manual_mapping',
          fieldsToSet: [
            {
              name: 'prompt',
              value: '{{promptTemplate}}',
              type: 'string',
            },
          ],
          'success?': {
            'ask-ai': {
              model: '$.aiModel',
              prompt: '$.prompt',
              temperature: 0.7,
              maxTokens: 1000,
              'success?': {
                'jsonExtract': {
                  sourceField: '$.aiResponse',
                  extractionPath: '{{extractionPath}}',
                  format: 'auto',
                  'success?': {
                    'validateData': {
                      validationType: 'required_fields',
                      requiredFields: '{{requiredFields}}',
                      'valid?': {
                        'log': {
                          message: 'AI processing complete: {{$.extractedData}}',
                        },
                      },
                      'invalid?': {
                        'log': {
                          message: 'AI response validation failed: {{$.validationErrors}}',
                          level: 'error',
                        },
                      },
                    },
                  },
                  'error?': {
                    'log': {
                      message: 'Failed to extract data from AI response: {{$.error}}',
                      level: 'error',
                    },
                  },
                },
              },
              'error?': {
                'log': {
                  message: 'AI call failed: {{$.error}}',
                  level: 'error',
                },
              },
            },
          },
        },
      },
    ],
  },
  variations: [
    {
      name: 'with-retry',
      description: 'Retry AI call on failure with exponential backoff',
      changes: {
        wrapWithRetry: true,
        maxRetries: 3,
      },
    },
    {
      name: 'streaming',
      description: 'Use streaming for long AI responses',
      changes: {
        enableStreaming: true,
      },
    },
  ],
};

/**
 * Error Handling Pattern
 * Comprehensive error handling with logging and fallback
 */
const ERROR_HANDLING_PATTERN: PatternWithAnyTemplate = {
  id: 'error-handling',
  name: 'Error Handling',
  description: 'Comprehensive error handling with logging, state cleanup, and optional fallback execution path.',
  category: 'error-handling',
  complexity: 'simple',
  structure: {
    stages: ['try', 'catch', 'finally'],
    nodeSequence: ['risky-operation', 'error-handler', 'cleanup'],
    typicalEdgeFlow: 'success? -> continue, error? -> handle-error',
  },
  template: {
    id: 'error-handling-workflow',
    name: 'Error Handling Workflow',
    version: '1.0.0',
    initialState: {
      errorCount: 0,
      lastError: null,
    },
    workflow: [
      {
        'database': {
          operation: '{{operation}}',
          table: '{{table}}',
          query: '{{query}}',
          'found?': {
            'log': {
              message: 'Operation successful: {{$.dbRecords.length}} records',
            },
          },
          'not_found?': {
            'log': {
              message: 'No records found, this may be expected',
            },
          },
          'error?': {
            'editFields': {
              mode: 'manual_mapping',
              fieldsToSet: [
                { name: 'lastError', value: '$.error', type: 'object' },
                { name: 'errorCount', value: '$.errorCount + 1', type: 'number' },
                { name: 'errorHandled', value: true, type: 'boolean' },
              ],
              'success?': {
                'log': {
                  message: 'Error handled: {{$.error}}. Total errors: {{$.errorCount}}',
                  level: 'error',
                },
              },
            },
          },
        },
      },
    ],
  },
  variations: [
    {
      name: 'with-retry',
      description: 'Retry the failed operation before giving up',
      changes: {
        wrapWithRetry: true,
        maxRetries: 3,
      },
    },
    {
      name: 'with-notification',
      description: 'Send notification on error',
      changes: {
        addNotification: true,
        notificationChannel: 'email',
      },
    },
  ],
};

/**
 * Parallel Processing Pattern
 * Split data, process in parallel, then aggregate results
 */
const PARALLEL_PROCESSING_PATTERN: PatternWithAnyTemplate = {
  id: 'parallel-processing',
  name: 'Parallel Processing',
  description: 'Split data into chunks, process each chunk (conceptually in parallel), then aggregate results.',
  category: 'data-processing',
  complexity: 'complex',
  structure: {
    stages: ['split', 'process-each', 'aggregate'],
    nodeSequence: ['splitOut', 'process-node', 'aggregate'],
    typicalEdgeFlow: 'success? -> success? (per item) -> success',
  },
  template: {
    id: 'parallel-processing-workflow',
    name: 'Parallel Processing Workflow',
    version: '1.0.0',
    initialState: {
      items: '{{items}}',
      processedResults: [],
    },
    workflow: [
      {
        'splitOut': {
          sourceField: '$.items',
          fieldName: 'currentItem',
          'success?': {
            'editFields': {
              mode: 'manual_mapping',
              fieldsToSet: '{{transformations}}',
              'success?': {
                'log': {
                  message: 'Processed item: {{$.currentItem}}',
                },
              },
            },
          },
          'empty?': {
            'log': {
              message: 'No items to process',
            },
          },
        },
      },
      {
        'aggregate': {
          items: '$.processedResults',
          operations: [
            { field: '*', operation: 'count', alias: 'totalProcessed' },
          ],
          'success?': {
            'log': {
              message: 'Parallel processing complete: {{$.totalProcessed}} items processed',
            },
          },
        },
      },
    ],
  },
  variations: [
    {
      name: 'with-batch',
      description: 'Process items in batches of specified size',
      changes: {
        useBatching: true,
        batchSize: 10,
      },
    },
    {
      name: 'with-rate-limit',
      description: 'Add rate limiting between batch processing',
      changes: {
        useRateLimit: true,
        delayMs: 1000,
      },
    },
  ],
};

// ============================================================================
// ALL PATTERNS COLLECTION
// ============================================================================

// Cast patterns to Pattern type for storage (templates are compatible at runtime)
const ALL_PATTERNS: Pattern[] = [
  ETL_PIPELINE_PATTERN as Pattern,
  CONDITIONAL_BRANCHING_PATTERN as Pattern,
  LOOP_WITH_COUNTER_PATTERN as Pattern,
  AI_PROCESSING_PIPELINE_PATTERN as Pattern,
  ERROR_HANDLING_PATTERN as Pattern,
  PARALLEL_PROCESSING_PATTERN as Pattern,
];

// ============================================================================
// PATTERN LIBRARY SERVICE
// ============================================================================

/**
 * PatternLibrary - Singleton service for workflow pattern management
 *
 * Provides access to predefined workflow patterns and enables
 * pattern detection and workflow generation from templates.
 */
export class PatternLibrary {
  private static instance: PatternLibrary | null = null;

  // Internal patterns storage
  private patterns: Map<string, Pattern> = new Map();

  private constructor() {
    // Initialize with predefined patterns
    this.loadPatterns();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PatternLibrary {
    if (PatternLibrary.instance === null) {
      PatternLibrary.instance = new PatternLibrary();
    }
    return PatternLibrary.instance;
  }

  /**
   * Load all predefined patterns into the internal map
   */
  private loadPatterns(): void {
    for (const pattern of ALL_PATTERNS) {
      this.patterns.set(pattern.id, pattern);
    }
  }

  // ============================================================================
  // PATTERN RETRIEVAL
  // ============================================================================

  /**
   * Get all available patterns
   */
  public getAllPatterns(): Pattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get patterns by category
   */
  public getPatternsByCategory(category: Pattern['category']): Pattern[] {
    return Array.from(this.patterns.values()).filter(p => p.category === category);
  }

  /**
   * Get a specific pattern by ID
   */
  public getPattern(patternId: string): Pattern | null {
    return this.patterns.get(patternId) || null;
  }

  /**
   * Check if a pattern exists
   */
  public hasPattern(patternId: string): boolean {
    return this.patterns.has(patternId);
  }

  /**
   * Get pattern count
   */
  public getPatternCount(): number {
    return this.patterns.size;
  }

  /**
   * Get patterns grouped by category
   */
  public getPatternsByCategories(): Record<Pattern['category'], Pattern[]> {
    const grouped: Record<Pattern['category'], Pattern[]> = {
      'data-processing': [],
      'control-flow': [],
      'integration': [],
      'error-handling': [],
    };

    for (const pattern of this.patterns.values()) {
      grouped[pattern.category].push(pattern);
    }

    return grouped;
  }

  // ============================================================================
  // PATTERN DETECTION
  // ============================================================================

  /**
   * Detect patterns in a workflow
   */
  public detectPatterns(workflow: WorkflowDefinition): PatternDetectionResponse {
    const detectedPatterns: DetectedPattern[] = [];
    const suggestions: Array<{ patternId: string; reason: string }> = [];

    // Extract node types from the workflow
    const nodeTypes = this.extractNodeTypes(workflow);
    const nodeTypeSet = new Set(nodeTypes);

    // Check each pattern for matches
    for (const pattern of this.patterns.values()) {
      const matchResult = this.matchPattern(pattern, workflow, nodeTypes, nodeTypeSet);

      if (matchResult.confidence > 0.3) {
        detectedPatterns.push({
          patternId: pattern.id,
          confidence: matchResult.confidence,
          matchedNodes: matchResult.matchedNodes,
        });
      }
    }

    // Generate suggestions for patterns that could be added
    suggestions.push(...this.generatePatternSuggestions(workflow, nodeTypeSet, detectedPatterns));

    // Sort by confidence
    detectedPatterns.sort((a, b) => b.confidence - a.confidence);

    return { detectedPatterns, suggestions };
  }

  /**
   * Extract node types from a workflow definition
   */
  private extractNodeTypes(workflow: WorkflowDefinition): string[] {
    const nodeTypes: string[] = [];

    const extractFromNode = (node: any): void => {
      if (!node || typeof node !== 'object') return;

      for (const key of Object.keys(node)) {
        // Skip edge keys
        if (key.endsWith('?') || key === 'workflow' || key === 'initialState') continue;

        // Check if this is a node type (has an object value with config)
        const value = node[key];
        if (typeof value === 'object' && value !== null) {
          // Check if this looks like a node (has edges or known properties)
          const hasEdges = Object.keys(value).some(k => k.endsWith('?'));
          const hasNodeProps = ['operation', 'mode', 'items', 'conditions', 'message', 'prompt'].some(
            p => p in value
          );

          if (hasEdges || hasNodeProps) {
            // This is a node type
            const cleanKey = key.replace('...', ''); // Handle loop syntax
            nodeTypes.push(cleanKey);
          }

          // Recursively extract from edges and nested nodes
          for (const subKey of Object.keys(value)) {
            if (subKey.endsWith('?')) {
              const edgeValue = value[subKey];
              if (Array.isArray(edgeValue)) {
                for (const item of edgeValue) {
                  extractFromNode(item);
                }
              } else if (typeof edgeValue === 'object' && edgeValue !== null) {
                extractFromNode(edgeValue);
              }
            }
          }
        }
      }
    };

    // Process workflow array
    if (Array.isArray(workflow.workflow)) {
      for (const item of workflow.workflow) {
        extractFromNode(item);
      }
    }

    return nodeTypes;
  }

  /**
   * Match a pattern against a workflow
   */
  private matchPattern(
    pattern: Pattern,
    workflow: WorkflowDefinition,
    nodeTypes: string[],
    nodeTypeSet: Set<string>
  ): { confidence: number; matchedNodes: string[] } {
    const matchedNodes: string[] = [];
    let score = 0;
    const maxScore = pattern.structure.nodeSequence.length;

    // Check for node sequence matches
    for (const requiredNode of pattern.structure.nodeSequence) {
      // Handle generic references like 'node-true', 'process-node'
      if (requiredNode.includes('-')) {
        // These are generic placeholders, check if any node exists
        score += 0.5;
        continue;
      }

      // Handle array index references like 'database[load]'
      const baseNode = requiredNode.split('[')[0] ?? requiredNode;

      if (baseNode && nodeTypeSet.has(baseNode)) {
        matchedNodes.push(baseNode);
        score += 1;
      }
    }

    // Pattern-specific matching logic
    switch (pattern.id) {
      case 'etl-pipeline':
        // ETL needs database (or similar data source), transformation, and output
        if (nodeTypeSet.has('database') || nodeTypeSet.has('fetchApi')) {
          score += 1;
        }
        if (nodeTypeSet.has('filter') || nodeTypeSet.has('editFields') || nodeTypeSet.has('transform')) {
          score += 1;
        }
        break;

      case 'conditional-branching':
        // Conditional needs logic or switch
        if (nodeTypeSet.has('logic') || nodeTypeSet.has('switch')) {
          score += 2;
        }
        break;

      case 'loop-with-counter':
        // Check for loop syntax in original workflow
        const hasLoopSyntax = nodeTypes.some(n => n.includes('logic'));
        if (hasLoopSyntax) {
          // Check for state with counter-like pattern
          const state = workflow.initialState || {};
          if ('index' in state || 'counter' in state || 'i' in state) {
            score += 2;
          }
        }
        break;

      case 'ai-processing-pipeline':
        if (nodeTypeSet.has('ask-ai')) {
          score += 2;
          if (nodeTypeSet.has('jsonExtract') || nodeTypeSet.has('extractText')) {
            score += 1;
          }
        }
        break;

      case 'error-handling':
        // Check if workflow has error edges being handled
        const workflowStr = JSON.stringify(workflow);
        if (workflowStr.includes('error?')) {
          score += 2;
        }
        break;

      case 'parallel-processing':
        if (nodeTypeSet.has('splitOut')) {
          score += 2;
          if (nodeTypeSet.has('aggregate')) {
            score += 1;
          }
        }
        break;
    }

    const confidence = maxScore > 0 ? Math.min(score / (maxScore + 2), 1) : 0;

    return { confidence, matchedNodes };
  }

  /**
   * Generate suggestions for patterns that could be added
   */
  private generatePatternSuggestions(
    workflow: WorkflowDefinition,
    nodeTypeSet: Set<string>,
    alreadyDetected: DetectedPattern[]
  ): Array<{ patternId: string; reason: string }> {
    const suggestions: Array<{ patternId: string; reason: string }> = [];
    const detectedIds = new Set(alreadyDetected.map(d => d.patternId));

    // Suggest error handling if not detected
    if (!detectedIds.has('error-handling')) {
      const workflowStr = JSON.stringify(workflow);
      const hasRiskyNodes = nodeTypeSet.has('database') || nodeTypeSet.has('fetchApi') || nodeTypeSet.has('ask-ai');
      const hasErrorHandling = workflowStr.includes('error?');

      if (hasRiskyNodes && !hasErrorHandling) {
        suggestions.push({
          patternId: 'error-handling',
          reason: 'Workflow contains operations that may fail (database, API calls) but lacks error handling',
        });
      }
    }

    // Suggest validation if data manipulation is present
    if (!nodeTypeSet.has('validateData')) {
      if (nodeTypeSet.has('database') || nodeTypeSet.has('editFields')) {
        suggestions.push({
          patternId: 'etl-pipeline',
          reason: 'Consider adding validation before database operations using the ETL pattern with-validation variation',
        });
      }
    }

    // Suggest AI pipeline if using ask-ai without extraction
    if (nodeTypeSet.has('ask-ai') && !nodeTypeSet.has('jsonExtract') && !nodeTypeSet.has('extractText')) {
      if (!detectedIds.has('ai-processing-pipeline')) {
        suggestions.push({
          patternId: 'ai-processing-pipeline',
          reason: 'AI node detected but no structured extraction. Consider adding jsonExtract for better data handling',
        });
      }
    }

    return suggestions;
  }

  // ============================================================================
  // WORKFLOW GENERATION
  // ============================================================================

  /**
   * Generate a workflow from a pattern template
   */
  public generateFromPattern(
    patternId: string,
    parameters: Record<string, any>
  ): PatternGenerationResponse {
    const pattern = this.patterns.get(patternId);

    if (!pattern) {
      throw new Error(`Pattern not found: ${patternId}`);
    }

    // Validate required parameters based on pattern
    const requiredParams = this.getRequiredParameters(pattern);
    const missingParams = requiredParams.filter(p => !(p in parameters));

    if (missingParams.length > 0) {
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    // Deep clone the template
    const workflow = JSON.parse(JSON.stringify(pattern.template)) as WorkflowDefinition;

    // Substitute parameters
    this.substituteParameters(workflow, parameters);

    // Generate explanation
    const explanation = this.generateExplanation(pattern, parameters);

    return { workflow, explanation };
  }

  /**
   * Get required parameters for a pattern
   */
  private getRequiredParameters(pattern: Pattern): string[] {
    const params: string[] = [];
    const templateStr = JSON.stringify(pattern.template);

    // Find all {{param}} placeholders
    const matches = templateStr.match(/\{\{(\w+)\}\}/g);
    if (matches) {
      for (const match of matches) {
        const param = match.replace(/\{\{|\}\}/g, '');
        if (!params.includes(param)) {
          params.push(param);
        }
      }
    }

    return params;
  }

  /**
   * Substitute parameters in a workflow template
   */
  private substituteParameters(obj: any, parameters: Record<string, any>): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key of Object.keys(obj)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Check for parameter placeholders
        if (value.startsWith('{{') && value.endsWith('}}')) {
          const paramName = value.slice(2, -2);
          if (paramName in parameters) {
            obj[key] = parameters[paramName];
          }
        } else if (value.includes('{{')) {
          // Handle inline template interpolation
          obj[key] = value.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
            return paramName in parameters ? String(parameters[paramName]) : `{{${paramName}}}`;
          });
        }
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (typeof item === 'string') {
            // Handle string items in arrays
            if (item.startsWith('{{') && item.endsWith('}}')) {
              const paramName = item.slice(2, -2);
              if (paramName in parameters) {
                value[i] = parameters[paramName];
              }
            } else if (item.includes('{{')) {
              value[i] = item.replace(/\{\{(\w+)\}\}/g, (_, paramName) => {
                return paramName in parameters ? String(parameters[paramName]) : `{{${paramName}}}`;
              });
            }
          } else if (typeof item === 'object' && item !== null) {
            this.substituteParameters(item, parameters);
          }
        }
      } else if (typeof value === 'object') {
        this.substituteParameters(value, parameters);
      }
    }
  }

  /**
   * Generate an explanation for the generated workflow
   */
  private generateExplanation(pattern: Pattern, parameters: Record<string, any>): string {
    const parts: string[] = [
      `Generated workflow based on the "${pattern.name}" pattern.`,
      '',
      `Pattern Description: ${pattern.description}`,
      '',
      'Workflow Stages:',
    ];

    for (const stage of pattern.structure.stages) {
      parts.push(`  - ${stage}`);
    }

    parts.push('');
    parts.push('Applied Parameters:');

    for (const [key, value] of Object.entries(parameters)) {
      const displayValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      parts.push(`  - ${key}: ${displayValue}`);
    }

    parts.push('');
    parts.push(`Typical Edge Flow: ${pattern.structure.typicalEdgeFlow}`);

    if (pattern.variations.length > 0) {
      parts.push('');
      parts.push('Available Variations:');
      for (const variation of pattern.variations) {
        parts.push(`  - ${variation.name}: ${variation.description}`);
      }
    }

    return parts.join('\n');
  }

  // ============================================================================
  // PATTERN METADATA
  // ============================================================================

  /**
   * Get available categories
   */
  public getCategories(): Pattern['category'][] {
    return ['data-processing', 'control-flow', 'integration', 'error-handling'];
  }

  /**
   * Get pattern summary for listing
   */
  public getPatternSummaries(): Array<{
    id: string;
    name: string;
    description: string;
    category: Pattern['category'];
    complexity: ComplexityLevel;
  }> {
    return Array.from(this.patterns.values()).map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      complexity: p.complexity,
    }));
  }
}

// ============================================================================
// SINGLETON ACCESSOR
// ============================================================================

/**
 * Get the PatternLibrary singleton instance
 */
export function getPatternLibrary(): PatternLibrary {
  return PatternLibrary.getInstance();
}
