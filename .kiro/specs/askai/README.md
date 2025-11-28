# Ask-AI Shared Service - Specification

**Feature:** OpenRouter API integration for AI completions with model discovery and usage tracking
**Target Application:** `/apps/api/src/shared-services/ask-ai/`
**Status:** Ready for Implementation
**Created:** 2025-11-28
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 20 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, reliability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 95 actionable tasks organized in 10 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 3-4 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

A shared service that provides Workscript plugins with unified AI capabilities through OpenRouter:

- **AI Completions**: Send chat messages to 300+ AI models (OpenAI, Anthropic, Google, Meta, Mistral, etc.)
- **Model Discovery**: List available models with pricing, capabilities, and context lengths
- **Usage Tracking**: Full tracking of tokens, costs, and latency per plugin/user/tenant
- **Cost Calculation**: Automatic cost calculation using real-time model pricing
- **Model Caching**: MySQL persistence with in-memory TTL for fast lookups
- **Scheduled Sync**: Daily automatic synchronization of model data from OpenRouter

### Technology Stack

| Component | Technology |
|-----------|------------|
| Runtime | Bun |
| HTTP Client | Native fetch |
| Database | MySQL + Drizzle ORM |
| ID Generation | CUID2 |
| Scheduling | CronScheduler (existing shared service) |
| API | OpenRouter (https://openrouter.ai/api/v1) |

---

## Architecture

```
/apps/api/src/shared-services/ask-ai/
├── index.ts                    # Public exports & helper functions
├── AskAIService.ts             # Main service facade (singleton)
├── OpenRouterClient.ts         # HTTP client for OpenRouter API
├── ModelRegistry.ts            # Model cache (memory + DB)
├── UsageTracker.ts             # Usage recording & analytics
├── types.ts                    # TypeScript interfaces
└── __tests__/                  # Unit & integration tests
    ├── OpenRouterClient.test.ts
    ├── ModelRegistry.test.ts
    ├── UsageTracker.test.ts
    ├── AskAIService.test.ts
    └── integration.test.ts

/apps/api/src/db/schema/
└── ai.schema.ts                # Database tables (ai_models, ai_usage)
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **AskAIService** | Main facade for plugins. Handles completions, model listing, usage queries |
| **OpenRouterClient** | Low-level HTTP client for OpenRouter API with auth and error handling |
| **ModelRegistry** | Two-tier cache (1h memory, 24h DB) with scheduled sync from OpenRouter |
| **UsageTracker** | Records all completions to DB with cost calculation and analytics |

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
│  ModelRegistry  │ ── verifies model exists, gets pricing
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│OpenRouterClient │ ── sends request to OpenRouter
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  UsageTracker   │ ── records usage & calculates cost
└────────┬────────┘
         │
         ▼
   CompletionResult
```

---

## Implementation Phases

| Phase | Description | Tasks | Est. Time |
|-------|-------------|-------|-----------|
| 1 | Foundation & Database Schema | 11 | 0.5 days |
| 2 | Type Definitions | 13 | 0.25 days |
| 3 | OpenRouter Client | 8 | 0.5 days |
| 4 | Model Registry | 11 | 0.5 days |
| 5 | Usage Tracker | 10 | 0.5 days |
| 6 | Main Service | 11 | 0.5 days |
| 7 | Service Integration | 4 | 0.25 days |
| 8 | Testing | 7 | 0.5 days |
| 9 | Documentation & Polish | 4 | 0.25 days |
| 10 | Final Verification | 8 | 0.25 days |

**Total: 95 tasks, 3-4 days estimated**

---

## Quick Start Guide

### For Developers

1. **Read the specifications**
   ```bash
   # Start with requirements
   cat .kiro/specs/askai/requirements.md

   # Then review implementation plan
   cat .kiro/specs/askai/implementation_plan.md
   ```

2. **Set up environment**
   ```bash
   # Add to apps/api/.env
   OPENROUTER_API_KEY="sk-or-v1-your-key-here"
   ```

3. **Begin implementation**
   - Follow tasks in `implementation_plan.md` in order
   - Check off tasks as you complete them
   - Start with Phase 1 (database schema)

4. **Run tests**
   ```bash
   cd apps/api
   bun test src/shared-services/ask-ai/
   ```

### For Reviewers

1. Review the requirements document for completeness
2. Check that acceptance criteria are testable
3. Verify task breakdown covers all requirements
4. Ensure architecture aligns with existing patterns

---

## Success Criteria

- [ ] All 20 requirements implemented with acceptance criteria passing
- [ ] 95 implementation tasks completed
- [ ] Model listing returns 300+ models from OpenRouter
- [ ] Completions work with OpenAI, Anthropic, and Google models
- [ ] Usage data persists to MySQL database
- [ ] Model sync runs daily via CronScheduler
- [ ] All unit tests passing
- [ ] TypeScript strict mode compliant
- [ ] Performance targets met (listing < 100ms, overhead < 50ms)

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| API Key Exposure | Read from env vars only, never logged or included in errors |
| User Isolation | Usage queries filtered by userId/tenantId |
| Cost Tracking | All requests tracked with calculated costs |
| Input Validation | All inputs validated before API calls |
| Error Messages | No sensitive data in error responses |

---

## Progress Tracking

Use the checkboxes in `implementation_plan.md` to track progress:

```markdown
- [x] Task completed
- [ ] Task pending
```

To see overall progress:
```bash
# Count completed vs total tasks
grep -c "\- \[x\]" .kiro/specs/askai/implementation_plan.md
grep -c "\- \[ \]" .kiro/specs/askai/implementation_plan.md
```

---

## Out of Scope

The following features are NOT included in this implementation:

- Streaming completions (SSE)
- Tool/function calling
- Image generation
- Embeddings API
- Per-plugin rate limiting
- Cost alerts and notifications
- Automatic model recommendations
- Prompt template management
- Response caching
- Multi-region support

---

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Project architecture and conventions
- [CronScheduler](/apps/api/src/shared-services/scheduler/CronScheduler.ts) - Scheduling service pattern
- [IntegrationManager](/apps/api/src/shared-services/integrations/IntegrationManager.ts) - Singleton service pattern
- [OpenRouter Docs](https://openrouter.ai/docs) - External API documentation

---

## Contributing

When implementing this feature:

1. **Follow existing patterns** - Match IntegrationManager and CronScheduler code style
2. **Use singleton pattern** - All services should be singletons with getInstance()
3. **Comprehensive JSDoc** - Document all public methods and types
4. **Error handling** - Use AIServiceError with appropriate codes
5. **Non-blocking logging** - Log errors but don't fail primary operations
6. **Test coverage** - Write tests alongside implementation

---

## File Checklist

### Files to Create

| File | Phase |
|------|-------|
| `/apps/api/src/db/schema/ai.schema.ts` | 1 |
| `/apps/api/src/shared-services/ask-ai/types.ts` | 2 |
| `/apps/api/src/shared-services/ask-ai/OpenRouterClient.ts` | 3 |
| `/apps/api/src/shared-services/ask-ai/ModelRegistry.ts` | 4 |
| `/apps/api/src/shared-services/ask-ai/UsageTracker.ts` | 5 |
| `/apps/api/src/shared-services/ask-ai/AskAIService.ts` | 6 |
| `/apps/api/src/shared-services/ask-ai/index.ts` | 7 |

### Files to Modify

| File | Changes |
|------|---------|
| `/apps/api/src/db/index.ts` | Add AI schema import |
| `/apps/api/.env.example` | Add OpenRouter config |
| `/apps/api/.env` | Add API key |

---

**Happy Coding!**
