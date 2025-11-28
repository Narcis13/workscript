# Implementation Plan: Ask-AI Shared Service

This document provides a concrete, actionable implementation plan for the Ask-AI shared service that wraps OpenRouter APIs to provide workscript plugins with AI completion capabilities, model discovery with pricing, and full usage tracking. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: FOUNDATION & DATABASE SCHEMA

### 1.1 Environment Configuration

- [x] **Task 1.1.1: Update .env.example with OpenRouter configuration**
  - Open `/apps/api/.env.example`
  - Add new section for OpenRouter AI Configuration
  - Add `OPENROUTER_API_KEY` with placeholder value
  - Add `OPENROUTER_SITE_URL` with default CLIENT_URL
  - Add `OPENROUTER_SITE_NAME` with default "Workscript"
  - Add `AI_MODEL_SYNC_INTERVAL` with default 86400
  - Add `AI_REQUEST_TIMEOUT` with default 30000
  - Include documentation comments for each variable
  - _Requirements: 15_

- [x] **Task 1.1.2: Add OpenRouter API key to local .env**
  - Open `/apps/api/.env`
  - Add user's OPENROUTER_API_KEY
  - Verify the key is not committed to git
  - _Requirements: 15_

### 1.2 Database Schema Creation

- [x] **Task 1.2.1: Create ai.schema.ts file**
  - Create new file `/apps/api/src/db/schema/ai.schema.ts`
  - Add file header with JSDoc documentation
  - Import required Drizzle ORM functions (mysqlTable, varchar, text, timestamp, boolean, int, json, decimal, index)
  - Import createId from @paralleldrive/cuid2
  - _Requirements: 10, 11_

- [x] **Task 1.2.2: Define ai_models table schema**
  - Add `aiModels` table definition
  - Define `id` as varchar(128) primary key
  - Define `name` as varchar(255) not null
  - Define `description` as text
  - Define `contextLength` as int
  - Define `promptPrice` as decimal(18,12)
  - Define `completionPrice` as decimal(18,12)
  - Define `requestPrice` as decimal(18,12)
  - Define `imagePrice` as decimal(18,12)
  - Define `modality` as varchar(50)
  - Define `inputModalities` as json
  - Define `outputModalities` as json
  - Define `tokenizer` as varchar(50)
  - Define `maxCompletionTokens` as int
  - Define `supportedParameters` as json
  - Define `isActive` as boolean with default true
  - Define `lastSyncedAt` as timestamp
  - Define `createdAt` with defaultNow()
  - Define `updatedAt` with defaultNow() and onUpdateNow()
  - _Requirements: 10_

- [x] **Task 1.2.3: Add indexes to ai_models table**
  - Add index on `modality` column
  - Add index on `isActive` column
  - Add index on `lastSyncedAt` column
  - _Requirements: 10_

- [x] **Task 1.2.4: Define ai_usage table schema**
  - Add `aiUsage` table definition
  - Define `id` as varchar(128) primary key with $defaultFn(() => createId())
  - Define `pluginId` as varchar(128) not null
  - Define `userId` as varchar(128) nullable
  - Define `tenantId` as varchar(128) nullable
  - Define `modelId` as varchar(128) not null
  - Define `promptTokens` as int not null
  - Define `completionTokens` as int not null
  - Define `totalTokens` as int not null
  - Define `promptCost` as decimal(18,12)
  - Define `completionCost` as decimal(18,12)
  - Define `totalCost` as decimal(18,12)
  - Define `requestDurationMs` as int
  - Define `status` as varchar(20)
  - Define `errorMessage` as text nullable
  - Define `metadata` as json nullable
  - Define `createdAt` with defaultNow()
  - _Requirements: 11_

- [x] **Task 1.2.5: Add indexes to ai_usage table**
  - Add index on `pluginId` column
  - Add index on `userId` column
  - Add index on `tenantId` column
  - Add index on `modelId` column
  - Add index on `createdAt` column
  - Add composite index on `(pluginId, createdAt)` for analytics
  - _Requirements: 11_

- [x] **Task 1.2.6: Export type definitions from schema**
  - Export `AIModel` type using $inferSelect
  - Export `NewAIModel` type using $inferInsert
  - Export `AIUsage` type using $inferSelect
  - Export `NewAIUsage` type using $inferInsert
  - _Requirements: 10, 11_

### 1.3 Schema Registration

- [x] **Task 1.3.1: Register AI schema in db/index.ts**
  - Open `/apps/api/src/db/index.ts`
  - Add import for ai.schema.ts: `import * as aiSchema from './schema/ai.schema'`
  - Add aiSchema to combined schema object
  - Add export for AI schema: `export * from './schema/ai.schema'`
  - _Requirements: 16_

- [x] **Task 1.3.2: Generate database migration**
  - Run `cd apps/api && bun run db:generate`
  - Verify migration file is created
  - Review generated SQL for correctness
  - _Requirements: 16_

- [x] **Task 1.3.3: Push schema to database**
  - Run `cd apps/api && bun run db:push`
  - Verify tables created successfully
  - Check table structure in database
  - _Requirements: 16_

---

## PHASE 2: TYPE DEFINITIONS

### 2.1 Core Types

- [x] **Task 2.1.1: Create ask-ai directory structure**
  - Create directory `/apps/api/src/shared-services/ask-ai/`
  - _Requirements: 12_

- [x] **Task 2.1.2: Create types.ts file with header**
  - Create `/apps/api/src/shared-services/ask-ai/types.ts`
  - Add file header with JSDoc documentation describing all types
  - _Requirements: 12_

- [x] **Task 2.1.3: Define ChatMessage interface**
  - Export `ChatMessage` interface
  - Add `role` property: 'system' | 'user' | 'assistant'
  - Add `content` property: string
  - Add JSDoc documentation
  - _Requirements: 12, 20_

- [x] **Task 2.1.4: Define CompletionRequest interface**
  - Export `CompletionRequest` interface
  - Add required `model`: string
  - Add required `messages`: ChatMessage[]
  - Add required `pluginId`: string
  - Add optional `userId`: string
  - Add optional `tenantId`: string
  - Add optional `temperature`: number (0-2)
  - Add optional `maxTokens`: number
  - Add optional `topP`: number (0-1)
  - Add optional `frequencyPenalty`: number
  - Add optional `presencePenalty`: number
  - Add optional `systemPrompt`: string
  - Add JSDoc documentation
  - _Requirements: 12, 6_

- [x] **Task 2.1.5: Define CompletionResult interface**
  - Export `CompletionResult` interface
  - Add `id`: string
  - Add `model`: string
  - Add `content`: string
  - Add `finishReason`: 'stop' | 'length' | 'error'
  - Add nested `usage` object with promptTokens, completionTokens, totalTokens, cost
  - Add `durationMs`: number
  - Add JSDoc documentation
  - _Requirements: 12, 6_

- [x] **Task 2.1.6: Define AIModel interface**
  - Export `AIModel` interface
  - Add `id`: string
  - Add `name`: string
  - Add `description`: string
  - Add `contextLength`: number
  - Add `pricing`: ModelPricing
  - Add `modality`: string
  - Add `inputModalities`: string[]
  - Add `outputModalities`: string[]
  - Add `tokenizer`: string
  - Add `maxCompletionTokens`: number
  - Add `supportedParameters`: string[]
  - Add JSDoc documentation
  - _Requirements: 12, 2_

- [x] **Task 2.1.7: Define ModelPricing interface**
  - Export `ModelPricing` interface
  - Add `prompt`: number (per token in USD)
  - Add `completion`: number
  - Add `request`: number
  - Add `image`: number
  - Add JSDoc documentation
  - _Requirements: 12, 8_

- [x] **Task 2.1.8: Define UsageSummary interface**
  - Export `UsageSummary` interface
  - Add `totalRequests`: number
  - Add `totalTokens`: number
  - Add `totalCost`: number
  - Add `byModel`: Record<string, { requests: number; tokens: number; cost: number }>
  - Add JSDoc documentation
  - _Requirements: 12, 9_

- [x] **Task 2.1.9: Define DateRange interface**
  - Export `DateRange` interface
  - Add optional `from`: Date
  - Add optional `to`: Date
  - Add JSDoc documentation
  - _Requirements: 12, 9_

- [x] **Task 2.1.10: Define ModelFilters interface**
  - Export `ModelFilters` interface
  - Add optional `modality`: string
  - Add optional `inputModality`: string
  - Add optional `provider`: string
  - Add optional `minContextLength`: number
  - Add optional `maxPrice`: number
  - Add JSDoc documentation
  - _Requirements: 12, 2_

### 2.2 Error Types

- [x] **Task 2.2.1: Define AIErrorCode enum/type**
  - Export `AIErrorCode` type with all error codes:
  - `MISSING_API_KEY`
  - `MODEL_NOT_FOUND`
  - `INVALID_REQUEST`
  - `RATE_LIMITED`
  - `AUTH_FAILED`
  - `TIMEOUT`
  - `PROVIDER_ERROR`
  - `NETWORK_ERROR`
  - `DATABASE_ERROR`
  - Add JSDoc documentation
  - _Requirements: 14_

- [x] **Task 2.2.2: Define AIServiceError class**
  - Export `AIServiceError` class extending Error
  - Add `code`: AIErrorCode property
  - Add `provider`: string | undefined property
  - Add `details`: Record<string, any> | undefined property
  - Add constructor accepting message, code, provider, details
  - Add JSDoc documentation
  - _Requirements: 14_

### 2.3 OpenRouter API Types

- [x] **Task 2.3.1: Define OpenRouterModel interface**
  - Export `OpenRouterModel` interface for API response
  - Add `id`: string
  - Add `name`: string
  - Add `description`: string
  - Add `context_length`: number
  - Add `pricing` object with string values
  - Add `architecture` object with modality info
  - Add `top_provider` object
  - Add `supported_parameters`: string[]
  - _Requirements: 1, 2_

- [x] **Task 2.3.2: Define OpenRouterCompletionRequest interface**
  - Export `OpenRouterCompletionRequest` interface
  - Add `model`: string
  - Add `messages`: array of role/content objects
  - Add optional parameters (temperature, max_tokens, etc.)
  - _Requirements: 1, 6_

- [x] **Task 2.3.3: Define OpenRouterCompletionResponse interface**
  - Export `OpenRouterCompletionResponse` interface
  - Add `id`: string
  - Add `model`: string
  - Add `choices` array with message and finish_reason
  - Add `usage` object with prompt_tokens, completion_tokens, total_tokens
  - _Requirements: 1, 6_

---

## PHASE 3: OPENROUTER CLIENT

### 3.1 HTTP Client Implementation

- [x] **Task 3.1.1: Create OpenRouterClient.ts file**
  - Create `/apps/api/src/shared-services/ask-ai/OpenRouterClient.ts`
  - Add file header with JSDoc documentation
  - Import types from types.ts
  - _Requirements: 1_

- [x] **Task 3.1.2: Define OpenRouterClient class structure**
  - Define `OpenRouterClient` class
  - Add private `apiKey`: string property
  - Add private `baseUrl`: string = 'https://openrouter.ai/api/v1'
  - Add private `siteUrl`: string property
  - Add private `siteName`: string property
  - Add private `timeout`: number property (default 30000)
  - _Requirements: 1_

- [x] **Task 3.1.3: Implement constructor with configuration**
  - Read `OPENROUTER_API_KEY` from process.env
  - Throw `AIServiceError` with `MISSING_API_KEY` if not set
  - Read `OPENROUTER_SITE_URL` with fallback to CLIENT_URL
  - Read `OPENROUTER_SITE_NAME` with fallback to "Workscript"
  - Read `AI_REQUEST_TIMEOUT` with fallback to 30000
  - _Requirements: 1, 15_

- [x] **Task 3.1.4: Implement private request method**
  - Create private `request<T>` method
  - Accept endpoint, method, and optional body parameters
  - Create AbortController for timeout
  - Build full URL from baseUrl and endpoint
  - Add headers: Authorization, Content-Type, HTTP-Referer, X-Title
  - Use fetch with timeout signal
  - Handle timeout errors
  - Handle non-ok responses
  - Parse and return JSON response
  - _Requirements: 1_

- [x] **Task 3.1.5: Implement error handling in request method**
  - Parse OpenRouter error response format
  - Map HTTP status codes to AIErrorCode
  - 401/403 → AUTH_FAILED
  - 429 → RATE_LIMITED
  - 4xx → INVALID_REQUEST
  - 5xx → PROVIDER_ERROR
  - Network errors → NETWORK_ERROR
  - Timeout → TIMEOUT
  - Include retry-after header if present
  - _Requirements: 1, 14_

- [x] **Task 3.1.6: Implement listModels method**
  - Create public `listModels(): Promise<OpenRouterModel[]>`
  - Call GET /models endpoint
  - Return data array from response
  - Handle errors appropriately
  - _Requirements: 1, 2_

- [x] **Task 3.1.7: Implement createCompletion method**
  - Create public `createCompletion(request: OpenRouterCompletionRequest): Promise<OpenRouterCompletionResponse>`
  - Call POST /chat/completions endpoint
  - Pass request body as JSON
  - Return parsed response
  - Handle errors appropriately
  - _Requirements: 1, 6_

- [x] **Task 3.1.8: Add JSDoc documentation to all methods**
  - Document class purpose
  - Document constructor parameters
  - Document listModels return type and behavior
  - Document createCompletion parameters and return type
  - Include usage examples
  - _Requirements: 17_

---

## PHASE 4: MODEL REGISTRY

### 4.1 Cache Management

- [x] **Task 4.1.1: Create ModelRegistry.ts file**
  - Create `/apps/api/src/shared-services/ask-ai/ModelRegistry.ts`
  - Add file header with JSDoc documentation
  - Import db from '../../db'
  - Import aiModels schema
  - Import OpenRouterClient
  - Import types
  - Import Drizzle operators (eq, desc, and, gte, sql)
  - _Requirements: 3, 4_

- [x] **Task 4.1.2: Define ModelRegistry class structure**
  - Define `ModelRegistry` class
  - Add private static `instance`: ModelRegistry | null
  - Add private `memoryCache`: Map<string, AIModel>
  - Add private `cacheExpiresAt`: Date | null
  - Add private `client`: OpenRouterClient
  - Add private `memoryCacheTTL`: number = 60 * 60 * 1000 (1 hour)
  - Add private `dbCacheTTL`: number = 24 * 60 * 60 * 1000 (24 hours)
  - Add private `syncInProgress`: boolean = false
  - Add private `syncPromise`: Promise<void> | null
  - _Requirements: 3, 4, 13_

- [x] **Task 4.1.3: Implement singleton pattern**
  - Create private constructor
  - Initialize memoryCache as new Map()
  - Initialize client as new OpenRouterClient()
  - Create static `getInstance()` method
  - Create static `resetInstance()` method for testing
  - _Requirements: 13_

- [x] **Task 4.1.4: Implement getModels method**
  - Create public `getModels(options?: { forceRefresh?: boolean }): Promise<AIModel[]>`
  - If forceRefresh, call syncModels()
  - Check memory cache validity (within TTL)
  - If memory cache valid, return cached models
  - Otherwise, call loadFromDatabase()
  - If database stale, trigger sync
  - Return models array
  - _Requirements: 2, 3, 4_

- [x] **Task 4.1.5: Implement getModel method**
  - Create public `getModel(modelId: string): Promise<AIModel | null>`
  - Check memory cache first
  - If not in memory, query database
  - Return null if not found
  - _Requirements: 2_

- [x] **Task 4.1.6: Implement getModelPricing method**
  - Create public `getModelPricing(modelId: string): Promise<ModelPricing | null>`
  - Get model from cache/db
  - Extract and return pricing object
  - Return null if model not found
  - _Requirements: 8_

- [x] **Task 4.1.7: Implement loadFromDatabase method**
  - Create private `loadFromDatabase(): Promise<AIModel[]>`
  - Query ai_models table where isActive = true
  - Transform database records to AIModel interface
  - Populate memory cache
  - Set cacheExpiresAt
  - Check if lastSyncedAt is older than dbCacheTTL
  - Return models array
  - _Requirements: 3, 4_

- [x] **Task 4.1.8: Implement syncModels method**
  - Create public `syncModels(): Promise<void>`
  - Implement request coalescing (return existing promise if sync in progress)
  - Set syncInProgress = true
  - Log "Starting model sync from OpenRouter"
  - Fetch models from OpenRouter via client
  - Call updateDatabase with fetched models
  - Refresh memory cache
  - Log completion with model count and duration
  - Handle errors gracefully (log and continue with stale cache)
  - Set syncInProgress = false
  - _Requirements: 3, 5_

- [x] **Task 4.1.9: Implement updateDatabase method**
  - Create private `updateDatabase(models: OpenRouterModel[]): Promise<void>`
  - Get existing model IDs from database
  - For each model from OpenRouter:
    - Transform to database format
    - Parse pricing strings to numbers
    - Upsert into database (insert or update)
  - Mark models not in API response as isActive = false
  - Update lastSyncedAt for all synced models
  - _Requirements: 3_

- [x] **Task 4.1.10: Implement transformModel helper**
  - Create private `transformToAIModel(dbModel: typeof aiModels.$inferSelect): AIModel`
  - Map database fields to AIModel interface
  - Parse JSON fields (inputModalities, outputModalities, supportedParameters)
  - Construct pricing object
  - _Requirements: 2, 3_

- [x] **Task 4.1.11: Implement clearCache method**
  - Create public `clearCache(): void`
  - Clear memoryCache Map
  - Set cacheExpiresAt to null
  - Log cache cleared
  - _Requirements: 4_

---

## PHASE 5: USAGE TRACKER

### 5.1 Usage Recording

- [x] **Task 5.1.1: Create UsageTracker.ts file**
  - Create `/apps/api/src/shared-services/ask-ai/UsageTracker.ts`
  - Add file header with JSDoc documentation
  - Import db from '../../db'
  - Import aiUsage schema
  - Import createId from @paralleldrive/cuid2
  - Import types
  - Import Drizzle operators
  - _Requirements: 7, 9_

- [x] **Task 5.1.2: Define UsageTracker class structure**
  - Define `UsageTracker` class
  - Add private static `instance`: UsageTracker | null
  - Add private `modelRegistry`: ModelRegistry reference
  - _Requirements: 7, 13_

- [x] **Task 5.1.3: Implement singleton pattern**
  - Create private constructor
  - Initialize modelRegistry via getInstance()
  - Create static `getInstance()` method
  - Create static `resetInstance()` method for testing
  - _Requirements: 13_

- [x] **Task 5.1.4: Implement recordUsage method**
  - Create public `recordUsage(params: RecordUsageParams): Promise<void>`
  - Accept: pluginId, userId, tenantId, modelId, promptTokens, completionTokens, durationMs, status, error, metadata
  - Calculate costs using model pricing
  - Generate unique ID with createId()
  - Insert record into ai_usage table
  - Wrap in try-catch (non-blocking)
  - Log errors but don't throw
  - _Requirements: 7_

- [x] **Task 5.1.5: Implement calculateCosts helper**
  - Create private `calculateCosts(modelId: string, promptTokens: number, completionTokens: number): Promise<CostBreakdown>`
  - Get model pricing from ModelRegistry
  - Calculate promptCost = promptTokens * pricing.prompt
  - Calculate completionCost = completionTokens * pricing.completion
  - Calculate totalCost = promptCost + completionCost + pricing.request
  - Return { promptCost, completionCost, totalCost }
  - Handle missing model (return zeros with warning)
  - _Requirements: 8_

- [x] **Task 5.1.6: Implement getUsageByPlugin method**
  - Create public `getUsageByPlugin(pluginId: string, dateRange?: DateRange): Promise<UsageSummary>`
  - Query ai_usage where pluginId matches
  - Apply date filters if provided
  - Aggregate: count, sum tokens, sum costs
  - Group by modelId for byModel breakdown
  - Return UsageSummary
  - _Requirements: 9_

- [x] **Task 5.1.7: Implement getUsageByUser method**
  - Create public `getUsageByUser(userId: string, dateRange?: DateRange): Promise<UsageSummary>`
  - Query ai_usage where userId matches
  - Apply date filters if provided
  - Aggregate results
  - Return UsageSummary
  - _Requirements: 9_

- [x] **Task 5.1.8: Implement getUsageByTenant method**
  - Create public `getUsageByTenant(tenantId: string, dateRange?: DateRange): Promise<UsageSummary>`
  - Query ai_usage where tenantId matches
  - Apply date filters if provided
  - Aggregate results
  - Return UsageSummary
  - _Requirements: 9_

- [x] **Task 5.1.9: Implement getTotalCost method**
  - Create public `getTotalCost(dateRange?: DateRange): Promise<number>`
  - Query sum of totalCost from ai_usage
  - Apply date filters if provided
  - Return total cost number
  - _Requirements: 9_

- [x] **Task 5.1.10: Implement buildUsageSummary helper**
  - Create private `buildUsageSummary(records: AIUsage[]): UsageSummary`
  - Calculate totalRequests as record count
  - Calculate totalTokens as sum of totalTokens
  - Calculate totalCost as sum of totalCost
  - Build byModel record with aggregation per model
  - Return UsageSummary object
  - _Requirements: 9_

---

## PHASE 6: MAIN SERVICE

### 6.1 AskAI Service Implementation

- [x] **Task 6.1.1: Create AskAIService.ts file**
  - Create `/apps/api/src/shared-services/ask-ai/AskAIService.ts`
  - Add file header with JSDoc documentation
  - Import all dependencies
  - _Requirements: 13_

- [x] **Task 6.1.2: Define AskAIService class structure**
  - Define `AskAIService` class
  - Add private static `instance`: AskAIService | null
  - Add private `client`: OpenRouterClient
  - Add private `modelRegistry`: ModelRegistry
  - Add private `usageTracker`: UsageTracker
  - Add private `isShuttingDown`: boolean = false
  - _Requirements: 13_

- [x] **Task 6.1.3: Implement singleton pattern**
  - Create private constructor
  - Initialize client, modelRegistry, usageTracker
  - Log "AskAI Service initialized"
  - Create static `getInstance()` method
  - Create static `resetInstance()` method
  - _Requirements: 13, 17_

- [x] **Task 6.1.4: Implement input validation**
  - Create private `validateCompletionRequest(request: CompletionRequest): void`
  - Check model is not empty
  - Check messages array is not empty
  - Check each message has valid role
  - Check each message has non-empty content
  - Check pluginId is not empty
  - Validate temperature range (0-2) if provided
  - Validate maxTokens is positive if provided
  - Validate topP range (0-1) if provided
  - Throw AIServiceError with INVALID_REQUEST for failures
  - _Requirements: 18_

- [x] **Task 6.1.5: Implement complete method**
  - Create public `complete(request: CompletionRequest): Promise<CompletionResult>`
  - Check isShuttingDown flag
  - Call validateCompletionRequest
  - Record start time
  - Verify model exists via modelRegistry
  - Build OpenRouter request with optional systemPrompt prepended
  - Call client.createCompletion
  - Calculate duration
  - Extract response content
  - Get usage from response
  - Calculate cost
  - Record usage (non-blocking)
  - Build and return CompletionResult
  - _Requirements: 6, 7, 8_

- [x] **Task 6.1.6: Implement error handling in complete method**
  - Wrap API call in try-catch
  - On error, record failed usage
  - Re-throw AIServiceError with appropriate code
  - Log error details
  - _Requirements: 14, 17_

- [x] **Task 6.1.7: Implement listModels method**
  - Create public `listModels(filters?: ModelFilters): Promise<AIModel[]>`
  - Get all models from modelRegistry
  - Apply filters if provided:
    - Filter by modality
    - Filter by inputModality (check array includes)
    - Filter by provider (extract from model id)
    - Filter by minContextLength
    - Filter by maxPrice (prompt price)
  - Return filtered array
  - _Requirements: 2_

- [x] **Task 6.1.8: Implement getModel method**
  - Create public `getModel(modelId: string): Promise<AIModel | null>`
  - Delegate to modelRegistry.getModel
  - _Requirements: 2_

- [x] **Task 6.1.9: Implement getUsage method**
  - Create public `getUsage(params: UsageQueryParams): Promise<UsageSummary>`
  - Accept pluginId, userId, tenantId, dateRange
  - Route to appropriate UsageTracker method
  - Return UsageSummary
  - _Requirements: 9_

- [x] **Task 6.1.10: Implement syncModels method**
  - Create public `syncModels(): Promise<void>`
  - Delegate to modelRegistry.syncModels
  - _Requirements: 5_

- [x] **Task 6.1.11: Implement shutdown method**
  - Create public `shutdown(): Promise<void>`
  - Set isShuttingDown = true
  - Unschedule cron automation
  - Unregister execution callback
  - Log "AskAI Service shutdown complete"
  - _Requirements: 19_

---

## PHASE 7: SERVICE INTEGRATION

### 7.1 Exports and Registration

- [x] **Task 7.1.1: Create index.ts exports file**
  - Create `/apps/api/src/shared-services/ask-ai/index.ts`
  - Export AskAIService class
  - Export getAskAIService helper function
  - Export all types from types.ts
  - Export ModelRegistry (for direct access if needed)
  - Export UsageTracker (for direct access if needed)
  - Add JSDoc module documentation
  - _Requirements: 16_

- [x] **Task 7.1.2: Implement getAskAIService helper**
  - Create `getAskAIService(): AskAIService`
  - Return AskAIService.getInstance()
  - Add JSDoc with usage example
  - _Requirements: 16_

- [x] **Task 7.1.3: Create cron integration module**
  - Create initialization function for cron registration
  - Import CronScheduler
  - Register execution callback for 'ask-ai' plugin
  - Schedule daily model sync automation
  - Use cron expression '0 3 * * *'
  - Export initialization function
  - _Requirements: 5_

- [x] **Task 7.1.4: Update shared-services index (if exists)**
  - Check if `/apps/api/src/shared-services/index.ts` exists
  - If exists, add `export * from './ask-ai'`
  - If not, consider creating it
  - _Requirements: 16_

---

## PHASE 8: TESTING

### 8.1 Unit Tests

- [ ] **Task 8.1.1: Create test file for types**
  - Create `/apps/api/src/shared-services/ask-ai/__tests__/types.test.ts`
  - Test AIServiceError construction
  - Test error code values
  - _Requirements: 12, 14_

- [ ] **Task 8.1.2: Create test file for OpenRouterClient**
  - Create `/apps/api/src/shared-services/ask-ai/__tests__/OpenRouterClient.test.ts`
  - Mock fetch globally
  - Test constructor throws on missing API key
  - Test listModels parses response correctly
  - Test createCompletion sends correct request
  - Test error handling for various status codes
  - Test timeout handling
  - _Requirements: 1_

- [ ] **Task 8.1.3: Create test file for ModelRegistry**
  - Create `/apps/api/src/shared-services/ask-ai/__tests__/ModelRegistry.test.ts`
  - Mock OpenRouterClient
  - Mock database operations
  - Test singleton pattern
  - Test memory cache TTL
  - Test database fallback
  - Test sync functionality
  - Test request coalescing
  - _Requirements: 3, 4_

- [ ] **Task 8.1.4: Create test file for UsageTracker**
  - Create `/apps/api/src/shared-services/ask-ai/__tests__/UsageTracker.test.ts`
  - Mock database operations
  - Test recordUsage inserts correctly
  - Test cost calculation accuracy
  - Test aggregation queries
  - Test date range filtering
  - _Requirements: 7, 8, 9_

- [ ] **Task 8.1.5: Create test file for AskAIService**
  - Create `/apps/api/src/shared-services/ask-ai/__tests__/AskAIService.test.ts`
  - Mock all dependencies
  - Test complete method end-to-end
  - Test input validation
  - Test error handling
  - Test model filtering
  - Test usage recording on success and failure
  - _Requirements: 6, 18_

### 8.2 Integration Tests

- [ ] **Task 8.2.1: Create integration test file**
  - Create `/apps/api/src/shared-services/ask-ai/__tests__/integration.test.ts`
  - Add conditional skip for CI (requires real API key)
  - Test full completion flow with real OpenRouter
  - Test model sync with real API
  - Verify database persistence
  - _Requirements: All_

- [ ] **Task 8.2.2: Add test scripts to package.json**
  - Add test command for ask-ai module
  - Ensure tests run with bun test
  - _Requirements: Code Quality_

---

## PHASE 9: DOCUMENTATION & POLISH

### 9.1 Documentation

- [x] **Task 9.1.1: Add comprehensive JSDoc to all files**
  - Review all files for missing documentation
  - Add @module tags
  - Add @example blocks with usage code
  - Document all public methods
  - Document all exported types
  - _Requirements: 17_

- [x] **Task 9.1.2: Create README for ask-ai module**
  - Create `/apps/api/src/shared-services/ask-ai/README.md`
  - Document installation/setup
  - Document configuration
  - Document API reference
  - Include code examples
  - Document error handling
  - _Requirements: 17_

### 9.2 Final Review

- [ ] **Task 9.2.1: Run TypeScript type check**
  - Run `bun run typecheck` from project root
  - Fix any type errors
  - Ensure strict mode compliance
  - _Requirements: Code Quality_

- [ ] **Task 9.2.2: Run all tests**
  - Run `bun run test`
  - Ensure all tests pass
  - Fix any failing tests
  - _Requirements: Code Quality_

- [ ] **Task 9.2.3: Run build**
  - Run `bun run build`
  - Ensure build succeeds
  - Test built output
  - _Requirements: Code Quality_

- [ ] **Task 9.2.4: Manual integration test**
  - Start the API server
  - Test model listing endpoint
  - Test completion with real model
  - Verify usage recorded in database
  - Test cron sync (manually trigger or wait)
  - _Requirements: All_

---

## PHASE 10: FINAL VERIFICATION

### 10.1 Build & Deploy Readiness

- [ ] **Task 10.1.1: Verify production build**
  - Run `bun run build` from project root
  - Check for any build warnings
  - Verify all files included in output
  - _Requirements: Code Quality_

- [ ] **Task 10.1.2: Verify database migrations**
  - Check migration files are generated
  - Verify schema matches implementation
  - Test migration on clean database
  - _Requirements: 10, 11_

- [ ] **Task 10.1.3: Verify environment configuration**
  - Check .env.example has all required variables
  - Verify defaults are sensible
  - Test with minimal configuration
  - _Requirements: 15_

### 10.2 Final Acceptance

- [ ] **Task 10.2.1: Review all requirements**
  - Go through requirements.md
  - Verify each acceptance criterion is met
  - Document any deviations
  - _Requirements: All_

- [ ] **Task 10.2.2: Performance verification**
  - Test model listing response time (< 100ms cached)
  - Test completion overhead (< 50ms)
  - Verify model sync completes (< 30s)
  - _Requirements: Performance_

- [ ] **Task 10.2.3: Security review**
  - Verify API key not logged
  - Verify API key not in errors
  - Check for any sensitive data exposure
  - _Requirements: Security_

- [ ] **Task 10.2.4: Final code review**
  - Review all new files
  - Check for code quality issues
  - Verify patterns match existing codebase
  - _Requirements: Code Quality_

---

## Summary

**Total Tasks:** 95
**Estimated Time:** 3-4 days

**Critical Path:**
1. Phase 1: Foundation & Database Schema (0.5 days)
2. Phase 2: Type Definitions (0.25 days)
3. Phase 3: OpenRouter Client (0.5 days)
4. Phase 4: Model Registry (0.5 days)
5. Phase 5: Usage Tracker (0.5 days)
6. Phase 6: Main Service (0.5 days)
7. Phase 7: Service Integration (0.25 days)
8. Phase 8: Testing (0.5 days)
9. Phase 9: Documentation & Polish (0.25 days)
10. Phase 10: Final Verification (0.25 days)

**Key Milestones:**
- Database schema created and migrated
- OpenRouter client functional
- Model caching working (memory + DB)
- Completions working with usage tracking
- All tests passing
- Documentation complete

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-28
**Status:** Ready for Implementation
