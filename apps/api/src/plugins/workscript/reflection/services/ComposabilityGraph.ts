/**
 * ComposabilityGraph Service
 *
 * Manages node relationships and composability information for the Reflection API.
 * This service builds a graph of how nodes can connect based on their state key
 * reading/writing patterns, enabling intelligent suggestions for workflow composition.
 *
 * Key features:
 * - Graph building from ai_hints.post_to_state and get_from_state
 * - State key mapping (which nodes write/read each key)
 * - Successor suggestions (what can follow a node)
 * - Predecessor suggestions (what can precede a node)
 * - Context-aware suggestions with confidence scoring
 * - Graph caching with automatic rebuild on node changes
 */

import { WorkflowService } from '../../services/WorkflowService';
import { NODE_CATEGORIES, getAllNodeIds, isKnownNode } from './nodeCategories';
import type {
  ComposabilityGraph as ComposabilityGraphType,
  NodeConnections,
  StateKeyUsage,
  NodeSuggestion,
  SuggestionContext,
  SuccessorsResponse,
  PredecessorsResponse,
  NodeCategory,
} from '../types/reflection.types';
import type { NodeMetadata } from '@workscript/engine';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

interface CachedGraph {
  graph: ComposabilityGraphType;
  nodeCount: number;
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// COMPOSABILITY GRAPH SERVICE
// ============================================================================

/**
 * ComposabilityGraph - Singleton service for node relationship mapping
 *
 * Builds and maintains a graph of node connections based on state key
 * reading and writing patterns, enabling intelligent workflow composition.
 */
export class ComposabilityGraph {
  private static instance: ComposabilityGraph | null = null;

  // Cached graph data
  private graphCache: CachedGraph | null = null;

  // Node metadata cache for quick lookups
  private nodeMetadataMap: Map<string, NodeMetadata> = new Map();

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ComposabilityGraph {
    if (ComposabilityGraph.instance === null) {
      ComposabilityGraph.instance = new ComposabilityGraph();
    }
    return ComposabilityGraph.instance;
  }

  /**
   * Clear all caches - useful for testing or when nodes change
   */
  public clearCache(): void {
    this.graphCache = null;
    this.nodeMetadataMap.clear();
  }

  // ============================================================================
  // GRAPH BUILDING
  // ============================================================================

  /**
   * Build the complete composability graph
   * Analyzes all nodes' ai_hints to determine connections
   */
  public async buildGraph(): Promise<ComposabilityGraphType> {
    // Check cache first
    if (this.graphCache && this.isCacheValid()) {
      return this.graphCache.graph;
    }

    const workflowService = await WorkflowService.getInstance();
    const allNodes = workflowService.getAvailableNodes();

    // Update metadata map
    this.nodeMetadataMap.clear();
    for (const node of allNodes) {
      this.nodeMetadataMap.set(node.id, node);
    }

    // Build the graph
    const nodes: Record<string, NodeConnections> = {};
    const stateKeyMap: Record<string, StateKeyUsage> = {};

    // First pass: collect all state key information
    for (const node of allNodes) {
      const postToState = node.ai_hints?.post_to_state || [];
      const getFromState = node.ai_hints?.get_from_state || [];
      const expectedEdges = node.ai_hints?.expected_edges || ['success', 'error'];

      // Initialize node connections
      nodes[node.id] = {
        typicalSources: [],
        typicalTargets: {},
        provides: {},
      };

      // Map state keys written by this node
      for (const edge of expectedEdges) {
        // Determine which state keys this edge provides
        // Most nodes write state on their success paths
        const nodeEntry = nodes[node.id];
        if (nodeEntry && !edge.includes('error')) {
          nodeEntry.provides[edge] = [...postToState];
        }
        if (nodeEntry) {
          nodeEntry.typicalTargets[edge] = [];
        }
      }

      // Update stateKeyMap for writes
      for (const stateKey of postToState) {
        if (!stateKeyMap[stateKey]) {
          stateKeyMap[stateKey] = { writtenBy: [], readBy: [] };
        }
        // Add write information for each non-error edge
        for (const edge of expectedEdges) {
          if (!edge.includes('error')) {
            stateKeyMap[stateKey].writtenBy.push({ nodeId: node.id, edge });
          }
        }
      }

      // Update stateKeyMap for reads
      for (const stateKey of getFromState) {
        if (!stateKeyMap[stateKey]) {
          stateKeyMap[stateKey] = { writtenBy: [], readBy: [] };
        }
        if (!stateKeyMap[stateKey].readBy.includes(node.id)) {
          stateKeyMap[stateKey].readBy.push(node.id);
        }
      }
    }

    // Second pass: build connections based on state key compatibility
    for (const node of allNodes) {
      const getFromState = node.ai_hints?.get_from_state || [];

      // Find typical sources (nodes that write what this node reads)
      const nodeEntry = nodes[node.id];
      if (!nodeEntry) continue;

      for (const stateKey of getFromState) {
        const usage = stateKeyMap[stateKey];
        if (usage) {
          for (const writer of usage.writtenBy) {
            // Avoid self-references
            if (writer.nodeId !== node.id) {
              const existing = nodeEntry.typicalSources.find(
                s => s.nodeId === writer.nodeId && s.edge === writer.edge
              );
              if (!existing) {
                nodeEntry.typicalSources.push(writer);
              }
            }
          }
        }
      }

      // Find typical targets (nodes that read what this node writes)
      const postToState = node.ai_hints?.post_to_state || [];
      const expectedEdges = node.ai_hints?.expected_edges || ['success', 'error'];

      for (const edge of expectedEdges) {
        if (edge.includes('error')) continue;

        for (const stateKey of postToState) {
          const usage = stateKeyMap[stateKey];
          if (usage) {
            for (const readerId of usage.readBy) {
              // Avoid self-references
              if (readerId !== node.id) {
                const targets = nodeEntry.typicalTargets[edge];
                if (targets && !targets.includes(readerId)) {
                  targets.push(readerId);
                }
              }
            }
          }
        }
      }
    }

    // Add common composability patterns based on node categories
    this.addCategoryBasedConnections(nodes, allNodes);

    const graph: ComposabilityGraphType = { nodes, stateKeyMap };

    // Cache the result
    this.graphCache = {
      graph,
      nodeCount: allNodes.length,
      timestamp: Date.now(),
    };

    return graph;
  }

  /**
   * Build the state key map showing which nodes write/read each key
   */
  public async buildStateKeyMap(): Promise<Record<string, StateKeyUsage>> {
    const graph = await this.buildGraph();
    return graph.stateKeyMap;
  }

  // ============================================================================
  // SUCCESSOR SUGGESTIONS
  // ============================================================================

  /**
   * Get suggested successors for a node on a specific edge
   */
  public async getSuggestedSuccessors(nodeId: string, edge?: string): Promise<SuccessorsResponse> {
    if (!isKnownNode(nodeId)) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const graph = await this.buildGraph();
    const nodeConnections = graph.nodes[nodeId];

    if (!nodeConnections) {
      return {
        nodeId,
        edges: {},
      };
    }

    const edges: Record<string, { provides: string[]; suggestedNext: NodeSuggestion[] }> = {};

    // Get metadata for this node
    const metadata = this.nodeMetadataMap.get(nodeId);
    const expectedEdges = metadata?.ai_hints?.expected_edges || ['success', 'error'];

    // Filter edges if specific edge requested
    const edgesToProcess = edge ? [edge] : expectedEdges;

    for (const edgeName of edgesToProcess) {
      if (edgeName.includes('error')) {
        // For error edges, suggest error handling nodes
        edges[edgeName] = {
          provides: [],
          suggestedNext: this.getErrorHandlingSuggestions(),
        };
        continue;
      }

      const provides = nodeConnections.provides[edgeName] || [];
      const typicalTargets = nodeConnections.typicalTargets[edgeName] || [];

      // Generate suggestions
      const suggestions: NodeSuggestion[] = [];

      // Add typical targets first
      for (const targetId of typicalTargets) {
        const targetMeta = this.nodeMetadataMap.get(targetId);
        if (targetMeta) {
          suggestions.push({
            nodeId: targetId,
            confidence: 0.8,
            config: this.generateDefaultConfig(targetId, provides),
            explanation: `Reads state keys that ${nodeId} writes: ${provides.join(', ')}`,
          });
        }
      }

      // Add category-based suggestions
      const categoryBased = this.getCategoryBasedSuccessors(nodeId, edgeName);
      for (const suggestion of categoryBased) {
        if (!suggestions.find(s => s.nodeId === suggestion.nodeId)) {
          suggestions.push(suggestion);
        }
      }

      // Sort by confidence
      suggestions.sort((a, b) => b.confidence - a.confidence);

      edges[edgeName] = {
        provides,
        suggestedNext: suggestions.slice(0, 10), // Limit to top 10
      };
    }

    return { nodeId, edges };
  }

  // ============================================================================
  // PREDECESSOR SUGGESTIONS
  // ============================================================================

  /**
   * Get suggested predecessors for a node
   */
  public async getSuggestedPredecessors(nodeId: string): Promise<PredecessorsResponse> {
    if (!isKnownNode(nodeId)) {
      throw new Error(`Node not found: ${nodeId}`);
    }

    const graph = await this.buildGraph();
    const nodeConnections = graph.nodes[nodeId];

    // Get metadata for this node
    const metadata = this.nodeMetadataMap.get(nodeId);
    const getFromState = metadata?.ai_hints?.get_from_state || [];

    // Build requires description
    let requires = 'No specific state requirements';
    if (getFromState.length > 0) {
      requires = `Requires state keys: ${getFromState.join(', ')}`;
    }

    // Generate predecessor suggestions
    const suggestedPredecessors: PredecessorsResponse['suggestedPredecessors'] = [];

    if (nodeConnections) {
      for (const source of nodeConnections.typicalSources) {
        const sourceMeta = this.nodeMetadataMap.get(source.nodeId);
        if (sourceMeta) {
          const postToState = sourceMeta.ai_hints?.post_to_state || [];
          const commonKeys = getFromState.filter(k => postToState.includes(k));

          suggestedPredecessors.push({
            nodeId: source.nodeId,
            edge: source.edge,
            reason: commonKeys.length > 0
              ? `Provides ${commonKeys.join(', ')} which this node reads`
              : `Compatible output edge`,
            connectsVia: source.edge,
          });
        }
      }
    }

    // Add category-based predecessors
    const categoryBased = this.getCategoryBasedPredecessors(nodeId);
    for (const pred of categoryBased) {
      if (!suggestedPredecessors.find(s => s.nodeId === pred.nodeId)) {
        suggestedPredecessors.push(pred);
      }
    }

    return {
      nodeId,
      requires,
      suggestedPredecessors: suggestedPredecessors.slice(0, 10),
    };
  }

  // ============================================================================
  // CONTEXT-AWARE SUGGESTIONS
  // ============================================================================

  /**
   * Get context-aware suggestions for the next node
   */
  public async suggestNext(context: SuggestionContext): Promise<NodeSuggestion[]> {
    const { currentNode, currentEdge, currentState, intent } = context;

    if (!isKnownNode(currentNode)) {
      throw new Error(`Node not found: ${currentNode}`);
    }

    const suggestions: NodeSuggestion[] = [];

    // Get base suggestions from successors
    const successorsResponse = await this.getSuggestedSuccessors(currentNode, currentEdge);
    const edgeData = successorsResponse.edges[currentEdge];

    if (edgeData) {
      suggestions.push(...edgeData.suggestedNext);
    }

    // Adjust confidence based on current state
    const stateKeys = Object.keys(currentState || {});
    for (const suggestion of suggestions) {
      const targetMeta = this.nodeMetadataMap.get(suggestion.nodeId);
      if (targetMeta) {
        const getFromState = targetMeta.ai_hints?.get_from_state || [];

        // Boost confidence if current state has keys this node reads
        const availableKeys = getFromState.filter(k => stateKeys.includes(k));
        if (availableKeys.length > 0) {
          suggestion.confidence = Math.min(1, suggestion.confidence + 0.1 * availableKeys.length);
          suggestion.explanation += ` State has ${availableKeys.length} required keys.`;
        }
      }
    }

    // Apply intent matching if provided
    if (intent) {
      const intentLower = intent.toLowerCase();
      for (const suggestion of suggestions) {
        const targetMeta = this.nodeMetadataMap.get(suggestion.nodeId);
        if (targetMeta) {
          const purpose = targetMeta.ai_hints?.purpose?.toLowerCase() || '';
          const whenToUse = targetMeta.ai_hints?.when_to_use?.toLowerCase() || '';
          const description = targetMeta.description?.toLowerCase() || '';

          // Check for intent matches
          if (purpose.includes(intentLower) ||
              whenToUse.includes(intentLower) ||
              description.includes(intentLower)) {
            suggestion.confidence = Math.min(1, suggestion.confidence + 0.2);
            suggestion.explanation += ` Matches intent: "${intent}".`;
          }

          // Special handling for common intents
          const intentMatches = this.getIntentMatches(intent);
          if (intentMatches.includes(suggestion.nodeId)) {
            suggestion.confidence = Math.min(1, suggestion.confidence + 0.25);
            suggestion.explanation += ` Directly related to "${intent}".`;
          }
        }
      }
    }

    // Sort by confidence and return top suggestions
    suggestions.sort((a, b) => b.confidence - a.confidence);
    return suggestions.slice(0, 10);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if the graph cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.graphCache) return false;

    // Check TTL
    if (Date.now() - this.graphCache.timestamp > CACHE_TTL_MS) {
      return false;
    }

    return true;
  }

  /**
   * Add category-based connections for common patterns
   */
  private addCategoryBasedConnections(
    nodes: Record<string, NodeConnections>,
    allNodes: NodeMetadata[]
  ): void {
    // Define common workflow patterns by category
    const categoryPatterns: Record<string, string[]> = {
      // Data manipulation nodes often chain together
      'data-manipulation': ['filter', 'sort', 'limit', 'summarize', 'editFields', 'validateData'],
      // These nodes commonly produce data for manipulation
      'server': ['database', 'filesystem'],
      'integrations': ['fetchApi', 'listEmails'],
      // Core nodes work everywhere
      'core': ['log', 'logic', 'math', 'transform'],
    };

    // Add connections for data pipeline patterns
    const dataProducers = ['database', 'fetchApi', 'listEmails', 'toateContactele'];
    const dataConsumers = ['filter', 'sort', 'aggregate', 'summarize', 'limit', 'validateData', 'editFields'];

    for (const producer of dataProducers) {
      const producerNode = nodes[producer];
      if (producerNode) {
        for (const edge of Object.keys(producerNode.typicalTargets)) {
          if (edge.includes('error')) continue;
          const targets = producerNode.typicalTargets[edge];
          if (!targets) continue;
          for (const consumer of dataConsumers) {
            if (nodes[consumer] && !targets.includes(consumer)) {
              targets.push(consumer);
            }
          }
        }
      }
    }

    // Add connections for data transformation pipeline
    const transformPipeline = ['filter', 'sort', 'summarize', 'editFields'];
    for (let i = 0; i < transformPipeline.length - 1; i++) {
      const current = transformPipeline[i];
      const next = transformPipeline[i + 1];
      const currentNode = current ? nodes[current] : undefined;
      const nextNode = next ? nodes[next] : undefined;
      if (currentNode && nextNode && current && next) {
        for (const edge of Object.keys(currentNode.typicalTargets)) {
          const targets = currentNode.typicalTargets[edge];
          if (targets && !edge.includes('error') && !targets.includes(next)) {
            targets.push(next);
          }
        }
      }
    }

    // AI nodes can feed into data extraction
    if (nodes['ask-ai']) {
      const aiSuccessors = ['jsonExtract', 'extractText', 'validateData', 'editFields'];
      for (const successor of aiSuccessors) {
        if (nodes[successor] && !nodes['ask-ai'].typicalTargets['success']?.includes(successor)) {
          if (!nodes['ask-ai'].typicalTargets['success']) {
            nodes['ask-ai'].typicalTargets['success'] = [];
          }
          nodes['ask-ai'].typicalTargets['success'].push(successor);
        }
      }
    }
  }

  /**
   * Get category-based successor suggestions
   */
  private getCategoryBasedSuccessors(nodeId: string, edge: string): NodeSuggestion[] {
    const category = NODE_CATEGORIES[nodeId];
    const suggestions: NodeSuggestion[] = [];

    // Add log node as a common successor for debugging
    suggestions.push({
      nodeId: 'log',
      confidence: 0.3,
      config: { message: `{{$.${nodeId}Result}}` },
      explanation: 'Good for debugging workflow state',
    });

    // Category-specific suggestions
    switch (category) {
      case 'data-manipulation':
        if (nodeId !== 'editFields') {
          suggestions.push({
            nodeId: 'editFields',
            confidence: 0.5,
            config: { mode: 'manual_mapping', fieldsToSet: [] },
            explanation: 'Transform or reshape the data output',
          });
        }
        if (nodeId !== 'validateData') {
          suggestions.push({
            nodeId: 'validateData',
            confidence: 0.4,
            config: { validationType: 'required_fields', requiredFields: [] },
            explanation: 'Validate data before further processing',
          });
        }
        break;

      case 'server':
        if (nodeId === 'database') {
          suggestions.push({
            nodeId: 'filter',
            confidence: 0.6,
            config: { conditions: [], matchMode: 'all' },
            explanation: 'Filter database results',
          });
        }
        break;

      case 'ai':
        suggestions.push({
          nodeId: 'jsonExtract',
          confidence: 0.7,
          config: { extractionPath: '', format: 'auto' },
          explanation: 'Extract structured data from AI response',
        });
        break;
    }

    return suggestions;
  }

  /**
   * Get category-based predecessor suggestions
   */
  private getCategoryBasedPredecessors(nodeId: string): PredecessorsResponse['suggestedPredecessors'] {
    const category = NODE_CATEGORIES[nodeId];
    const suggestions: PredecessorsResponse['suggestedPredecessors'] = [];

    // Category-specific suggestions
    switch (category) {
      case 'data-manipulation':
        // Data manipulation nodes often follow data sources
        suggestions.push({
          nodeId: 'database',
          edge: 'found',
          reason: 'Commonly retrieves data for manipulation',
          connectsVia: 'found',
        });
        suggestions.push({
          nodeId: 'fetchApi',
          edge: 'success',
          reason: 'API responses often need data manipulation',
          connectsVia: 'success',
        });
        break;

      case 'ai':
        suggestions.push({
          nodeId: 'editFields',
          edge: 'success',
          reason: 'Prepare data before AI processing',
          connectsVia: 'success',
        });
        break;

      case 'server':
        if (nodeId === 'database') {
          suggestions.push({
            nodeId: 'validateData',
            edge: 'valid',
            reason: 'Validate data before database operations',
            connectsVia: 'valid',
          });
        }
        break;
    }

    return suggestions;
  }

  /**
   * Get error handling node suggestions
   */
  private getErrorHandlingSuggestions(): NodeSuggestion[] {
    return [
      {
        nodeId: 'log',
        confidence: 0.8,
        config: { message: 'Error: {{$.error}}', level: 'error' },
        explanation: 'Log the error for debugging',
      },
      {
        nodeId: 'editFields',
        confidence: 0.5,
        config: {
          mode: 'manual_mapping',
          fieldsToSet: [{ name: 'errorHandled', value: true, type: 'boolean' }],
        },
        explanation: 'Set error handling flags in state',
      },
    ];
  }

  /**
   * Generate default configuration for a node
   */
  private generateDefaultConfig(nodeId: string, availableStateKeys: string[]): Record<string, any> {
    const metadata = this.nodeMetadataMap.get(nodeId);
    if (!metadata) return {};

    // Try to parse example_config if available
    const exampleConfig = metadata.ai_hints?.example_config;
    if (exampleConfig) {
      try {
        // Parse simplified config format
        const config: Record<string, any> = {};
        const getFromState = metadata.ai_hints?.get_from_state || [];

        // For nodes that read items/data from state
        if (getFromState.includes('items') && availableStateKeys.length > 0) {
          config.items = `$.${availableStateKeys[0]}`;
        }

        return config;
      } catch {
        // Fall back to empty config
      }
    }

    return {};
  }

  /**
   * Get node IDs that match a specific intent
   */
  private getIntentMatches(intent: string): string[] {
    const intentLower = intent.toLowerCase();
    const intentMap: Record<string, string[]> = {
      'filter': ['filter'],
      'sort': ['sort'],
      'aggregate': ['aggregate', 'summarize'],
      'summarize': ['summarize', 'aggregate'],
      'validate': ['validateData'],
      'transform': ['transform', 'editFields', 'transformObject'],
      'ai': ['ask-ai'],
      'llm': ['ask-ai'],
      'gpt': ['ask-ai'],
      'claude': ['ask-ai'],
      'database': ['database'],
      'db': ['database'],
      'query': ['database'],
      'api': ['fetchApi'],
      'http': ['fetchApi'],
      'fetch': ['fetchApi'],
      'email': ['sendEmail', 'listEmails'],
      'gmail': ['googleConnect', 'sendEmail', 'listEmails'],
      'extract': ['jsonExtract', 'extractText'],
      'json': ['jsonExtract'],
      'string': ['stringOperations'],
      'text': ['stringOperations', 'extractText'],
      'date': ['dateTime'],
      'time': ['dateTime'],
      'math': ['math', 'mathOperations', 'calculateField'],
      'calculate': ['calculateField', 'mathOperations'],
      'loop': ['logic', 'everyArrayItem'],
      'condition': ['logic', 'switch'],
      'if': ['logic', 'switch'],
      'branch': ['logic', 'switch'],
      'unique': ['removeDuplicates'],
      'dedupe': ['removeDuplicates'],
      'limit': ['limit'],
      'split': ['splitOut'],
      'array': ['arrayUtilities'],
      'object': ['objectUtilities'],
      'file': ['filesystem'],
      'auth': ['auth'],
    };

    return intentMap[intentLower] || [];
  }

  /**
   * Get the full composability graph
   */
  public async getGraph(): Promise<ComposabilityGraphType> {
    return this.buildGraph();
  }
}

// ============================================================================
// SINGLETON ACCESSOR
// ============================================================================

/**
 * Get the ComposabilityGraph singleton instance
 */
export function getComposabilityGraph(): ComposabilityGraph {
  return ComposabilityGraph.getInstance();
}
