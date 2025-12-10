# Requirements Document: Workscript Reflection API

## Introduction

The Workscript Reflection API introduces a "consciousness layer" to the workscript agentic workflow orchestration system. This meta-feature enables AI agents to introspect, understand, and dynamically compose workflows by providing comprehensive APIs for node introspection, source code extraction, AI manifest generation, workflow analysis, composability discovery, and pattern recognition.

The Reflection API transforms workscript from a workflow execution engine into a self-aware system where nodes can explain themselves, AI agents can understand node capabilities and compose workflows intelligently, and the system can analyze and optimize existing workflows. This feature leverages the rich `ai_hints` metadata already present in nodes and extends it with deep introspection capabilities.

The API will be implemented as a new route module within the workscript plugin, following the existing Hono-based architecture. All routes will be mounted under `/workscript/reflection/` and will integrate with the existing NodeRegistry, WorkflowService, and node metadata systems. The implementation follows a mostly-public authentication model to enable easy consumption by AI agents while protecting user-specific workflow data.

---

## Requirements

### Requirement 1: Reflection Route Infrastructure

**User Story:** As a developer, I want a well-organized route structure for reflection endpoints, so that the reflection API is maintainable and follows existing patterns.

#### Acceptance Criteria

1. WHEN the API server starts THEN reflection routes must be mounted at `/workscript/reflection/`
2. WHEN creating reflection routes THEN they must follow the Hono router pattern used by other workscript routes
3. WHEN organizing routes THEN they must be split into separate files: nodes.ts, source.ts, manifest.ts, analysis.ts, composability.ts, patterns.ts
4. WHEN mounting reflection routes THEN the main index.ts must import and combine all sub-routers
5. WHEN the plugin.ts is updated THEN it must import reflectionRoutes and mount with `router.route('/reflection', reflectionRoutes)`
6. WHEN creating the reflection module THEN it must include a types/ directory with reflection.types.ts
7. WHEN creating the reflection module THEN it must include a services/ directory for business logic
8. IF the reflection routes fail to load THEN the plugin must still function with other routes operational
9. WHEN defining routes THEN they must return consistent JSON response formats matching existing API patterns
10. WHEN errors occur THEN they must return appropriate HTTP status codes (400, 404, 500) with error messages

---

### Requirement 2: Deep Node Introspection - List All Nodes

**User Story:** As an AI agent, I want to list all available nodes with deep introspection data, so that I can understand the full capabilities of the workflow system.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/nodes` THEN it must return all registered nodes with extended metadata
2. WHEN returning nodes THEN each must include standard metadata: id, name, version, description, inputs, outputs
3. WHEN returning nodes THEN each must include ai_hints: purpose, when_to_use, expected_edges, example_usage, example_config, get_from_state, post_to_state
4. WHEN returning nodes THEN each must include introspection data: category, complexity, inputSchema, edgeConditions, stateInteractions
5. WHEN returning nodes THEN each must include source information: sourceFile path, hasExampleFile, hasTestFile flags
6. WHEN returning the response THEN it must include metadata: totalNodes count and byCategory breakdown
7. IF a query parameter `category` is provided THEN only nodes in that category must be returned
8. IF a query parameter `search` is provided THEN nodes must be filtered by name or description matching
9. WHEN categorizing nodes THEN they must be assigned to: core, ai, orchestration, data-manipulation, server, integrations
10. WHEN determining complexity THEN nodes must be rated as: simple (< 100 lines), medium (100-300 lines), complex (> 300 lines)
11. WHEN building inputSchema THEN it must include type, required flag, description for each input parameter
12. WHEN building edgeConditions THEN it must explain what triggers each edge and what data is returned

---

### Requirement 3: Deep Node Introspection - Single Node

**User Story:** As an AI agent, I want to retrieve deep introspection data for a specific node, so that I can understand exactly how to use it.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/nodes/:nodeId` THEN it must return complete introspection for that node
2. IF the nodeId does not exist THEN it must return 404 with error message "Node not found: {nodeId}"
3. WHEN returning single node data THEN it must include all fields from the list endpoint plus additional detail
4. WHEN returning inputSchema THEN it must include nested schemas for complex parameters (e.g., conditions array items)
5. WHEN returning stateInteractions THEN it must include writeSchema showing the structure of values written to state
6. WHEN the node has operation modes (filter, switch, etc.) THEN it must include operations listing all available operations
7. WHEN returning composability info THEN it must include typicalPredecessors, typicalSuccessors, and antiPatterns
8. WHEN returning source info THEN it must resolve the actual file path in packages/nodes/src/
9. IF the node has an example JSON file THEN hasExampleFile must be true
10. IF the node has a test file THEN hasTestFile must be true

---

### Requirement 4: Node Operations Discovery

**User Story:** As an AI agent, I want to discover all operations available for a specific node, so that I can correctly configure operation-based nodes.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/nodes/:nodeId/operations` THEN it must return all operations grouped by data type
2. IF the node does not have operations THEN it must return an empty operations object
3. WHEN returning operations THEN each must include: operation name, description, example configuration
4. WHEN the node is FilterNode THEN it must return operations grouped by: string, number, boolean, date, array, object
5. WHEN the node is SwitchNode THEN it must return all comparison operations available
6. WHEN the node is StringOperationsNode THEN it must return all string manipulation operations
7. IF the nodeId does not exist THEN it must return 404 with appropriate error
8. WHEN returning operation examples THEN they must be valid JSON configuration snippets

---

### Requirement 5: Node Usage Examples

**User Story:** As an AI agent, I want to retrieve usage examples for a node, so that I can learn correct configuration patterns.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/nodes/:nodeId/examples` THEN it must return example configurations and workflows
2. IF the node has an example.json file THEN it must parse and return the full example workflow
3. WHEN generating examples THEN they must include: name, description, config, initialState, expectedOutput
4. WHEN the example.json exists THEN it must be returned under `exampleWorkflow` field
5. IF no example.json exists THEN examples must be generated from ai_hints.example_usage
6. WHEN generating examples THEN they must cover common use cases for that node type
7. IF the nodeId does not exist THEN it must return 404 with appropriate error
8. WHEN returning examples THEN they must be valid workflow JSON that can be executed

---

### Requirement 6: Source Code Extraction - Structured

**User Story:** As an AI agent, I want to read node source code with parsed structure, so that I can understand implementation details.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/source/:nodeId` THEN it must return full source code with parsed structure
2. WHEN returning source THEN it must include: language (typescript), content (full source), path (file location)
3. WHEN returning structure THEN it must include: className, extendsClass, methods array, interfaces array
4. WHEN parsing methods THEN each must include: name, signature, description, parameters, returnType, visibility
5. WHEN parsing interfaces THEN each must include: name, properties object
6. WHEN returning highlights THEN it must include key implementation snippets with names and descriptions
7. WHEN returning relatedFiles THEN it must list test files (.test.ts) and example files (.example.json)
8. IF the nodeId does not exist THEN it must return 404 with error "Node not found"
9. IF the source file cannot be read THEN it must return 500 with error "Failed to read source file"
10. WHEN extracting source THEN it must ONLY access files within packages/nodes/src/ directory
11. WHEN resolving file paths THEN it must handle both root-level nodes and data/ subdirectory nodes

---

### Requirement 7: Source Code Extraction - Raw

**User Story:** As an AI agent, I want to read raw node source code as plain text, so that I can process it directly.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/source/:nodeId/raw` THEN it must return raw TypeScript source
2. WHEN returning raw source THEN Content-Type must be "text/plain"
3. WHEN returning raw source THEN it must be the complete file contents without modification
4. IF the nodeId does not exist THEN it must return 404 with plain text error message
5. IF the source file cannot be read THEN it must return 500 with error message
6. WHEN extracting source THEN it must ONLY access files within packages/nodes/src/ directory

---

### Requirement 8: AI Manifest Generation - Full

**User Story:** As an AI developer, I want to generate a complete AI manifest, so that I can use it as a system prompt for workflow-building agents.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/manifest` THEN it must return a comprehensive AI manifest
2. WHEN returning manifest THEN it must include systemPrompt: a ready-to-use prompt for AI agents
3. WHEN returning manifest THEN it must include quickReference: a markdown quick reference card
4. WHEN returning manifest THEN it must include capabilities: organized by nodeCategories with descriptions
5. WHEN returning manifest THEN it must include syntaxReference: explaining $.key, {{$.key}}, edge syntax, loop syntax
6. WHEN returning manifest THEN it must include tokenCount: estimated token count for the manifest
7. WHEN returning manifest THEN it must include optimizedFor: target AI model (default: "claude-3")
8. WHEN generating systemPrompt THEN it must include node count, category summary, and syntax reference
9. WHEN generating quickReference THEN it must be formatted as markdown with node listings and examples
10. WHEN generating capabilities THEN nodes must be grouped by category with descriptions and common patterns

---

### Requirement 9: AI Manifest Generation - Compact

**User Story:** As an AI developer, I want a compact manifest for smaller context windows, so that I can use it with models that have limited context.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/manifest/compact` THEN it must return a compressed manifest
2. WHEN generating compact manifest THEN systemPrompt must be shorter and focus on essentials
3. WHEN generating compact manifest THEN it must include nodeList: just IDs and one-liner descriptions
4. WHEN generating compact manifest THEN tokenCount should be approximately 5000 tokens or less
5. WHEN compressing THEN it must prioritize most commonly used nodes
6. WHEN compressing THEN it must abbreviate descriptions while preserving meaning
7. WHEN generating compact manifest THEN it must still include syntax reference

---

### Requirement 10: AI Manifest Generation - Custom

**User Story:** As an AI developer, I want to generate custom manifests for specific use cases, so that I can optimize context for different scenarios.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/manifest/custom` THEN it must generate a filtered manifest
2. WHEN receiving request body THEN it must accept: useCase, includeCategories, excludeNodes, maxTokens, format
3. IF useCase is "data-pipeline" THEN it must prioritize data manipulation nodes
4. IF useCase is "ai-workflow" THEN it must prioritize AI and orchestration nodes
5. IF useCase is "integration" THEN it must prioritize server and integration nodes
6. IF useCase is "full" THEN it must include all nodes without filtering
7. WHEN includeCategories is specified THEN only nodes in those categories must be included
8. WHEN excludeNodes is specified THEN those specific nodes must be excluded
9. WHEN maxTokens is specified THEN the manifest must be truncated to fit within that limit
10. WHEN format is "markdown" THEN it must return markdown formatted content
11. WHEN format is "json" THEN it must return structured JSON
12. WHEN format is "structured" THEN it must return detailed structured data

---

### Requirement 11: Workflow Analysis - Explain

**User Story:** As a workflow developer, I want to get a human-readable explanation of a workflow, so that I can understand what it does.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/analysis/explain` THEN it must return a detailed workflow explanation
2. WHEN receiving request body THEN it must accept a complete workflow definition JSON
3. WHEN explaining THEN it must include summary: 1-2 sentence description of what the workflow does
4. WHEN explaining THEN it must include steps: array of step explanations with nodeType, purpose, inputs, outputs, nextSteps
5. WHEN explaining THEN it must include stateFlow: showing initial, intermediate, and final state keys
6. WHEN explaining THEN it must include dataTransformations: showing how data changes through the workflow
7. WHEN explaining THEN it must include complexity: nodeCount, maxDepth, branchCount, loopCount
8. IF workflow JSON is invalid THEN it must return 400 with validation errors
9. WHEN tracing execution paths THEN it must follow conditional edges and loop patterns
10. WHEN describing steps THEN it must use human-readable language based on ai_hints.purpose

---

### Requirement 12: Workflow Analysis - Deep Validation

**User Story:** As a workflow developer, I want semantic validation beyond schema checks, so that I can catch logical errors before execution.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/analysis/validate-deep` THEN it must perform semantic validation
2. WHEN validating THEN it must return: valid boolean, schemaErrors array, semanticIssues array
3. WHEN validating THEN it must include stateConsistency: usedBeforeDefined, unusedWrites, potentialUndefined
4. WHEN detecting state issues THEN it must identify state keys used before any node writes to them
5. WHEN detecting state issues THEN it must identify state keys written but never read
6. WHEN detecting state issues THEN it must identify potentially undefined nested paths like $.user.email
7. WHEN detecting semantic issues THEN it must identify unreachable code paths
8. WHEN detecting semantic issues THEN it must identify filter conditions that may always return empty
9. WHEN detecting semantic issues THEN it must identify missing error edge handlers
10. WHEN returning issues THEN each must include: type (warning/error), path, message, suggestion
11. IF workflow has no issues THEN valid must be true and arrays must be empty

---

### Requirement 13: Workflow Analysis - Optimize

**User Story:** As a workflow developer, I want optimization suggestions for my workflow, so that I can improve performance and maintainability.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/analysis/optimize` THEN it must return optimization suggestions
2. WHEN analyzing THEN it must detect sequential filters that could be combined
3. WHEN analyzing THEN it must detect missing error handling for risky operations
4. WHEN analyzing THEN it must detect redundant state writes
5. WHEN analyzing THEN it must detect opportunities for parallel processing
6. WHEN returning suggestions THEN each must include: type, location, current, suggested, impact
7. WHEN describing impact THEN it must explain the benefit (e.g., "Reduces iterations by ~50%")
8. IF no optimizations are found THEN it must return an empty suggestions array
9. WHEN detecting patterns THEN it must identify anti-patterns from the composability graph

---

### Requirement 14: Workflow Analysis - By ID

**User Story:** As a workflow developer, I want to analyze a stored workflow by its ID, so that I can understand workflows in my database.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/analysis/:workflowId` THEN it must analyze the stored workflow
2. WHEN retrieving workflow THEN it must query the workflows database table
3. IF workflow does not exist THEN it must return 404 with error "Workflow not found"
4. WHEN analyzing THEN it must return the same format as the explain endpoint
5. WHEN accessing this endpoint THEN authentication must be required (JWT token)
6. WHEN authenticated THEN it must verify the user has access to the workflow
7. IF user lacks permission THEN it must return 403 Forbidden

---

### Requirement 15: Composability Graph - Full

**User Story:** As an AI agent, I want to understand the full node compatibility matrix, so that I can compose valid workflows.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/composability/graph` THEN it must return the complete composability matrix
2. WHEN returning graph THEN it must include nodes: object with each node's input/output connections
3. WHEN returning graph THEN it must include stateKeyMap: showing which nodes write and read each state key
4. WHEN building node connections THEN typicalSources must list nodes/edges that typically precede
5. WHEN building node connections THEN typicalTargets must list nodes that typically follow each edge
6. WHEN building stateKeyMap THEN writtenBy must list node:edge combinations that write to the key
7. WHEN building stateKeyMap THEN readBy must list nodes that read from the key
8. WHEN generating graph THEN it must derive connections from ai_hints.post_to_state and get_from_state
9. WHEN generating graph THEN it must include provides: showing what state keys each edge creates

---

### Requirement 16: Composability Discovery - From Node

**User Story:** As an AI agent, I want to know what can follow a specific node, so that I can build valid node sequences.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/composability/from/:nodeId` THEN it must return possible successors
2. WHEN returning data THEN it must include edges: object with each edge's successor information
3. WHEN returning edge data THEN it must include provides: state keys this edge makes available
4. WHEN returning edge data THEN it must include suggestedNext: array of recommended follow-up nodes
5. WHEN suggesting next nodes THEN each must include: node ID, reason, commonConfig example
6. IF the nodeId does not exist THEN it must return 404 with appropriate error
7. WHEN generating suggestions THEN they must be based on state key compatibility

---

### Requirement 17: Composability Discovery - To Node

**User Story:** As an AI agent, I want to know what can precede a specific node, so that I can understand node requirements.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/composability/to/:nodeId` THEN it must return possible predecessors
2. WHEN returning data THEN it must include requires: description of what input this node needs
3. WHEN returning data THEN it must include suggestedPredecessors: array of nodes that can precede
4. WHEN suggesting predecessors THEN each must include: node ID, edge, reason, connectsVia
5. WHEN determining predecessors THEN it must analyze what state keys the node reads
6. IF the nodeId does not exist THEN it must return 404 with appropriate error

---

### Requirement 18: Composability Suggestion

**User Story:** As an AI agent, I want intelligent suggestions for the next node based on current context, so that I can build workflows step by step.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/composability/suggest` THEN it must return contextual suggestions
2. WHEN receiving request THEN it must accept: currentNode, currentEdge, currentState, intent
3. WHEN returning suggestions THEN each must include: node ID, confidence score, config, explanation
4. WHEN generating suggestions THEN confidence must be calculated based on state compatibility and intent match
5. IF intent is provided THEN it must influence node selection (e.g., "aggregate" suggests summarize node)
6. WHEN returning config THEN it must be a reasonable default configuration for the suggested node
7. WHEN returning explanation THEN it must describe why this node is suggested

---

### Requirement 19: Pattern Library - List

**User Story:** As a workflow developer, I want to browse available workflow patterns, so that I can learn common approaches.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/patterns` THEN it must return all recognized workflow patterns
2. WHEN returning patterns THEN each must include: id, name, description, category, complexity
3. WHEN returning patterns THEN each must include structure: stages, nodeSequence, typicalEdgeFlow
4. WHEN returning patterns THEN each must include template: a complete workflow definition
5. WHEN returning patterns THEN each must include variations: alternative approaches
6. WHEN providing patterns THEN it must include: etl-pipeline, conditional-branching, loop-with-counter, ai-processing-pipeline, error-handling, parallel-processing
7. IF a query parameter `category` is provided THEN only patterns in that category must be returned

---

### Requirement 20: Pattern Library - Single Pattern

**User Story:** As a workflow developer, I want detailed information about a specific pattern, so that I can implement it correctly.

#### Acceptance Criteria

1. WHEN calling GET `/reflection/patterns/:patternId` THEN it must return the complete pattern details
2. WHEN returning pattern THEN it must include all fields from the list endpoint plus full template
3. IF the patternId does not exist THEN it must return 404 with error "Pattern not found"
4. WHEN returning template THEN it must be a complete, executable workflow definition
5. WHEN returning variations THEN each must explain what it adds or changes

---

### Requirement 21: Pattern Detection

**User Story:** As a workflow developer, I want to detect patterns in my workflow, so that I can understand its architecture.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/patterns/detect` THEN it must analyze the workflow for known patterns
2. WHEN detecting patterns THEN it must return detectedPatterns: array with pattern ID, confidence, matchedNodes
3. WHEN detecting patterns THEN it must return suggestions: patterns that could be added
4. WHEN calculating confidence THEN it must be based on how closely the workflow matches the pattern structure
5. IF no patterns are detected THEN detectedPatterns must be an empty array
6. IF workflow JSON is invalid THEN it must return 400 with validation errors

---

### Requirement 22: Pattern-Based Generation

**User Story:** As an AI agent, I want to generate workflows from patterns and parameters, so that I can quickly create standard workflows.

#### Acceptance Criteria

1. WHEN calling POST `/reflection/patterns/generate` THEN it must create a workflow from a pattern
2. WHEN receiving request THEN it must accept: patternId, parameters object
3. WHEN generating workflow THEN it must substitute pattern variables with provided parameters
4. WHEN generating workflow THEN it must return: workflow (complete JSON), explanation (what was generated)
5. IF the patternId does not exist THEN it must return 404 with error "Pattern not found"
6. IF required parameters are missing THEN it must return 400 with error listing missing parameters
7. WHEN generating ETL pattern THEN parameters must include: sourceTable, targetTable, filterConditions, transformations

---

### Requirement 23: Type Definitions

**User Story:** As a developer, I want comprehensive TypeScript type definitions, so that I can work with the reflection API safely.

#### Acceptance Criteria

1. WHEN defining types THEN ReflectionNodeInfo must include all standard and introspection fields
2. WHEN defining types THEN InputSchemaEntry must include: type, required, description, itemSchema (for arrays)
3. WHEN defining types THEN EdgeConditionInfo must include: condition description, dataReturned schema
4. WHEN defining types THEN StateInteractionInfo must include: reads array, writes array, writeSchema object
5. WHEN defining types THEN AIManifest must include: systemPrompt, quickReference, capabilities, tokenCount, optimizedFor
6. WHEN defining types THEN WorkflowAnalysis must include: summary, steps, stateFlow, dataTransformations, potentialIssues, complexity
7. WHEN defining types THEN Pattern must include: id, name, description, category, structure, template, variations
8. WHEN defining types THEN all interfaces must be exported from reflection.types.ts

---

### Requirement 24: Service Layer - Source Extractor

**User Story:** As a developer, I want a SourceExtractor service to handle node source code retrieval, so that source extraction logic is encapsulated.

#### Acceptance Criteria

1. WHEN implementing SourceExtractor THEN it must be a singleton class
2. WHEN resolving node paths THEN it must map node IDs to file paths in packages/nodes/src/
3. WHEN extracting source THEN it must read the TypeScript file contents
4. WHEN parsing structure THEN it must extract class name, methods, and interfaces
5. WHEN finding related files THEN it must check for .test.ts and .example.json files
6. WHEN extracting source THEN it must NEVER access files outside packages/nodes/
7. WHEN parsing TypeScript THEN it may use regex or simple parsing (full AST not required)

---

### Requirement 25: Service Layer - Manifest Generator

**User Story:** As a developer, I want a ManifestGenerator service to create AI manifests, so that manifest logic is reusable.

#### Acceptance Criteria

1. WHEN implementing ManifestGenerator THEN it must be a singleton class
2. WHEN generating full manifest THEN it must gather all node metadata and organize by category
3. WHEN generating system prompt THEN it must include node count, syntax reference, and usage guidelines
4. WHEN generating compact manifest THEN it must prioritize frequently used nodes
5. WHEN generating custom manifest THEN it must apply filters and respect token limits
6. WHEN estimating tokens THEN it may use approximate calculation (characters / 4)

---

### Requirement 26: Service Layer - Workflow Analyzer

**User Story:** As a developer, I want a WorkflowAnalyzer service to handle workflow analysis, so that analysis logic is centralized.

#### Acceptance Criteria

1. WHEN implementing WorkflowAnalyzer THEN it must be a singleton class
2. WHEN explaining workflows THEN it must trace execution paths through the workflow JSON
3. WHEN tracing state THEN it must track which state keys are written and read at each step
4. WHEN validating deeply THEN it must check for semantic issues beyond JSON schema
5. WHEN suggesting optimizations THEN it must identify common anti-patterns
6. WHEN analyzing THEN it must NEVER execute the workflow, only analyze the JSON structure

---

### Requirement 27: Service Layer - Composability Graph

**User Story:** As a developer, I want a ComposabilityGraph service to manage node relationships, so that composability logic is efficient.

#### Acceptance Criteria

1. WHEN implementing ComposabilityGraph THEN it must be a singleton class
2. WHEN building the graph THEN it must analyze ai_hints.post_to_state and get_from_state
3. WHEN caching the graph THEN it must rebuild on node registry changes
4. WHEN suggesting successors THEN it must return nodes that read state keys written by the source
5. WHEN suggesting predecessors THEN it must return nodes that write state keys read by the target

---

### Requirement 28: Service Layer - Pattern Library

**User Story:** As a developer, I want a PatternLibrary service to manage workflow patterns, so that patterns are easily extensible.

#### Acceptance Criteria

1. WHEN implementing PatternLibrary THEN it must be a singleton class
2. WHEN providing patterns THEN it must define at least 6 common workflow patterns
3. WHEN detecting patterns THEN it must match workflow structure against pattern definitions
4. WHEN generating from patterns THEN it must substitute variables with provided parameters
5. WHEN adding new patterns THEN they must follow the Pattern interface

---

### Requirement 29: Caching

**User Story:** As a system operator, I want reflection data to be cached, so that API responses are fast.

#### Acceptance Criteria

1. WHEN extracting source code THEN results must be cached to avoid repeated file reads
2. WHEN generating manifests THEN results must be cached with appropriate TTL
3. WHEN building composability graph THEN it must be cached and rebuilt when nodes change
4. WHEN caching THEN cache must be invalidated on server restart
5. IF cache TTL is exceeded THEN data must be regenerated on next request

---

### Requirement 30: Plugin Integration

**User Story:** As a system operator, I want the reflection API documented in the plugin aiManifest, so that it is discoverable.

#### Acceptance Criteria

1. WHEN updating plugin.ts THEN aiManifest.endpoints must include a reflection section
2. WHEN documenting reflection THEN all routes must be listed with method, auth, and description
3. WHEN updating the root endpoint THEN /workscript/ response must list /workscript/reflection/* endpoints
4. WHEN documenting THEN aiManifest must include usage examples for key reflection endpoints

---

## Non-Functional Requirements

### Performance

1. Node introspection endpoints must respond within 100ms for single node requests
2. Full node list must respond within 500ms
3. Source extraction must respond within 200ms with caching
4. Manifest generation must respond within 1 second for full manifest
5. Workflow analysis must respond within 2 seconds for workflows under 100 nodes

### Security

1. Source code extraction must be limited to packages/nodes/ directory only
2. Workflow analysis by ID must require authentication
3. Analysis endpoints must not execute workflow code, only analyze JSON
4. Rate limiting should be applied to source extraction and analysis endpoints
5. Input validation must be applied to all POST request bodies

### Scalability

1. Caching must be used for frequently accessed data
2. Composability graph must be computed once and cached
3. Pattern library must be loaded once at startup

### Code Quality

1. All services must follow singleton pattern matching existing workscript services
2. All routes must follow Hono patterns used in existing workscript routes
3. All types must be exported and documented
4. Error handling must be consistent with existing API patterns

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Engine component source extraction** - Only node source code is exposed, not engine internals
2. **Live workflow execution** - Analysis endpoints analyze JSON structure, they do not execute workflows
3. **Node modification** - This is read-only introspection, no node creation or modification
4. **Pattern editing** - Patterns are predefined, users cannot create custom patterns via API
5. **Real-time introspection** - No WebSocket support for live node monitoring
6. **Cross-package dependencies** - Source extraction is limited to @workscript/nodes package
7. **AI model integration** - Manifest generation produces prompts, it does not call AI models
8. **Workflow storage** - Analysis works on provided JSON or existing workflows, no new storage

---

## Success Metrics

1. All 30 requirements have passing acceptance criteria
2. All 6 route modules are implemented and functional
3. All 5 services are implemented with singleton pattern
4. API response times meet performance requirements
5. No security vulnerabilities in source extraction
6. Complete TypeScript type coverage
7. Plugin aiManifest includes reflection documentation
8. At least 6 workflow patterns are defined and functional

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-10
**Status:** Draft - Ready for Implementation
