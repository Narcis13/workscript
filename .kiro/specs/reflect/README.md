# Workscript Reflection API - Specification

**Feature:** Introspection and reflection "consciousness layer" for workscript agentic workflows
**Target Application:** `/apps/api/src/plugins/workscript/reflection/`
**Status:** Ready for Implementation
**Created:** 2025-12-10
**Version:** 1.0.0

---

## Documentation Files

This specification folder contains:

1. **[requirements.md](./requirements.md)** - Complete Product Requirements Document (PRD)
   - 30 detailed user stories with acceptance criteria
   - Non-functional requirements (performance, security, scalability)
   - Success metrics and out-of-scope items

2. **[implementation_plan.md](./implementation_plan.md)** - Concrete Implementation Plan
   - 127 actionable tasks organized in 10 phases
   - Checkboxes for progress tracking
   - Estimated timeline: 5-7 days

3. **[README.md](./README.md)** - This overview document

---

## Feature Overview

### What We're Building

The Workscript Reflection API introduces a "consciousness layer" that enables AI agents to:

- **Deep Node Introspection** - Understand node capabilities, inputs, outputs, operations, and state interactions
- **Source Code Extraction** - Read actual node implementations to understand how they work
- **AI Manifest Generation** - Generate optimized system prompts for workflow-building AI agents
- **Workflow Analysis** - Explain, validate, and optimize existing workflows
- **Composability Discovery** - Understand which nodes can connect and suggest next nodes
- **Pattern Recognition** - Detect and generate workflows from common patterns

### Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | Bun 1.x |
| Framework | Hono 4.7.x |
| Language | TypeScript 5.8.x |
| Base System | Workscript Engine + Nodes packages |
| Authentication | JWT (selective - mostly public) |

---

## Architecture

```
/apps/api/src/plugins/workscript/reflection/
├── index.ts                    # Main router mounting all sub-routes
├── routes/
│   ├── nodes.ts                # Deep node introspection (4 endpoints)
│   ├── source.ts               # Source code extraction (2 endpoints)
│   ├── manifest.ts             # AI manifest generation (3 endpoints)
│   ├── analysis.ts             # Workflow analysis (4 endpoints)
│   ├── composability.ts        # Node connection graph (4 endpoints)
│   └── patterns.ts             # Pattern library (4 endpoints)
├── services/
│   ├── SourceExtractor.ts      # Node source code reading & parsing
│   ├── ManifestGenerator.ts    # Dynamic system prompt builder
│   ├── WorkflowAnalyzer.ts     # Workflow explanation & validation
│   ├── ComposabilityGraph.ts   # Node relationship mapping
│   └── PatternLibrary.ts       # Pattern detection & generation
└── types/
    └── reflection.types.ts     # TypeScript interfaces
```

### Key Components

| Component | Purpose |
|-----------|---------|
| **SourceExtractor** | Reads and parses node TypeScript source files, extracting class structure, methods, and interfaces |
| **ManifestGenerator** | Creates AI-optimized system prompts with node documentation and syntax reference |
| **WorkflowAnalyzer** | Parses workflow JSON to explain execution, validate semantics, and suggest optimizations |
| **ComposabilityGraph** | Maps node relationships based on state key reading/writing patterns |
| **PatternLibrary** | Defines common workflow patterns and generates workflows from templates |

---

## API Endpoints (21 Total)

### Node Introspection (`/reflection/nodes`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/nodes` | None | List all nodes with deep introspection |
| GET | `/nodes/:nodeId` | None | Get single node details |
| GET | `/nodes/:nodeId/operations` | None | Get node operations (for filter, switch, etc.) |
| GET | `/nodes/:nodeId/examples` | None | Get usage examples |

### Source Code (`/reflection/source`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/source/:nodeId` | None | Get structured source with parsed info |
| GET | `/source/:nodeId/raw` | None | Get raw TypeScript source |

### AI Manifest (`/reflection/manifest`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/manifest` | None | Get full AI manifest |
| GET | `/manifest/compact` | None | Get compressed manifest |
| POST | `/manifest/custom` | None | Generate filtered manifest |

### Workflow Analysis (`/reflection/analysis`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/analysis/explain` | None | Explain a workflow |
| POST | `/analysis/validate-deep` | None | Semantic validation |
| POST | `/analysis/optimize` | None | Get optimization suggestions |
| GET | `/analysis/:workflowId` | **Required** | Analyze stored workflow |

### Composability (`/reflection/composability`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/composability/graph` | None | Full compatibility matrix |
| GET | `/composability/from/:nodeId` | None | What can follow this node? |
| GET | `/composability/to/:nodeId` | None | What can precede this node? |
| POST | `/composability/suggest` | None | Context-aware node suggestion |

### Patterns (`/reflection/patterns`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/patterns` | None | List all patterns |
| GET | `/patterns/:patternId` | None | Get pattern details |
| POST | `/patterns/detect` | None | Detect patterns in workflow |
| POST | `/patterns/generate` | None | Generate workflow from pattern |

---

## Implementation Phases

| Phase | Name | Tasks | Duration |
|-------|------|-------|----------|
| 1 | Foundation & Infrastructure | 11 | 1 day |
| 2 | Node Introspection Routes | 17 | 1 day |
| 3 | Source Code Extraction | 6 | 0.5 days |
| 4 | AI Manifest Generation | 14 | 1 day |
| 5 | Workflow Analysis | 16 | 1 day |
| 6 | Composability Discovery | 14 | 0.5 days |
| 7 | Pattern Library | 16 | 0.5 days |
| 8 | Plugin Integration | 10 | 0.25 days |
| 9 | Testing & Verification | 12 | 0.5 days |
| 10 | Final Verification | 11 | 0.25 days |

**Total: 127 tasks, 5-7 days estimated**

---

## Quick Start Guide

### For Developers

1. **Read the requirements document**
   ```bash
   cat .kiro/specs/reflect/requirements.md
   ```

2. **Start with Phase 1 tasks in implementation plan**
   - Create directory structure
   - Define type interfaces
   - Set up main router

3. **Follow task checkboxes**
   - Each task is 15-30 minutes
   - Tasks are ordered by dependency
   - Mark complete as you go

4. **Test frequently**
   ```bash
   bun run dev:api
   # Test: GET /workscript/reflection/
   ```

### For Reviewers

1. **Check implementation against requirements**
   - Each requirement has clear acceptance criteria
   - Use criteria as a checklist

2. **Verify endpoints work**
   - Test each endpoint in the API table above
   - Verify response formats match documentation

3. **Check integration**
   - Verify routes are mounted in plugin.ts
   - Verify aiManifest includes reflection documentation

---

## Success Criteria

- [ ] All 30 requirements have passing acceptance criteria
- [ ] All 21 endpoints are functional
- [ ] All 5 services are implemented as singletons
- [ ] Response times meet performance requirements:
  - Single node: < 100ms
  - Node list: < 500ms
  - Source extraction: < 200ms
  - Manifest generation: < 1s
- [ ] No security vulnerabilities in source extraction
- [ ] Complete TypeScript type coverage
- [ ] Plugin aiManifest includes reflection documentation
- [ ] 6 workflow patterns defined and functional

---

## Security Considerations

1. **Source Code Access**
   - Source extraction limited to `packages/nodes/` only
   - Path traversal attempts are blocked
   - No engine internal source exposure

2. **Authentication**
   - Most endpoints are public for AI agent consumption
   - Only `/analysis/:workflowId` requires JWT authentication
   - User can only analyze their own workflows

3. **Input Validation**
   - All POST bodies are validated
   - Workflow JSON is parsed but never executed
   - Invalid input returns 400 with details

4. **Rate Limiting**
   - Consider adding rate limits for source extraction
   - Consider adding rate limits for analysis endpoints

---

## Out of Scope

These features are explicitly NOT included:

- Engine component source extraction (only nodes)
- Live workflow execution during analysis
- Node creation or modification via API
- Custom pattern creation via API
- WebSocket support for live introspection
- Cross-package file access
- AI model integration (manifest produces prompts, doesn't call AI)
- New workflow storage

---

## Related Documentation

- **Plan File:** `/Users/narcisbrindusescu/.claude/plans/abundant-squishing-ullman.md`
- **Existing Plugin:** `/apps/api/src/plugins/workscript/plugin.ts`
- **Nodes Package:** `/packages/nodes/src/index.ts`
- **Engine Types:** `/packages/engine/src/types/index.ts`
- **Workflow Blueprint:** `/WORKFLOW_CREATION_BLUEPRINT.md`

---

## Contributing

### Implementation Guidelines

1. **Follow existing patterns**
   - Use Hono router pattern from other workscript routes
   - Use singleton pattern from existing services
   - Follow error handling conventions

2. **Test as you build**
   - Write tests alongside implementation
   - Verify endpoints work before moving on

3. **Document changes**
   - Update aiManifest when adding routes
   - Keep response formats consistent

### Code Style

- TypeScript strict mode
- Export all types from reflection.types.ts
- Use async/await for all async operations
- Return consistent JSON response formats

---

**Happy Coding!**
