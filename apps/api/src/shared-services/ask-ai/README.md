# Ask-AI Shared Service

**OpenRouter API integration for AI completions, model discovery, and usage tracking.**

The Ask-AI shared service provides Workscript plugins with unified access to 300+ AI models from multiple providers (OpenAI, Anthropic, Google, Meta, Mistral, etc.) through a single, consistent interface.

## Features

- **AI Completions**: Send chat messages to any supported AI model
- **Model Discovery**: List available models with pricing, context length, and capabilities
- **Usage Tracking**: Full tracking of tokens, costs, and latency per plugin/user/tenant
- **Cost Calculation**: Automatic cost calculation using real-time model pricing
- **Model Caching**: Two-tier cache (1h memory, 24h database) for fast lookups
- **Scheduled Sync**: Daily automatic synchronization of model data from OpenRouter

## Quick Start

### Installation

The Ask-AI service is part of the API application. Ensure the following environment variables are set:

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-your-key-here

# Optional (with defaults)
OPENROUTER_SITE_URL=https://workscript.dev
OPENROUTER_SITE_NAME=Workscript
AI_MODEL_SYNC_INTERVAL=86400  # 24 hours in seconds
AI_REQUEST_TIMEOUT=30000       # 30 seconds
```

### Basic Usage

```typescript
import { getAskAIService } from '../shared-services/ask-ai';

// Get the singleton service instance
const askAI = getAskAIService();

// Send a completion request
const result = await askAI.complete({
  model: 'openai/gpt-4o',
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is TypeScript?' }
  ],
  pluginId: 'my-plugin',
  temperature: 0.7
});

console.log(result.content);           // AI response
console.log(result.usage.cost);        // Cost in USD
console.log(result.usage.totalTokens); // Tokens used
console.log(result.durationMs);        // Request duration
```

## API Reference

### AskAIService

The main service facade for AI operations.

#### `complete(request: CompletionRequest): Promise<CompletionResult>`

Sends a chat completion request to an AI model.

```typescript
const result = await askAI.complete({
  // Required
  model: 'anthropic/claude-3.5-sonnet',
  messages: [{ role: 'user', content: 'Hello!' }],
  pluginId: 'workscript',

  // Optional - tracking
  userId: 'user-123',
  tenantId: 'tenant-456',
  metadata: { workflowId: 'wf-789' },

  // Optional - model parameters
  systemPrompt: 'You are a helpful assistant.',
  temperature: 0.7,      // 0-2, higher = more random
  maxTokens: 1000,       // Max output tokens
  topP: 0.9,             // 0-1, nucleus sampling
  frequencyPenalty: 0,   // -2 to 2
  presencePenalty: 0,    // -2 to 2
});
```

**CompletionResult:**

```typescript
{
  id: 'chatcmpl-123abc',           // OpenRouter completion ID
  model: 'anthropic/claude-3.5-sonnet',
  content: 'Hello! How can I help?',
  finishReason: 'stop',            // 'stop' | 'length' | 'error'
  usage: {
    promptTokens: 15,
    completionTokens: 8,
    totalTokens: 23,
    cost: 0.000345                  // USD
  },
  durationMs: 1250
}
```

#### `listModels(filters?: ModelFilters): Promise<AIModel[]>`

Lists available AI models with optional filtering.

```typescript
// All models
const allModels = await askAI.listModels();

// Filter by provider
const anthropicModels = await askAI.listModels({ provider: 'anthropic' });

// Filter by context length
const largeContextModels = await askAI.listModels({ minContextLength: 100000 });

// Filter by modality
const textModels = await askAI.listModels({ modality: 'text->text' });

// Filter by price (per token)
const cheapModels = await askAI.listModels({ maxPrice: 0.000001 });

// Combine filters
const models = await askAI.listModels({
  provider: 'openai',
  minContextLength: 16000,
  maxPrice: 0.00001
});
```

#### `getModel(modelId: string): Promise<AIModel | null>`

Gets a specific model by ID.

```typescript
const model = await askAI.getModel('openai/gpt-4o');
if (model) {
  console.log(`Context length: ${model.contextLength}`);
  console.log(`Prompt price: $${model.pricing.prompt} per token`);
  console.log(`Completion price: $${model.pricing.completion} per token`);
}
```

#### `getUsage(params: UsageQueryParams): Promise<UsageSummary>`

Gets aggregated usage statistics.

```typescript
// By plugin
const pluginUsage = await askAI.getUsage({ pluginId: 'workscript' });

// By user
const userUsage = await askAI.getUsage({ userId: 'user-123' });

// By tenant
const tenantUsage = await askAI.getUsage({ tenantId: 'tenant-456' });

// With date range
const lastWeekUsage = await askAI.getUsage({
  pluginId: 'workscript',
  dateRange: {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date()
  }
});

console.log(`Total requests: ${lastWeekUsage.totalRequests}`);
console.log(`Total tokens: ${lastWeekUsage.totalTokens}`);
console.log(`Total cost: $${lastWeekUsage.totalCost}`);
console.log('By model:', lastWeekUsage.byModel);
```

#### `syncModels(): Promise<void>`

Manually triggers model sync from OpenRouter.

```typescript
await askAI.syncModels();
```

#### `shutdown(): Promise<void>`

Gracefully shuts down the service.

```typescript
await askAI.shutdown();
```

### ModelRegistry

For advanced usage, direct access to the model cache.

```typescript
import { ModelRegistry } from '../shared-services/ask-ai';

const registry = ModelRegistry.getInstance();

// Get all models (uses cache)
const models = await registry.getModels();

// Force refresh from OpenRouter
const freshModels = await registry.getModels({ forceRefresh: true });

// Get specific model
const model = await registry.getModel('openai/gpt-4o');

// Get pricing only
const pricing = await registry.getModelPricing('openai/gpt-4o');

// Clear memory cache
registry.clearCache();

// Sync from OpenRouter
await registry.syncModels();
```

### UsageTracker

For advanced usage, direct access to usage tracking.

```typescript
import { UsageTracker } from '../shared-services/ask-ai';

const tracker = UsageTracker.getInstance();

// Get usage by plugin
const pluginUsage = await tracker.getUsageByPlugin('workscript');

// Get usage by user
const userUsage = await tracker.getUsageByUser('user-123');

// Get usage by tenant
const tenantUsage = await tracker.getUsageByTenant('tenant-456');

// Get total cost
const totalCost = await tracker.getTotalCost();
const monthCost = await tracker.getTotalCost({
  from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
});
```

## Error Handling

The service uses structured errors with specific codes:

```typescript
import { AIServiceError } from '../shared-services/ask-ai';

try {
  await askAI.complete(request);
} catch (error) {
  if (error instanceof AIServiceError) {
    console.error(`Error [${error.code}]: ${error.message}`);

    switch (error.code) {
      case 'MISSING_API_KEY':
        // API key not configured
        break;
      case 'MODEL_NOT_FOUND':
        // Model doesn't exist or is inactive
        break;
      case 'INVALID_REQUEST':
        // Invalid request parameters
        console.log('Field:', error.details?.field);
        break;
      case 'RATE_LIMITED':
        // OpenRouter rate limit exceeded
        const retryAfter = error.details?.retryAfter;
        break;
      case 'AUTH_FAILED':
        // Invalid API key
        break;
      case 'TIMEOUT':
        // Request timed out
        break;
      case 'PROVIDER_ERROR':
        // OpenRouter server error
        break;
      case 'NETWORK_ERROR':
        // Network connection failed
        break;
      case 'DATABASE_ERROR':
        // Database operation failed
        break;
    }
  }
}
```

## Cron Integration

Enable automatic daily model synchronization:

```typescript
import { initializeAskAICron, shutdownAskAICron } from '../shared-services/ask-ai';

// During server startup
await initializeAskAICron();

// During server shutdown
await shutdownAskAICron();
```

The cron job runs at 3 AM UTC daily to sync models from OpenRouter.

## Database Schema

The service uses two database tables:

### ai_models

Stores cached model information from OpenRouter.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar(128) | Model ID (PK) |
| name | varchar(255) | Human-readable name |
| description | text | Model description |
| contextLength | int | Max context tokens |
| promptPrice | decimal(18,12) | Cost per prompt token |
| completionPrice | decimal(18,12) | Cost per completion token |
| requestPrice | decimal(18,12) | Cost per request |
| imagePrice | decimal(18,12) | Cost per image |
| modality | varchar(50) | Input/output modality |
| inputModalities | json | Supported inputs |
| outputModalities | json | Supported outputs |
| tokenizer | varchar(50) | Tokenizer used |
| maxCompletionTokens | int | Max output tokens |
| supportedParameters | json | API parameters |
| isActive | boolean | Active status |
| lastSyncedAt | timestamp | Last sync time |
| createdAt | timestamp | Record created |
| updatedAt | timestamp | Record updated |

### ai_usage

Tracks all AI completion requests.

| Column | Type | Description |
|--------|------|-------------|
| id | varchar(128) | Record ID (PK, CUID2) |
| pluginId | varchar(128) | Plugin that made request |
| userId | varchar(128) | User ID (optional) |
| tenantId | varchar(128) | Tenant ID (optional) |
| modelId | varchar(128) | Model used |
| promptTokens | int | Input tokens |
| completionTokens | int | Output tokens |
| totalTokens | int | Total tokens |
| promptCost | decimal(18,12) | Input cost |
| completionCost | decimal(18,12) | Output cost |
| totalCost | decimal(18,12) | Total cost |
| requestDurationMs | int | Request duration |
| status | varchar(20) | 'success' or 'error' |
| errorMessage | text | Error details |
| metadata | json | Custom metadata |
| createdAt | timestamp | Request time |

## Architecture

```
ask-ai/
├── index.ts                 # Public exports & cron integration
├── AskAIService.ts          # Main service facade
├── OpenRouterClient.ts      # HTTP client for OpenRouter
├── ModelRegistry.ts         # Model cache (memory + database)
├── UsageTracker.ts          # Usage recording & analytics
├── types.ts                 # TypeScript interfaces
└── README.md                # This file
```

### Data Flow

```
Plugin Request
     │
     ▼
┌─────────────────┐
│  AskAIService   │ ── validates request
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ModelRegistry  │ ── verifies model, gets pricing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│OpenRouterClient │ ── sends request to OpenRouter
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UsageTracker   │ ── records usage, calculates cost
└────────┬────────┘
         │
         ▼
   CompletionResult
```

### Caching Strategy

```
Request → Memory Cache (1h TTL)
              │
              │ miss/expired
              ▼
         Database Cache (24h TTL)
              │
              │ miss/stale
              ▼
         OpenRouter API
```

## Popular Models

| Model ID | Provider | Context | Input Price | Output Price |
|----------|----------|---------|-------------|--------------|
| openai/gpt-4o | OpenAI | 128k | $5/1M | $15/1M |
| openai/gpt-4o-mini | OpenAI | 128k | $0.15/1M | $0.60/1M |
| anthropic/claude-3.5-sonnet | Anthropic | 200k | $3/1M | $15/1M |
| anthropic/claude-3-haiku | Anthropic | 200k | $0.25/1M | $1.25/1M |
| google/gemini-pro-1.5 | Google | 1M | $2.50/1M | $10/1M |
| meta-llama/llama-3.1-70b | Meta | 128k | $0.40/1M | $0.40/1M |

*Prices are approximate and subject to change. Use `listModels()` for current pricing.*

## Best Practices

### 1. Always specify pluginId

The `pluginId` is required for usage tracking and should identify your plugin:

```typescript
await askAI.complete({
  model: 'openai/gpt-4o',
  messages: [...],
  pluginId: 'my-plugin'  // Required
});
```

### 2. Use system prompts effectively

System prompts guide model behavior:

```typescript
await askAI.complete({
  model: 'openai/gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }],
  pluginId: 'my-plugin',
  systemPrompt: 'You are a helpful assistant that responds concisely.'
});
```

### 3. Choose appropriate models

- **Fast & cheap**: `openai/gpt-4o-mini`, `anthropic/claude-3-haiku`
- **Balanced**: `openai/gpt-4o`, `anthropic/claude-3.5-sonnet`
- **Large context**: `google/gemini-pro-1.5` (1M tokens)

### 4. Track costs by user/tenant

Include optional identifiers for billing:

```typescript
await askAI.complete({
  model: 'openai/gpt-4o',
  messages: [...],
  pluginId: 'my-plugin',
  userId: 'user-123',      // For per-user billing
  tenantId: 'tenant-456',  // For per-tenant billing
  metadata: {
    workflowId: 'wf-789'   // Custom tracking
  }
});
```

### 5. Handle errors gracefully

Always catch and handle AIServiceError:

```typescript
try {
  const result = await askAI.complete(request);
} catch (error) {
  if (error instanceof AIServiceError) {
    if (error.code === 'RATE_LIMITED') {
      // Wait and retry
    } else if (error.code === 'MODEL_NOT_FOUND') {
      // Fall back to different model
    }
  }
}
```

## Troubleshooting

### "MISSING_API_KEY" error

Ensure `OPENROUTER_API_KEY` is set in your environment:

```bash
export OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

### Model not found

Models must be synced from OpenRouter. Trigger a manual sync:

```typescript
await askAI.syncModels();
```

### Rate limiting

OpenRouter has rate limits. If you hit them:
1. Check `error.details.retryAfter` for retry timing
2. Implement exponential backoff
3. Consider caching responses for identical requests

### High latency

- Use faster models (`gpt-4o-mini`, `claude-3-haiku`)
- Reduce `maxTokens`
- Check `AI_REQUEST_TIMEOUT` setting

## See Also

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)
- [Workscript CLAUDE.md](/CLAUDE.md)

---

**Version:** 1.0.0
**Last Updated:** 2025-11-28
