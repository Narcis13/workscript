# Implementation Plan: Workscript Reflection API

This document provides a concrete, actionable implementation plan for building the Workscript Reflection API - a "consciousness layer" that enables AI agents to introspect, understand, and dynamically compose workflows. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: FOUNDATION & INFRASTRUCTURE

### 1.1 Directory Structure Setup

- [x] **Task 1.1.1: Create reflection module directory**
  - Create `/apps/api/src/plugins/workscript/reflection/` directory
  - Create subdirectories: `routes/`, `services/`, `types/`
  - Verify directory structure matches the planned architecture
  - _Requirements: 1_

- [x] **Task 1.1.2: Create type definitions file**
  - Create `/apps/api/src/plugins/workscript/reflection/types/reflection.types.ts`
  - Define NodeCategory type: `'core' | 'ai' | 'orchestration' | 'data-manipulation' | 'server' | 'integrations'`
  - Define ComplexityLevel type: `'simple' | 'medium' | 'complex'`
  - _Requirements: 23_

- [x] **Task 1.1.3: Define InputSchemaEntry interface**
  - Add interface with: type, required, description, default, itemSchema (for arrays), enum (for enums)
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.4: Define EdgeConditionInfo interface**
  - Add interface with: condition (string description), dataReturned (Record<string, string>)
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.5: Define StateInteractionInfo interface**
  - Add interface with: reads (string[]), writes (string[]), writeSchema (Record<string, any>)
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.6: Define ComposabilityInfo interface**
  - Add interface with: typicalPredecessors, typicalSuccessors, antiPatterns (string[])
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.7: Define NodeIntrospection interface**
  - Add interface combining: category, complexity, inputSchema, edgeConditions, stateInteractions, operations, composability
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.8: Define ReflectionNodeInfo interface**
  - Extend NodeMetadata with introspection, sourceFile, hasExampleFile, hasTestFile
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.9: Define AIManifest interface**
  - Add interface with: systemPrompt, quickReference, capabilities, tokenCount, optimizedFor
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.10: Define WorkflowAnalysis interfaces**
  - Add StepExplanation, StateFlowInfo, DataTransformation, Issue, ComplexityMetrics
  - Add main WorkflowAnalysis interface combining all
  - Export from reflection.types.ts
  - _Requirements: 23_

- [x] **Task 1.1.11: Define Pattern interfaces**
  - Add PatternStructure, PatternVariation interfaces
  - Add main Pattern interface with: id, name, description, category, structure, template, variations
  - Export from reflection.types.ts
  - _Requirements: 23_

### 1.2 Main Router Setup

- [x] **Task 1.2.1: Create main reflection router**
  - Create `/apps/api/src/plugins/workscript/reflection/index.ts`
  - Import Hono and create router instance
  - Add root GET `/` endpoint returning API overview
  - Export router as default
  - _Requirements: 1_

- [x] **Task 1.2.2: Mount reflection routes in plugin.ts**
  - Open `/apps/api/src/plugins/workscript/plugin.ts`
  - Add import: `import reflectionRoutes from './reflection'`
  - Add route mount: `router.route('/reflection', reflectionRoutes)`
  - Update root endpoint to include `/workscript/reflection/*` in endpoints list
  - _Requirements: 1, 30_

- [x] **Task 1.2.3: Verify reflection routes are accessible**
  - Start dev server: `bun run dev:api`
  - Test GET `/workscript/reflection/` returns overview
  - Verify no errors in console
  - _Requirements: 1_

---

## PHASE 2: NODE INTROSPECTION ROUTES

### 2.1 Node Introspection Service

- [ ] **Task 2.1.1: Create node categorization mapping**
  - Create `/apps/api/src/plugins/workscript/reflection/services/nodeCategories.ts`
  - Define NODE_CATEGORIES map: nodeId -> category
  - Include all 40 nodes with correct categories
  - _Requirements: 2_

- [ ] **Task 2.1.2: Create SourceExtractor service skeleton**
  - Create `/apps/api/src/plugins/workscript/reflection/services/SourceExtractor.ts`
  - Implement singleton pattern with getInstance()
  - Add private nodePathMap for nodeId -> file path mapping
  - _Requirements: 24_

- [ ] **Task 2.1.3: Implement node path resolution**
  - Add method `resolveNodePath(nodeId: string): string | null`
  - Map core nodes to `/packages/nodes/src/{NodeName}Node.ts`
  - Map data nodes to `/packages/nodes/src/data/{NodeName}Node.ts`
  - Map custom nodes to appropriate paths
  - _Requirements: 24_

- [ ] **Task 2.1.4: Implement source file reading**
  - Add method `readNodeSource(nodeId: string): Promise<string | null>`
  - Use fs.readFile to read TypeScript source
  - Handle file not found errors
  - _Requirements: 24_

- [ ] **Task 2.1.5: Implement basic TypeScript parsing**
  - Add method `parseStructure(source: string): ParsedStructure`
  - Extract class name using regex: `/class\s+(\w+)\s+extends/`
  - Extract method signatures using regex
  - Extract interface definitions
  - _Requirements: 24_

- [ ] **Task 2.1.6: Implement related files detection**
  - Add method `findRelatedFiles(nodeId: string): RelatedFiles`
  - Check for `.test.ts` file existence
  - Check for `.example.json` file existence
  - Return { testFile, exampleFile } paths or null
  - _Requirements: 24_

- [ ] **Task 2.1.7: Implement source caching**
  - Add private cache Map<string, CachedSource>
  - Cache source content with timestamp
  - Add TTL of 5 minutes for development
  - _Requirements: 29_

### 2.2 Node Introspection Utilities

- [ ] **Task 2.2.1: Create introspection builder utility**
  - Create `/apps/api/src/plugins/workscript/reflection/services/introspectionBuilder.ts`
  - Add function `buildInputSchema(metadata: NodeMetadata): Record<string, InputSchemaEntry>`
  - Parse ai_hints.example_config to extract type information
  - _Requirements: 2, 3_

- [ ] **Task 2.2.2: Implement edge conditions builder**
  - Add function `buildEdgeConditions(metadata: NodeMetadata): Record<string, EdgeConditionInfo>`
  - Parse ai_hints.expected_edges and ai_hints.post_to_state
  - Generate human-readable condition descriptions
  - _Requirements: 2, 3_

- [ ] **Task 2.2.3: Implement state interactions builder**
  - Add function `buildStateInteractions(metadata: NodeMetadata): StateInteractionInfo`
  - Extract reads from ai_hints.get_from_state
  - Extract writes from ai_hints.post_to_state
  - Build writeSchema from example_config when possible
  - _Requirements: 2, 3_

- [ ] **Task 2.2.4: Implement complexity calculator**
  - Add function `calculateComplexity(source: string): ComplexityLevel`
  - Count lines: < 100 = simple, 100-300 = medium, > 300 = complex
  - Return complexity level
  - _Requirements: 2_

- [ ] **Task 2.2.5: Implement operations extractor**
  - Add function `extractOperations(nodeId: string, source: string): Record<string, OperationInfo[]> | undefined`
  - Parse FilterNode for string/number/boolean/date/array/object operations
  - Parse SwitchNode for comparison operations
  - Return undefined for nodes without operations
  - _Requirements: 4_

### 2.3 Nodes Routes Implementation

- [ ] **Task 2.3.1: Create nodes routes file**
  - Create `/apps/api/src/plugins/workscript/reflection/routes/nodes.ts`
  - Import Hono and create router
  - Import WorkflowService and SourceExtractor
  - Export router as default
  - _Requirements: 2_

- [ ] **Task 2.3.2: Implement GET /nodes endpoint**
  - Add route handler for `GET /`
  - Get all nodes from WorkflowService.getAvailableNodes()
  - Enrich each node with introspection data
  - Support query params: category, search
  - Return { nodes: ReflectionNodeInfo[], metadata: { totalNodes, byCategory } }
  - _Requirements: 2_

- [ ] **Task 2.3.3: Implement GET /nodes/:nodeId endpoint**
  - Add route handler for `GET /:nodeId`
  - Get single node metadata from WorkflowService
  - Build full introspection data
  - Return 404 if node not found
  - Return complete ReflectionNodeInfo
  - _Requirements: 3_

- [ ] **Task 2.3.4: Implement GET /nodes/:nodeId/operations endpoint**
  - Add route handler for `GET /:nodeId/operations`
  - Extract operations from node source
  - Return grouped operations with descriptions and examples
  - Return empty object if no operations
  - _Requirements: 4_

- [ ] **Task 2.3.5: Implement GET /nodes/:nodeId/examples endpoint**
  - Add route handler for `GET /:nodeId/examples`
  - Check for .example.json file
  - Parse and return example workflow if exists
  - Generate examples from ai_hints.example_usage if no file
  - Return { examples: [], exampleWorkflow?: {} }
  - _Requirements: 5_

- [ ] **Task 2.3.6: Mount nodes routes in main router**
  - Import nodesRoutes in index.ts
  - Mount with `router.route('/nodes', nodesRoutes)`
  - _Requirements: 1_

- [ ] **Task 2.3.7: Test nodes endpoints**
  - Test GET `/reflection/nodes` returns all nodes
  - Test GET `/reflection/nodes/filter` returns FilterNode details
  - Test GET `/reflection/nodes/filter/operations` returns filter operations
  - Test GET `/reflection/nodes/nonexistent` returns 404
  - _Requirements: 2, 3, 4, 5_

---

## PHASE 3: SOURCE CODE EXTRACTION ROUTES

### 3.1 Source Routes Implementation

- [ ] **Task 3.1.1: Create source routes file**
  - Create `/apps/api/src/plugins/workscript/reflection/routes/source.ts`
  - Import Hono and create router
  - Import SourceExtractor service
  - Export router as default
  - _Requirements: 6_

- [ ] **Task 3.1.2: Implement GET /source/:nodeId endpoint**
  - Add route handler for `GET /:nodeId`
  - Read source using SourceExtractor
  - Parse structure (class, methods, interfaces)
  - Find related files
  - Return structured source response
  - Return 404 if node not found
  - _Requirements: 6_

- [ ] **Task 3.1.3: Implement source highlights extraction**
  - Add function to identify key code snippets
  - Extract execute method
  - Extract helper methods with significant logic
  - Include in response under highlights field
  - _Requirements: 6_

- [ ] **Task 3.1.4: Implement GET /source/:nodeId/raw endpoint**
  - Add route handler for `GET /:nodeId/raw`
  - Read raw source file
  - Set Content-Type: text/plain
  - Return raw file contents
  - Return 404 with plain text if not found
  - _Requirements: 7_

- [ ] **Task 3.1.5: Mount source routes in main router**
  - Import sourceRoutes in index.ts
  - Mount with `router.route('/source', sourceRoutes)`
  - _Requirements: 1_

- [ ] **Task 3.1.6: Test source endpoints**
  - Test GET `/reflection/source/filter` returns structured source
  - Test GET `/reflection/source/filter/raw` returns plain text
  - Test GET `/reflection/source/nonexistent` returns 404
  - Verify source is only from packages/nodes/
  - _Requirements: 6, 7_

---

## PHASE 4: AI MANIFEST GENERATION

### 4.1 Manifest Generator Service

- [ ] **Task 4.1.1: Create ManifestGenerator service**
  - Create `/apps/api/src/plugins/workscript/reflection/services/ManifestGenerator.ts`
  - Implement singleton pattern with getInstance()
  - Import WorkflowService for node metadata
  - _Requirements: 25_

- [ ] **Task 4.1.2: Implement system prompt generation**
  - Add method `generateSystemPrompt(): string`
  - Include introduction: "You are a workflow orchestration expert..."
  - Include node count and category summary
  - Include syntax reference for $.key and {{$.key}}
  - Include edge syntax and loop syntax
  - _Requirements: 8, 25_

- [ ] **Task 4.1.3: Implement quick reference generation**
  - Add method `generateQuickReference(): string`
  - Generate markdown formatted reference
  - List nodes by category with brief descriptions
  - Include syntax quick reference
  - Include common patterns
  - _Requirements: 8, 25_

- [ ] **Task 4.1.4: Implement capabilities map generation**
  - Add method `generateCapabilities(): CapabilitiesMap`
  - Group nodes by category
  - Include description and common patterns for each category
  - Include syntax reference section
  - _Requirements: 8, 25_

- [ ] **Task 4.1.5: Implement token estimation**
  - Add method `estimateTokens(text: string): number`
  - Use approximation: characters / 4
  - Return estimated token count
  - _Requirements: 8_

- [ ] **Task 4.1.6: Implement compact manifest generation**
  - Add method `generateCompactManifest(): AIManifest`
  - Use shorter system prompt
  - Include only node IDs and one-liner descriptions
  - Target ~5000 tokens
  - _Requirements: 9, 25_

- [ ] **Task 4.1.7: Implement custom manifest generation**
  - Add method `generateCustomManifest(options: CustomManifestOptions): AIManifest`
  - Accept: useCase, includeCategories, excludeNodes, maxTokens, format
  - Apply filters to node list
  - Truncate to maxTokens if specified
  - Format output based on format parameter
  - _Requirements: 10, 25_

- [ ] **Task 4.1.8: Implement manifest caching**
  - Cache full and compact manifests
  - Add TTL of 10 minutes
  - Clear cache on service initialization
  - _Requirements: 29_

### 4.2 Manifest Routes Implementation

- [ ] **Task 4.2.1: Create manifest routes file**
  - Create `/apps/api/src/plugins/workscript/reflection/routes/manifest.ts`
  - Import Hono and create router
  - Import ManifestGenerator service
  - Export router as default
  - _Requirements: 8_

- [ ] **Task 4.2.2: Implement GET /manifest endpoint**
  - Add route handler for `GET /`
  - Generate full manifest using ManifestGenerator
  - Return complete AIManifest response
  - _Requirements: 8_

- [ ] **Task 4.2.3: Implement GET /manifest/compact endpoint**
  - Add route handler for `GET /compact`
  - Generate compact manifest
  - Return compressed AIManifest
  - _Requirements: 9_

- [ ] **Task 4.2.4: Implement POST /manifest/custom endpoint**
  - Add route handler for `POST /custom`
  - Parse request body for options
  - Validate options
  - Generate custom manifest
  - Return filtered AIManifest
  - _Requirements: 10_

- [ ] **Task 4.2.5: Mount manifest routes in main router**
  - Import manifestRoutes in index.ts
  - Mount with `router.route('/manifest', manifestRoutes)`
  - _Requirements: 1_

- [ ] **Task 4.2.6: Test manifest endpoints**
  - Test GET `/reflection/manifest` returns full manifest
  - Test GET `/reflection/manifest/compact` returns shorter manifest
  - Test POST `/reflection/manifest/custom` with useCase filter
  - Verify token counts are reasonable
  - _Requirements: 8, 9, 10_

---

## PHASE 5: WORKFLOW ANALYSIS

### 5.1 Workflow Analyzer Service

- [ ] **Task 5.1.1: Create WorkflowAnalyzer service**
  - Create `/apps/api/src/plugins/workscript/reflection/services/WorkflowAnalyzer.ts`
  - Implement singleton pattern with getInstance()
  - Import workflow types and node metadata
  - _Requirements: 26_

- [ ] **Task 5.1.2: Implement workflow parsing**
  - Add method `parseWorkflow(workflow: WorkflowDefinition): ParsedWorkflow`
  - Extract all nodes from workflow array
  - Build execution path graph
  - Identify conditional branches and loops
  - _Requirements: 11, 26_

- [ ] **Task 5.1.3: Implement step explanation generation**
  - Add method `explainSteps(parsedWorkflow: ParsedWorkflow): StepExplanation[]`
  - For each node, generate purpose description
  - Identify inputs and outputs
  - Map next steps based on edges
  - _Requirements: 11, 26_

- [ ] **Task 5.1.4: Implement state flow tracing**
  - Add method `traceStateFlow(parsedWorkflow: ParsedWorkflow): StateFlowInfo`
  - Track initial state keys
  - Track intermediate state changes at each node
  - Identify final state keys
  - _Requirements: 11, 26_

- [ ] **Task 5.1.5: Implement data transformation tracking**
  - Add method `trackTransformations(parsedWorkflow: ParsedWorkflow): DataTransformation[]`
  - Identify how data flows through nodes
  - Track type changes (array -> filtered array -> sorted array)
  - _Requirements: 11, 26_

- [ ] **Task 5.1.6: Implement complexity calculation**
  - Add method `calculateComplexity(parsedWorkflow: ParsedWorkflow): ComplexityMetrics`
  - Count total nodes
  - Calculate max depth
  - Count branches
  - Count loops
  - _Requirements: 11_

- [ ] **Task 5.1.7: Implement summary generation**
  - Add method `generateSummary(analysis: WorkflowAnalysis): string`
  - Generate 1-2 sentence description
  - Include main data flow description
  - _Requirements: 11_

- [ ] **Task 5.1.8: Implement semantic validation**
  - Add method `validateSemantics(workflow: WorkflowDefinition): SemanticValidation`
  - Check for state keys used before defined
  - Check for unused state writes
  - Check for potentially undefined nested paths
  - Check for unreachable code
  - _Requirements: 12, 26_

- [ ] **Task 5.1.9: Implement optimization detection**
  - Add method `detectOptimizations(workflow: WorkflowDefinition): Optimization[]`
  - Detect sequential filters that could be combined
  - Detect missing error handlers
  - Detect redundant state writes
  - _Requirements: 13, 26_

### 5.2 Analysis Routes Implementation

- [ ] **Task 5.2.1: Create analysis routes file**
  - Create `/apps/api/src/plugins/workscript/reflection/routes/analysis.ts`
  - Import Hono and create router
  - Import WorkflowAnalyzer service
  - Import authentication middleware
  - Export router as default
  - _Requirements: 11_

- [ ] **Task 5.2.2: Implement POST /analysis/explain endpoint**
  - Add route handler for `POST /explain`
  - Parse workflow from request body
  - Generate full workflow analysis
  - Return WorkflowAnalysis response
  - Return 400 if workflow invalid
  - _Requirements: 11_

- [ ] **Task 5.2.3: Implement POST /analysis/validate-deep endpoint**
  - Add route handler for `POST /validate-deep`
  - Parse workflow from request body
  - Run semantic validation
  - Return { valid, schemaErrors, semanticIssues, stateConsistency }
  - _Requirements: 12_

- [ ] **Task 5.2.4: Implement POST /analysis/optimize endpoint**
  - Add route handler for `POST /optimize`
  - Parse workflow from request body
  - Run optimization detection
  - Return { suggestions: Optimization[] }
  - _Requirements: 13_

- [ ] **Task 5.2.5: Implement GET /analysis/:workflowId endpoint**
  - Add route handler for `GET /:workflowId`
  - Apply authentication middleware
  - Query workflow from database
  - Return 404 if not found
  - Return 403 if user lacks permission
  - Return WorkflowAnalysis
  - _Requirements: 14_

- [ ] **Task 5.2.6: Mount analysis routes in main router**
  - Import analysisRoutes in index.ts
  - Mount with `router.route('/analysis', analysisRoutes)`
  - _Requirements: 1_

- [ ] **Task 5.2.7: Test analysis endpoints**
  - Test POST `/reflection/analysis/explain` with valid workflow
  - Test POST `/reflection/analysis/validate-deep` detects issues
  - Test POST `/reflection/analysis/optimize` returns suggestions
  - Test GET `/reflection/analysis/:id` requires auth
  - _Requirements: 11, 12, 13, 14_

---

## PHASE 6: COMPOSABILITY DISCOVERY

### 6.1 Composability Graph Service

- [ ] **Task 6.1.1: Create ComposabilityGraph service**
  - Create `/apps/api/src/plugins/workscript/reflection/services/ComposabilityGraph.ts`
  - Implement singleton pattern with getInstance()
  - Import WorkflowService for node metadata
  - _Requirements: 27_

- [ ] **Task 6.1.2: Implement graph building**
  - Add method `buildGraph(): void`
  - For each node, extract post_to_state keys
  - For each node, extract get_from_state keys
  - Build connections map
  - _Requirements: 15, 27_

- [ ] **Task 6.1.3: Implement state key map building**
  - Add method `buildStateKeyMap(): Map<string, StateKeyUsage>`
  - Track which nodes write each state key
  - Track which nodes read each state key
  - _Requirements: 15, 27_

- [ ] **Task 6.1.4: Implement successor suggestion**
  - Add method `getSuggestedSuccessors(nodeId: string, edge: string): NodeSuggestion[]`
  - Find nodes that read state keys this node writes
  - Include reason and common config
  - _Requirements: 16, 27_

- [ ] **Task 6.1.5: Implement predecessor suggestion**
  - Add method `getSuggestedPredecessors(nodeId: string): NodeSuggestion[]`
  - Find nodes that write state keys this node reads
  - Include edge, reason, and connectsVia
  - _Requirements: 17, 27_

- [ ] **Task 6.1.6: Implement context-aware suggestion**
  - Add method `suggestNext(context: SuggestionContext): NodeSuggestion[]`
  - Accept currentNode, currentEdge, currentState, intent
  - Calculate confidence based on compatibility
  - Match intent to node purposes
  - _Requirements: 18, 27_

- [ ] **Task 6.1.7: Implement graph caching**
  - Cache built graph on first access
  - Rebuild when node registry changes
  - _Requirements: 29_

### 6.2 Composability Routes Implementation

- [ ] **Task 6.2.1: Create composability routes file**
  - Create `/apps/api/src/plugins/workscript/reflection/routes/composability.ts`
  - Import Hono and create router
  - Import ComposabilityGraph service
  - Export router as default
  - _Requirements: 15_

- [ ] **Task 6.2.2: Implement GET /composability/graph endpoint**
  - Add route handler for `GET /graph`
  - Return full composability matrix
  - Include nodes with connections
  - Include stateKeyMap
  - _Requirements: 15_

- [ ] **Task 6.2.3: Implement GET /composability/from/:nodeId endpoint**
  - Add route handler for `GET /from/:nodeId`
  - Return possible successors for each edge
  - Include provides and suggestedNext
  - Return 404 if node not found
  - _Requirements: 16_

- [ ] **Task 6.2.4: Implement GET /composability/to/:nodeId endpoint**
  - Add route handler for `GET /to/:nodeId`
  - Return possible predecessors
  - Include requires and suggestedPredecessors
  - Return 404 if node not found
  - _Requirements: 17_

- [ ] **Task 6.2.5: Implement POST /composability/suggest endpoint**
  - Add route handler for `POST /suggest`
  - Parse context from request body
  - Generate contextual suggestions
  - Return sorted by confidence
  - _Requirements: 18_

- [ ] **Task 6.2.6: Mount composability routes in main router**
  - Import composabilityRoutes in index.ts
  - Mount with `router.route('/composability', composabilityRoutes)`
  - _Requirements: 1_

- [ ] **Task 6.2.7: Test composability endpoints**
  - Test GET `/reflection/composability/graph` returns full matrix
  - Test GET `/reflection/composability/from/filter` returns successors
  - Test GET `/reflection/composability/to/sort` returns predecessors
  - Test POST `/reflection/composability/suggest` with intent
  - _Requirements: 15, 16, 17, 18_

---

## PHASE 7: PATTERN LIBRARY

### 7.1 Pattern Library Service

- [ ] **Task 7.1.1: Create PatternLibrary service**
  - Create `/apps/api/src/plugins/workscript/reflection/services/PatternLibrary.ts`
  - Implement singleton pattern with getInstance()
  - Define internal patterns array
  - _Requirements: 28_

- [ ] **Task 7.1.2: Define ETL Pipeline pattern**
  - Add pattern with id: 'etl-pipeline'
  - Define stages: extract, transform, load
  - Create template workflow with database/fetchApi -> filter/transform -> database
  - Include variations: with-validation, with-deduplication
  - _Requirements: 19, 28_

- [ ] **Task 7.1.3: Define Conditional Branching pattern**
  - Add pattern with id: 'conditional-branching'
  - Define structure with logic node entry
  - Create template with true/false branches
  - _Requirements: 19, 28_

- [ ] **Task 7.1.4: Define Loop with Counter pattern**
  - Add pattern with id: 'loop-with-counter'
  - Define structure with logic... loop node
  - Include counter initialization and increment
  - _Requirements: 19, 28_

- [ ] **Task 7.1.5: Define AI Processing Pipeline pattern**
  - Add pattern with id: 'ai-processing-pipeline'
  - Define stages: prepare, ai-call, process-response, store
  - Create template with editFields -> ask-ai -> jsonExtract -> database
  - _Requirements: 19, 28_

- [ ] **Task 7.1.6: Define Error Handling pattern**
  - Add pattern with id: 'error-handling'
  - Define structure with error edges
  - Show try/catch via edge routing
  - _Requirements: 19, 28_

- [ ] **Task 7.1.7: Define Parallel Processing pattern**
  - Add pattern with id: 'parallel-processing'
  - Define structure with splitOut -> process -> aggregate
  - _Requirements: 19, 28_

- [ ] **Task 7.1.8: Implement pattern detection**
  - Add method `detectPatterns(workflow: WorkflowDefinition): DetectedPattern[]`
  - Match workflow structure against pattern definitions
  - Calculate confidence scores
  - Identify matched nodes
  - _Requirements: 21, 28_

- [ ] **Task 7.1.9: Implement workflow generation from pattern**
  - Add method `generateFromPattern(patternId: string, parameters: object): WorkflowDefinition`
  - Substitute variables in template
  - Validate required parameters
  - Return complete workflow
  - _Requirements: 22, 28_

### 7.2 Pattern Routes Implementation

- [ ] **Task 7.2.1: Create patterns routes file**
  - Create `/apps/api/src/plugins/workscript/reflection/routes/patterns.ts`
  - Import Hono and create router
  - Import PatternLibrary service
  - Export router as default
  - _Requirements: 19_

- [ ] **Task 7.2.2: Implement GET /patterns endpoint**
  - Add route handler for `GET /`
  - Return all patterns with summary info
  - Support category filter query param
  - _Requirements: 19_

- [ ] **Task 7.2.3: Implement GET /patterns/:patternId endpoint**
  - Add route handler for `GET /:patternId`
  - Return complete pattern details
  - Include full template
  - Return 404 if not found
  - _Requirements: 20_

- [ ] **Task 7.2.4: Implement POST /patterns/detect endpoint**
  - Add route handler for `POST /detect`
  - Parse workflow from request body
  - Run pattern detection
  - Return { detectedPatterns, suggestions }
  - _Requirements: 21_

- [ ] **Task 7.2.5: Implement POST /patterns/generate endpoint**
  - Add route handler for `POST /generate`
  - Parse patternId and parameters from body
  - Generate workflow from pattern
  - Return { workflow, explanation }
  - Return 400 if missing parameters
  - Return 404 if pattern not found
  - _Requirements: 22_

- [ ] **Task 7.2.6: Mount patterns routes in main router**
  - Import patternsRoutes in index.ts
  - Mount with `router.route('/patterns', patternsRoutes)`
  - _Requirements: 1_

- [ ] **Task 7.2.7: Test patterns endpoints**
  - Test GET `/reflection/patterns` returns 6 patterns
  - Test GET `/reflection/patterns/etl-pipeline` returns full pattern
  - Test POST `/reflection/patterns/detect` detects patterns
  - Test POST `/reflection/patterns/generate` creates workflow
  - _Requirements: 19, 20, 21, 22_

---

## PHASE 8: PLUGIN INTEGRATION & DOCUMENTATION

### 8.1 Plugin aiManifest Update

- [ ] **Task 8.1.1: Add reflection to aiManifest endpoints**
  - Open `/apps/api/src/plugins/workscript/plugin.ts`
  - Add new `reflection` section in aiManifest.endpoints
  - Document all routes with method, auth, description
  - _Requirements: 30_

- [ ] **Task 8.1.2: Document nodes routes in aiManifest**
  - Add `/workscript/reflection/nodes` route documentation
  - Add `/workscript/reflection/nodes/:nodeId` documentation
  - Add operations and examples endpoints
  - _Requirements: 30_

- [ ] **Task 8.1.3: Document source routes in aiManifest**
  - Add `/workscript/reflection/source/:nodeId` documentation
  - Add `/workscript/reflection/source/:nodeId/raw` documentation
  - _Requirements: 30_

- [ ] **Task 8.1.4: Document manifest routes in aiManifest**
  - Add all manifest endpoints documentation
  - Include custom manifest options
  - _Requirements: 30_

- [ ] **Task 8.1.5: Document analysis routes in aiManifest**
  - Add all analysis endpoints documentation
  - Note authentication requirements
  - _Requirements: 30_

- [ ] **Task 8.1.6: Document composability routes in aiManifest**
  - Add all composability endpoints documentation
  - Include suggestion request format
  - _Requirements: 30_

- [ ] **Task 8.1.7: Document patterns routes in aiManifest**
  - Add all patterns endpoints documentation
  - Include available pattern IDs
  - _Requirements: 30_

- [ ] **Task 8.1.8: Add reflection examples to aiManifest**
  - Add example for generating AI manifest
  - Add example for analyzing workflow
  - Add example for pattern-based generation
  - _Requirements: 30_

### 8.2 Final Route Integration

- [ ] **Task 8.2.1: Verify all routes are mounted**
  - Confirm nodes routes mounted at `/reflection/nodes`
  - Confirm source routes mounted at `/reflection/source`
  - Confirm manifest routes mounted at `/reflection/manifest`
  - Confirm analysis routes mounted at `/reflection/analysis`
  - Confirm composability routes mounted at `/reflection/composability`
  - Confirm patterns routes mounted at `/reflection/patterns`
  - _Requirements: 1_

- [ ] **Task 8.2.2: Add API overview endpoint content**
  - Update GET `/reflection/` to return comprehensive overview
  - List all available endpoints
  - Include version information
  - _Requirements: 1_

---

## PHASE 9: TESTING & VERIFICATION

### 9.1 Integration Testing

- [ ] **Task 9.1.1: Test full node introspection flow**
  - List all nodes
  - Get single node details
  - Get node operations
  - Get node examples
  - Verify all data is accurate
  - _Requirements: 2, 3, 4, 5_

- [ ] **Task 9.1.2: Test source extraction security**
  - Attempt to access file outside packages/nodes/
  - Verify request is rejected
  - Test with various path traversal attempts
  - _Requirements: 6, 7_

- [ ] **Task 9.1.3: Test manifest generation completeness**
  - Generate full manifest
  - Verify all 40 nodes are included
  - Verify syntax reference is accurate
  - Test compact manifest is smaller
  - Test custom manifest filtering
  - _Requirements: 8, 9, 10_

- [ ] **Task 9.1.4: Test workflow analysis accuracy**
  - Analyze sample ETL workflow
  - Verify step explanations are correct
  - Verify state flow tracking is accurate
  - Test semantic validation detects issues
  - _Requirements: 11, 12, 13_

- [ ] **Task 9.1.5: Test composability suggestions**
  - Get successors for filter node
  - Verify suggestions include sort, limit, summarize
  - Get predecessors for sort node
  - Verify suggestions include filter, database
  - Test context-aware suggestions
  - _Requirements: 15, 16, 17, 18_

- [ ] **Task 9.1.6: Test pattern library**
  - List all patterns
  - Verify 6 patterns exist
  - Get ETL pattern details
  - Detect patterns in sample workflow
  - Generate workflow from pattern
  - _Requirements: 19, 20, 21, 22_

### 9.2 Error Handling Testing

- [ ] **Task 9.2.1: Test 404 responses**
  - Request non-existent node
  - Request non-existent pattern
  - Request non-existent workflow ID
  - Verify all return 404 with appropriate message
  - _Requirements: 1_

- [ ] **Task 9.2.2: Test 400 responses**
  - Submit invalid workflow JSON to analysis
  - Submit missing parameters to pattern generation
  - Submit invalid custom manifest options
  - Verify all return 400 with validation errors
  - _Requirements: 1_

- [ ] **Task 9.2.3: Test 403 responses**
  - Access /analysis/:workflowId without auth
  - Access workflow belonging to another user
  - Verify 403 is returned
  - _Requirements: 14_

### 9.3 Performance Testing

- [ ] **Task 9.3.1: Test response times**
  - Measure GET /nodes response time (should be < 500ms)
  - Measure GET /nodes/:nodeId response time (should be < 100ms)
  - Measure GET /source/:nodeId response time (should be < 200ms)
  - Measure GET /manifest response time (should be < 1s)
  - _Requirements: Performance_

- [ ] **Task 9.3.2: Test caching effectiveness**
  - Request source multiple times
  - Verify second request is faster
  - Request manifest multiple times
  - Verify caching works
  - _Requirements: 29_

---

## PHASE 10: FINAL VERIFICATION

### 10.1 Build & Deploy Readiness

- [ ] **Task 10.1.1: Run TypeScript type checking**
  - Execute `bun run typecheck` from monorepo root
  - Fix any type errors in reflection module
  - Verify no new type warnings
  - _Requirements: Code Quality_

- [ ] **Task 10.1.2: Run full build**
  - Execute `bun run build` from monorepo root
  - Verify reflection routes are included in build
  - Fix any build errors
  - _Requirements: Code Quality_

- [ ] **Task 10.1.3: Test production build**
  - Start server from dist
  - Verify all reflection endpoints work
  - Test key functionality
  - _Requirements: Code Quality_

### 10.2 Final Acceptance

- [ ] **Task 10.2.1: Review all requirements**
  - Go through requirements 1-30
  - Verify all acceptance criteria are met
  - Document any deviations
  - _Requirements: All_

- [ ] **Task 10.2.2: Verify success metrics**
  - Confirm all 30 requirements passing
  - Confirm all 6 route modules implemented
  - Confirm all 5 services implemented
  - Confirm API performance meets requirements
  - Confirm no security vulnerabilities
  - Confirm complete TypeScript coverage
  - Confirm aiManifest includes reflection docs
  - Confirm 6 patterns defined
  - _Requirements: All_

- [ ] **Task 10.2.3: Final documentation review**
  - Verify aiManifest is accurate
  - Test examples in documentation
  - Confirm response formats match documentation
  - _Requirements: 30_

---

## Summary

**Total Tasks:** 127
**Estimated Time:** 5-7 days

**Critical Path:**
1. Phase 1: Foundation & Infrastructure (1 day)
2. Phase 2: Node Introspection Routes (1 day)
3. Phase 3: Source Code Extraction Routes (0.5 days)
4. Phase 4: AI Manifest Generation (1 day)
5. Phase 5: Workflow Analysis (1 day)
6. Phase 6: Composability Discovery (0.5 days)
7. Phase 7: Pattern Library (0.5 days)
8. Phase 8: Plugin Integration (0.25 days)
9. Phase 9: Testing & Verification (0.5 days)
10. Phase 10: Final Verification (0.25 days)

**Key Milestones:**
- Phase 1 complete: Basic infrastructure working
- Phase 2 complete: Node introspection functional
- Phase 4 complete: AI manifest generation working
- Phase 5 complete: Workflow analysis operational
- Phase 7 complete: All features implemented
- Phase 10 complete: Production ready

**Dependencies:**
- Phase 2 depends on Phase 1 (types and router)
- Phase 3 depends on Phase 2 (SourceExtractor)
- Phase 4 depends on Phase 2 (node metadata)
- Phase 5 depends on Phase 2 (node info for analysis)
- Phase 6 depends on Phase 2 (node metadata for graph)
- Phase 7 depends on Phase 5 (workflow analysis for detection)
- Phase 8 depends on Phases 2-7 (all routes for documentation)
- Phase 9 depends on Phase 8 (full implementation for testing)
- Phase 10 depends on Phase 9 (testing complete)

---

**Document Version:** 1.0.0
**Last Updated:** 2025-12-10
**Status:** Ready for Implementation
