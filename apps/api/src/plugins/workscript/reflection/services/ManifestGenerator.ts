/**
 * ManifestGenerator Service
 *
 * Generates AI-optimized manifests for workflow-building agents.
 * This service creates system prompts, quick references, and capabilities maps
 * that help AI models understand and compose workscript workflows.
 *
 * Key features:
 * - Full manifest with complete node documentation
 * - Compact manifest for smaller context windows
 * - Custom manifest generation with filtering options
 * - Token estimation for context management
 * - Caching for performance optimization
 */

import { WorkflowService } from '../../services/WorkflowService';
import {
  NODE_CATEGORIES,
  getNodesByCategory,
  getNodeCountsByCategory,
  getAllNodeIds,
} from './nodeCategories';
import type {
  NodeCategory,
  AIManifest,
  CompactManifest,
  CustomManifestOptions,
  SyntaxReference,
  CategoryCapabilities,
  NodeCapability,
} from '../types/reflection.types';
import type { NodeMetadata } from '@workscript/engine';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

interface CachedManifest<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================================
// MANIFEST GENERATOR SERVICE
// ============================================================================

/**
 * ManifestGenerator - Singleton service for AI manifest generation
 *
 * Creates optimized system prompts and documentation for AI agents
 * to understand and compose workscript workflows.
 */
export class ManifestGenerator {
  private static instance: ManifestGenerator | null = null;

  // Caches for generated manifests
  private fullManifestCache: CachedManifest<AIManifest> | null = null;
  private compactManifestCache: CachedManifest<CompactManifest> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): ManifestGenerator {
    if (ManifestGenerator.instance === null) {
      ManifestGenerator.instance = new ManifestGenerator();
    }
    return ManifestGenerator.instance;
  }

  /**
   * Clear all caches - useful for testing or when nodes change
   */
  public clearCache(): void {
    this.fullManifestCache = null;
    this.compactManifestCache = null;
  }

  // ============================================================================
  // FULL MANIFEST GENERATION
  // ============================================================================

  /**
   * Generate a complete AI manifest with full documentation
   */
  public async generateFullManifest(): Promise<AIManifest> {
    // Check cache first
    if (this.fullManifestCache && this.isCacheValid(this.fullManifestCache)) {
      return this.fullManifestCache.data;
    }

    const workflowService = await WorkflowService.getInstance();
    const allNodes = workflowService.getAvailableNodes();

    // Generate all components
    const systemPrompt = this.generateSystemPrompt(allNodes);
    const quickReference = this.generateQuickReference(allNodes);
    const capabilities = this.generateCapabilities(allNodes);
    const syntaxReference = this.getSyntaxReference();

    // Estimate token count
    const fullContent = systemPrompt + quickReference + JSON.stringify(capabilities);
    const tokenCount = this.estimateTokens(fullContent);

    const manifest: AIManifest = {
      systemPrompt,
      quickReference,
      capabilities,
      syntaxReference,
      tokenCount,
      optimizedFor: 'claude-3',
    };

    // Cache the result
    this.fullManifestCache = {
      data: manifest,
      timestamp: Date.now(),
    };

    return manifest;
  }

  // ============================================================================
  // COMPACT MANIFEST GENERATION
  // ============================================================================

  /**
   * Generate a compact manifest for smaller context windows
   * Target: ~5000 tokens or less
   */
  public async generateCompactManifest(): Promise<CompactManifest> {
    // Check cache first
    if (this.compactManifestCache && this.isCacheValid(this.compactManifestCache)) {
      return this.compactManifestCache.data;
    }

    const workflowService = await WorkflowService.getInstance();
    const allNodes = workflowService.getAvailableNodes();

    // Generate compact components
    const systemPrompt = this.generateCompactSystemPrompt(allNodes);
    const nodeList = this.generateNodeList(allNodes);
    const syntaxReference = this.getSyntaxReference();

    // Estimate token count
    const fullContent = systemPrompt + JSON.stringify(nodeList) + JSON.stringify(syntaxReference);
    const tokenCount = this.estimateTokens(fullContent);

    const manifest: CompactManifest = {
      systemPrompt,
      nodeList,
      syntaxReference,
      tokenCount,
      optimizedFor: 'claude-3',
    };

    // Cache the result
    this.compactManifestCache = {
      data: manifest,
      timestamp: Date.now(),
    };

    return manifest;
  }

  // ============================================================================
  // CUSTOM MANIFEST GENERATION
  // ============================================================================

  /**
   * Generate a custom manifest with filtering options
   */
  public async generateCustomManifest(options: CustomManifestOptions): Promise<AIManifest | CompactManifest> {
    const workflowService = await WorkflowService.getInstance();
    let allNodes = workflowService.getAvailableNodes();

    // Apply use case filtering
    if (options.useCase && options.useCase !== 'full') {
      const priorityCategories = this.getUseCaseCategories(options.useCase);
      allNodes = allNodes.filter(node => {
        const category = NODE_CATEGORIES[node.id];
        return category && priorityCategories.includes(category);
      });
    }

    // Apply category filtering
    if (options.includeCategories && options.includeCategories.length > 0) {
      allNodes = allNodes.filter(node => {
        const category = NODE_CATEGORIES[node.id];
        return category && options.includeCategories!.includes(category);
      });
    }

    // Apply node exclusion
    if (options.excludeNodes && options.excludeNodes.length > 0) {
      allNodes = allNodes.filter(node => !options.excludeNodes!.includes(node.id));
    }

    // Generate manifest based on format
    const format = options.format || 'json';

    if (format === 'markdown') {
      return this.generateMarkdownManifest(allNodes, options.maxTokens);
    }

    // For json and structured formats
    const systemPrompt = this.generateSystemPrompt(allNodes);
    const quickReference = this.generateQuickReference(allNodes);
    const capabilities = this.generateCapabilities(allNodes);
    const syntaxReference = this.getSyntaxReference();

    let fullContent = systemPrompt + quickReference + JSON.stringify(capabilities);
    let tokenCount = this.estimateTokens(fullContent);

    // Truncate if maxTokens is specified
    if (options.maxTokens && tokenCount > options.maxTokens) {
      // Try compact format first
      const compactPrompt = this.generateCompactSystemPrompt(allNodes);
      const nodeList = this.generateNodeList(allNodes);

      fullContent = compactPrompt + JSON.stringify(nodeList);
      tokenCount = this.estimateTokens(fullContent);

      if (tokenCount > options.maxTokens) {
        // Further truncate by limiting nodes
        const maxNodes = Math.floor(allNodes.length * (options.maxTokens / tokenCount));
        const truncatedNodes = allNodes.slice(0, maxNodes);

        return {
          systemPrompt: this.generateCompactSystemPrompt(truncatedNodes),
          nodeList: this.generateNodeList(truncatedNodes),
          syntaxReference,
          tokenCount: options.maxTokens,
          optimizedFor: 'claude-3',
        };
      }

      return {
        systemPrompt: compactPrompt,
        nodeList,
        syntaxReference,
        tokenCount,
        optimizedFor: 'claude-3',
      };
    }

    return {
      systemPrompt,
      quickReference,
      capabilities,
      syntaxReference,
      tokenCount,
      optimizedFor: 'claude-3',
    };
  }

  // ============================================================================
  // SYSTEM PROMPT GENERATION
  // ============================================================================

  /**
   * Generate a full system prompt for AI agents
   */
  private generateSystemPrompt(nodes: NodeMetadata[]): string {
    const nodeCount = nodes.length;
    const categoryCounts = this.getNodeCountsByNodes(nodes);

    return `# Workscript Workflow Orchestration Expert

You are an expert at creating and understanding Workscript workflows - a server-side agentic workflow orchestration system.

## System Overview

Workscript is a JSON-based workflow definition system with ${nodeCount} available nodes across ${Object.keys(categoryCounts).length} categories:
${Object.entries(categoryCounts).map(([cat, count]) => `- **${cat}**: ${count} nodes`).join('\n')}

## Core Concepts

### Workflow Structure
Every workflow is a JSON object with these required fields:
\`\`\`json
{
  "id": "unique-workflow-id",
  "name": "Human-Readable Name",
  "version": "1.0.0",
  "initialState": { "key": "value" },
  "workflow": [ /* array of node configurations */ ]
}
\`\`\`

### State Management
Workflows maintain state that flows between nodes:

1. **Full References** (type-preserving): \`$.key\` or \`$.nested.path\`
   - Returns the actual value (number, object, array, etc.)
   - Use when passing values to node configurations

2. **Template Interpolation** (string building): \`{{$.key}}\`
   - Embeds values as strings in larger strings
   - Example: \`"Hello {{$.name}}"\` → \`"Hello Alice"\`

3. **State Setters**: \`{ "$.path": value }\`
   - Sets state.path to the specified value
   - Can use in workflow array to update state between nodes

### Edge Syntax
Nodes return edges that determine the next execution path:

- \`{ ... }\` → Execute inline node configuration
- \`[ ... ]\` → Execute array of inline nodes sequentially
- \`null\` → End execution or exit loop

### Loop Syntax
Use \`...\` suffix to create looping nodes:
\`\`\`json
{
  "logic...": {
    "operation": "less",
    "values": ["$.counter", 10],
    "true?": [ /* continue loop */ ],
    "false?": null  /* exit loop */
  }
}
\`\`\`

## Available Node Categories

${this.generateCategoryDescriptions(nodes)}

## Best Practices

1. **Handle All Edges**: Always handle both success and error/empty edges
2. **Use Meaningful State Keys**: Name state keys descriptively (e.g., \`activeUsers\` not \`data\`)
3. **Validate Data Early**: Use \`validateData\` node before processing external data
4. **Avoid Deep Nesting**: Prefer sequential nodes over deeply nested edge configurations
5. **Use Logging**: Add \`log\` nodes during development to debug state flow

## Quick Node Reference

${this.generateQuickNodeList(nodes)}
`;
  }

  /**
   * Generate a compact system prompt for smaller context windows
   */
  private generateCompactSystemPrompt(nodes: NodeMetadata[]): string {
    const nodeCount = nodes.length;

    return `# Workscript Workflow Expert

JSON workflow system with ${nodeCount} nodes. Create workflows with:

\`\`\`json
{
  "id": "id", "name": "Name", "version": "1.0.0",
  "initialState": {},
  "workflow": [{ "nodeType": { "config": "value", "success?": { "nextNode": {} } } }]
}
\`\`\`

**State Syntax:**
- \`$.key\` - Get value (type-preserving)
- \`{{$.key}}\` - String interpolation
- \`{ "$.key": val }\` - Set state

**Edges:** \`{ }\` = inline node, \`[ ]\` = sequence, \`null\` = end

**Loop:** Add \`...\` suffix: \`"logic...": { "true?": [...], "false?": null }\`
`;
  }

  // ============================================================================
  // QUICK REFERENCE GENERATION
  // ============================================================================

  /**
   * Generate a markdown quick reference card
   */
  private generateQuickReference(nodes: NodeMetadata[]): string {
    const sections: string[] = [];

    // Header
    sections.push('# Workscript Quick Reference\n');

    // Syntax section
    sections.push('## Syntax Reference\n');
    sections.push('| Pattern | Usage | Example |');
    sections.push('|---------|-------|---------|');
    sections.push('| `$.key` | Get state value | `"items": "$.users"` |');
    sections.push('| `{{$.key}}` | String interpolation | `"Hello {{$.name}}"` |');
    sections.push('| `{ "$.key": val }` | Set state | `{ "$.count": 0 }` |');
    sections.push('| `success?`, `error?` | Edge handlers | Node-specific |');
    sections.push('| `nodeType...` | Loop node | `"logic...": {}` |');
    sections.push('');

    // Nodes by category
    sections.push('## Nodes by Category\n');

    const categories: NodeCategory[] = ['core', 'ai', 'orchestration', 'data-manipulation', 'server', 'integrations'];

    for (const category of categories) {
      const categoryNodes = nodes.filter(n => NODE_CATEGORIES[n.id] === category);
      if (categoryNodes.length === 0) continue;

      sections.push(`### ${this.formatCategoryName(category)}\n`);
      sections.push('| Node | Description | Key Edges |');
      sections.push('|------|-------------|-----------|');

      for (const node of categoryNodes) {
        const edges = node.ai_hints?.expected_edges?.join(', ') || 'success, error';
        const desc = node.description?.substring(0, 60) || node.ai_hints?.purpose?.substring(0, 60) || '';
        sections.push(`| \`${node.id}\` | ${desc} | ${edges} |`);
      }
      sections.push('');
    }

    // Common patterns section
    sections.push('## Common Patterns\n');
    sections.push('### Data Pipeline');
    sections.push('```json');
    sections.push('{ "database": { "operation": "find", "table": "users", "found?": { "filter": { "passed?": { "sort": {} } } } } }');
    sections.push('```\n');

    sections.push('### Conditional');
    sections.push('```json');
    sections.push('{ "logic": { "operation": "equal", "values": ["$.type", "admin"], "true?": { ... }, "false?": { ... } } }');
    sections.push('```\n');

    sections.push('### Loop');
    sections.push('```json');
    sections.push('{ "logic...": { "operation": "less", "values": ["$.i", 10], "true?": [{ "$.i": "$.i + 1" }], "false?": null } }');
    sections.push('```\n');

    return sections.join('\n');
  }

  // ============================================================================
  // CAPABILITIES GENERATION
  // ============================================================================

  /**
   * Generate capabilities map organized by category
   */
  private generateCapabilities(nodes: NodeMetadata[]): Record<NodeCategory, CategoryCapabilities> {
    const capabilities: Record<NodeCategory, CategoryCapabilities> = {
      'core': { description: '', nodes: [] },
      'ai': { description: '', nodes: [] },
      'orchestration': { description: '', nodes: [] },
      'data-manipulation': { description: '', nodes: [] },
      'server': { description: '', nodes: [] },
      'integrations': { description: '', nodes: [] },
    };

    // Set category descriptions
    capabilities['core'].description = 'Basic operations: math, logic, transforms, and logging';
    capabilities['ai'].description = 'AI/LLM integration for intelligent processing';
    capabilities['orchestration'].description = 'Workflow control and sub-workflow execution';
    capabilities['data-manipulation'].description = 'Data transformation, filtering, sorting, and validation';
    capabilities['server'].description = 'Server-side operations: filesystem, database, authentication';
    capabilities['integrations'].description = 'External service integrations and API calls';

    // Group nodes by category
    for (const node of nodes) {
      const category = NODE_CATEGORIES[node.id] || 'data-manipulation';
      const capability: NodeCapability = {
        id: node.id,
        description: node.description || node.ai_hints?.purpose || `${node.name} operations`,
        commonPatterns: this.getCommonPatterns(node),
      };
      capabilities[category].nodes.push(capability);
    }

    return capabilities;
  }

  // ============================================================================
  // SYNTAX REFERENCE
  // ============================================================================

  /**
   * Get the standard syntax reference
   */
  private getSyntaxReference(): SyntaxReference {
    return {
      stateAccess: {
        fullReference: '$.key or $.nested.path - Returns actual value (number, object, array)',
        templateInterpolation: '{{$.key}} - Embeds value as string in larger string',
        examples: [
          '$.users - Get users array from state',
          '$.user.email - Get nested email property',
          '"Hello {{$.name}}" - Build string with embedded value',
          '"{{$.firstName}} {{$.lastName}}" - Multiple interpolations',
        ],
      },
      edgeSyntax: {
        description: 'Edges determine the next node to execute based on the current node\'s result',
        examples: [
          '{ "nextNode": { "config": "value" } } - Execute inline node',
          '[ { "node1": {} }, { "node2": {} } ] - Execute sequence',
          'null - End execution or exit loop',
        ],
      },
      loopSyntax: {
        description: 'Add "..." suffix to node type for looping behavior',
        example: '{ "logic...": { "operation": "less", "values": ["$.i", 10], "true?": [ ... ], "false?": null } }',
      },
      stateSetter: {
        description: 'Set state values inline in workflow array',
        example: '{ "$.counter": 0 }, { "$.name": "{{$.firstName}} {{$.lastName}}" }',
      },
    };
  }

  // ============================================================================
  // TOKEN ESTIMATION
  // ============================================================================

  /**
   * Estimate token count for a string
   * Uses approximate calculation: characters / 4
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if a cached value is still valid
   */
  private isCacheValid<T>(cache: CachedManifest<T>): boolean {
    return (Date.now() - cache.timestamp) < CACHE_TTL_MS;
  }

  /**
   * Get priority categories for a use case
   */
  private getUseCaseCategories(useCase: 'data-pipeline' | 'ai-workflow' | 'integration'): NodeCategory[] {
    switch (useCase) {
      case 'data-pipeline':
        return ['data-manipulation', 'core', 'server'];
      case 'ai-workflow':
        return ['ai', 'orchestration', 'data-manipulation', 'core'];
      case 'integration':
        return ['integrations', 'server', 'data-manipulation'];
      default:
        return ['core', 'ai', 'orchestration', 'data-manipulation', 'server', 'integrations'];
    }
  }

  /**
   * Get node counts grouped by category for given nodes
   */
  private getNodeCountsByNodes(nodes: NodeMetadata[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const node of nodes) {
      const category = NODE_CATEGORIES[node.id] || 'other';
      counts[category] = (counts[category] || 0) + 1;
    }
    return counts;
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: NodeCategory): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Generate category descriptions for system prompt
   */
  private generateCategoryDescriptions(nodes: NodeMetadata[]): string {
    const categories: Array<{ name: NodeCategory; description: string }> = [
      { name: 'core', description: 'Basic building blocks: math operations, logic branching, data transforms, logging' },
      { name: 'ai', description: 'AI/LLM integration for intelligent text processing, analysis, and generation' },
      { name: 'orchestration', description: 'Workflow control: sub-workflow execution, branching, error handling' },
      { name: 'data-manipulation', description: 'Data processing: filter, sort, aggregate, transform, validate, extract' },
      { name: 'server', description: 'Server operations: file system access, database queries, authentication' },
      { name: 'integrations', description: 'External services: API calls, email, third-party integrations' },
    ];

    return categories.map(cat => {
      const categoryNodes = nodes.filter(n => NODE_CATEGORIES[n.id] === cat.name);
      const nodeIds = categoryNodes.map(n => `\`${n.id}\``).join(', ');
      return `### ${this.formatCategoryName(cat.name)}\n${cat.description}\n\nAvailable nodes: ${nodeIds || 'None'}`;
    }).join('\n\n');
  }

  /**
   * Generate a quick node list for system prompt
   */
  private generateQuickNodeList(nodes: NodeMetadata[]): string {
    return nodes.map(node => {
      const edges = node.ai_hints?.expected_edges?.join(', ') || 'success, error';
      const purpose = node.ai_hints?.purpose || node.description || 'No description';
      return `- **${node.id}**: ${purpose} (edges: ${edges})`;
    }).join('\n');
  }

  /**
   * Generate node list for compact manifest
   */
  private generateNodeList(nodes: NodeMetadata[]): Array<{ id: string; description: string }> {
    return nodes.map(node => ({
      id: node.id,
      description: (node.ai_hints?.purpose || node.description || node.name).substring(0, 100),
    }));
  }

  /**
   * Get common patterns for a node
   */
  private getCommonPatterns(node: NodeMetadata): string[] {
    const patterns: string[] = [];
    const nodeId = node.id;

    // Add node-specific patterns
    switch (nodeId) {
      case 'filter':
        patterns.push('Filter data before processing');
        patterns.push('Split data into passed/filtered groups');
        break;
      case 'sort':
        patterns.push('Sort results before display');
        patterns.push('Order by multiple fields');
        break;
      case 'database':
        patterns.push('CRUD operations on database tables');
        patterns.push('Query with conditions');
        break;
      case 'ask-ai':
        patterns.push('Text analysis and generation');
        patterns.push('Data extraction from unstructured text');
        break;
      case 'logic':
        patterns.push('Conditional branching');
        patterns.push('Loop control with ... suffix');
        break;
      case 'editFields':
        patterns.push('Set or modify state values');
        patterns.push('Transform data structure');
        break;
      default:
        if (node.ai_hints?.when_to_use) {
          patterns.push(node.ai_hints.when_to_use);
        }
    }

    return patterns;
  }

  /**
   * Generate markdown-formatted manifest
   */
  private generateMarkdownManifest(nodes: NodeMetadata[], maxTokens?: number): AIManifest {
    const quickReference = this.generateQuickReference(nodes);
    const syntaxReference = this.getSyntaxReference();

    // For markdown format, put everything in quickReference
    const systemPrompt = '# Workscript Reference\n\nSee Quick Reference below for complete documentation.';
    const capabilities = this.generateCapabilities(nodes);

    let tokenCount = this.estimateTokens(quickReference + systemPrompt);

    // Truncate if needed
    let finalQuickRef = quickReference;
    if (maxTokens && tokenCount > maxTokens) {
      const ratio = maxTokens / tokenCount;
      const maxLength = Math.floor(quickReference.length * ratio);
      finalQuickRef = quickReference.substring(0, maxLength) + '\n\n...(truncated)';
      tokenCount = maxTokens;
    }

    return {
      systemPrompt,
      quickReference: finalQuickRef,
      capabilities,
      syntaxReference,
      tokenCount,
      optimizedFor: 'claude-3',
    };
  }
}

// ============================================================================
// SINGLETON ACCESSOR
// ============================================================================

/**
 * Get the ManifestGenerator singleton instance
 */
export function getManifestGenerator(): ManifestGenerator {
  return ManifestGenerator.getInstance();
}
