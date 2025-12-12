/**
 * Node Categorization Mapping
 *
 * Maps node IDs to their categories and provides file path mappings for source extraction.
 * This is the single source of truth for node categorization used throughout the Reflection API.
 */

import type { NodeCategory } from '../types/reflection.types';

/**
 * Complete mapping of node IDs to their categories
 *
 * Categories:
 * - core: Basic operations (math, logic, transform, log, empty, stateSetter)
 * - ai: AI/LLM integration (ask-ai)
 * - orchestration: Workflow control (runWorkflow)
 * - data-manipulation: Data processing (filter, sort, aggregate, etc.)
 * - server: Server-side operations (filesystem, database, auth)
 * - integrations: External service integrations (gmail, zoca, fetchApi)
 */
export const NODE_CATEGORIES: Record<string, NodeCategory> = {
  // ============================================================================
  // CORE NODES (6)
  // ============================================================================
  'math': 'core',
  'logic': 'core',
  'transform': 'core',
  'empty': 'core',
  'log': 'core',
  'stateSetter': 'core',

  // ============================================================================
  // AI NODES (1)
  // ============================================================================
  'ask-ai': 'ai',

  // ============================================================================
  // ORCHESTRATION NODES (1)
  // ============================================================================
  'runWorkflow': 'orchestration',

  // ============================================================================
  // DATA MANIPULATION NODES (22)
  // ============================================================================
  // Array operations
  'splitOut': 'data-manipulation',
  'aggregate': 'data-manipulation',
  'removeDuplicates': 'data-manipulation',
  'sort': 'data-manipulation',
  'limit': 'data-manipulation',
  'arrayUtilities': 'data-manipulation',
  'everyArrayItem': 'data-manipulation',
  'range': 'data-manipulation',

  // Data transformation
  'editFields': 'data-manipulation',
  'summarize': 'data-manipulation',
  'transformObject': 'data-manipulation',

  // Parsing and extraction
  'jsonExtract': 'data-manipulation',
  'stringOperations': 'data-manipulation',
  'extractText': 'data-manipulation',

  // Filtering and comparison
  'filter': 'data-manipulation',
  'compareDatasets': 'data-manipulation',
  'switch': 'data-manipulation',

  // Calculations and math
  'calculateField': 'data-manipulation',
  'mathOperations': 'data-manipulation',

  // Date/time operations
  'dateTime': 'data-manipulation',

  // Validation
  'validateData': 'data-manipulation',

  // Object utilities
  'objectUtilities': 'data-manipulation',

  // ============================================================================
  // SERVER NODES (3)
  // ============================================================================
  'filesystem': 'server',
  'database': 'server',
  'auth': 'server',

  // ============================================================================
  // INTEGRATION NODES (7)
  // ============================================================================
  // HTTP/API operations
  'fetchApi': 'integrations',

  // Gmail integration
  'googleConnect': 'integrations',
  'sendEmail': 'integrations',
  'listEmails': 'integrations',

  // Zoca CRM integration
  'toateContactele': 'integrations',
  'fiecareElement': 'integrations',
  'aplicaFiltre': 'integrations',
};

/**
 * Mapping of node IDs to their source file paths relative to packages/nodes/src/
 *
 * Notes:
 * - Core nodes are in the root of src/
 * - Data manipulation nodes are in src/data/
 * - Custom integrations are in src/custom/{provider}/{service}/
 */
export const NODE_FILE_PATHS: Record<string, string> = {
  // ============================================================================
  // CORE NODES
  // ============================================================================
  'math': 'MathNode.ts',
  'logic': 'LogicNode.ts',
  'transform': 'DataTransformNode.ts',
  'empty': 'EmptyNode.ts',
  'log': 'LogNode.ts',
  'stateSetter': 'StateSetterNode.ts',

  // ============================================================================
  // AI NODES
  // ============================================================================
  'ask-ai': 'AskAINode.ts',

  // ============================================================================
  // ORCHESTRATION NODES
  // ============================================================================
  'runWorkflow': 'RunWorkflowNode.ts',

  // ============================================================================
  // DATA MANIPULATION NODES
  // ============================================================================
  'splitOut': 'data/SplitOutNode.ts',
  'aggregate': 'data/AggregateNode.ts',
  'removeDuplicates': 'data/RemoveDuplicatesNode.ts',
  'sort': 'data/SortNode.ts',
  'limit': 'data/LimitNode.ts',
  'arrayUtilities': 'data/ArrayUtilitiesNode.ts',
  'everyArrayItem': 'data/EveryArrayItemNode.ts',
  'range': 'data/RangeNode.ts',
  'editFields': 'data/EditFieldsNode.ts',
  'summarize': 'data/SummarizeNode.ts',
  'transformObject': 'data/TransformObjectNode.ts',
  'jsonExtract': 'data/JSONExtractNode.ts',
  'stringOperations': 'data/StringOperationsNode.ts',
  'extractText': 'data/ExtractTextNode.ts',
  'filter': 'data/FilterNode.ts',
  'compareDatasets': 'data/CompareDatasetsNode.ts',
  'switch': 'data/SwitchNode.ts',
  'calculateField': 'data/CalculateFieldNode.ts',
  'mathOperations': 'data/MathOperationsNode.ts',
  'dateTime': 'data/DateTimeNode.ts',
  'validateData': 'data/ValidateDataNode.ts',
  'objectUtilities': 'data/ObjectUtilitiesNode.ts',
  'fetchApi': 'data/FetchApiNode.ts',

  // ============================================================================
  // SERVER NODES
  // ============================================================================
  'filesystem': 'FileSystemNode.ts',
  'database': 'DatabaseNode.ts',
  'auth': 'AuthNode.ts',

  // ============================================================================
  // CUSTOM INTEGRATIONS - Gmail
  // ============================================================================
  'googleConnect': 'custom/google/gmail/googleConnect.ts',
  'sendEmail': 'custom/google/gmail/sendEmail.ts',
  'listEmails': 'custom/google/gmail/listEmails.ts',

  // ============================================================================
  // CUSTOM INTEGRATIONS - Zoca
  // ============================================================================
  'toateContactele': 'custom/zoca/toateContactele.ts',
  'fiecareElement': 'custom/zoca/fiecareElement.ts',
  'aplicaFiltre': 'custom/zoca/aplicaFiltre.ts',
};

/**
 * Get the category for a node ID
 * @param nodeId - The node ID to look up
 * @returns The node category or undefined if not found
 */
export function getNodeCategory(nodeId: string): NodeCategory | undefined {
  return NODE_CATEGORIES[nodeId];
}

/**
 * Get the source file path for a node ID
 * @param nodeId - The node ID to look up
 * @returns The relative file path or undefined if not found
 */
export function getNodeFilePath(nodeId: string): string | undefined {
  return NODE_FILE_PATHS[nodeId];
}

/**
 * Get all node IDs for a specific category
 * @param category - The category to filter by
 * @returns Array of node IDs in that category
 */
export function getNodesByCategory(category: NodeCategory): string[] {
  return Object.entries(NODE_CATEGORIES)
    .filter(([, cat]) => cat === category)
    .map(([nodeId]) => nodeId);
}

/**
 * Get counts of nodes by category
 * @returns Object with category counts
 */
export function getNodeCountsByCategory(): Record<NodeCategory, number> {
  const counts: Record<NodeCategory, number> = {
    'core': 0,
    'ai': 0,
    'orchestration': 0,
    'data-manipulation': 0,
    'server': 0,
    'integrations': 0,
  };

  for (const category of Object.values(NODE_CATEGORIES)) {
    counts[category]++;
  }

  return counts;
}

/**
 * Get all known node IDs
 * @returns Array of all node IDs
 */
export function getAllNodeIds(): string[] {
  return Object.keys(NODE_CATEGORIES);
}

/**
 * Check if a node ID is known/registered
 * @param nodeId - The node ID to check
 * @returns true if the node ID is known
 */
export function isKnownNode(nodeId: string): boolean {
  return nodeId in NODE_CATEGORIES;
}
