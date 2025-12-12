/**
 * Workscript Reflection API Type Definitions
 *
 * This module provides comprehensive TypeScript interfaces for the reflection
 * "consciousness layer" that enables AI agents to introspect, understand, and
 * dynamically compose workflows.
 */

import type { NodeMetadata, WorkflowDefinition, AIHints } from '@workscript/engine';

// ============================================================================
// NODE CATEGORIES AND COMPLEXITY
// ============================================================================

/**
 * Node category classification for organization and filtering
 */
export type NodeCategory =
  | 'core'               // Basic operations: math, logic, transform, log, empty
  | 'ai'                 // AI-related: ask-ai
  | 'orchestration'      // Workflow control: runWorkflow
  | 'data-manipulation'  // Data processing: filter, sort, aggregate, etc.
  | 'server'             // Server-side operations: filesystem, database, auth
  | 'integrations';      // External integrations: API calls, etc.

/**
 * Node complexity level based on implementation size
 */
export type ComplexityLevel =
  | 'simple'   // < 100 lines of code
  | 'medium'   // 100-300 lines of code
  | 'complex'; // > 300 lines of code

// ============================================================================
// INPUT SCHEMA TYPES
// ============================================================================

/**
 * Schema entry for a node input parameter
 */
export interface InputSchemaEntry {
  /** Data type of the parameter */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';
  /** Whether this parameter is required */
  required: boolean;
  /** Human-readable description of the parameter */
  description: string;
  /** Default value if not provided */
  default?: any;
  /** For array types, schema of array items */
  itemSchema?: InputSchemaEntry;
  /** For enum-like parameters, list of valid values */
  enum?: any[];
  /** For object types, nested property schemas */
  properties?: Record<string, InputSchemaEntry>;
}

// ============================================================================
// EDGE CONDITION TYPES
// ============================================================================

/**
 * Information about what triggers a specific edge and what data it provides
 */
export interface EdgeConditionInfo {
  /** Human-readable description of when this edge is taken */
  condition: string;
  /** Schema of data returned when this edge is taken */
  dataReturned: Record<string, string>;
}

// ============================================================================
// STATE INTERACTION TYPES
// ============================================================================

/**
 * Information about how a node interacts with workflow state
 */
export interface StateInteractionInfo {
  /** State keys that this node reads during execution */
  reads: string[];
  /** State keys that this node writes during execution */
  writes: string[];
  /** Schema of values written to each state key */
  writeSchema: Record<string, any>;
}

// ============================================================================
// COMPOSABILITY TYPES
// ============================================================================

/**
 * Information about node composability and typical usage patterns
 */
export interface ComposabilityInfo {
  /** Nodes that typically precede this node */
  typicalPredecessors: Array<{
    nodeId: string;
    edge: string;
    reason: string;
  }>;
  /** Nodes that typically follow this node */
  typicalSuccessors: Array<{
    nodeId: string;
    reason: string;
  }>;
  /** Anti-patterns to avoid when using this node */
  antiPatterns: string[];
}

// ============================================================================
// OPERATION TYPES (for nodes like filter, switch, etc.)
// ============================================================================

/**
 * Information about a specific operation available in a node
 */
export interface OperationInfo {
  /** Operation name/identifier */
  name: string;
  /** Human-readable description */
  description: string;
  /** Example configuration for this operation */
  exampleConfig: Record<string, any>;
}

/**
 * Operations grouped by data type (for filter, switch, etc.)
 */
export interface OperationsByType {
  string?: OperationInfo[];
  number?: OperationInfo[];
  boolean?: OperationInfo[];
  date?: OperationInfo[];
  array?: OperationInfo[];
  object?: OperationInfo[];
  [key: string]: OperationInfo[] | undefined;
}

// ============================================================================
// NODE INTROSPECTION TYPES
// ============================================================================

/**
 * Deep introspection data for a node
 */
export interface NodeIntrospection {
  /** Node category for organization */
  category: NodeCategory;
  /** Implementation complexity */
  complexity: ComplexityLevel;
  /** Schema for all input parameters */
  inputSchema: Record<string, InputSchemaEntry>;
  /** Information about each edge and its conditions */
  edgeConditions: Record<string, EdgeConditionInfo>;
  /** State key read/write information */
  stateInteractions: StateInteractionInfo;
  /** Available operations (for operation-based nodes) */
  operations?: OperationsByType;
  /** Composability suggestions */
  composability: ComposabilityInfo;
}

/**
 * Complete reflection information for a node
 * Extends NodeMetadata with introspection data
 */
export interface ReflectionNodeInfo {
  /** Standard node metadata */
  id: string;
  name: string;
  version: string;
  description: string;
  inputs: string[];
  outputs: string[];
  ai_hints: AIHints;

  /** Deep introspection data */
  introspection: NodeIntrospection;

  /** Source code information */
  sourceFile: string;
  hasExampleFile: boolean;
  hasTestFile: boolean;
}

/**
 * Response for listing all nodes with metadata
 */
export interface NodesListResponse {
  nodes: ReflectionNodeInfo[];
  metadata: {
    totalNodes: number;
    byCategory: Record<NodeCategory, number>;
  };
}

// ============================================================================
// SOURCE CODE TYPES
// ============================================================================

/**
 * Parsed method information from source code
 */
export interface ParsedMethod {
  name: string;
  signature: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: string;
    optional: boolean;
  }>;
  returnType: string;
  visibility: 'public' | 'private' | 'protected';
}

/**
 * Parsed interface information from source code
 */
export interface ParsedInterface {
  name: string;
  properties: Record<string, string>;
}

/**
 * Parsed structure of a node's source code
 */
export interface ParsedStructure {
  className: string;
  extendsClass: string;
  methods: ParsedMethod[];
  interfaces: ParsedInterface[];
}

/**
 * Key code snippet with context
 */
export interface CodeHighlight {
  name: string;
  description: string;
  code: string;
  lineNumbers: {
    start: number;
    end: number;
  };
}

/**
 * Related files for a node
 */
export interface RelatedFiles {
  testFile: string | null;
  exampleFile: string | null;
}

/**
 * Full source code response
 */
export interface SourceCodeResponse {
  language: 'typescript';
  content: string;
  path: string;
  structure: ParsedStructure;
  highlights: CodeHighlight[];
  relatedFiles: RelatedFiles;
}

// ============================================================================
// AI MANIFEST TYPES
// ============================================================================

/**
 * Node capability information for manifest
 */
export interface NodeCapability {
  id: string;
  description: string;
  commonPatterns: string[];
}

/**
 * Category capabilities for manifest
 */
export interface CategoryCapabilities {
  description: string;
  nodes: NodeCapability[];
}

/**
 * Syntax reference for AI manifest
 */
export interface SyntaxReference {
  stateAccess: {
    fullReference: string;
    templateInterpolation: string;
    examples: string[];
  };
  edgeSyntax: {
    description: string;
    examples: string[];
  };
  loopSyntax: {
    description: string;
    example: string;
  };
  stateSetter: {
    description: string;
    example: string;
  };
}

/**
 * Complete AI manifest for workflow-building agents
 */
export interface AIManifest {
  /** Ready-to-use system prompt for AI agents */
  systemPrompt: string;
  /** Markdown formatted quick reference card */
  quickReference: string;
  /** Capabilities organized by category */
  capabilities: Record<NodeCategory, CategoryCapabilities>;
  /** Syntax reference for workflow JSON */
  syntaxReference: SyntaxReference;
  /** Estimated token count */
  tokenCount: number;
  /** Target AI model optimization */
  optimizedFor: string;
}

/**
 * Compact manifest for smaller context windows
 */
export interface CompactManifest {
  systemPrompt: string;
  nodeList: Array<{
    id: string;
    description: string;
  }>;
  syntaxReference: SyntaxReference;
  tokenCount: number;
  optimizedFor: string;
}

/**
 * Options for custom manifest generation
 */
export interface CustomManifestOptions {
  /** Use case to optimize for */
  useCase?: 'data-pipeline' | 'ai-workflow' | 'integration' | 'full';
  /** Categories to include */
  includeCategories?: NodeCategory[];
  /** Specific nodes to exclude */
  excludeNodes?: string[];
  /** Maximum token limit */
  maxTokens?: number;
  /** Output format */
  format?: 'markdown' | 'json' | 'structured';
}

// ============================================================================
// WORKFLOW ANALYSIS TYPES
// ============================================================================

/**
 * Explanation of a single step in a workflow
 */
export interface StepExplanation {
  /** Step number in execution order */
  stepNumber: number;
  /** Node type being executed */
  nodeType: string;
  /** Human-readable purpose of this step */
  purpose: string;
  /** Input parameters for this step */
  inputs: Record<string, any>;
  /** Outputs produced by this step */
  outputs: string[];
  /** Possible next steps based on edges */
  nextSteps: Array<{
    edge: string;
    description: string;
    target: string | null;
  }>;
}

/**
 * Information about state flow through a workflow
 */
export interface StateFlowInfo {
  /** State keys available at workflow start */
  initial: string[];
  /** State changes at each step */
  intermediate: Array<{
    step: number;
    nodeType: string;
    keysRead: string[];
    keysWritten: string[];
  }>;
  /** State keys available at workflow end */
  final: string[];
}

/**
 * Description of a data transformation
 */
export interface DataTransformation {
  /** State key being transformed */
  stateKey: string;
  /** Description of the transformation */
  transformation: string;
  /** Nodes involved in this transformation */
  nodes: string[];
}

/**
 * Issue or warning found during analysis
 */
export interface AnalysisIssue {
  /** Issue severity */
  type: 'warning' | 'error';
  /** JSON path to the issue location */
  path: string;
  /** Description of the issue */
  message: string;
  /** Suggestion for fixing the issue */
  suggestion?: string;
}

/**
 * Workflow complexity metrics
 */
export interface ComplexityMetrics {
  /** Total number of nodes */
  nodeCount: number;
  /** Maximum depth of nested configurations */
  maxDepth: number;
  /** Number of conditional branches */
  branchCount: number;
  /** Number of loops */
  loopCount: number;
}

/**
 * Complete workflow analysis result
 */
export interface WorkflowAnalysis {
  /** Brief summary of what the workflow does */
  summary: string;
  /** Detailed step-by-step explanation */
  steps: StepExplanation[];
  /** State flow through the workflow */
  stateFlow: StateFlowInfo;
  /** Data transformations performed */
  dataTransformations: DataTransformation[];
  /** Potential issues found */
  potentialIssues: AnalysisIssue[];
  /** Complexity metrics */
  complexity: ComplexityMetrics;
}

// ============================================================================
// SEMANTIC VALIDATION TYPES
// ============================================================================

/**
 * State consistency issues
 */
export interface StateConsistencyIssue {
  /** State key with the issue */
  key: string;
  /** Description of the issue */
  issue: string;
  /** Where the issue occurs */
  location: string;
}

/**
 * State consistency analysis result
 */
export interface StateConsistency {
  /** Keys used before any node writes to them */
  usedBeforeDefined: StateConsistencyIssue[];
  /** Keys written but never read */
  unusedWrites: StateConsistencyIssue[];
  /** Potentially undefined nested paths */
  potentialUndefined: StateConsistencyIssue[];
}

/**
 * Deep semantic validation result
 */
export interface SemanticValidation {
  /** Overall validity */
  valid: boolean;
  /** JSON schema errors */
  schemaErrors: Array<{
    path: string;
    message: string;
  }>;
  /** Semantic issues found */
  semanticIssues: AnalysisIssue[];
  /** State consistency analysis */
  stateConsistency: StateConsistency;
}

// ============================================================================
// OPTIMIZATION TYPES
// ============================================================================

/**
 * Optimization suggestion
 */
export interface OptimizationSuggestion {
  /** Type of optimization */
  type: 'combine-filters' | 'add-error-handling' | 'remove-redundant' | 'parallel-processing' | 'anti-pattern';
  /** Location in the workflow */
  location: string;
  /** Current code/pattern */
  current: string;
  /** Suggested improvement */
  suggested: string;
  /** Impact description */
  impact: string;
}

// ============================================================================
// COMPOSABILITY GRAPH TYPES
// ============================================================================

/**
 * State key usage information
 */
export interface StateKeyUsage {
  /** Which nodes/edges write to this key */
  writtenBy: Array<{
    nodeId: string;
    edge: string;
  }>;
  /** Which nodes read from this key */
  readBy: string[];
}

/**
 * Node connection information in the composability graph
 */
export interface NodeConnections {
  /** Sources that can precede this node */
  typicalSources: Array<{
    nodeId: string;
    edge: string;
  }>;
  /** Targets that can follow this node, by edge */
  typicalTargets: Record<string, string[]>;
  /** State keys this node provides, by edge */
  provides: Record<string, string[]>;
}

/**
 * Full composability graph
 */
export interface ComposabilityGraph {
  /** Node connection information */
  nodes: Record<string, NodeConnections>;
  /** State key to node mapping */
  stateKeyMap: Record<string, StateKeyUsage>;
}

/**
 * Suggestion for next node
 */
export interface NodeSuggestion {
  /** Suggested node ID */
  nodeId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Suggested configuration */
  config: Record<string, any>;
  /** Reason for this suggestion */
  explanation: string;
}

/**
 * Context for contextual suggestion
 */
export interface SuggestionContext {
  /** Current node ID */
  currentNode: string;
  /** Current edge being followed */
  currentEdge: string;
  /** Current workflow state */
  currentState: Record<string, any>;
  /** User intent (optional) */
  intent?: string;
}

// ============================================================================
// PATTERN LIBRARY TYPES
// ============================================================================

/**
 * Pattern structure definition
 */
export interface PatternStructure {
  /** Pattern stages */
  stages: string[];
  /** Typical node sequence */
  nodeSequence: string[];
  /** Typical edge flow */
  typicalEdgeFlow: string;
}

/**
 * Pattern variation
 */
export interface PatternVariation {
  /** Variation name */
  name: string;
  /** What this variation adds/changes */
  description: string;
  /** Additional nodes or changes */
  changes: Record<string, any>;
}

/**
 * Workflow pattern definition
 */
export interface Pattern {
  /** Pattern identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of what this pattern does */
  description: string;
  /** Pattern category */
  category: 'data-processing' | 'control-flow' | 'integration' | 'error-handling';
  /** Complexity level */
  complexity: ComplexityLevel;
  /** Pattern structure */
  structure: PatternStructure;
  /** Complete workflow template */
  template: WorkflowDefinition;
  /** Available variations */
  variations: PatternVariation[];
}

/**
 * Detected pattern in a workflow
 */
export interface DetectedPattern {
  /** Pattern ID */
  patternId: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Nodes that matched the pattern */
  matchedNodes: string[];
}

/**
 * Pattern generation parameters
 */
export interface PatternGenerationParams {
  /** Pattern ID to generate from */
  patternId: string;
  /** Parameters to substitute in the template */
  parameters: Record<string, any>;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard error response
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, any>;
}

/**
 * Node operations response
 */
export interface NodeOperationsResponse {
  nodeId: string;
  operations: OperationsByType;
}

/**
 * Node examples response
 */
export interface NodeExamplesResponse {
  nodeId: string;
  examples: Array<{
    name: string;
    description: string;
    config: Record<string, any>;
    initialState?: Record<string, any>;
    expectedOutput?: Record<string, any>;
  }>;
  exampleWorkflow?: WorkflowDefinition;
}

/**
 * Successors response from composability
 */
export interface SuccessorsResponse {
  nodeId: string;
  edges: Record<string, {
    provides: string[];
    suggestedNext: NodeSuggestion[];
  }>;
}

/**
 * Predecessors response from composability
 */
export interface PredecessorsResponse {
  nodeId: string;
  requires: string;
  suggestedPredecessors: Array<{
    nodeId: string;
    edge: string;
    reason: string;
    connectsVia: string;
  }>;
}

/**
 * Pattern detection response
 */
export interface PatternDetectionResponse {
  detectedPatterns: DetectedPattern[];
  suggestions: Array<{
    patternId: string;
    reason: string;
  }>;
}

/**
 * Pattern generation response
 */
export interface PatternGenerationResponse {
  workflow: WorkflowDefinition;
  explanation: string;
}
