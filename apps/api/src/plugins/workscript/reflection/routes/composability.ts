/**
 * Composability Routes
 *
 * API endpoints for node composability discovery - understanding which nodes
 * can connect to each other and suggesting next nodes based on context.
 *
 * Endpoints:
 * - GET /graph - Full compatibility matrix
 * - GET /from/:nodeId - Possible successors for a node
 * - GET /to/:nodeId - Possible predecessors for a node
 * - POST /suggest - Context-aware node suggestions
 */

import { Hono } from 'hono';
import { getComposabilityGraph } from '../services/ComposabilityGraph';
import { isKnownNode } from '../services/nodeCategories';
import type { SuggestionContext } from '../types/reflection.types';

const composabilityRouter = new Hono();

// ============================================================================
// GET /graph - Full Composability Matrix
// ============================================================================

/**
 * GET /composability/graph
 * Returns the complete composability matrix including node connections
 * and state key mappings.
 *
 * Response:
 * {
 *   nodes: { [nodeId]: NodeConnections },
 *   stateKeyMap: { [stateKey]: StateKeyUsage }
 * }
 */
composabilityRouter.get('/graph', async (c) => {
  try {
    const composabilityGraph = getComposabilityGraph();
    const graph = await composabilityGraph.getGraph();

    return c.json({
      nodes: graph.nodes,
      stateKeyMap: graph.stateKeyMap,
      metadata: {
        totalNodes: Object.keys(graph.nodes).length,
        totalStateKeys: Object.keys(graph.stateKeyMap).length,
      },
    });
  } catch (error) {
    console.error('Error building composability graph:', error);
    return c.json(
      { error: 'Failed to build composability graph' },
      500
    );
  }
});

// ============================================================================
// GET /from/:nodeId - Possible Successors
// ============================================================================

/**
 * GET /composability/from/:nodeId
 * Returns possible successor nodes for each edge of the specified node.
 *
 * Query params:
 * - edge: (optional) Filter to a specific edge
 *
 * Response:
 * {
 *   nodeId: string,
 *   edges: {
 *     [edgeName]: {
 *       provides: string[],
 *       suggestedNext: NodeSuggestion[]
 *     }
 *   }
 * }
 */
composabilityRouter.get('/from/:nodeId', async (c) => {
  const nodeId = c.req.param('nodeId');
  const edge = c.req.query('edge');

  // Validate node exists
  if (!isKnownNode(nodeId)) {
    return c.json(
      { error: `Node not found: ${nodeId}` },
      404
    );
  }

  try {
    const composabilityGraph = getComposabilityGraph();
    const successors = await composabilityGraph.getSuggestedSuccessors(nodeId, edge);

    return c.json(successors);
  } catch (error) {
    console.error(`Error getting successors for ${nodeId}:`, error);
    return c.json(
      { error: `Failed to get successors for node: ${nodeId}` },
      500
    );
  }
});

// ============================================================================
// GET /to/:nodeId - Possible Predecessors
// ============================================================================

/**
 * GET /composability/to/:nodeId
 * Returns possible predecessor nodes for the specified node.
 *
 * Response:
 * {
 *   nodeId: string,
 *   requires: string,
 *   suggestedPredecessors: Array<{
 *     nodeId: string,
 *     edge: string,
 *     reason: string,
 *     connectsVia: string
 *   }>
 * }
 */
composabilityRouter.get('/to/:nodeId', async (c) => {
  const nodeId = c.req.param('nodeId');

  // Validate node exists
  if (!isKnownNode(nodeId)) {
    return c.json(
      { error: `Node not found: ${nodeId}` },
      404
    );
  }

  try {
    const composabilityGraph = getComposabilityGraph();
    const predecessors = await composabilityGraph.getSuggestedPredecessors(nodeId);

    return c.json(predecessors);
  } catch (error) {
    console.error(`Error getting predecessors for ${nodeId}:`, error);
    return c.json(
      { error: `Failed to get predecessors for node: ${nodeId}` },
      500
    );
  }
});

// ============================================================================
// POST /suggest - Context-Aware Suggestions
// ============================================================================

/**
 * POST /composability/suggest
 * Returns context-aware suggestions for the next node based on current
 * workflow state and optional user intent.
 *
 * Request body:
 * {
 *   currentNode: string,     // Current node ID
 *   currentEdge: string,     // Current edge being followed
 *   currentState: object,    // Current workflow state
 *   intent?: string          // Optional user intent (e.g., "filter", "aggregate")
 * }
 *
 * Response:
 * Array<{
 *   nodeId: string,
 *   confidence: number,
 *   config: object,
 *   explanation: string
 * }>
 */
composabilityRouter.post('/suggest', async (c) => {
  let body: SuggestionContext;

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: 'Invalid JSON request body' },
      400
    );
  }

  // Validate required fields
  if (!body.currentNode) {
    return c.json(
      { error: 'Missing required field: currentNode' },
      400
    );
  }

  if (!body.currentEdge) {
    return c.json(
      { error: 'Missing required field: currentEdge' },
      400
    );
  }

  // Validate node exists
  if (!isKnownNode(body.currentNode)) {
    return c.json(
      { error: `Node not found: ${body.currentNode}` },
      404
    );
  }

  // Default currentState to empty object if not provided
  const context: SuggestionContext = {
    currentNode: body.currentNode,
    currentEdge: body.currentEdge,
    currentState: body.currentState || {},
    intent: body.intent,
  };

  try {
    const composabilityGraph = getComposabilityGraph();
    const suggestions = await composabilityGraph.suggestNext(context);

    return c.json({
      context: {
        node: context.currentNode,
        edge: context.currentEdge,
        stateKeys: Object.keys(context.currentState),
        intent: context.intent || null,
      },
      suggestions,
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return c.json(
      { error: 'Failed to generate node suggestions' },
      500
    );
  }
});

export default composabilityRouter;
