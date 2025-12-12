/**
 * Workscript Reflection API - Main Router
 *
 * This module provides the entry point for the reflection "consciousness layer"
 * that enables AI agents to introspect, understand, and dynamically compose workflows.
 *
 * Routes:
 * - GET /reflection/ - API overview and available endpoints
 * - /reflection/nodes/* - Deep node introspection
 * - /reflection/source/* - Source code extraction
 * - /reflection/manifest/* - AI manifest generation
 * - /reflection/analysis/* - Workflow analysis
 * - /reflection/composability/* - Node connection graph
 * - /reflection/patterns/* - Pattern library
 */

import { Hono } from 'hono';
import type { NodeCategory } from './types/reflection.types';

// Import sub-routers
import nodesRoutes from './routes/nodes';
import sourceRoutes from './routes/source';
import manifestRoutes from './routes/manifest';
import analysisRoutes from './routes/analysis';

// Create the main reflection router
const reflectionRouter = new Hono();

/**
 * GET /reflection/
 * Returns an overview of the Reflection API and all available endpoints
 */
reflectionRouter.get('/', (c) => {
  return c.json({
    name: 'Workscript Reflection API',
    version: '1.0.0',
    description: 'Introspection and reflection "consciousness layer" for AI agents to understand and compose workflows',

    endpoints: {
      nodes: {
        basePath: '/workscript/reflection/nodes',
        description: 'Deep node introspection - understand node capabilities, inputs, outputs, and operations',
        routes: [
          { method: 'GET', path: '/nodes', description: 'List all nodes with deep introspection data' },
          { method: 'GET', path: '/nodes/:nodeId', description: 'Get complete introspection for a specific node' },
          { method: 'GET', path: '/nodes/:nodeId/operations', description: 'Get available operations for a node' },
          { method: 'GET', path: '/nodes/:nodeId/examples', description: 'Get usage examples for a node' }
        ]
      },
      source: {
        basePath: '/workscript/reflection/source',
        description: 'Source code extraction - read actual node implementations',
        routes: [
          { method: 'GET', path: '/source/:nodeId', description: 'Get structured source with parsed info' },
          { method: 'GET', path: '/source/:nodeId/raw', description: 'Get raw TypeScript source' }
        ]
      },
      manifest: {
        basePath: '/workscript/reflection/manifest',
        description: 'AI manifest generation - create optimized system prompts for workflow-building agents',
        routes: [
          { method: 'GET', path: '/manifest', description: 'Get full AI manifest' },
          { method: 'GET', path: '/manifest/compact', description: 'Get compressed manifest for smaller context windows' },
          { method: 'POST', path: '/manifest/custom', description: 'Generate filtered manifest for specific use cases' }
        ]
      },
      analysis: {
        basePath: '/workscript/reflection/analysis',
        description: 'Workflow analysis - explain, validate, and optimize workflows',
        routes: [
          { method: 'POST', path: '/analysis/explain', description: 'Get detailed workflow explanation' },
          { method: 'POST', path: '/analysis/validate-deep', description: 'Perform semantic validation' },
          { method: 'POST', path: '/analysis/optimize', description: 'Get optimization suggestions' },
          { method: 'GET', path: '/analysis/:workflowId', description: 'Analyze stored workflow (auth required)' }
        ]
      },
      composability: {
        basePath: '/workscript/reflection/composability',
        description: 'Composability discovery - understand node connections and suggest next nodes',
        routes: [
          { method: 'GET', path: '/composability/graph', description: 'Get full compatibility matrix' },
          { method: 'GET', path: '/composability/from/:nodeId', description: 'Get possible successors for a node' },
          { method: 'GET', path: '/composability/to/:nodeId', description: 'Get possible predecessors for a node' },
          { method: 'POST', path: '/composability/suggest', description: 'Get context-aware node suggestions' }
        ]
      },
      patterns: {
        basePath: '/workscript/reflection/patterns',
        description: 'Pattern library - browse, detect, and generate workflows from common patterns',
        routes: [
          { method: 'GET', path: '/patterns', description: 'List all recognized workflow patterns' },
          { method: 'GET', path: '/patterns/:patternId', description: 'Get complete pattern details' },
          { method: 'POST', path: '/patterns/detect', description: 'Detect patterns in a workflow' },
          { method: 'POST', path: '/patterns/generate', description: 'Generate workflow from pattern' }
        ]
      }
    },

    categories: [
      'core',
      'ai',
      'orchestration',
      'data-manipulation',
      'server',
      'integrations'
    ] as NodeCategory[],

    authentication: {
      default: 'None - most endpoints are public for AI agent consumption',
      protected: [
        'GET /analysis/:workflowId - requires JWT authentication'
      ]
    },

    links: {
      documentation: '/workscript/reflection/manifest',
      nodeList: '/workscript/reflection/nodes',
      patterns: '/workscript/reflection/patterns'
    }
  });
});

// Mount sub-routers
reflectionRouter.route('/nodes', nodesRoutes);
reflectionRouter.route('/source', sourceRoutes);
reflectionRouter.route('/manifest', manifestRoutes);
reflectionRouter.route('/analysis', analysisRoutes);

// Sub-routers to be mounted as they are implemented:
// - router.route('/composability', composabilityRoutes);
// - router.route('/patterns', patternsRoutes);

export default reflectionRouter;
