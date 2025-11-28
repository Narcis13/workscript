# Requirements Document: Ask-AI Shared Service

## Introduction

The Ask-AI shared service is a centralized AI integration layer for the Workscript platform that wraps OpenRouter APIs to provide workscript plugins with unified access to 300+ AI models from multiple providers (OpenAI, Anthropic, Google, Meta, Mistral, etc.) through a single, consistent interface.

This service addresses the need for plugins and workflows to interact with AI models without managing individual provider integrations, API keys, or pricing complexities. By abstracting the OpenRouter API behind a clean facade, plugins can request AI completions with automatic model discovery, cost calculation, and comprehensive usage tracking for billing and analytics purposes.

The Ask-AI service integrates with the existing shared-services architecture, following established patterns from IntegrationManager, CronScheduler, and EmailService. It uses MySQL for persistent model caching and usage tracking, implements the singleton pattern for consistent state management, and leverages the CronScheduler for automated model synchronization. The service is built with TypeScript, uses Drizzle ORM for database operations, and follows the bhvr stack conventions (Bun + Hono + Vite + React).

Key technologies include: OpenRouter API for model access, MySQL with Drizzle ORM for persistence, native fetch for HTTP requests, and CUID2 for ID generation. The service prioritizes non-streaming completions for initial implementation, with streaming support planned for future iterations.

---

## Requirements

### Requirement 1: OpenRouter API Client

**User Story:** As a backend developer, I want a robust HTTP client for OpenRouter API, so that I can reliably communicate with the OpenRouter service without handling low-level HTTP details.

#### Acceptance Criteria

1. WHEN the OpenRouterClient is instantiated THEN it must read the `OPENROUTER_API_KEY` from environment variables
2. WHEN the API key is missing or empty THEN the client must throw an `AIServiceError` with code `MISSING_API_KEY`
3. WHEN making any API request THEN the client must include the `Authorization: Bearer <API_KEY>` header
4. WHEN making any API request THEN the client must include the `HTTP-Referer` header with the configured site URL
5. WHEN making any API request THEN the client must include the `X-Title` header with the configured site name
6. WHEN making any API request THEN the client must include `Content-Type: application/json` header
7. WHEN a request takes longer than 30 seconds THEN the client must abort and throw a timeout error
8. WHEN the OpenRouter API returns a 4xx error THEN the client must parse the error response and throw a structured `AIServiceError`
9. WHEN the OpenRouter API returns a 5xx error THEN the client must include retry information in the error
10. WHEN the OpenRouter API returns invalid JSON THEN the client must throw a parse error with the raw response
11. WHEN calling `listModels()` THEN the client must make a GET request to `/api/v1/models`
12. WHEN calling `createCompletion()` THEN the client must make a POST request to `/api/v1/chat/completions`
13. WHEN the client receives a successful response THEN it must parse and return the typed response object

---

### Requirement 2: Model Discovery and Listing

**User Story:** As a plugin developer, I want to discover available AI models with their capabilities and pricing, so that I can choose the appropriate model for my use case.

#### Acceptance Criteria

1. WHEN calling `listModels()` without filters THEN the service must return all available active models
2. WHEN calling `listModels()` with a modality filter THEN the service must return only models matching that modality (e.g., "text->text")
3. WHEN calling `listModels()` with an inputModality filter THEN the service must return models supporting that input type (e.g., "text", "image")
4. WHEN calling `listModels()` with a provider filter THEN the service must return models from that provider (e.g., "openai", "anthropic")
5. WHEN calling `listModels()` with a minContextLength filter THEN the service must return models with context length >= the specified value
6. WHEN calling `listModels()` with a maxPrice filter THEN the service must return models with prompt price <= the specified value
7. WHEN calling `getModel(modelId)` with a valid model ID THEN the service must return the complete model information including pricing
8. WHEN calling `getModel(modelId)` with an invalid model ID THEN the service must return null
9. WHEN listing models THEN each model must include: id, name, description, contextLength, pricing, modality, inputModalities, outputModalities, tokenizer, maxCompletionTokens, and supportedParameters
10. WHEN listing models THEN the pricing object must include: prompt (per token), completion (per token), request, and image costs
11. WHEN a model is marked as inactive in the database THEN it must not be returned in listing results

---

### Requirement 3: Model Cache with Database Persistence

**User Story:** As a system administrator, I want models to be cached in the database with periodic refresh, so that the service provides fast responses without excessive API calls to OpenRouter.

#### Acceptance Criteria

1. WHEN the ModelRegistry is first accessed THEN it must attempt to load models from the database cache
2. WHEN the database cache is empty THEN the registry must synchronize models from OpenRouter API
3. WHEN the database cache is older than 24 hours THEN the registry must refresh from OpenRouter API on next access
4. WHEN models are fetched from OpenRouter THEN they must be persisted to the `ai_models` table
5. WHEN syncing models THEN new models must be inserted into the database
6. WHEN syncing models THEN existing models must be updated with latest pricing and metadata
7. WHEN syncing models THEN models no longer available from OpenRouter must be marked as `isActive = false`
8. WHEN calling `getModels({ forceRefresh: true })` THEN the registry must bypass cache and sync from OpenRouter
9. WHEN multiple requests arrive simultaneously during cache refresh THEN only one API call must be made (request coalescing)
10. WHEN model sync completes THEN the `lastSyncedAt` timestamp must be updated
11. WHEN model sync fails THEN the registry must use stale cache and log the error
12. WHEN the in-memory cache expires (1 hour) THEN the next request must check the database cache before calling OpenRouter

---

### Requirement 4: In-Memory Model Cache

**User Story:** As a backend developer, I want frequently accessed model data cached in memory, so that lookups are fast and don't require database queries for every request.

#### Acceptance Criteria

1. WHEN models are loaded from the database THEN they must be stored in an in-memory Map
2. WHEN the in-memory cache is accessed within 1 hour of population THEN it must return cached data without database access
3. WHEN the in-memory cache expires (older than 1 hour) THEN the next access must check the database
4. WHEN `getModel(modelId)` is called THEN the registry must first check the in-memory cache
5. WHEN a model is not found in memory cache THEN the registry must check the database
6. WHEN the memory cache is invalidated THEN subsequent requests must repopulate from the database
7. WHEN model sync completes THEN the in-memory cache must be refreshed with new data
8. WHEN the server restarts THEN the in-memory cache must be repopulated from the database on first access
9. WHEN `clearCache()` is called THEN both in-memory cache and cache expiration must be reset

---

### Requirement 5: Scheduled Model Synchronization

**User Story:** As a system administrator, I want models to be automatically synchronized daily, so that the cache stays up-to-date with OpenRouter's latest models and pricing.

#### Acceptance Criteria

1. WHEN the AskAI service initializes THEN it must register an execution callback with CronScheduler for the 'ask-ai' plugin
2. WHEN the cron job triggers THEN it must call `ModelRegistry.syncModels()`
3. WHEN scheduling the automation THEN the cron expression must be `0 3 * * *` (3 AM daily UTC)
4. WHEN sync succeeds THEN the CronScheduler callback must return `{ success: true }`
5. WHEN sync fails THEN the CronScheduler callback must return `{ success: false, error: errorMessage }`
6. WHEN the service shuts down THEN it must unschedule the automation and unregister the callback
7. WHEN the sync interval environment variable is set THEN it must be used to determine refresh frequency
8. WHEN manual sync is triggered via `forceRefresh` THEN it must not affect the scheduled sync timing

---

### Requirement 6: AI Completion Requests

**User Story:** As a plugin developer, I want to send chat completion requests to AI models, so that I can integrate AI capabilities into my workflows.

#### Acceptance Criteria

1. WHEN calling `complete()` THEN the request must include a model ID, messages array, and pluginId
2. WHEN calling `complete()` with a valid model THEN the service must forward the request to OpenRouter
3. WHEN calling `complete()` with an invalid/unknown model THEN the service must throw `MODEL_NOT_FOUND` error
4. WHEN the messages array is empty THEN the service must throw `INVALID_REQUEST` error
5. WHEN providing a systemPrompt parameter THEN the service must prepend a system message to the messages array
6. WHEN providing temperature parameter THEN it must be passed to OpenRouter (range: 0-2)
7. WHEN providing maxTokens parameter THEN it must be passed to OpenRouter as `max_tokens`
8. WHEN providing topP parameter THEN it must be passed to OpenRouter as `top_p`
9. WHEN providing frequencyPenalty parameter THEN it must be passed to OpenRouter as `frequency_penalty`
10. WHEN providing presencePenalty parameter THEN it must be passed to OpenRouter as `presence_penalty`
11. WHEN OpenRouter returns a successful completion THEN the service must return the response content
12. WHEN OpenRouter returns usage data THEN the service must include promptTokens, completionTokens, and totalTokens in the result
13. WHEN the completion succeeds THEN the service must calculate and include the cost based on model pricing
14. WHEN the completion succeeds THEN the service must include the request duration in milliseconds
15. WHEN the completion fails THEN the service must return the error with appropriate error code

---

### Requirement 7: Usage Tracking and Recording

**User Story:** As a system administrator, I want all AI completions tracked in the database, so that I can analyze usage patterns and allocate costs to plugins and users.

#### Acceptance Criteria

1. WHEN a completion request succeeds THEN the UsageTracker must record a usage entry with status 'success'
2. WHEN a completion request fails THEN the UsageTracker must record a usage entry with status 'error' and error message
3. WHEN recording usage THEN the entry must include: pluginId, modelId, promptTokens, completionTokens, totalTokens
4. WHEN recording usage THEN the entry must include calculated costs: promptCost, completionCost, totalCost
5. WHEN recording usage THEN the entry must include requestDurationMs for latency tracking
6. WHEN userId is provided in the completion request THEN it must be recorded in the usage entry
7. WHEN tenantId is provided in the completion request THEN it must be recorded in the usage entry
8. WHEN metadata is provided THEN it must be stored as JSON in the usage entry
9. WHEN recording usage THEN a unique CUID2 ID must be generated for the entry
10. WHEN recording usage THEN the createdAt timestamp must be automatically set
11. IF usage recording fails THEN the completion result must still be returned (non-blocking)
12. IF usage recording fails THEN the error must be logged for investigation

---

### Requirement 8: Cost Calculation

**User Story:** As a plugin developer, I want accurate cost calculations for AI requests, so that I can understand the financial impact of my integrations.

#### Acceptance Criteria

1. WHEN calculating cost THEN promptCost must equal `promptTokens * model.pricing.prompt`
2. WHEN calculating cost THEN completionCost must equal `completionTokens * model.pricing.completion`
3. WHEN calculating cost THEN totalCost must equal `promptCost + completionCost + requestCost`
4. WHEN the model has a per-request cost THEN it must be included in totalCost
5. WHEN model pricing uses string values (e.g., "0.00003") THEN they must be parsed to numbers correctly
6. WHEN model pricing is returned in per-million-token format THEN it must be converted to per-token
7. WHEN cost is calculated THEN it must maintain precision to at least 12 decimal places
8. WHEN a model is not found in the registry THEN cost calculation must use zeros and log a warning
9. WHEN returning cost in CompletionResult THEN it must be the total cost in USD

---

### Requirement 9: Usage Analytics Queries

**User Story:** As a system administrator, I want to query usage data by plugin, user, and time range, so that I can generate reports and analyze AI consumption.

#### Acceptance Criteria

1. WHEN calling `getUsageByPlugin(pluginId)` THEN the tracker must return aggregated usage for that plugin
2. WHEN calling `getUsageByUser(userId)` THEN the tracker must return aggregated usage for that user
3. WHEN calling `getUsageByTenant(tenantId)` THEN the tracker must return aggregated usage for that tenant
4. WHEN providing a dateRange parameter THEN results must be filtered to that time period
5. WHEN the dateRange.from is provided THEN only records with createdAt >= from must be included
6. WHEN the dateRange.to is provided THEN only records with createdAt <= to must be included
7. WHEN returning UsageSummary THEN it must include: totalRequests, totalTokens, totalCost
8. WHEN returning UsageSummary THEN it must include byModel breakdown with requests, tokens, and cost per model
9. WHEN calling `getTotalCost()` THEN it must return the sum of all totalCost values
10. WHEN calling `getTotalCost(dateRange)` THEN it must return the sum filtered by date range
11. WHEN no usage records exist for the query THEN return a summary with zero values
12. WHEN querying large datasets THEN the query must be optimized with appropriate indexes

---

### Requirement 10: Database Schema for AI Models

**User Story:** As a database administrator, I want a well-structured schema for AI models, so that model data is stored efficiently with proper indexing.

#### Acceptance Criteria

1. WHEN creating the ai_models table THEN id must be varchar(128) and serve as primary key
2. WHEN creating the ai_models table THEN name must be varchar(255) and not null
3. WHEN creating the ai_models table THEN description must be text type to allow long descriptions
4. WHEN creating the ai_models table THEN contextLength must be int type
5. WHEN creating the ai_models table THEN pricing fields (promptPrice, completionPrice, requestPrice, imagePrice) must be decimal(18,12)
6. WHEN creating the ai_models table THEN modality must be varchar(50)
7. WHEN creating the ai_models table THEN inputModalities and outputModalities must be JSON arrays
8. WHEN creating the ai_models table THEN supportedParameters must be JSON array
9. WHEN creating the ai_models table THEN isActive must be boolean with default true
10. WHEN creating the ai_models table THEN lastSyncedAt must be timestamp type
11. WHEN creating the ai_models table THEN createdAt must have defaultNow()
12. WHEN creating the ai_models table THEN updatedAt must have onUpdateNow()
13. WHEN creating indexes THEN modality must be indexed for filtering
14. WHEN creating indexes THEN isActive must be indexed for active model queries
15. WHEN creating indexes THEN lastSyncedAt must be indexed for cache staleness checks

---

### Requirement 11: Database Schema for AI Usage

**User Story:** As a database administrator, I want a well-structured schema for AI usage tracking, so that usage data can be efficiently queried for analytics.

#### Acceptance Criteria

1. WHEN creating the ai_usage table THEN id must be varchar(128) primary key with CUID2 default
2. WHEN creating the ai_usage table THEN pluginId must be varchar(128) and not null
3. WHEN creating the ai_usage table THEN userId must be varchar(128) and nullable
4. WHEN creating the ai_usage table THEN tenantId must be varchar(128) and nullable
5. WHEN creating the ai_usage table THEN modelId must be varchar(128) and not null
6. WHEN creating the ai_usage table THEN token fields (promptTokens, completionTokens, totalTokens) must be int and not null
7. WHEN creating the ai_usage table THEN cost fields (promptCost, completionCost, totalCost) must be decimal(18,12)
8. WHEN creating the ai_usage table THEN requestDurationMs must be int type
9. WHEN creating the ai_usage table THEN status must be varchar(20) for 'success' or 'error'
10. WHEN creating the ai_usage table THEN errorMessage must be text type and nullable
11. WHEN creating the ai_usage table THEN metadata must be JSON type and nullable
12. WHEN creating indexes THEN pluginId must be indexed for plugin analytics
13. WHEN creating indexes THEN userId must be indexed for user analytics
14. WHEN creating indexes THEN tenantId must be indexed for tenant isolation
15. WHEN creating indexes THEN modelId must be indexed for model popularity
16. WHEN creating indexes THEN createdAt must be indexed for time-range queries
17. WHEN creating indexes THEN composite index (pluginId, createdAt) must exist for plugin time-series queries

---

### Requirement 12: TypeScript Type Definitions

**User Story:** As a TypeScript developer, I want comprehensive type definitions, so that I have full IntelliSense support and compile-time type safety.

#### Acceptance Criteria

1. WHEN defining ChatMessage THEN it must include role ('system' | 'user' | 'assistant') and content (string)
2. WHEN defining CompletionRequest THEN it must include model, messages, pluginId as required fields
3. WHEN defining CompletionRequest THEN it must include userId, tenantId, temperature, maxTokens, topP, frequencyPenalty, presencePenalty as optional fields
4. WHEN defining CompletionResult THEN it must include id, model, content, finishReason, usage, and durationMs
5. WHEN defining CompletionResult.usage THEN it must include promptTokens, completionTokens, totalTokens, and cost
6. WHEN defining AIModel THEN it must include id, name, description, contextLength, pricing, modality, inputModalities, outputModalities, tokenizer, maxCompletionTokens, supportedParameters
7. WHEN defining ModelPricing THEN it must include prompt, completion, request, and image as numbers
8. WHEN defining UsageSummary THEN it must include totalRequests, totalTokens, totalCost, and byModel record
9. WHEN defining DateRange THEN it must include optional from and to Date fields
10. WHEN defining ModelFilters THEN it must include optional modality, inputModality, provider, minContextLength, maxPrice fields
11. WHEN defining AIServiceError THEN it must extend Error and include code, provider, and details fields
12. WHEN exporting types THEN all interfaces and types must be exported from types.ts

---

### Requirement 13: Singleton Service Pattern

**User Story:** As a backend developer, I want the AskAI service to follow the singleton pattern, so that there is consistent state management across the application.

#### Acceptance Criteria

1. WHEN AskAIService is first instantiated THEN it must create single instances of OpenRouterClient, ModelRegistry, and UsageTracker
2. WHEN calling `AskAIService.getInstance()` THEN it must return the same instance on every call
3. WHEN calling `getInstance()` for the first time THEN it must initialize all dependencies
4. WHEN calling `ModelRegistry.getInstance()` THEN it must return the same ModelRegistry instance
5. WHEN calling `UsageTracker.getInstance()` THEN it must return the same UsageTracker instance
6. WHEN the service needs testing THEN `resetInstance()` static method must clear the singleton
7. WHEN exporting the service THEN provide a `getAskAIService()` helper function
8. WHEN multiple plugins call the service concurrently THEN they must share the same instances

---

### Requirement 14: Error Handling and Error Types

**User Story:** As a plugin developer, I want structured error handling with specific error codes, so that I can handle different failure scenarios appropriately.

#### Acceptance Criteria

1. WHEN an error occurs THEN it must be wrapped in AIServiceError with appropriate code
2. WHEN API key is missing THEN error code must be `MISSING_API_KEY`
3. WHEN model is not found THEN error code must be `MODEL_NOT_FOUND`
4. WHEN request validation fails THEN error code must be `INVALID_REQUEST`
5. WHEN OpenRouter returns rate limit error THEN error code must be `RATE_LIMITED`
6. WHEN OpenRouter returns authentication error THEN error code must be `AUTH_FAILED`
7. WHEN request times out THEN error code must be `TIMEOUT`
8. WHEN OpenRouter returns server error THEN error code must be `PROVIDER_ERROR`
9. WHEN network fails THEN error code must be `NETWORK_ERROR`
10. WHEN database operation fails THEN error code must be `DATABASE_ERROR`
11. WHEN an error includes details THEN they must be accessible via error.details object
12. WHEN logging errors THEN include timestamp, error code, message, and stack trace

---

### Requirement 15: Environment Configuration

**User Story:** As a DevOps engineer, I want all configuration via environment variables, so that the service can be deployed in different environments without code changes.

#### Acceptance Criteria

1. WHEN configuring OpenRouter THEN `OPENROUTER_API_KEY` environment variable must be required
2. WHEN configuring site info THEN `OPENROUTER_SITE_URL` must be optional with default of CLIENT_URL
3. WHEN configuring site info THEN `OPENROUTER_SITE_NAME` must be optional with default of "Workscript"
4. WHEN configuring sync interval THEN `AI_MODEL_SYNC_INTERVAL` must be optional with default of 86400 (24 hours)
5. WHEN configuring timeouts THEN `AI_REQUEST_TIMEOUT` must be optional with default of 30000 (30 seconds)
6. WHEN the .env.example file is updated THEN it must include all AI-related configuration with documentation
7. WHEN configuration is missing required values THEN service initialization must fail with clear error message
8. WHEN configuration values are invalid THEN service must log warning and use defaults where possible

---

### Requirement 16: Service Integration and Export

**User Story:** As a plugin developer, I want the Ask-AI service properly exported and integrated, so that I can easily import and use it in my plugins.

#### Acceptance Criteria

1. WHEN importing from shared-services THEN AskAIService must be available via `import { AskAIService } from '../shared-services/ask-ai'`
2. WHEN importing from shared-services THEN helper function `getAskAIService()` must be available
3. WHEN importing from shared-services THEN all types must be re-exported for plugin use
4. WHEN the db/index.ts is updated THEN it must import and include aiSchema in the combined schema
5. WHEN the shared-services/index.ts exists THEN it must export the ask-ai module
6. WHEN schema is registered THEN `ai_models` and `ai_usage` tables must be available via db object
7. WHEN running migrations THEN the AI tables must be created correctly

---

### Requirement 17: Logging and Observability

**User Story:** As a system administrator, I want comprehensive logging, so that I can monitor service health and debug issues.

#### Acceptance Criteria

1. WHEN the service initializes THEN it must log "AskAI Service initialized"
2. WHEN model sync starts THEN it must log "Starting model sync from OpenRouter"
3. WHEN model sync completes THEN it must log the number of models synced and duration
4. WHEN model sync fails THEN it must log the error with details
5. WHEN a completion request is made THEN it must log model, pluginId, and prompt token count
6. WHEN a completion succeeds THEN it must log completion tokens and duration
7. WHEN a completion fails THEN it must log error code, message, and model
8. WHEN rate limiting occurs THEN it must log the retry-after value if available
9. WHEN cache is refreshed THEN it must log cache statistics (hits, misses, size)
10. WHEN logging THEN use structured logging format compatible with existing patterns (console.log with emoji prefixes)

---

### Requirement 18: Input Validation

**User Story:** As a backend developer, I want all inputs validated before processing, so that invalid requests fail fast with clear error messages.

#### Acceptance Criteria

1. WHEN model ID is empty or undefined THEN throw INVALID_REQUEST with message "Model ID is required"
2. WHEN messages array is empty THEN throw INVALID_REQUEST with message "Messages array cannot be empty"
3. WHEN messages array contains invalid message THEN throw INVALID_REQUEST with details
4. WHEN message role is not valid THEN throw INVALID_REQUEST with accepted roles
5. WHEN message content is empty THEN throw INVALID_REQUEST with message "Message content cannot be empty"
6. WHEN pluginId is empty THEN throw INVALID_REQUEST with message "Plugin ID is required"
7. WHEN temperature is out of range (0-2) THEN throw INVALID_REQUEST with valid range
8. WHEN maxTokens is negative THEN throw INVALID_REQUEST with valid range
9. WHEN topP is out of range (0-1) THEN throw INVALID_REQUEST with valid range
10. WHEN validation fails THEN the error must include the field name and provided value

---

### Requirement 19: Graceful Shutdown

**User Story:** As a DevOps engineer, I want the service to shut down gracefully, so that in-flight requests complete and resources are cleaned up.

#### Acceptance Criteria

1. WHEN shutdown is initiated THEN the service must stop accepting new requests
2. WHEN shutdown is initiated THEN in-flight completion requests must be allowed to complete
3. WHEN shutdown is initiated THEN the cron automation must be unscheduled
4. WHEN shutdown is initiated THEN the execution callback must be unregistered from CronScheduler
5. WHEN shutdown completes THEN "AskAI Service shutdown complete" must be logged
6. WHEN the service provides a shutdown method THEN it must return a Promise that resolves when cleanup is done
7. IF shutdown times out THEN force cleanup must occur after a configurable timeout

---

### Requirement 20: Request/Response Message Format

**User Story:** As a plugin developer, I want the message format to be OpenAI-compatible, so that I can easily port existing integrations.

#### Acceptance Criteria

1. WHEN sending messages THEN the format must match OpenAI's chat completion format
2. WHEN a message has role 'system' THEN it must be sent first in the messages array
3. WHEN a message has role 'user' THEN content must be a string
4. WHEN a message has role 'assistant' THEN it represents the AI's previous response
5. WHEN OpenRouter returns a response THEN choices[0].message.content must be extracted
6. WHEN OpenRouter returns finish_reason THEN it must be included in CompletionResult
7. WHEN finish_reason is 'stop' THEN the model completed normally
8. WHEN finish_reason is 'length' THEN maxTokens was reached
9. WHEN the response includes model field THEN it must be included in CompletionResult (may differ from requested model)
10. WHEN the response includes an id THEN it must be included in CompletionResult

---

## Non-Functional Requirements

### Performance

- Model listing must return within 100ms when using in-memory cache
- Completion requests must add less than 50ms overhead beyond OpenRouter latency
- Database queries for usage must use indexed columns
- Model sync must handle 300+ models efficiently without memory issues
- In-memory cache must limit size to prevent unbounded memory growth

### Security

- API key must never be logged or included in error messages
- API key must be read from environment variables, not hardcoded
- User and tenant data must be isolated in usage queries
- Database connections must use prepared statements (Drizzle ORM handles this)
- No sensitive data (tokens, keys) in usage metadata

### Reliability

- Service must gracefully handle OpenRouter outages by using cached data
- Failed usage recording must not affect completion responses
- Model sync failures must not crash the service
- Request coalescing must prevent thundering herd on cache expiration

### Code Quality

- All public methods must have JSDoc documentation
- All exported types must have inline documentation
- Code must pass TypeScript strict mode
- Follow existing code patterns from IntegrationManager and CronScheduler
- Unit test coverage for core business logic

---

## Out of Scope

The following features are explicitly NOT included in this implementation:

1. **Streaming Completions** - SSE/streaming responses will be added in a future iteration
2. **Tool/Function Calling** - Advanced agentic features are not supported initially
3. **Image Generation** - Only text completion models are supported
4. **Embeddings API** - Vector embeddings are not included
5. **Fine-tuning** - Model customization is not supported
6. **Rate Limiting** - Per-plugin/user rate limits are not implemented
7. **Cost Alerts** - Automatic alerts when usage exceeds thresholds
8. **Model Recommendations** - Automatic model selection based on task
9. **Prompt Templates** - Reusable prompt management system
10. **Response Caching** - Caching identical requests is not implemented
11. **Multi-region** - Single OpenRouter endpoint, no regional fallbacks
12. **Billing Integration** - Usage data is tracked but not billed automatically

---

## Success Metrics

The implementation will be considered successful when:

1. **Functional Completeness**
   - [ ] All 20 requirements have been implemented
   - [ ] All acceptance criteria pass verification
   - [ ] Service can list 300+ models from OpenRouter
   - [ ] Completions work with major model providers (OpenAI, Anthropic, Google)

2. **Performance Targets**
   - [ ] Model listing < 100ms (cached)
   - [ ] Service overhead < 50ms per request
   - [ ] Model sync completes < 30 seconds

3. **Quality Gates**
   - [ ] Zero TypeScript errors in strict mode
   - [ ] All tests passing
   - [ ] Code review approved
   - [ ] Documentation complete

4. **Integration Verification**
   - [ ] Schema migrates without errors
   - [ ] Cron scheduler successfully syncs models
   - [ ] Usage data persists to database
   - [ ] Service works from workscript plugin

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-28
**Status:** Draft - Ready for Implementation
