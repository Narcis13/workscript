/**
 * Nodes Reflection Routes
 *
 * Deep node introspection endpoints that enable AI agents to understand
 * node capabilities, inputs, outputs, operations, and usage patterns.
 *
 * Endpoints:
 * - GET /nodes - List all nodes with deep introspection data
 * - GET /nodes/:nodeId - Get complete introspection for a specific node
 * - GET /nodes/:nodeId/operations - Get available operations for a node
 * - GET /nodes/:nodeId/examples - Get usage examples for a node
 */

import { Hono } from 'hono';
import type { NodeMetadata } from '@workscript/engine';
import { WorkflowService } from '../../services/WorkflowService';
import {
  getNodeCategory,
  getNodeCountsByCategory,
  getNodesByCategory,
  isKnownNode,
} from '../services/nodeCategories';
import {
  SourceExtractor,
  getSourceExtractor,
} from '../services/SourceExtractor';
import {
  buildInputSchema,
  buildEdgeConditions,
  buildStateInteractions,
  calculateComplexity,
  extractOperations,
} from '../services/introspectionBuilder';
import type {
  NodeCategory,
  ReflectionNodeInfo,
  NodeIntrospection,
  NodesListResponse,
  NodeOperationsResponse,
  NodeExamplesResponse,
  ComposabilityInfo,
  ErrorResponse,
} from '../types/reflection.types';

// Create the nodes router
const nodesRouter = new Hono();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build complete introspection data for a node
 */
async function buildNodeIntrospection(
  metadata: NodeMetadata,
  sourceExtractor: SourceExtractor
): Promise<NodeIntrospection> {
  const nodeId = metadata.id;

  // Get source code for complexity calculation and operations extraction
  const cachedSource = await sourceExtractor.getSourceWithCache(nodeId);
  const source = cachedSource?.content || '';

  // Build all introspection components
  const category = getNodeCategory(nodeId) || 'data-manipulation';
  const complexity = source ? calculateComplexity(source) : 'medium';
  const inputSchema = buildInputSchema(metadata);
  const edgeConditions = buildEdgeConditions(metadata);
  const stateInteractions = buildStateInteractions(metadata);
  const operations = extractOperations(nodeId, source);

  // Build composability info (basic version - will be enhanced in Phase 6)
  const composability = buildBasicComposability(metadata);

  return {
    category,
    complexity,
    inputSchema,
    edgeConditions,
    stateInteractions,
    operations,
    composability,
  };
}

/**
 * Build basic composability info from metadata
 * This is a simplified version - full composability comes from Phase 6
 */
function buildBasicComposability(metadata: NodeMetadata): ComposabilityInfo {
  const aiHints = metadata.ai_hints;

  // Generate typical predecessors based on what state this node reads
  const typicalPredecessors: ComposabilityInfo['typicalPredecessors'] = [];
  const readsFrom = aiHints?.get_from_state || [];

  for (const stateKey of readsFrom) {
    // Add common nodes that write to these state keys
    if (stateKey.includes('items') || stateKey.includes('data') || stateKey.includes('records')) {
      typicalPredecessors.push({
        nodeId: 'database',
        edge: 'found',
        reason: `Provides ${stateKey} from database query`,
      });
      typicalPredecessors.push({
        nodeId: 'filter',
        edge: 'passed',
        reason: `Provides filtered ${stateKey}`,
      });
    }
  }

  // Generate typical successors based on what state this node writes
  const typicalSuccessors: ComposabilityInfo['typicalSuccessors'] = [];
  const writesTo = aiHints?.post_to_state || [];

  for (const stateKey of writesTo) {
    if (stateKey.includes('items') || stateKey.includes('passed')) {
      typicalSuccessors.push({
        nodeId: 'sort',
        reason: `Can sort the ${stateKey} output`,
      });
      typicalSuccessors.push({
        nodeId: 'limit',
        reason: `Can limit the ${stateKey} output`,
      });
    }
  }

  // Common anti-patterns
  const antiPatterns: string[] = [];

  // Add node-specific anti-patterns
  const nodeId = metadata.id;
  if (nodeId === 'filter') {
    antiPatterns.push('Avoid multiple sequential filters - combine conditions in a single filter node');
  }
  if (nodeId === 'database') {
    antiPatterns.push('Always handle the not_found edge to avoid undefined state');
  }
  if (nodeId === 'ask-ai') {
    antiPatterns.push('Do not use in tight loops - AI calls are expensive and rate-limited');
  }

  return {
    typicalPredecessors,
    typicalSuccessors,
    antiPatterns,
  };
}

/**
 * Build complete ReflectionNodeInfo from metadata
 */
async function buildReflectionNodeInfo(
  metadata: NodeMetadata,
  sourceExtractor: SourceExtractor
): Promise<ReflectionNodeInfo> {
  const nodeId = metadata.id;

  // Get introspection data
  const introspection = await buildNodeIntrospection(metadata, sourceExtractor);

  // Get source file info
  const sourcePath = sourceExtractor.resolveNodePath(nodeId);
  const relatedFiles = await sourceExtractor.findRelatedFiles(nodeId);

  // Provide defaults for optional metadata fields
  const defaultAIHints = {
    purpose: `Executes the ${metadata.name} operation`,
    when_to_use: `Use when you need ${metadata.name.toLowerCase()} functionality`,
    expected_edges: ['success', 'error'],
  };

  return {
    // Standard metadata with defaults for optional fields
    id: metadata.id,
    name: metadata.name,
    version: metadata.version || '1.0.0',
    description: metadata.description || `${metadata.name} node`,
    inputs: metadata.inputs || [],
    outputs: metadata.outputs || [],
    ai_hints: metadata.ai_hints || defaultAIHints,

    // Introspection data
    introspection,

    // Source info
    sourceFile: sourcePath || `packages/nodes/src/${nodeId}`,
    hasExampleFile: !!relatedFiles.exampleFile,
    hasTestFile: !!relatedFiles.testFile,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /nodes
 *
 * List all registered nodes with deep introspection data.
 *
 * Query Parameters:
 * - category: Filter by node category (core, ai, orchestration, data-manipulation, server, integrations)
 * - search: Search by name or description
 *
 * Response:
 * - nodes: Array of ReflectionNodeInfo
 * - metadata: { totalNodes, byCategory }
 */
nodesRouter.get('/', async (c) => {
  try {
    const workflowService = await WorkflowService.getInstance();
    const sourceExtractor = getSourceExtractor();

    // Get query parameters
    const categoryFilter = c.req.query('category') as NodeCategory | undefined;
    const searchQuery = c.req.query('search')?.toLowerCase();

    // Get all available nodes
    let allNodes = workflowService.getAvailableNodes();

    // Filter by category if specified
    if (categoryFilter) {
      const nodesInCategory = getNodesByCategory(categoryFilter);
      allNodes = allNodes.filter(node => nodesInCategory.includes(node.id));
    }

    // Filter by search query if specified
    if (searchQuery) {
      allNodes = allNodes.filter(node =>
        node.name.toLowerCase().includes(searchQuery) ||
        (node.description?.toLowerCase().includes(searchQuery) ?? false) ||
        node.id.toLowerCase().includes(searchQuery)
      );
    }

    // Build reflection info for each node
    const nodes: ReflectionNodeInfo[] = await Promise.all(
      allNodes.map(metadata => buildReflectionNodeInfo(metadata, sourceExtractor))
    );

    // Build metadata
    const byCategory = getNodeCountsByCategory();

    const response: NodesListResponse = {
      nodes,
      metadata: {
        totalNodes: nodes.length,
        byCategory,
      },
    };

    return c.json(response);
  } catch (error) {
    console.error('[Reflection/Nodes] Error listing nodes:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to list nodes',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /nodes/:nodeId
 *
 * Get complete introspection data for a specific node.
 *
 * Path Parameters:
 * - nodeId: The node ID to get details for
 *
 * Response:
 * - Complete ReflectionNodeInfo for the node
 * - 404 if node not found
 */
nodesRouter.get('/:nodeId', async (c) => {
  try {
    const nodeId = c.req.param('nodeId');
    const workflowService = await WorkflowService.getInstance();
    const sourceExtractor = getSourceExtractor();

    // Check if node exists
    if (!workflowService.hasNode(nodeId)) {
      const errorResponse: ErrorResponse = {
        error: `Node not found: ${nodeId}`,
        code: 'NODE_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Get node metadata
    const metadata = workflowService.getNodeMetadata(nodeId);
    if (!metadata) {
      const errorResponse: ErrorResponse = {
        error: `Node metadata not found: ${nodeId}`,
        code: 'METADATA_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Build complete reflection info
    const nodeInfo = await buildReflectionNodeInfo(metadata, sourceExtractor);

    return c.json(nodeInfo);
  } catch (error) {
    console.error('[Reflection/Nodes] Error getting node details:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get node details',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /nodes/:nodeId/operations
 *
 * Get all operations available for a specific node.
 * Operations are grouped by data type (string, number, boolean, etc.)
 *
 * Path Parameters:
 * - nodeId: The node ID to get operations for
 *
 * Response:
 * - nodeId: The node ID
 * - operations: Operations grouped by type
 * - 404 if node not found
 */
nodesRouter.get('/:nodeId/operations', async (c) => {
  try {
    const nodeId = c.req.param('nodeId');
    const workflowService = await WorkflowService.getInstance();
    const sourceExtractor = getSourceExtractor();

    // Check if node exists
    if (!workflowService.hasNode(nodeId)) {
      const errorResponse: ErrorResponse = {
        error: `Node not found: ${nodeId}`,
        code: 'NODE_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Get source code for operation extraction
    const cachedSource = await sourceExtractor.getSourceWithCache(nodeId);
    const source = cachedSource?.content || '';

    // Extract operations
    const operations = extractOperations(nodeId, source) || {};

    const response: NodeOperationsResponse = {
      nodeId,
      operations,
    };

    return c.json(response);
  } catch (error) {
    console.error('[Reflection/Nodes] Error getting node operations:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get node operations',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * GET /nodes/:nodeId/examples
 *
 * Get usage examples for a specific node.
 * Returns example.json file contents if available, otherwise generates
 * examples from ai_hints.example_usage.
 *
 * Path Parameters:
 * - nodeId: The node ID to get examples for
 *
 * Response:
 * - nodeId: The node ID
 * - examples: Array of example configurations
 * - exampleWorkflow: Complete example workflow (if example.json exists)
 * - 404 if node not found
 */
nodesRouter.get('/:nodeId/examples', async (c) => {
  try {
    const nodeId = c.req.param('nodeId');
    const workflowService = await WorkflowService.getInstance();
    const sourceExtractor = getSourceExtractor();

    // Check if node exists
    if (!workflowService.hasNode(nodeId)) {
      const errorResponse: ErrorResponse = {
        error: `Node not found: ${nodeId}`,
        code: 'NODE_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Get node metadata
    const metadata = workflowService.getNodeMetadata(nodeId);
    if (!metadata) {
      const errorResponse: ErrorResponse = {
        error: `Node metadata not found: ${nodeId}`,
        code: 'METADATA_NOT_FOUND',
      };
      return c.json(errorResponse, 404);
    }

    // Try to read example.json file
    const exampleWorkflow = await sourceExtractor.readExampleFile(nodeId);

    // Generate examples from ai_hints
    const examples = generateExamplesFromHints(metadata);

    const response: NodeExamplesResponse = {
      nodeId,
      examples,
      exampleWorkflow: exampleWorkflow || undefined,
    };

    return c.json(response);
  } catch (error) {
    console.error('[Reflection/Nodes] Error getting node examples:', error);
    const errorResponse: ErrorResponse = {
      error: 'Failed to get node examples',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
    return c.json(errorResponse, 500);
  }
});

/**
 * Generate examples from node ai_hints
 */
function generateExamplesFromHints(metadata: NodeMetadata): NodeExamplesResponse['examples'] {
  const examples: NodeExamplesResponse['examples'] = [];
  const aiHints = metadata.ai_hints;

  if (!aiHints) {
    return examples;
  }

  // Parse example_usage if available
  if (aiHints.example_usage) {
    examples.push({
      name: 'Basic Usage',
      description: `Basic example of using the ${metadata.name} node`,
      config: parseExampleUsage(aiHints.example_usage),
      initialState: generateInitialState(metadata),
    });
  }

  // Parse example_config if available
  if (aiHints.example_config) {
    try {
      const config = JSON.parse(aiHints.example_config.replace(/'/g, '"'));
      examples.push({
        name: 'Configuration Example',
        description: `Example configuration for ${metadata.name}`,
        config,
      });
    } catch {
      // If parsing fails, just skip this example
    }
  }

  // Generate additional examples based on node type
  const additionalExamples = generateTypeSpecificExamples(metadata);
  examples.push(...additionalExamples);

  return examples;
}

/**
 * Parse example_usage string into config object
 */
function parseExampleUsage(exampleUsage: string): Record<string, any> {
  try {
    // Try direct JSON parse
    return JSON.parse(exampleUsage.replace(/'/g, '"'));
  } catch {
    // Return as-is wrapped in a config object
    return { usage: exampleUsage };
  }
}

/**
 * Generate initial state based on what the node reads
 */
function generateInitialState(metadata: NodeMetadata): Record<string, any> {
  const state: Record<string, any> = {};
  const readsFrom = metadata.ai_hints?.get_from_state || [];

  for (const key of readsFrom) {
    // Generate sample data based on key name
    if (key.includes('items') || key.includes('data') || key.includes('records')) {
      state[key] = [
        { id: 1, name: 'Item 1', value: 100 },
        { id: 2, name: 'Item 2', value: 200 },
      ];
    } else if (key.includes('count') || key.includes('index')) {
      state[key] = 0;
    } else if (key.includes('flag') || key.includes('enabled') || key.includes('active')) {
      state[key] = true;
    } else {
      state[key] = `sample_${key}`;
    }
  }

  return state;
}

/**
 * Generate type-specific examples based on node ID
 */
function generateTypeSpecificExamples(metadata: NodeMetadata): NodeExamplesResponse['examples'] {
  const examples: NodeExamplesResponse['examples'] = [];
  const nodeId = metadata.id;

  switch (nodeId) {
    case 'filter':
      examples.push({
        name: 'Filter Active Users',
        description: 'Filter an array to only include active users',
        config: {
          items: '$.users',
          conditions: [
            { field: 'status', dataType: 'string', operation: 'equals', value: 'active' }
          ]
        },
        initialState: {
          users: [
            { id: 1, name: 'Alice', status: 'active' },
            { id: 2, name: 'Bob', status: 'inactive' },
          ]
        },
        expectedOutput: {
          passedItems: [{ id: 1, name: 'Alice', status: 'active' }],
          filterStats: { passedCount: 1, filteredCount: 1, totalCount: 2 }
        }
      });
      break;

    case 'sort':
      examples.push({
        name: 'Sort by Score Descending',
        description: 'Sort items by score in descending order',
        config: {
          type: 'simple',
          fieldsToSortBy: [{ fieldName: 'score', order: 'descending' }]
        },
        initialState: {
          items: [
            { name: 'A', score: 75 },
            { name: 'B', score: 95 },
            { name: 'C', score: 85 },
          ]
        },
        expectedOutput: {
          sortedItems: [
            { name: 'B', score: 95 },
            { name: 'C', score: 85 },
            { name: 'A', score: 75 },
          ]
        }
      });
      break;

    case 'math':
      examples.push({
        name: 'Calculate Sum',
        description: 'Add multiple numbers together',
        config: {
          operation: 'add',
          values: ['$.a', '$.b', '$.c']
        },
        initialState: { a: 10, b: 20, c: 30 },
        expectedOutput: { mathResult: 60 }
      });
      break;

    case 'logic':
      examples.push({
        name: 'Check Age Requirement',
        description: 'Check if user is at least 18 years old',
        config: {
          operation: 'greaterOrEqual',
          values: ['$.age', 18]
        },
        initialState: { age: 21 },
        expectedOutput: { logicResult: true }
      });
      break;

    case 'editFields':
      examples.push({
        name: 'Set User Status',
        description: 'Set multiple fields on the state',
        config: {
          mode: 'manual_mapping',
          fieldsToSet: [
            { name: 'status', value: 'active', type: 'string' },
            { name: 'updatedAt', value: '{{$.timestamp}}', type: 'string' }
          ]
        },
        initialState: { timestamp: '2024-01-01' },
        expectedOutput: { status: 'active', updatedAt: '2024-01-01' }
      });
      break;
  }

  return examples;
}

export default nodesRouter;
