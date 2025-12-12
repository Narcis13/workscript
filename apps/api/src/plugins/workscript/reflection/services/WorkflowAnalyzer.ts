/**
 * WorkflowAnalyzer Service
 *
 * Provides deep analysis of workflow definitions including:
 * - Workflow parsing and execution path tracing
 * - Step-by-step explanation generation
 * - State flow tracking
 * - Data transformation analysis
 * - Complexity metrics calculation
 * - Semantic validation
 * - Optimization detection
 *
 * IMPORTANT: This service analyzes workflow JSON structure.
 * It NEVER executes workflows - only analyzes their definitions.
 */

import { WorkflowService } from '../../services/WorkflowService';
import { NODE_CATEGORIES } from './nodeCategories';
import type {
  WorkflowAnalysis,
  StepExplanation,
  StateFlowInfo,
  DataTransformation,
  AnalysisIssue,
  ComplexityMetrics,
  SemanticValidation,
  StateConsistency,
  StateConsistencyIssue,
  OptimizationSuggestion,
} from '../types/reflection.types';
import type { WorkflowDefinition, NodeMetadata } from '@workscript/engine';

// ============================================================================
// INTERNAL TYPES
// ============================================================================

/**
 * Parsed node information extracted from workflow JSON
 */
interface ParsedNode {
  /** Index in the workflow array or nested path */
  path: string;
  /** Node type (e.g., 'filter', 'logic', 'database') */
  nodeType: string;
  /** Whether this is a loop node (has ... suffix) */
  isLoop: boolean;
  /** Node configuration (parameters) */
  config: Record<string, any>;
  /** Edge routes defined for this node */
  edges: Record<string, any>;
  /** Depth level in nested structure */
  depth: number;
}

/**
 * Parsed workflow representation
 */
interface ParsedWorkflow {
  /** Workflow metadata */
  id: string;
  name: string;
  version: string;
  /** All nodes found in the workflow */
  nodes: ParsedNode[];
  /** Initial state keys */
  initialStateKeys: string[];
  /** State setter operations found */
  stateSetters: Array<{ path: string; key: string; value: any }>;
}

// ============================================================================
// WORKFLOW ANALYZER SERVICE
// ============================================================================

/**
 * WorkflowAnalyzer - Singleton service for workflow analysis
 *
 * Analyzes workflow definitions to explain execution, validate semantics,
 * and suggest optimizations. This service only analyzes JSON structure
 * and never executes workflows.
 */
export class WorkflowAnalyzer {
  private static instance: WorkflowAnalyzer | null = null;

  // Cache for node metadata lookup
  private nodeMetadataCache: Map<string, NodeMetadata> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): WorkflowAnalyzer {
    if (WorkflowAnalyzer.instance === null) {
      WorkflowAnalyzer.instance = new WorkflowAnalyzer();
    }
    return WorkflowAnalyzer.instance;
  }

  /**
   * Clear the node metadata cache
   */
  public clearCache(): void {
    this.nodeMetadataCache = null;
  }

  // ============================================================================
  // MAIN ANALYSIS METHOD
  // ============================================================================

  /**
   * Perform complete workflow analysis
   * Returns explanation, state flow, transformations, issues, and complexity
   */
  public async analyzeWorkflow(workflow: WorkflowDefinition): Promise<WorkflowAnalysis> {
    // Parse the workflow structure
    const parsed = this.parseWorkflow(workflow);

    // Generate all analysis components
    const steps = await this.explainSteps(parsed);
    const stateFlow = this.traceStateFlow(parsed, workflow);
    const dataTransformations = this.trackTransformations(parsed, workflow);
    const complexity = this.calculateComplexity(parsed);
    const potentialIssues = this.findPotentialIssues(parsed, workflow);
    const summary = this.generateSummary(workflow, parsed, complexity);

    return {
      summary,
      steps,
      stateFlow,
      dataTransformations,
      potentialIssues,
      complexity,
    };
  }

  // ============================================================================
  // WORKFLOW PARSING (Task 5.1.2)
  // ============================================================================

  /**
   * Parse workflow JSON into a structured representation
   */
  public parseWorkflow(workflow: WorkflowDefinition): ParsedWorkflow {
    const nodes: ParsedNode[] = [];
    const stateSetters: Array<{ path: string; key: string; value: any }> = [];

    // Extract initial state keys
    const initialStateKeys = workflow.initialState
      ? Object.keys(workflow.initialState)
      : [];

    // Parse workflow array
    if (Array.isArray(workflow.workflow)) {
      this.parseWorkflowArray(workflow.workflow, '', 0, nodes, stateSetters);
    }

    return {
      id: workflow.id,
      name: workflow.name,
      version: workflow.version,
      nodes,
      initialStateKeys,
      stateSetters,
    };
  }

  /**
   * Recursively parse a workflow array
   */
  private parseWorkflowArray(
    workflowArray: any[],
    basePath: string,
    depth: number,
    nodes: ParsedNode[],
    stateSetters: Array<{ path: string; key: string; value: any }>
  ): void {
    workflowArray.forEach((step, index) => {
      const currentPath = basePath ? `${basePath}[${index}]` : `workflow[${index}]`;

      if (typeof step === 'string') {
        // Simple node reference
        nodes.push({
          path: currentPath,
          nodeType: step.replace(/\.\.\.?$/, ''),
          isLoop: step.endsWith('...'),
          config: {},
          edges: {},
          depth,
        });
      } else if (typeof step === 'object' && step !== null) {
        // Check for state setter
        const keys = Object.keys(step);
        const firstKey = keys[0];
        if (keys.length === 1 && firstKey && firstKey.startsWith('$.')) {
          stateSetters.push({
            path: currentPath,
            key: firstKey,
            value: step[firstKey],
          });
        } else {
          // Parse as node configuration
          this.parseNodeConfig(step, currentPath, depth, nodes, stateSetters);
        }
      }
    });
  }

  /**
   * Parse a node configuration object
   */
  private parseNodeConfig(
    nodeConfig: Record<string, any>,
    path: string,
    depth: number,
    nodes: ParsedNode[],
    stateSetters: Array<{ path: string; key: string; value: any }>
  ): void {
    for (const [key, value] of Object.entries(nodeConfig)) {
      // Skip state setters at the object level
      if (key.startsWith('$.')) {
        stateSetters.push({ path, key, value });
        continue;
      }

      // Determine if this is a loop node
      const isLoop = key.endsWith('...');
      const nodeType = key.replace(/\.\.\.?$/, '');

      // Separate config from edges
      const config: Record<string, any> = {};
      const edges: Record<string, any> = {};

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        for (const [configKey, configValue] of Object.entries(value)) {
          if (configKey.endsWith('?')) {
            edges[configKey] = configValue;
            // Recursively parse edge targets
            this.parseEdgeTarget(configValue, `${path}.${key}.${configKey}`, depth + 1, nodes, stateSetters);
          } else {
            config[configKey] = configValue;
          }
        }
      } else {
        config['value'] = value;
      }

      nodes.push({
        path,
        nodeType,
        isLoop,
        config,
        edges,
        depth,
      });
    }
  }

  /**
   * Parse edge target (can be null, object, or array)
   */
  private parseEdgeTarget(
    target: any,
    path: string,
    depth: number,
    nodes: ParsedNode[],
    stateSetters: Array<{ path: string; key: string; value: any }>
  ): void {
    if (target === null) {
      // End of execution path
      return;
    }

    if (Array.isArray(target)) {
      // Array of nodes to execute sequentially
      this.parseWorkflowArray(target, path, depth, nodes, stateSetters);
    } else if (typeof target === 'object') {
      // Nested node configuration
      this.parseNodeConfig(target, path, depth, nodes, stateSetters);
    }
    // String references are handled at runtime
  }

  // ============================================================================
  // STEP EXPLANATION (Task 5.1.3)
  // ============================================================================

  /**
   * Generate human-readable explanations for each step
   */
  public async explainSteps(parsed: ParsedWorkflow): Promise<StepExplanation[]> {
    const nodeMetadata = await this.getNodeMetadataMap();
    const steps: StepExplanation[] = [];
    let stepNumber = 1;

    for (const node of parsed.nodes) {
      const metadata = nodeMetadata.get(node.nodeType);
      const purpose = this.generateNodePurpose(node, metadata);
      const inputs = this.extractInputs(node.config);
      const outputs = this.getExpectedOutputs(node.nodeType, metadata);
      const nextSteps = this.describeNextSteps(node.edges, metadata);

      steps.push({
        stepNumber: stepNumber++,
        nodeType: node.nodeType,
        purpose,
        inputs,
        outputs,
        nextSteps,
      });
    }

    return steps;
  }

  /**
   * Generate a human-readable purpose description for a node
   */
  private generateNodePurpose(node: ParsedNode, metadata?: NodeMetadata): string {
    // Use ai_hints.purpose if available
    if (metadata?.ai_hints?.purpose) {
      return this.personalizeDescription(metadata.ai_hints.purpose, node.config);
    }

    // Generate based on node type and config
    switch (node.nodeType) {
      case 'filter':
        return this.describeFilterNode(node.config);
      case 'sort':
        return this.describeSortNode(node.config);
      case 'logic':
        return this.describeLogicNode(node.config, node.isLoop);
      case 'database':
        return this.describeDatabaseNode(node.config);
      case 'editFields':
        return 'Set or modify state values';
      case 'log':
        return `Log message: ${node.config.message || 'undefined'}`;
      case 'ask-ai':
        return 'Process data using AI/LLM';
      default:
        return metadata?.description || `Execute ${node.nodeType} operation`;
    }
  }

  /**
   * Personalize a description by substituting config values
   */
  private personalizeDescription(template: string, config: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' || typeof value === 'number') {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }
    return result;
  }

  /**
   * Describe a filter node based on its configuration
   */
  private describeFilterNode(config: Record<string, any>): string {
    const items = config.items || 'items';
    const conditions = config.conditions;
    if (Array.isArray(conditions) && conditions.length > 0) {
      const firstCondition = conditions[0];
      return `Filter ${items} where ${firstCondition.field || 'field'} ${firstCondition.operation || 'matches'} ${firstCondition.value || 'value'}`;
    }
    return `Filter ${items} based on conditions`;
  }

  /**
   * Describe a sort node based on its configuration
   */
  private describeSortNode(config: Record<string, any>): string {
    const fields = config.fieldsToSortBy;
    if (Array.isArray(fields) && fields.length > 0) {
      const sortDesc = fields.map((f: any) => `${f.fieldName} (${f.order || 'ascending'})`).join(', ');
      return `Sort items by ${sortDesc}`;
    }
    return 'Sort items';
  }

  /**
   * Describe a logic node based on its configuration
   */
  private describeLogicNode(config: Record<string, any>, isLoop: boolean): string {
    const operation = config.operation || 'equal';
    const values = config.values || [];
    const prefix = isLoop ? 'Loop while' : 'Check if';

    if (values.length >= 2) {
      return `${prefix} ${values[0]} ${operation} ${values[1]}`;
    }
    return `${prefix} condition is ${operation}`;
  }

  /**
   * Describe a database node based on its configuration
   */
  private describeDatabaseNode(config: Record<string, any>): string {
    const operation = config.operation || 'find';
    const table = config.table || 'table';
    return `${operation.charAt(0).toUpperCase() + operation.slice(1)} records in ${table}`;
  }

  /**
   * Extract input parameters from node config
   */
  private extractInputs(config: Record<string, any>): Record<string, any> {
    const inputs: Record<string, any> = {};
    for (const [key, value] of Object.entries(config)) {
      if (!key.endsWith('?')) {
        inputs[key] = value;
      }
    }
    return inputs;
  }

  /**
   * Get expected outputs for a node type
   */
  private getExpectedOutputs(nodeType: string, metadata?: NodeMetadata): string[] {
    if (metadata?.ai_hints?.post_to_state) {
      return metadata.ai_hints.post_to_state;
    }

    // Default outputs based on node type
    const defaultOutputs: Record<string, string[]> = {
      filter: ['passedItems', 'filteredItems', 'filterStats'],
      sort: ['sortedItems'],
      database: ['dbRecord', 'dbRecords', 'dbResult'],
      'ask-ai': ['aiResponse'],
      validateData: ['validationResult', 'validationErrors'],
      aggregate: ['aggregateResult'],
      summarize: ['summary'],
      transform: ['transformedData'],
    };

    return defaultOutputs[nodeType] || [];
  }

  /**
   * Describe possible next steps based on edges
   */
  private describeNextSteps(
    edges: Record<string, any>,
    metadata?: NodeMetadata
  ): Array<{ edge: string; description: string; target: string | null }> {
    const nextSteps: Array<{ edge: string; description: string; target: string | null }> = [];

    for (const [edgeName, target] of Object.entries(edges)) {
      const cleanEdge = edgeName.replace('?', '');
      const description = this.getEdgeDescription(cleanEdge, metadata);
      const targetDesc = target === null
        ? null
        : typeof target === 'object'
          ? this.describeTarget(target)
          : String(target);

      nextSteps.push({
        edge: cleanEdge,
        description,
        target: targetDesc,
      });
    }

    // If no edges defined, add default success/error
    if (nextSteps.length === 0 && metadata?.ai_hints?.expected_edges) {
      for (const edge of metadata.ai_hints.expected_edges) {
        nextSteps.push({
          edge,
          description: this.getEdgeDescription(edge, metadata),
          target: 'implicit',
        });
      }
    }

    return nextSteps;
  }

  /**
   * Get description for an edge based on common patterns
   */
  private getEdgeDescription(edge: string, metadata?: NodeMetadata): string {
    const edgeDescriptions: Record<string, string> = {
      success: 'Operation completed successfully',
      error: 'An error occurred',
      true: 'Condition evaluated to true',
      false: 'Condition evaluated to false',
      passed: 'Items passed the filter',
      filtered: 'Items were filtered out',
      found: 'Records were found',
      not_found: 'No records were found',
      valid: 'Data passed validation',
      invalid: 'Data failed validation',
      continue: 'Continue loop execution',
      exit: 'Exit loop',
      complete: 'Operation completed',
    };

    return edgeDescriptions[edge] || `Edge: ${edge}`;
  }

  /**
   * Describe a target configuration
   */
  private describeTarget(target: any): string {
    if (Array.isArray(target)) {
      return `sequence of ${target.length} steps`;
    }
    if (typeof target === 'object') {
      const keys = Object.keys(target);
      if (keys.length === 1) {
        return `execute ${keys[0]}`;
      }
      return `inline configuration`;
    }
    return 'next step';
  }

  // ============================================================================
  // STATE FLOW TRACING (Task 5.1.4)
  // ============================================================================

  /**
   * Trace how state flows through the workflow
   */
  public traceStateFlow(parsed: ParsedWorkflow, workflow: WorkflowDefinition): StateFlowInfo {
    const initial = parsed.initialStateKeys;
    const intermediate: StateFlowInfo['intermediate'] = [];
    let step = 0;

    // Track state keys read and written at each node
    for (const node of parsed.nodes) {
      step++;
      const keysRead = this.extractStateReads(node.config);
      const keysWritten = this.extractStateWrites(node);

      intermediate.push({
        step,
        nodeType: node.nodeType,
        keysRead,
        keysWritten,
      });
    }

    // Add state setters as intermediate steps
    for (const setter of parsed.stateSetters) {
      const key = setter.key.replace(/^\$\./, '');
      intermediate.push({
        step: intermediate.length + 1,
        nodeType: 'state-setter',
        keysRead: this.extractStateReadsFromValue(setter.value),
        keysWritten: [key],
      });
    }

    // Calculate final state keys
    const final = new Set(initial);
    for (const step of intermediate) {
      for (const key of step.keysWritten) {
        final.add(key);
      }
    }

    return {
      initial,
      intermediate,
      final: Array.from(final),
    };
  }

  /**
   * Extract state keys read from a configuration object
   */
  private extractStateReads(config: Record<string, any>): string[] {
    const reads: string[] = [];
    const configStr = JSON.stringify(config);

    // Find $.key patterns (full references)
    const fullRefPattern = /"\$\.([a-zA-Z0-9_.]+)"/g;
    let match;
    while ((match = fullRefPattern.exec(configStr)) !== null) {
      const captured = match[1];
      if (captured) {
        const key = captured.split('.')[0]; // Get root key
        if (key && !reads.includes(key)) {
          reads.push(key);
        }
      }
    }

    // Find {{$.key}} patterns (template interpolation)
    const templatePattern = /\{\{\$\.([a-zA-Z0-9_.]+)\}\}/g;
    while ((match = templatePattern.exec(configStr)) !== null) {
      const captured = match[1];
      if (captured) {
        const key = captured.split('.')[0];
        if (key && !reads.includes(key)) {
          reads.push(key);
        }
      }
    }

    return reads;
  }

  /**
   * Extract state keys read from a value (for state setters)
   */
  private extractStateReadsFromValue(value: any): string[] {
    return this.extractStateReads({ value });
  }

  /**
   * Extract state keys written by a node
   */
  private extractStateWrites(node: ParsedNode): string[] {
    // Node-specific writes based on ai_hints would be ideal
    // For now, use common patterns
    const writes: string[] = [];

    switch (node.nodeType) {
      case 'filter':
        writes.push('passedItems', 'filteredItems', 'filterStats');
        break;
      case 'sort':
        writes.push('sortedItems');
        break;
      case 'database':
        if (node.config.operation === 'find') {
          writes.push('dbRecords');
        } else {
          writes.push('dbRecord', 'dbResult');
        }
        break;
      case 'ask-ai':
        writes.push('aiResponse');
        break;
      case 'validateData':
        writes.push('validationResult', 'validationErrors');
        break;
      case 'editFields':
        // Check fieldsToSet for specific keys
        if (Array.isArray(node.config.fieldsToSet)) {
          for (const field of node.config.fieldsToSet) {
            if (field.name) {
              writes.push(field.name);
            }
          }
        }
        break;
      case 'aggregate':
        writes.push('aggregateResult');
        break;
      case 'summarize':
        writes.push('summary');
        break;
    }

    return writes;
  }

  // ============================================================================
  // DATA TRANSFORMATION TRACKING (Task 5.1.5)
  // ============================================================================

  /**
   * Track how data is transformed through the workflow
   */
  public trackTransformations(
    parsed: ParsedWorkflow,
    workflow: WorkflowDefinition
  ): DataTransformation[] {
    const transformations: DataTransformation[] = [];
    const dataFlows = new Map<string, { nodes: string[]; transformations: string[] }>();

    // Track data flows
    for (const node of parsed.nodes) {
      const reads = this.extractStateReads(node.config);
      const writes = this.extractStateWrites(node);

      // For each read, check if it's being transformed
      for (const readKey of reads) {
        for (const writeKey of writes) {
          const transformation = this.describeTransformation(node, readKey, writeKey);
          if (transformation) {
            if (!dataFlows.has(readKey)) {
              dataFlows.set(readKey, { nodes: [], transformations: [] });
            }
            const flow = dataFlows.get(readKey)!;
            flow.nodes.push(node.nodeType);
            flow.transformations.push(transformation);
          }
        }
      }
    }

    // Convert to output format
    for (const [key, flow] of dataFlows) {
      transformations.push({
        stateKey: key,
        transformation: flow.transformations.join(' → '),
        nodes: flow.nodes,
      });
    }

    return transformations;
  }

  /**
   * Describe how a node transforms data
   */
  private describeTransformation(
    node: ParsedNode,
    inputKey: string,
    outputKey: string
  ): string | null {
    switch (node.nodeType) {
      case 'filter':
        return `filter by conditions`;
      case 'sort':
        return `sort by ${this.getSortDescription(node.config)}`;
      case 'transform':
        return `transform structure`;
      case 'aggregate':
        return `aggregate to ${node.config.operation || 'sum'}`;
      case 'summarize':
        return `summarize to key metrics`;
      case 'editFields':
        return `modify fields`;
      case 'ask-ai':
        return `AI processing`;
      default:
        return null;
    }
  }

  /**
   * Get sort description from config
   */
  private getSortDescription(config: Record<string, any>): string {
    if (Array.isArray(config.fieldsToSortBy) && config.fieldsToSortBy.length > 0) {
      return config.fieldsToSortBy.map((f: any) => f.fieldName).join(', ');
    }
    return 'fields';
  }

  // ============================================================================
  // COMPLEXITY CALCULATION (Task 5.1.6)
  // ============================================================================

  /**
   * Calculate complexity metrics for the workflow
   */
  public calculateComplexity(parsed: ParsedWorkflow): ComplexityMetrics {
    return {
      nodeCount: parsed.nodes.length,
      maxDepth: this.calculateMaxDepth(parsed.nodes),
      branchCount: this.countBranches(parsed.nodes),
      loopCount: parsed.nodes.filter(n => n.isLoop).length,
    };
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateMaxDepth(nodes: ParsedNode[]): number {
    if (nodes.length === 0) return 0;
    return Math.max(...nodes.map(n => n.depth)) + 1;
  }

  /**
   * Count conditional branches
   */
  private countBranches(nodes: ParsedNode[]): number {
    let branches = 0;
    for (const node of nodes) {
      const edgeCount = Object.keys(node.edges).length;
      if (edgeCount > 1) {
        branches += edgeCount - 1; // Each additional edge is a branch
      }
    }
    return branches;
  }

  // ============================================================================
  // SUMMARY GENERATION (Task 5.1.7)
  // ============================================================================

  /**
   * Generate a 1-2 sentence summary of what the workflow does
   */
  public generateSummary(
    workflow: WorkflowDefinition,
    parsed: ParsedWorkflow,
    complexity: ComplexityMetrics
  ): string {
    const parts: string[] = [];

    // Start with the workflow name if descriptive
    if (workflow.name && workflow.name !== workflow.id) {
      parts.push(`"${workflow.name}"`);
    }

    // Describe the main operations
    const nodeTypes = new Set(parsed.nodes.map(n => n.nodeType));
    const operations: string[] = [];

    if (nodeTypes.has('database')) {
      operations.push('database operations');
    }
    if (nodeTypes.has('filter')) {
      operations.push('data filtering');
    }
    if (nodeTypes.has('sort')) {
      operations.push('sorting');
    }
    if (nodeTypes.has('ask-ai')) {
      operations.push('AI processing');
    }
    if (nodeTypes.has('transform') || nodeTypes.has('editFields')) {
      operations.push('data transformation');
    }
    if (nodeTypes.has('validateData')) {
      operations.push('validation');
    }

    if (operations.length > 0) {
      parts.push(`performs ${operations.slice(0, 3).join(', ')}`);
    }

    // Add complexity info
    if (complexity.loopCount > 0) {
      parts.push(`with ${complexity.loopCount} loop${complexity.loopCount > 1 ? 's' : ''}`);
    }
    if (complexity.branchCount > 0) {
      parts.push(`and ${complexity.branchCount} conditional branch${complexity.branchCount > 1 ? 'es' : ''}`);
    }

    // Compose summary
    let summary = parts.length > 0
      ? `This workflow ${parts.join(' ')}.`
      : `This workflow executes ${complexity.nodeCount} nodes.`;

    // Add data flow description if available
    const initialKeys = parsed.initialStateKeys;
    if (initialKeys.length > 0 && initialKeys.length <= 3) {
      summary += ` It starts with ${initialKeys.join(', ')} in state.`;
    }

    return summary;
  }

  // ============================================================================
  // SEMANTIC VALIDATION (Task 5.1.8)
  // ============================================================================

  /**
   * Perform semantic validation beyond JSON schema
   */
  public async validateSemantics(workflow: WorkflowDefinition): Promise<SemanticValidation> {
    const parsed = this.parseWorkflow(workflow);
    const nodeMetadata = await this.getNodeMetadataMap();

    const schemaErrors: Array<{ path: string; message: string }> = [];
    const semanticIssues: AnalysisIssue[] = [];
    const stateConsistency = this.analyzeStateConsistency(parsed, workflow);

    // Check for unknown node types
    for (const node of parsed.nodes) {
      if (!nodeMetadata.has(node.nodeType)) {
        schemaErrors.push({
          path: node.path,
          message: `Unknown node type: ${node.nodeType}`,
        });
      }
    }

    // Check for unreachable code paths
    const unreachable = this.findUnreachableCode(parsed);
    for (const path of unreachable) {
      semanticIssues.push({
        type: 'warning',
        path,
        message: 'This code path may be unreachable',
        suggestion: 'Verify that this edge is properly connected',
      });
    }

    // Check for missing error handlers
    const missingHandlers = this.findMissingErrorHandlers(parsed, nodeMetadata);
    for (const issue of missingHandlers) {
      semanticIssues.push(issue);
    }

    // Check for always-empty filter conditions
    const emptyFilters = this.findAlwaysEmptyFilters(parsed);
    for (const issue of emptyFilters) {
      semanticIssues.push(issue);
    }

    // Add state consistency issues to semantic issues
    for (const issue of stateConsistency.usedBeforeDefined) {
      semanticIssues.push({
        type: 'error',
        path: issue.location,
        message: `State key "${issue.key}" used before it is defined`,
        suggestion: 'Add this key to initialState or ensure a previous node writes to it',
      });
    }

    for (const issue of stateConsistency.potentialUndefined) {
      semanticIssues.push({
        type: 'warning',
        path: issue.location,
        message: issue.issue,
        suggestion: 'Ensure the parent object exists before accessing nested properties',
      });
    }

    const valid = schemaErrors.length === 0 &&
      semanticIssues.filter(i => i.type === 'error').length === 0;

    return {
      valid,
      schemaErrors,
      semanticIssues,
      stateConsistency,
    };
  }

  /**
   * Analyze state consistency
   */
  private analyzeStateConsistency(
    parsed: ParsedWorkflow,
    workflow: WorkflowDefinition
  ): StateConsistency {
    const usedBeforeDefined: StateConsistencyIssue[] = [];
    const unusedWrites: StateConsistencyIssue[] = [];
    const potentialUndefined: StateConsistencyIssue[] = [];

    // Track defined keys
    const definedKeys = new Set(parsed.initialStateKeys);
    const readKeys = new Set<string>();
    const writtenKeys = new Map<string, string>(); // key -> location

    // Process nodes in order
    for (const node of parsed.nodes) {
      const reads = this.extractStateReads(node.config);
      const writes = this.extractStateWrites(node);

      // Check for used before defined
      for (const key of reads) {
        readKeys.add(key);
        if (!definedKeys.has(key)) {
          usedBeforeDefined.push({
            key,
            issue: `Used before defined`,
            location: node.path,
          });
        }
      }

      // Track writes
      for (const key of writes) {
        definedKeys.add(key);
        writtenKeys.set(key, node.path);
      }

      // Check for potentially undefined nested paths
      const nestedPaths = this.extractNestedPaths(node.config);
      for (const nestedPath of nestedPaths) {
        const rootKey = nestedPath.split('.')[0];
        if (rootKey && !definedKeys.has(rootKey)) {
          potentialUndefined.push({
            key: nestedPath,
            issue: `Nested path "${nestedPath}" may be undefined if "${rootKey}" is not set`,
            location: node.path,
          });
        }
      }
    }

    // Find unused writes
    for (const [key, location] of writtenKeys) {
      if (!readKeys.has(key) && !parsed.initialStateKeys.includes(key)) {
        unusedWrites.push({
          key,
          issue: 'Written but never read',
          location,
        });
      }
    }

    return {
      usedBeforeDefined,
      unusedWrites,
      potentialUndefined,
    };
  }

  /**
   * Extract nested paths from config
   */
  private extractNestedPaths(config: Record<string, any>): string[] {
    const paths: string[] = [];
    const configStr = JSON.stringify(config);

    // Find $.nested.path patterns
    const pattern = /"\$\.([a-zA-Z0-9_.]+)"/g;
    let match;
    while ((match = pattern.exec(configStr)) !== null) {
      const captured = match[1];
      if (captured && captured.includes('.')) {
        paths.push(captured);
      }
    }

    return paths;
  }

  /**
   * Find unreachable code paths
   */
  private findUnreachableCode(parsed: ParsedWorkflow): string[] {
    // For simplicity, look for edges that go to null when not expected
    const unreachable: string[] = [];

    for (const node of parsed.nodes) {
      // In a loop node, false? going to null is expected (exit)
      // But in non-loop nodes, edges going to null might be suspicious
      if (!node.isLoop && node.nodeType === 'logic') {
        // Logic nodes should have both true? and false? handled
        if (Object.keys(node.edges).length < 2) {
          // Missing some edges - might be intentional but worth noting
        }
      }
    }

    return unreachable;
  }

  /**
   * Find missing error handlers
   */
  private findMissingErrorHandlers(
    parsed: ParsedWorkflow,
    nodeMetadata: Map<string, NodeMetadata>
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Nodes that typically need error handling
    const riskyNodes = ['database', 'ask-ai', 'filesystem', 'fetchApi'];

    for (const node of parsed.nodes) {
      if (riskyNodes.includes(node.nodeType)) {
        const hasErrorEdge = Object.keys(node.edges).some(
          e => e.includes('error') || e.includes('not_found')
        );

        if (!hasErrorEdge) {
          issues.push({
            type: 'warning',
            path: node.path,
            message: `${node.nodeType} node has no error handler`,
            suggestion: 'Consider adding error? edge to handle failures gracefully',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Find filter conditions that may always return empty
   */
  private findAlwaysEmptyFilters(parsed: ParsedWorkflow): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    for (const node of parsed.nodes) {
      if (node.nodeType === 'filter') {
        const conditions = node.config.conditions;
        if (Array.isArray(conditions)) {
          for (const condition of conditions) {
            // Check for impossible conditions
            if (this.isImpossibleCondition(condition)) {
              issues.push({
                type: 'warning',
                path: node.path,
                message: 'Filter condition may never match',
                suggestion: 'Review the condition logic',
              });
            }
          }
        }
      }
    }

    return issues;
  }

  /**
   * Check if a filter condition is impossible
   */
  private isImpossibleCondition(condition: any): boolean {
    // Simple heuristics
    if (condition.operation === 'notEqual' && condition.value === condition.field) {
      return true; // Comparing field to itself with notEqual
    }
    return false;
  }

  // ============================================================================
  // OPTIMIZATION DETECTION (Task 5.1.9)
  // ============================================================================

  /**
   * Detect optimization opportunities in the workflow
   */
  public async detectOptimizations(workflow: WorkflowDefinition): Promise<OptimizationSuggestion[]> {
    const parsed = this.parseWorkflow(workflow);
    const suggestions: OptimizationSuggestion[] = [];

    // Detect sequential filters that could be combined
    suggestions.push(...this.detectSequentialFilters(parsed));

    // Detect missing error handling
    suggestions.push(...this.detectMissingErrorHandling(parsed));

    // Detect redundant state writes
    suggestions.push(...this.detectRedundantWrites(parsed));

    // Detect opportunities for parallel processing
    suggestions.push(...this.detectParallelOpportunities(parsed));

    // Detect anti-patterns
    suggestions.push(...this.detectAntiPatterns(parsed));

    return suggestions;
  }

  /**
   * Detect sequential filters that could be combined
   */
  private detectSequentialFilters(parsed: ParsedWorkflow): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    let prevFilter: ParsedNode | null = null;

    for (const node of parsed.nodes) {
      if (node.nodeType === 'filter') {
        if (prevFilter && node.depth === prevFilter.depth) {
          suggestions.push({
            type: 'combine-filters',
            location: node.path,
            current: `Sequential filter nodes at ${prevFilter.path} and ${node.path}`,
            suggested: 'Combine filter conditions into a single filter node',
            impact: 'Reduces iterations by processing data in a single pass',
          });
        }
        prevFilter = node;
      } else {
        prevFilter = null;
      }
    }

    return suggestions;
  }

  /**
   * Detect missing error handling
   */
  private detectMissingErrorHandling(parsed: ParsedWorkflow): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const riskyNodes = ['database', 'ask-ai', 'filesystem', 'fetchApi'];

    for (const node of parsed.nodes) {
      if (riskyNodes.includes(node.nodeType)) {
        const hasErrorEdge = Object.keys(node.edges).some(
          e => e.includes('error') || e === 'not_found?'
        );

        if (!hasErrorEdge) {
          suggestions.push({
            type: 'add-error-handling',
            location: node.path,
            current: `${node.nodeType} without error handling`,
            suggested: 'Add error? edge with appropriate error handling',
            impact: 'Prevents workflow failures from propagating unexpectedly',
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Detect redundant state writes
   */
  private detectRedundantWrites(parsed: ParsedWorkflow): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    const writes = new Map<string, string[]>(); // key -> locations

    for (const node of parsed.nodes) {
      const nodeWrites = this.extractStateWrites(node);
      for (const key of nodeWrites) {
        const existing = writes.get(key);
        if (existing) {
          existing.push(node.path);
        } else {
          writes.set(key, [node.path]);
        }
      }
    }

    // Check for overwrites without reads
    for (const [key, locations] of writes) {
      const firstLocation = locations[0];
      if (locations.length > 1 && firstLocation) {
        // Multiple writes to the same key
        suggestions.push({
          type: 'remove-redundant',
          location: firstLocation,
          current: `State key "${key}" written ${locations.length} times`,
          suggested: 'Review if all writes are necessary or if some can be removed',
          impact: 'Simplifies state management and reduces confusion',
        });
      }
    }

    return suggestions;
  }

  /**
   * Detect opportunities for parallel processing
   */
  private detectParallelOpportunities(parsed: ParsedWorkflow): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Look for independent nodes at the same depth that could run in parallel
    const nodesByDepth = new Map<number, ParsedNode[]>();

    for (const node of parsed.nodes) {
      const existing = nodesByDepth.get(node.depth);
      if (existing) {
        existing.push(node);
      } else {
        nodesByDepth.set(node.depth, [node]);
      }
    }

    for (const [_depth, nodes] of nodesByDepth) {
      // Check if multiple database operations could be parallelized
      const dbNodes = nodes.filter(n => n.nodeType === 'database');
      const firstDbNode = dbNodes[0];
      if (dbNodes.length > 2 && firstDbNode) {
        suggestions.push({
          type: 'parallel-processing',
          location: firstDbNode.path,
          current: `${dbNodes.length} sequential database operations`,
          suggested: 'Consider using splitOut for parallel database queries',
          impact: 'Could significantly reduce total execution time',
        });
      }
    }

    return suggestions;
  }

  /**
   * Detect common anti-patterns
   */
  private detectAntiPatterns(parsed: ParsedWorkflow): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Anti-pattern: Deep nesting (more than 4 levels)
    const maxDepth = this.calculateMaxDepth(parsed.nodes);
    if (maxDepth > 4) {
      suggestions.push({
        type: 'anti-pattern',
        location: 'workflow',
        current: `Workflow has ${maxDepth} levels of nesting`,
        suggested: 'Flatten by using sequential nodes or extract sub-workflows',
        impact: 'Improves readability and maintainability',
      });
    }

    // Anti-pattern: Too many state keys
    const stateFlow = this.traceStateFlow(parsed, { id: '', name: '', version: '1.0.0', workflow: [] });
    if (stateFlow.final.length > 20) {
      suggestions.push({
        type: 'anti-pattern',
        location: 'workflow',
        current: `Workflow creates ${stateFlow.final.length} state keys`,
        suggested: 'Group related data into objects to reduce state key count',
        impact: 'Improves state management and debugging',
      });
    }

    return suggestions;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Get node metadata map (cached)
   */
  private async getNodeMetadataMap(): Promise<Map<string, NodeMetadata>> {
    if (this.nodeMetadataCache) {
      return this.nodeMetadataCache;
    }

    const workflowService = await WorkflowService.getInstance();
    const nodes = workflowService.getAvailableNodes();

    this.nodeMetadataCache = new Map();
    for (const node of nodes) {
      this.nodeMetadataCache.set(node.id, node);
    }

    return this.nodeMetadataCache;
  }

  /**
   * Find potential issues during analysis
   */
  private findPotentialIssues(
    parsed: ParsedWorkflow,
    workflow: WorkflowDefinition
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    // Check for empty workflow
    if (parsed.nodes.length === 0) {
      issues.push({
        type: 'warning',
        path: 'workflow',
        message: 'Workflow has no nodes',
        suggestion: 'Add at least one node to the workflow array',
      });
    }

    // Check for very complex workflows
    const complexity = this.calculateComplexity(parsed);
    if (complexity.nodeCount > 50) {
      issues.push({
        type: 'warning',
        path: 'workflow',
        message: `Workflow has ${complexity.nodeCount} nodes which may be difficult to maintain`,
        suggestion: 'Consider breaking into smaller sub-workflows using runWorkflow',
      });
    }

    return issues;
  }
}

// ============================================================================
// SINGLETON ACCESSOR
// ============================================================================

/**
 * Get the WorkflowAnalyzer singleton instance
 */
export function getWorkflowAnalyzer(): WorkflowAnalyzer {
  return WorkflowAnalyzer.getInstance();
}
