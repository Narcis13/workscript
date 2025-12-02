# VISION.md

## The Workscript Manifesto: Orchestrating the Future of Business Logic

**Version:** 1.0.0
**Last Updated:** November 2025
**Status:** Living Document

---

## Part 1: The Core Thesis

### Workflows Are the Universal Abstraction

Every piece of software, at its core, does the same thing: it takes input, transforms it through a series of steps, and produces output. Whether you're processing a payment, sending an email, scoring a lead, or coordinating an AI agent—it's all workflows.

The problem? Most developers rebuild this wheel for every project. State management is scattered. Error handling is inconsistent. Observability is an afterthought. And when AI enters the picture, the complexity multiplies.

**Workscript exists because we believe:**

1. **Workflows should be declarative.** Define *what* should happen, not *how* to wire it together.

2. **State should be a first-class citizen.** Not an afterthought buried in closures and global variables.

3. **Observability should be built-in.** Every execution should be traceable, debuggable, replayable.

4. **AI and automation should coexist.** Deterministic steps and AI-powered decisions in the same workflow.

### The Convergence Moment

We are witnessing a convergence that happens once in a generation:

**Deterministic Automation** (if-this-then-that, cron jobs, API chains) is meeting **AI Agency** (LLMs making decisions, generating content, understanding context).

Most systems were built for one or the other. Zapier handles automation but struggles with AI. LangChain handles AI but creates spaghetti for structured workflows. n8n is powerful but server-bound and not AI-native.

**Workscript is built for both.** A workflow can validate a form (deterministic), send it to GPT for analysis (AI), route based on sentiment (conditional), and trigger a notification (automation)—all in one JSON definition.

### Why NOW Is the Time

Three forces are converging:

1. **LLMs can write and modify JSON.** Our workflow definitions aren't code—they're structured data that AI can generate, optimize, and debug.

2. **Businesses need to move faster.** The gap between idea and deployment must shrink from months to days.

3. **The agentic future requires orchestration.** AI agents don't work in isolation—they need coordination, state management, and human oversight.

The infrastructure for this future doesn't exist yet. We're building it.

---

## Part 2: What Workscript IS

Workscript is three things, depending on who you are.

### For Developers: The Production-Ready SaaS Boilerplate

You want to build a SaaS product. You don't want to spend three months on infrastructure.

Workscript gives you:
- **Complete monorepo** with build, test, and deploy scripts
- **35+ production nodes** for data manipulation, APIs, email, file systems
- **Database persistence** with Drizzle ORM and MySQL
- **Real-time WebSocket events** for live workflow monitoring
- **Plugin architecture** to organize your domain logic
- **Type-safe TypeScript** throughout

Clone it. Customize it. Ship it.

```bash
git clone workscript
bun install
bun run dev
# Your SaaS backend is running
```

**Build time saved:** 2-4 months of infrastructure work.

### For Learners: The Modern Architecture Masterclass

You want to understand how production systems are built. Not toy examples—real architecture.

Workscript demonstrates:
- **Pure orchestration pattern** (engine knows nothing about implementations)
- **Advanced state management** (atomic updates, snapshots, watchers)
- **Lifecycle hooks** (15+ extension points for total control)
- **Plugin systems** (how to build extensible SaaS platforms)
- **Repository pattern** (clean separation of concerns)
- **Event-driven architecture** (WebSockets, hooks, async flows)

Every pattern in this codebase is used in production systems at scale. Study it. Learn from it. Apply it everywhere.

### For Businesses: The Operational OS for the AI Era

You need to automate processes. Coordinate AI agents. Integrate systems. Move fast.

Workscript provides:
- **Visual workflow definition** (JSON-based, AI-generatable)
- **Scheduled automation** (cron-based workflow execution)
- **API-first design** (integrate with anything)
- **Real-time monitoring** (see what's running, catch errors early)
- **AI-ready infrastructure** (plug in LLMs, let them orchestrate)

Define your business logic once. Execute it anywhere. Monitor everything.

---

## Part 3: Technical Excellence

The foundation determines what you can build. Ours is designed for scale, clarity, and evolution.

### The Pure Orchestration Pattern

**The engine knows nothing about what it executes.**

This single design decision changes everything:

```
┌─────────────────────────────────────────────────────────────┐
│                    @workscript/engine                        │
│                                                              │
│   ExecutionEngine  │  StateManager  │  HookManager          │
│   WorkflowParser   │  StateResolver │  NodeRegistry         │
│                                                              │
│   Zero knowledge of what nodes actually do.                 │
│   Pure orchestration. Pure coordination.                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Registers & Executes
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    @workscript/nodes                         │
│                                                              │
│   MathNode, LogicNode, FilterNode, SortNode,               │
│   DatabaseNode, FileSystemNode, EmailNode,                 │
│   And 30+ more...                                          │
│                                                              │
│   All implementations. All business logic. One package.    │
└─────────────────────────────────────────────────────────────┘
```

**Why this matters:**

- **Testability:** Engine tests don't need node implementations. Node tests don't need the engine.
- **Extensibility:** Add new nodes without touching engine code.
- **Maintainability:** Bugs are isolated. Changes don't cascade.
- **AI Integration:** The engine doesn't care if a node calls GPT-4 or adds two numbers.

### Advanced State Management

State is where most workflow systems fall apart. We built it right.

**StateManager Features:**

```typescript
// Atomic updates with version control
await stateManager.update(executionId, 'user.score', 85, {
  lockKey: 'score-update',
  timeout: 5000
});

// Point-in-time snapshots
const snapshotId = await stateManager.createSnapshot(executionId);
// ... workflow continues ...
await stateManager.rollback(executionId, snapshotId);  // Undo everything

// Reactive watchers with debouncing
stateManager.registerWatcher({
  executionId,
  keys: ['cart.total'],
  condition: (changes) => changes.some(c => c.newValue > 1000),
  callback: async () => await notifyHighValueOrder(),
  debounceMs: 100
});

// Deep change detection with diffing
const changes = stateManager.getChanges(executionId);
// Returns: [{ key: 'user.score', oldValue: 0, newValue: 85, timestamp }]
```

**Why this matters:**

- **Debugging:** Know exactly what changed and when
- **Recovery:** Roll back to any point if something goes wrong
- **Real-time:** React to state changes as they happen
- **Concurrency:** Atomic updates prevent race conditions

### The $.key Syntax

Access state naturally. No boilerplate. No ceremony.

```json
{
  "calculate-discount": {
    "basePrice": "$.cart.total",
    "discountRate": "$.user.loyaltyTier",
    "success?": "apply-discount"
  }
}
```

The StateResolver automatically:
- Resolves `$.cart.total` → `state.cart.total` → `149.99`
- Handles nested paths: `$.user.preferences.currency`
- Works recursively through objects and arrays
- Provides configurable strategies for missing keys

**For AI:** This syntax is semantic. An LLM understanding the workflow can infer that `$.user.loyaltyTier` relates to user loyalty without reading implementation code.

### The Lifecycle Hook System

15+ extension points. Total observability. Zero engine modification.

**Workflow Hooks:**
```typescript
hookManager.register('workflow:before-start', {
  name: 'audit-log',
  handler: async (context) => {
    await auditLog.create({
      event: 'workflow-started',
      workflowId: context.workflowId,
      timestamp: new Date()
    });
  }
});

hookManager.register('workflow:on-error', {
  name: 'alert-ops',
  handler: async (context) => {
    await slack.send(`Workflow ${context.workflowId} failed: ${context.error}`);
  }
});
```

**Node Hooks:**
```typescript
hookManager.register('node:after-execute', {
  name: 'performance-tracking',
  handler: async (context) => {
    await metrics.track({
      nodeId: context.nodeId,
      duration: context.duration,
      success: !context.error
    });
  }
});
```

**State Hooks:**
```typescript
hookManager.register('state:change', {
  name: 'sync-to-redis',
  handler: async (context) => {
    await redis.set(`workflow:${context.executionId}`, context.newState);
  }
});
```

**Why this matters:**

- **Monitoring:** Add observability without touching core logic
- **Debugging:** Log everything at any granularity
- **Integration:** Sync state to external systems in real-time
- **Testing:** Add assertions without modifying workflows

### Plugin Architecture

Build multiple SaaS products from one codebase.

```
/apps/api/src/plugins/
├── workscript/          # Core workflow execution
│   ├── plugin.ts        # Plugin manifest
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   └── schema/          # Database tables
│
├── formflow/            # Form builder SaaS
│   ├── plugin.ts
│   ├── routes/
│   └── ...
│
├── estateflow/          # Real Estate CRM
│   ├── plugin.ts
│   ├── routes/
│   └── ...
│
└── docflow/             # PDF Generator
    └── ...
```

Each plugin is:
- **Self-contained:** Routes, schema, services in one place
- **Auto-discovered:** PluginLoader finds and registers automatically
- **Health-checked:** Individual health endpoints per plugin
- **AI-discoverable:** Manifest exposes capabilities to LLMs

**Why this matters:**

- **Multi-product:** Build multiple SaaS from one foundation
- **Team scaling:** Different teams own different plugins
- **Feature flags:** Enable/disable plugins per environment
- **Clean boundaries:** No cross-plugin dependencies

---

## Part 4: AI-First Design

This is not an afterthought. Every architectural decision was made with LLMs in mind.

### Node Metadata for LLM Discovery

Every node declares its purpose in a format LLMs understand:

```typescript
export class FilterNode extends WorkflowNode {
  metadata = {
    id: 'filter',
    name: 'Filter Data',
    version: '1.0.0',
    description: 'Filter arrays based on conditions',

    ai_hints: {
      purpose: 'Filter items from an array based on specified conditions',
      when_to_use: 'When you need to narrow down a dataset to items matching criteria',
      expected_edges: ['success', 'empty', 'error'],

      example_usage: `{
        "filter-orders": {
          "data": "$.orders",
          "conditions": [
            { "field": "status", "operator": "equals", "value": "pending" },
            { "field": "total", "operator": "greaterThan", "value": 100 }
          ],
          "success?": "process-orders",
          "empty?": "no-orders-found"
        }
      }`,

      get_from_state: ['The array to filter'],
      post_to_state: ['filteredData - The resulting filtered array']
    }
  };
}
```

**An LLM reading this knows:**
- What the node does (purpose)
- When to use it (context)
- What edges to expect (routing)
- How to configure it (example)
- What state it reads/writes (data flow)

### JSON Workflows: The Perfect AI Format

Workflows are not code. They're structured data.

```json
{
  "id": "lead-qualification",
  "name": "Qualify Sales Lead",
  "version": "1.0.0",
  "initialState": {
    "lead": null,
    "score": 0,
    "qualified": false
  },
  "workflow": [
    {
      "fetch-lead": {
        "source": "$.leadId",
        "success?": "score-lead",
        "error?": "log-error"
      }
    },
    {
      "score-lead": {
        "data": "$.lead",
        "rules": "$.scoringRules",
        "success?": "check-threshold"
      }
    },
    {
      "check-threshold": {
        "value": "$.score",
        "threshold": 70,
        "above?": "mark-qualified",
        "below?": "mark-unqualified"
      }
    }
  ]
}
```

**Why JSON is perfect for AI:**

1. **Parseable:** LLMs can read, understand, and modify JSON natively
2. **Generatable:** "Create a workflow that scores leads" → valid JSON
3. **Validatable:** JSON Schema catches errors before execution
4. **Explainable:** AI can describe what a workflow does
5. **Optimizable:** AI can suggest improvements based on execution data

### AI Manifest Endpoint

Your API is discoverable by AI agents:

```bash
GET /api/ai-manifest
```

Returns:
```json
{
  "version": "1.0.0",
  "name": "Workscript API",
  "plugins": [
    {
      "id": "formflow",
      "name": "FormFlow",
      "description": "Form builder with workflow automation",
      "capabilities": [
        "Create multi-step forms",
        "Validate submissions",
        "Trigger workflows on submit"
      ],
      "endpoints": [...]
    }
  ],
  "workflows": [
    {
      "id": "form-submission",
      "description": "Process form submissions with validation and notification",
      "trigger": "form.submit",
      "nodes": ["validate", "store", "notify"]
    }
  ]
}
```

**An AI agent can:**
- Discover what your API offers
- Understand which endpoint to call
- Generate valid requests
- Chain multiple operations

### Semantic State Keys

State keys aren't random—they're meaningful:

```json
{
  "user": {
    "email": "...",
    "loyaltyTier": "gold",
    "preferences": { "currency": "EUR" }
  },
  "cart": {
    "items": [...],
    "total": 149.99,
    "appliedDiscounts": []
  },
  "checkout": {
    "step": "payment",
    "validationErrors": []
  }
}
```

An LLM reading this state understands:
- There's a user who is a gold-tier member
- They have a cart with items totaling 149.99
- They're at the payment step of checkout

**No documentation needed.** The structure is self-documenting.

---

## Part 5: Business Value

Vision without execution is hallucination. Here's the concrete value.

### Time-to-Market: Days, Not Months

**Without Workscript:**
- Week 1-2: Set up monorepo, TypeScript, build tools
- Week 3-4: Build state management, error handling
- Week 5-6: Create API structure, database layer
- Week 7-8: Implement WebSocket, real-time features
- Week 9-12: Build actual business logic
- **Time to MVP:** 3+ months

**With Workscript:**
- Day 1: Clone, configure, understand structure
- Day 2-5: Customize for your domain
- Week 2-3: Build domain-specific nodes
- Week 4: Polish and ship
- **Time to MVP:** 3-4 weeks

**Time saved:** 60-70%

### The SaaS Factory Model

One foundation. Multiple products. Shared infrastructure.

**Product Portfolio:**

| Product | Description | Price | Status |
|---------|-------------|-------|--------|
| **EstateFlow** | Real Estate CRM | $99-299/mo | 60% built |
| **FormFlow** | Form Builder | $49-99/mo | Architecture ready |
| **DocFlow** | PDF Generator | $79-149/mo | Architecture ready |
| **CanvasFlow** | Video Generator | $99-199/mo | Planned |

**Why this works:**
- Shared authentication, billing, monitoring
- Shared node library (reuse across products)
- One codebase to maintain
- Knowledge compounds across products

### Three Revenue Pillars

**Pillar 1: Boilerplate Sales**
- **Price:** $297-997 one-time
- **Target:** Indie hackers, agencies, startups
- **Year 1 Potential:** $25K-100K (50-200 sales)

**Pillar 2: SaaS Products**
- **Price:** $49-299/mo per product
- **Target:** SMBs, enterprises
- **Year 2 Potential:** $10K-50K MRR combined

**Pillar 3: Educational Content**
- **Price:** $197-497 courses
- **Target:** Developers learning production patterns
- **Year 1 Potential:** $20K-50K

**Total Year 1-2 Potential:** $50K-200K

### Real-World Validation: EstateFlow

The architecture isn't theoretical. EstateFlow proves it works.

**What's built:**
- 13+ database tables (agencies, agents, contacts, properties)
- AI lead scoring system
- Property-client matching algorithm
- WhatsApp conversation tracking
- Email template system
- Activity logging

**What's remaining:**
- Frontend UI (Next.js)
- Authentication (Clerk)
- Payment integration (Stripe)

**Timeline to launch:** 6-8 weeks

This is a real CRM that could generate real revenue. The foundation made it possible.

---

## Part 6: The 6-12 Month Roadmap

Realistic milestones. Achievable with today's technology.

### Q1: Visual Builder & Enhanced Monitoring (Months 1-3)

**Visual Workflow Builder**
- Drag-and-drop node placement
- Visual edge connections
- Real-time validation
- Export to JSON

**Enhanced Monitoring Dashboard**
- Execution timeline visualization
- State diff viewer
- Error drill-down
- Performance metrics

**Technical Foundation:**
- All execution hooks already exist
- WebSocket infrastructure in place
- Just needs UI layer

### Q2: AI-Assisted Workflow Generation (Months 4-6)

**Describe → Generate**
```
User: "Create a workflow that:
       - Fetches new leads from our CRM
       - Scores them based on company size and industry
       - Routes high-score leads to sales team
       - Adds low-score leads to nurture campaign"

AI: Generates valid JSON workflow with proper node configuration
```

**Workflow Explanation**
```
User: "What does this workflow do?"

AI: "This workflow processes incoming form submissions.
     First, it validates the data against your schema.
     Then it checks for duplicate entries.
     If valid and unique, it stores in the database
     and sends a confirmation email.
     If invalid, it logs the error and notifies support."
```

**Technical Foundation:**
- ai_hints metadata enables LLM understanding
- JSON format is natively AI-parseable
- Just needs prompt engineering and UI

### Q3: Self-Healing & Resilience (Months 7-9)

**Retry Patterns**
```json
{
  "send-email": {
    "to": "$.user.email",
    "template": "welcome",
    "retry": {
      "attempts": 3,
      "backoff": "exponential",
      "maxDelay": 30000
    },
    "success?": "track-sent",
    "exhausted?": "fallback-sms"
  }
}
```

**Circuit Breakers**
```json
{
  "call-external-api": {
    "url": "$.apiEndpoint",
    "circuitBreaker": {
      "failureThreshold": 5,
      "resetTimeout": 60000
    },
    "success?": "process-response",
    "circuitOpen?": "use-cached-data"
  }
}
```

**Fallback Chains**
```json
{
  "get-data": {
    "primary": "api-call",
    "fallback": "cache-lookup",
    "lastResort": "default-values"
  }
}
```

**Technical Foundation:**
- Hook system enables retry wrapping
- State snapshots enable recovery
- Just needs pattern implementation

### Q4: Workflow Marketplace (Months 10-12)

**Template Library**
- Pre-built workflows for common use cases
- One-click import and customize
- Categories: Lead gen, E-commerce, Support, Analytics

**Community Sharing**
- Publish workflows publicly or privately
- Fork and modify others' workflows
- Star and review system

**Monetization**
- Premium templates (one-time purchase)
- Subscription for template access
- Revenue share with creators

**Technical Foundation:**
- Workflows are JSON (easy to store, share, version)
- Plugin system supports marketplace plugin
- Just needs platform implementation

---

## Part 7: Getting Started

Three paths. One destination. Choose yours.

### For Developers: Clone, Configure, Ship

**Step 1: Get the code**
```bash
git clone https://github.com/your-org/workscript.git
cd workscript
bun install
```

**Step 2: Configure environment**
```bash
cp .env.example .env
# Edit .env with your database credentials
```

**Step 3: Start developing**
```bash
bun run dev          # Start all services
bun run test         # Run tests
bun run build        # Production build
```

**Step 4: Create your first node**
```typescript
// packages/nodes/src/MyCustomNode.ts
import { WorkflowNode } from '@workscript/engine';

export class MyCustomNode extends WorkflowNode {
  metadata = {
    id: 'my-custom',
    name: 'My Custom Node',
    // ... ai_hints, inputs, outputs
  };

  async execute(context, config) {
    // Your logic here
    return {
      success: () => ({ result: 'done' })
    };
  }
}
```

**Step 5: Ship it**
```bash
# Deploy to Railway, Vercel, or your infrastructure
bun run build
# Your SaaS is ready
```

### For Learners: Study, Understand, Apply

**Week 1: Architecture Overview**
- Read CLAUDE.md (comprehensive project guide)
- Explore /packages/engine/src/ (core patterns)
- Run tests, read test files (learn by example)

**Week 2: Deep Dive - Engine**
- Study ExecutionEngine (orchestration pattern)
- Study StateManager (advanced state patterns)
- Study HookManager (extension system)

**Week 3: Deep Dive - Nodes**
- Study /packages/nodes/src/ (implementation patterns)
- Create a custom node from scratch
- Write tests for your node

**Week 4: Deep Dive - Integration**
- Study /apps/api/ (Hono patterns, plugin system)
- Study WebSocket implementation
- Study database layer (Drizzle ORM)

**Week 5+: Build Something**
- Create a new plugin for your domain
- Build a mini-SaaS using the patterns
- Share what you learned

### For Businesses: Deploy, Customize, Scale

**Phase 1: Assessment (Week 1)**
- Identify workflows to automate
- Map current processes to workflow patterns
- Define success metrics

**Phase 2: Deployment (Week 2-3)**
- Deploy Workscript to your infrastructure
- Configure authentication (Clerk recommended)
- Set up monitoring and alerts

**Phase 3: Customization (Week 4-6)**
- Create domain-specific nodes
- Build workflows for your processes
- Integrate with existing systems

**Phase 4: Scale (Ongoing)**
- Add more workflows as needs grow
- Train team on workflow creation
- Monitor and optimize based on metrics

---

## Part 8: The Promise

### What We're Building

Not just a workflow engine. Not just a boilerplate. Not just infrastructure.

**We're building the operating system for the AI era.**

An OS where:
- **Humans define intent**, AI generates implementation
- **Deterministic logic** coexists with **adaptive intelligence**
- **Every process** is observable, debuggable, improvable
- **Business logic** is an asset, not buried in code

### What This Enables

**For the indie hacker:** Ship in weeks what used to take months. Focus on your unique value, not infrastructure.

**For the learner:** Understand how production systems work. These patterns will serve you for decades.

**For the business:** Move at the speed of thought. Define a process, see it running tomorrow.

**For the future:** When AI agents coordinate autonomous workflows, they'll need infrastructure like this. We're building it now.

### The Path Forward

This is not vaporware. This is not a pitch deck.

The engine works. The nodes work. The architecture is proven.

EstateFlow is 60% built. FormFlow is architecturally ready. The foundation exists.

**What remains is execution.** Building the visual tools. Implementing AI generation. Creating the marketplace. Shipping the products.

**The technology is ready. The market is ready. The timing is right.**

### Join the Journey

This is an open invitation.

**If you're a developer:** Build something with Workscript. Push the boundaries. Show us what's possible.

**If you're a learner:** Study the code. Ask questions. Teach others what you learn.

**If you're a business:** Automate a process. Save hours. Prove the value.

**If you're an investor:** This is ground floor of workflow infrastructure for the AI age.

---

## Appendix: Technical Quick Reference

### Core Packages

| Package | Purpose | Import |
|---------|---------|--------|
| `@workscript/engine` | Execution, parsing, state | `import { ExecutionEngine, StateManager } from '@workscript/engine'` |
| `@workscript/nodes` | All 35+ workflow nodes | `import { ALL_NODES, FilterNode } from '@workscript/nodes'` |
| `@workscript/ui` | Shared React components | `import { Button } from '@workscript/ui'` |
| `@workscript/config` | ESLint, TypeScript, Tailwind | `extends: '@workscript/config/typescript'` |

### Key Commands

```bash
bun run dev              # Development mode (all services)
bun run build            # Production build
bun run test             # Run all tests
bun run typecheck        # TypeScript validation
bun run format           # Code formatting
```

### State Resolution Syntax

```
$.key                    → state.key
$.user.email             → state.user.email
$.items[0].name          → state.items[0].name
$.config.timeout         → state.config.timeout
```

### Hook Events

```
workflow:before-start    workflow:after-start
workflow:before-end      workflow:after-end
workflow:on-error        workflow:on-timeout
node:before-execute      node:after-execute
state:change             state:snapshot-created
state:rollback
```

### Workflow Structure

```json
{
  "id": "unique-id",
  "name": "Human Readable Name",
  "version": "1.0.0",
  "initialState": {},
  "workflow": [
    {
      "node-id": {
        "config": "value",
        "success?": "next-node",
        "error?": "error-handler"
      }
    }
  ]
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | November 2025 | Initial vision document |

---

*"The best way to predict the future is to build it."*

**Let's build.**
