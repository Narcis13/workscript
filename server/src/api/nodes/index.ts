import { Hono } from 'hono'
import { WorkflowService } from '../../services/WorkflowService'
import type { ExecutionContext, EdgeMap } from 'shared/dist'
import { createId } from '@paralleldrive/cuid2'

const nodes = new Hono()

/**
 * POST /run/:nodeId - Execute a single node in isolation
 *
 * Request body:
 * - config: Node configuration object (required)
 * - initialState: Optional initial state object
 *
 * Response:
 * - success: boolean indicating execution success
 * - nodeId: The executed node ID
 * - executionId: Unique execution identifier
 * - edges: Object containing executed edge data
 * - finalState: State object after node execution
 * - metadata: Execution metadata (timestamp, duration)
 */
nodes.post('/run/:nodeId', async (c) => {
  const startTime = Date.now()

  try {
    const nodeId = c.req.param('nodeId')

    if (!nodeId) {
      return c.json({
        success: false,
        error: 'Node ID is required'
      }, { status: 400 })
    }

    // Parse request body
    const body = await c.req.json().catch(() => ({}))
    const { config, initialState = {} } = body

    // Get WorkflowService singleton
    const workflowService = await WorkflowService.getInstance()

    // Verify node exists
    if (!workflowService.hasNode(nodeId)) {
      return c.json({
        success: false,
        error: `Node not found: ${nodeId}`,
        availableNodes: workflowService.getAvailableNodes().map(n => n.id)
      }, { status: 404 })
    }

    // Generate execution IDs
    const executionId = createId()
    const workflowId = `single-node-${nodeId}-${Date.now()}`

    // Create execution context
    const context: ExecutionContext = {
      state: { ...initialState },
      inputs: {},
      workflowId,
      nodeId,
      executionId
    }

    // Get node instance from registry
    const registry = (workflowService as any).registry
    const nodeInstance = registry.getInstance(nodeId)

    // Execute the node
    const edgeMap: EdgeMap = await nodeInstance.execute(context, config)

    // Execute all edge functions to get their data
    const executedEdges: Record<string, any> = {}
    for (const [edgeName, edgeFunction] of Object.entries(edgeMap)) {
      if (typeof edgeFunction === 'function') {
        try {
          executedEdges[edgeName] = edgeFunction()
        } catch (error) {
          executedEdges[edgeName] = {
            error: error instanceof Error ? error.message : 'Edge execution failed'
          }
        }
      } else {
        executedEdges[edgeName] = edgeFunction
      }
    }

    const duration = Date.now() - startTime

    // Return successful response
    return c.json({
      success: true,
      nodeId,
      executionId,
      edges: executedEdges,
      finalState: context.state,
      metadata: {
        executedAt: new Date().toISOString(),
        duration,
        workflowId
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Node execution error:', error)

    const duration = Date.now() - startTime

    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during node execution',
      metadata: {
        executedAt: new Date().toISOString(),
        duration
      }
    }, { status: 500 })
  }
})

/**
 * GET /metadata/:nodeId - Get metadata for a specific node
 *
 * Response:
 * - Node metadata including id, name, description, version, inputs, outputs, ai_hints
 */
nodes.get('/metadata/:nodeId', async (c) => {
  try {
    const nodeId = c.req.param('nodeId')

    if (!nodeId) {
      return c.json({
        success: false,
        error: 'Node ID is required'
      }, { status: 400 })
    }

    const workflowService = await WorkflowService.getInstance()

    if (!workflowService.hasNode(nodeId)) {
      return c.json({
        success: false,
        error: `Node not found: ${nodeId}`
      }, { status: 404 })
    }

    const metadata = workflowService.getNodeMetadata(nodeId)

    return c.json({
      success: true,
      metadata
    })

  } catch (error) {
    console.error('Error fetching node metadata:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
})

/**
 * GET / - List all available nodes
 *
 * Query parameters:
 * - source: Filter by source type (universal|server)
 *
 * Response:
 * - Array of node metadata
 */
nodes.get('/', async (c) => {
  try {
    const source = c.req.query('source') as 'universal' | 'server' | undefined

    const workflowService = await WorkflowService.getInstance()

    let nodeList
    if (source && (source === 'universal' || source === 'server')) {
      nodeList = workflowService.getNodesBySource(source)
    } else {
      nodeList = workflowService.getAvailableNodes()
    }

    return c.json({
      success: true,
      count: nodeList.length,
      nodes: nodeList,
      ...(source && { source })
    })

  } catch (error) {
    console.error('Error listing nodes:', error)
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      nodes: []
    }, { status: 500 })
  }
})

export default nodes
