/**
 * Node Type Definitions
 *
 * Type definitions for workflow node-related entities in the Workscript Main UI.
 * These types extend the core NodeMetadata from @workscript/engine with frontend-specific information.
 *
 * @module node.types
 */

import type { NodeMetadata as EngineNodeMetadata, AIHints, ExecutionContext, EdgeMap } from '@workscript/engine';

/**
 * Node source enum
 *
 * Indicates where a node can be executed.
 */
export enum NodeSource {
  /** Universal nodes (run anywhere) */
  UNIVERSAL = 'universal',

  /** Server-specific nodes (only on API server) */
  SERVER = 'server',

  /** Client-specific nodes (only in browser) */
  CLIENT = 'client'
}

/**
 * Node category enum
 *
 * Categorizes nodes by their primary function.
 */
export enum NodeCategory {
  /** Data manipulation and transformation */
  DATA = 'data',

  /** Logic and control flow */
  LOGIC = 'logic',

  /** Mathematical operations */
  MATH = 'math',

  /** State management */
  STATE = 'state',

  /** File system operations */
  FILE = 'file',

  /** Database operations */
  DATABASE = 'database',

  /** HTTP and network operations */
  NETWORK = 'network',

  /** Authentication and authorization */
  AUTH = 'auth',

  /** UI rendering and interaction */
  UI = 'ui',

  /** Integration with external services */
  INTEGRATION = 'integration',

  /** Utility and helper functions */
  UTILITY = 'utility',

  /** Logging and debugging */
  DEBUG = 'debug'
}

/**
 * Extended node metadata for the UI
 *
 * Combines engine NodeMetadata with additional frontend-specific fields.
 */
export interface NodeMetadata extends EngineNodeMetadata {
  /** Node source (universal, server, or client) */
  source: NodeSource;

  /** Node category */
  category?: NodeCategory;

  /** Tags for filtering and searching */
  tags?: string[];

  /** Whether the node is deprecated */
  deprecated?: boolean;

  /** Deprecation message */
  deprecationMessage?: string;

  /** Documentation URL */
  docsUrl?: string;

  /** Icon name (for lucide-react) */
  icon?: string;

  /** Node color (hex code) */
  color?: string;
}

/**
 * Node with extended metadata
 *
 * Represents a node from the registry with all available metadata.
 */
export interface Node {
  /** Node metadata */
  metadata: NodeMetadata;

  /** Package name where the node is defined */
  packageName?: string;

  /** File path where the node is implemented */
  filePath?: string;

  /** Whether the node is available in the current environment */
  available: boolean;
}

/**
 * Node test configuration
 *
 * Configuration for testing a node in isolation.
 */
export interface NodeTestConfig {
  /** Node ID to test */
  nodeId: string;

  /** Node configuration (JSON) */
  config: Record<string, any>;

  /** Initial state (optional) */
  initialState?: Record<string, any>;
}

/**
 * Node test result
 *
 * Result of executing a node test.
 */
export interface NodeTestResult {
  /** Whether the test succeeded */
  success: boolean;

  /** Execution time in milliseconds */
  executionTime: number;

  /** Returned edges */
  edges?: EdgeMap;

  /** Final state after execution */
  finalState?: Record<string, any>;

  /** Error message (if failed) */
  error?: string;

  /** Error stack trace (if failed) */
  stackTrace?: string;

  /** Timestamp of the test */
  timestamp: Date;
}

/**
 * Node execution statistics
 *
 * Usage statistics for a node across all workflows.
 */
export interface NodeStats {
  /** Node ID */
  nodeId: string;

  /** Total number of executions */
  totalExecutions: number;

  /** Number of successful executions */
  successCount: number;

  /** Number of failed executions */
  failureCount: number;

  /** Success rate (percentage) */
  successRate: number;

  /** Average execution time in milliseconds */
  averageExecutionTime?: number;

  /** Number of workflows using this node */
  workflowCount: number;

  /** Last execution timestamp */
  lastExecutedAt?: Date | string;
}

/**
 * Node list filter options
 */
export interface NodeFilterOptions {
  /** Search query (matches name, ID, or description) */
  search?: string;

  /** Filter by source */
  source?: NodeSource;

  /** Filter by category */
  category?: NodeCategory;

  /** Filter by tags */
  tags?: string[];

  /** Include deprecated nodes */
  includeDeprecated?: boolean;

  /** Sort field */
  sortBy?: 'name' | 'id' | 'category' | 'source';

  /** Sort order */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Node discovery result
 *
 * Result of discovering nodes from packages.
 */
export interface NodeDiscoveryResult {
  /** Total number of nodes found */
  total: number;

  /** Nodes by source */
  bySource: {
    universal: number;
    server: number;
    client: number;
  };

  /** Nodes by category */
  byCategory: Record<string, number>;

  /** Discovery timestamp */
  discoveredAt: Date;

  /** Packages scanned */
  packagesScanned: string[];
}

/**
 * Node configuration suggestion
 *
 * AI-generated or template-based configuration suggestion.
 */
export interface NodeConfigSuggestion {
  /** Suggestion title */
  title: string;

  /** Suggestion description */
  description: string;

  /** Suggested configuration (JSON) */
  config: Record<string, any>;

  /** Suggested initial state */
  initialState?: Record<string, any>;

  /** Source of the suggestion */
  source: 'ai' | 'template' | 'example';
}

/**
 * Node input field definition
 *
 * Detailed definition of a node's input field.
 */
export interface NodeInputField {
  /** Field name */
  name: string;

  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';

  /** Field description */
  description?: string;

  /** Whether the field is required */
  required?: boolean;

  /** Default value */
  default?: any;

  /** Example value */
  example?: any;

  /** Validation rules */
  validation?: {
    /** Minimum value (for numbers) */
    min?: number;

    /** Maximum value (for numbers) */
    max?: number;

    /** Pattern (for strings) */
    pattern?: string;

    /** Allowed values (enum) */
    enum?: any[];
  };
}

/**
 * Node output field definition
 *
 * Detailed definition of a node's output field.
 */
export interface NodeOutputField {
  /** Field name */
  name: string;

  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'any';

  /** Field description */
  description?: string;

  /** Example value */
  example?: any;

  /** Whether the output is always present */
  guaranteed?: boolean;
}

/**
 * Detailed node documentation
 *
 * Comprehensive documentation for a node.
 */
export interface NodeDocumentation {
  /** Node metadata */
  metadata: NodeMetadata;

  /** Detailed input field definitions */
  inputs?: NodeInputField[];

  /** Detailed output field definitions */
  outputs?: NodeOutputField[];

  /** Usage examples */
  examples?: NodeExample[];

  /** Common use cases */
  useCases?: string[];

  /** Best practices */
  bestPractices?: string[];

  /** Common errors and solutions */
  troubleshooting?: {
    error: string;
    solution: string;
  }[];

  /** Related nodes */
  relatedNodes?: string[];
}

/**
 * Node usage example
 *
 * A complete example of using a node in a workflow.
 */
export interface NodeExample {
  /** Example title */
  title: string;

  /** Example description */
  description: string;

  /** Node configuration */
  config: Record<string, any>;

  /** Initial state (optional) */
  initialState?: Record<string, any>;

  /** Expected result */
  expectedResult?: any;

  /** Expected edges */
  expectedEdges?: string[];
}

/**
 * Node with availability status
 *
 * Node metadata with information about its availability in the current environment.
 */
export interface NodeWithAvailability extends NodeMetadata {
  /** Whether the node is available for use */
  available: boolean;

  /** Reason if unavailable */
  unavailableReason?: string;

  /** Required environment */
  requiredEnvironment?: 'server' | 'client';
}

/**
 * Node registry response
 *
 * Response from the node registry API endpoint.
 */
export interface NodeRegistryResponse {
  /** Total number of nodes */
  total: number;

  /** Array of nodes */
  nodes: NodeMetadata[];

  /** Discovery metadata */
  discovery: NodeDiscoveryResult;
}
