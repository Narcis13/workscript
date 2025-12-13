/**
 * Central export point for all workflow nodes in @workscript/nodes package
 * This package consolidates all server-side workflow nodes into a single location
 *
 * Architecture:
 * - Core nodes: Basic workflow operations (Math, Logic, Transform, etc.)
 * - Data manipulation nodes: Advanced data processing (Filter, Sort, Aggregate, etc.)
 * - Server nodes: Server-specific operations (FileSystem, Database, Auth)
 * - Custom integrations: Third-party service integrations (Gmail, Zoca, etc.)
 */

// ============================================================================
// TYPE EXPORTS - Core engine types
// ============================================================================
export type { WorkflowNode } from '@workscript/engine';

// ============================================================================
// CORE NODES - Basic workflow operations
// ============================================================================
export { MathNode } from './MathNode.js';
export { LogicNode } from './LogicNode.js';
export { DataTransformNode } from './DataTransformNode.js';
export { EmptyNode } from './EmptyNode.js';
export { LogNode } from './LogNode.js';
export { StateSetterNode } from './StateSetterNode.js';

// ============================================================================
// AI NODES - AI/LLM integration nodes
// ============================================================================
export { AskAINode } from './AskAINode.js';

// ============================================================================
// WORKFLOW ORCHESTRATION NODES - Execute workflows from workflows
// ============================================================================
export { RunWorkflowNode } from './RunWorkflowNode.js';

// ============================================================================
// DATA MANIPULATION NODES - Advanced data processing
// ============================================================================

// Array operations
export { SplitOutNode } from './data/SplitOutNode.js';
export { AggregateNode } from './data/AggregateNode.js';
export { RemoveDuplicatesNode } from './data/RemoveDuplicatesNode.js';
export { SortNode } from './data/SortNode.js';
export { LimitNode } from './data/LimitNode.js';
export { ArrayUtilitiesNode } from './data/ArrayUtilitiesNode.js';
export { EveryArrayItemNode } from './data/EveryArrayItemNode.js';
export { RangeNode } from './data/RangeNode.js';
export { WhileNode } from './data/WhileNode.js';

// Data transformation
export { EditFieldsNode } from './data/EditFieldsNode.js';
export { SummarizeNode } from './data/SummarizeNode.js';
export { TransformObjectNode } from './data/TransformObjectNode.js';

// Parsing and extraction
export { JSONExtractNode } from './data/JSONExtractNode.js';
export { StringOperationsNode } from './data/StringOperationsNode.js';
export { ExtractTextNode } from './data/ExtractTextNode.js';

// HTTP/API operations
export { FetchApiNode } from './data/FetchApiNode.js';

// Resource operations
export { ResourceReadNode } from './data/ResourceReadNode.js';
export { ResourceWriteNode } from './data/ResourceWriteNode.js';
export { ResourceInterpolateNode } from './data/ResourceInterpolateNode.js';
export { ResourceListNode } from './data/ResourceListNode.js';

// Filtering and comparison
export { FilterNode } from './data/FilterNode.js';
export { CompareDatasetsNode } from './data/CompareDatasetsNode.js';
export { SwitchNode } from './data/SwitchNode.js';

// Calculations and math
export { CalculateFieldNode } from './data/CalculateFieldNode.js';
export { MathOperationsNode } from './data/MathOperationsNode.js';

// Date/time operations
export { DateTimeNode } from './data/DateTimeNode.js';

// Validation
export { ValidateDataNode } from './data/ValidateDataNode.js';

// Object utilities
export { ObjectUtilitiesNode } from './data/ObjectUtilitiesNode.js';

// ============================================================================
// SERVER NODES - Server-specific operations
// ============================================================================
export { FileSystemNode } from './FileSystemNode.js';
export { DatabaseNode } from './DatabaseNode.js';
export { AuthNode } from './AuthNode.js';

// ============================================================================
// CUSTOM INTEGRATIONS - Third-party service integrations
// ============================================================================

// Google Gmail integration
export { GoogleConnectNode } from './custom/google/gmail/googleConnect.js';
export { SendEmailNode } from './custom/google/gmail/sendEmail.js';
export { ListEmailsNode } from './custom/google/gmail/listEmails.js';

// Zoca integration
export { ToateContacteleNode } from './custom/zoca/toateContactele.js';
export { FiecareElementNode } from './custom/zoca/fiecareElement.js';
export { AplicaFiltreNode } from './custom/zoca/aplicaFiltre.js';

// ============================================================================
// IMPORTS FOR ALL_NODES ARRAY
// ============================================================================
import type { WorkflowNode } from '@workscript/engine';

// Core nodes
import { MathNode } from './MathNode.js';
import { LogicNode } from './LogicNode.js';
import { DataTransformNode } from './DataTransformNode.js';
import { EmptyNode } from './EmptyNode.js';
import { LogNode } from './LogNode.js';
import { StateSetterNode } from './StateSetterNode.js';

// AI nodes
import { AskAINode } from './AskAINode.js';

// Workflow orchestration nodes
import { RunWorkflowNode } from './RunWorkflowNode.js';

// Data manipulation nodes
import { SplitOutNode } from './data/SplitOutNode.js';
import { AggregateNode } from './data/AggregateNode.js';
import { RemoveDuplicatesNode } from './data/RemoveDuplicatesNode.js';
import { SortNode } from './data/SortNode.js';
import { LimitNode } from './data/LimitNode.js';
import { ArrayUtilitiesNode } from './data/ArrayUtilitiesNode.js';
import { EveryArrayItemNode } from './data/EveryArrayItemNode.js';
import { RangeNode } from './data/RangeNode.js';
import { WhileNode } from './data/WhileNode.js';
import { EditFieldsNode } from './data/EditFieldsNode.js';
import { SummarizeNode } from './data/SummarizeNode.js';
import { TransformObjectNode } from './data/TransformObjectNode.js';
import { JSONExtractNode } from './data/JSONExtractNode.js';
import { StringOperationsNode } from './data/StringOperationsNode.js';
import { ExtractTextNode } from './data/ExtractTextNode.js';
import { FetchApiNode } from './data/FetchApiNode.js';
import { ResourceReadNode } from './data/ResourceReadNode.js';
import { ResourceWriteNode } from './data/ResourceWriteNode.js';
import { ResourceInterpolateNode } from './data/ResourceInterpolateNode.js';
import { ResourceListNode } from './data/ResourceListNode.js';
import { FilterNode } from './data/FilterNode.js';
import { CompareDatasetsNode } from './data/CompareDatasetsNode.js';
import { SwitchNode } from './data/SwitchNode.js';
import { CalculateFieldNode } from './data/CalculateFieldNode.js';
import { MathOperationsNode } from './data/MathOperationsNode.js';
import { DateTimeNode } from './data/DateTimeNode.js';
import { ValidateDataNode } from './data/ValidateDataNode.js';
import { ObjectUtilitiesNode } from './data/ObjectUtilitiesNode.js';

// Server nodes
import { FileSystemNode } from './FileSystemNode.js';
import { DatabaseNode } from './DatabaseNode.js';
import { AuthNode } from './AuthNode.js';

// Custom integrations - Gmail
import { GoogleConnectNode } from './custom/google/gmail/googleConnect.js';
import { SendEmailNode } from './custom/google/gmail/sendEmail.js';
import { ListEmailsNode } from './custom/google/gmail/listEmails.js';

// Custom integrations - Zoca
import { ToateContacteleNode } from './custom/zoca/toateContactele.js';
import { FiecareElementNode } from './custom/zoca/fiecareElement.js';
import { AplicaFiltreNode } from './custom/zoca/aplicaFiltre.js';

// ============================================================================
// ALL_NODES ARRAY - Complete list of all node classes
// ============================================================================

/**
 * Array of all node classes available in @workscript/nodes package
 *
 * This is the primary export used by the API server to register all workflow nodes.
 * The array includes all node types:
 * - Core nodes (6): Math, Logic, DataTransform, Empty, Log, StateSetter
 * - AI nodes (1): AskAI
 * - Workflow orchestration nodes (1): RunWorkflow
 * - Data manipulation nodes (28): Filter, Sort, Aggregate, Transform, EveryArrayItem, Range, While, FetchApi, Resource (4), etc.
 * - Server nodes (3): FileSystem, Database, Auth
 * - Custom integrations (6): Gmail (3), Zoca (3)
 *
 * Total: 45 nodes
 *
 * @example
 * ```typescript
 * import { ALL_NODES } from '@workscript/nodes';
 *
 * // Register all nodes with NodeRegistry
 * for (const NodeClass of ALL_NODES) {
 *   await registry.register(NodeClass, { source: 'server' });
 * }
 * ```
 */
export const ALL_NODES: Array<typeof WorkflowNode> = [
  // ============================================================================
  // CORE NODES (6)
  // ============================================================================
  MathNode,
  LogicNode,
  DataTransformNode,
  EmptyNode,
  LogNode,
  StateSetterNode,

  // ============================================================================
  // AI NODES (1)
  // ============================================================================
  AskAINode,

  // ============================================================================
  // WORKFLOW ORCHESTRATION NODES (1)
  // ============================================================================
  RunWorkflowNode,

  // ============================================================================
  // DATA MANIPULATION NODES (27)
  // ============================================================================

  // Array operations
  SplitOutNode,
  AggregateNode,
  RemoveDuplicatesNode,
  SortNode,
  LimitNode,
  ArrayUtilitiesNode,
  EveryArrayItemNode,
  RangeNode,
  WhileNode,

  // Data transformation
  EditFieldsNode,
  SummarizeNode,
  TransformObjectNode,

  // Parsing and extraction
  JSONExtractNode,
  StringOperationsNode,
  ExtractTextNode,

  // HTTP/API operations
  FetchApiNode,

  // Resource operations (4)
  ResourceReadNode,
  ResourceWriteNode,
  ResourceInterpolateNode,
  ResourceListNode,

  // Filtering and comparison
  FilterNode,
  CompareDatasetsNode,
  SwitchNode,

  // Calculations and math
  CalculateFieldNode,
  MathOperationsNode,

  // Date/time operations
  DateTimeNode,

  // Validation
  ValidateDataNode,

  // Object utilities
  ObjectUtilitiesNode,

  // ============================================================================
  // SERVER NODES (3)
  // ============================================================================
  FileSystemNode,
  DatabaseNode,
  AuthNode,

  // ============================================================================
  // CUSTOM INTEGRATIONS (6)
  // ============================================================================

  // Gmail integration (3)
  GoogleConnectNode,
  SendEmailNode,
  ListEmailsNode,

  // Zoca integration (3)
  ToateContacteleNode,
  FiecareElementNode,
  AplicaFiltreNode,
];

/**
 * Get a copy of all node classes
 * @returns Array of all node class constructors
 */
export function getAllNodes(): Array<typeof WorkflowNode> {
  return [...ALL_NODES];
}

/**
 * Get count of available nodes by category
 * @returns Object with counts per category
 */
export function getNodeCount() {
  return {
    core: 6,
    ai: 1,
    workflowOrchestration: 1,
    dataManipulation: 28,  // Includes 4 Resource nodes and While loop
    server: 3,
    customIntegrations: 6,
    total: ALL_NODES.length,
  };
}

/**
 * Get node metadata for all nodes (for development/debugging)
 * @returns Array of node metadata objects
 */
export function getNodeMetadata() {
  return ALL_NODES.map(NodeClass => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const instance = new (NodeClass as any)();
      return {
        ...instance.metadata,
        source: 'server' as const,
      };
    } catch (error) {
      console.warn(`Failed to get metadata for node class:`, NodeClass, error);
      return null;
    }
  }).filter(Boolean);
}

// ============================================================================
// LEGACY EXPORTS - For backward compatibility
// ============================================================================

/**
 * @deprecated Use ALL_NODES instead. This export is kept for backward compatibility.
 */
export const UNIVERSAL_NODES = ALL_NODES;

/**
 * @deprecated Use getAllNodes() instead. This export is kept for backward compatibility.
 */
export function getAllUniversalNodes(): Array<typeof WorkflowNode> {
  return getAllNodes();
}

/**
 * @deprecated Use getNodeMetadata() instead. This export is kept for backward compatibility.
 */
export function getUniversalNodeMetadata() {
  return getNodeMetadata();
}