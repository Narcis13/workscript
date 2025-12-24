# AI Agent for Workscript Workflow Generation
## Implementation Plan - MVP Version

**Goal:** Create a production-ready AI Agent using Claude Agent SDK (TypeScript) that generates valid Workscript workflows from natural language descriptions, integrated into the Bun + Hono backend as a plugin, deployable to Ubuntu VPS.

---

## 1. Overview

### Architecture Pattern
- **Plugin-based integration** following existing Workscript plugin architecture (`SaaSPlugin` interface)
- **Claude Agent SDK** as the core agent harness (TypeScript)
- **Public API** with JWT/API key authentication
- **In-memory task queue** for MVP (scalable to BullMQ/Redis later)
- **WebSocket events** for real-time progress updates
- **Agent Playground UI** component for testing during development

### Key Components
```
AI Agent Plugin
├── REST API (Hono routes)
├── Agent Harness (Claude SDK)
├── MCP Tools (Workscript-specific)
├── Subagents (Complexity, Validation, Optimization)
├── Task Queue (in-memory)
└── UI Playground (React component)
```

---

## 2. Database Schema

### 2.1 Agent Tasks Table
**Location:** `/apps/api/src/plugins/ai-agent-workscript/schema/agent.schema.ts`

```typescript
export const agentTasks = mysqlTable('agent_tasks', {
  id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),

  // Ownership
  userId: varchar('user_id', { length: 128 }).notNull(),
  tenantId: varchar('tenant_id', { length: 128 }),

  // Task details
  description: text('description').notNull(),
  status: mysqlEnum('status', [
    'pending', 'analyzing', 'generating', 'validating',
    'optimizing', 'completed', 'failed', 'cancelled'
  ]).notNull().default('pending'),

  // Agent state
  agentSessionId: varchar('agent_session_id', { length: 128 }),
  conversationHistory: json('conversation_history'),

  // Generated artifacts
  workflowId: varchar('workflow_id', { length: 128 }),
  workflowJson: json('workflow_json'),
  validationResult: json('validation_result'),

  // Analysis
  complexityScore: int('complexity_score'),
  suggestedNodes: json('suggested_nodes'),
  optimizationSuggestions: json('optimization_suggestions'),

  // Progress
  currentStep: varchar('current_step', { length: 100 }),
  progress: int('progress').default(0),

  // Error handling
  error: text('error'),
  retriesCount: int('retries_count').default(0),

  // Cost tracking
  tokensUsed: int('tokens_used').default(0),
  costUsd: decimal('cost_usd', { precision: 10, scale: 4 }),

  // Timing
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: int('duration_ms'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
```

### 2.2 Agent Sessions Table
```typescript
export const agentSessions = mysqlTable('agent_sessions', {
  id: varchar('id', { length: 128 }).primaryKey().$defaultFn(() => createId()),
  userId: varchar('user_id', { length: 128 }).notNull(),
  tenantId: varchar('tenant_id', { length: 128 }),

  status: mysqlEnum('status', ['active', 'completed', 'abandoned']).default('active'),
  context: json('context'),

  // Budget tracking
  totalTokensUsed: int('total_tokens_used').default(0),
  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 4 }),
  budgetLimitUsd: decimal('budget_limit_usd', { precision: 10, scale: 4 }).default('5.00'),

  lastActivityAt: timestamp('last_activity_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at'),

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});
```

---

## 3. Plugin Structure

### Directory Layout
```
/apps/api/src/plugins/ai-agent-workscript/
├── plugin.ts                      # SaaSPlugin implementation
├── routes/
│   ├── index.ts                   # Main router
│   ├── tasks.ts                   # Task endpoints
│   ├── sessions.ts                # Session management
│   └── playground.ts              # Playground API
├── agent/
│   ├── harness.ts                 # Claude Agent SDK setup
│   ├── config.ts                  # Agent configuration
│   ├── hooks.ts                   # Lifecycle hooks
│   └── subagents/
│       ├── ComplexityAnalyzer.ts
│       ├── WorkflowValidator.ts
│       └── WorkflowOptimizer.ts
├── mcp-tools/
│   ├── index.ts                   # Tool registry
│   ├── FetchNodeDocs.ts
│   ├── GenerateWorkflow.ts
│   ├── ValidateWorkflow.ts
│   ├── SaveWorkflow.ts
│   └── ExecuteWorkflow.ts
├── services/
│   ├── AgentService.ts            # Core orchestration
│   └── TaskQueue.ts               # In-memory queue
├── repositories/
│   ├── AgentTaskRepository.ts
│   └── AgentSessionRepository.ts
├── schema/
│   └── agent.schema.ts
└── types/
    └── agent.types.ts
```

---

## 4. MCP Tool Implementations

### 4.1 Tool Registry Pattern
**File:** `/apps/api/src/plugins/ai-agent-workscript/mcp-tools/index.ts`

```typescript
import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import * as tools from './tools';

export const workscriptMcpServer = createSdkMcpServer({
  name: 'workscript-tools',
  version: '1.0.0',
  tools: [
    tool('fetchNodeDocs', tools.FetchNodeDocsSchema, tools.fetchNodeDocs),
    tool('generateWorkflow', tools.GenerateWorkflowSchema, tools.generateWorkflow),
    tool('validateWorkflow', tools.ValidateWorkflowSchema, tools.validateWorkflow),
    tool('saveWorkflow', tools.SaveWorkflowSchema, tools.saveWorkflow),
    tool('executeWorkflow', tools.ExecuteWorkflowSchema, tools.executeWorkflow),
  ],
});
```

### 4.2 Tool Schemas (Zod)
**Key Tools:**

1. **fetchNodeDocs** - Fetches from Reflection API (`/workscript/reflection/manifest/compact`)
2. **generateWorkflow** - Creates workflow JSON with validation
3. **validateWorkflow** - Calls existing `/workscript/workflows/validate` endpoint
4. **saveWorkflow** - Stores to DB and filesystem via existing endpoints
5. **executeWorkflow** - Test runs the generated workflow

---

## 5. Agent Harness Configuration

**File:** `/apps/api/src/plugins/ai-agent-workscript/agent/harness.ts`

### System Prompt
```typescript
const systemPrompt = `
You are an expert Workscript workflow architect. Generate production-ready workflow JSON files from natural language.

PROCESS:
1. Fetch node documentation using fetchNodeDocs()
2. Analyze complexity (if score ≥ 6, suggest new nodes instead)
3. Generate FLAT workflows (sequential > nested)
4. Add defensive guards (validateData for inputs/AI outputs)
5. Validate using validateWorkflow()
6. Save using saveWorkflow()

CRITICAL RULES:
- All nodes must be pre-registered (check docs first)
- Use inline edge configuration
- Prefer flat sequential workflows
- Always add error? edges on fallible nodes
- Include validateData nodes for external inputs and AI responses

Call fetchNodeDocs() first to see available nodes.
`;
```

### Agent Configuration
```typescript
export async function createWorkflowAgent(config: {
  taskId: string;
  description: string;
  sessionId?: string;
  userId: string;
}) {
  const response = query({
    prompt: config.description,
    options: {
      model: 'claude-sonnet-4-5',
      systemPrompt,
      mcpServers: { workscript: workscriptMcpServer },
      allowedTools: ['Read', 'Write', 'mcp__workscript__*'],
      maxBudgetUsd: 1.0,
      permissionMode: 'bypassPermissions',
      hooks: {
        PostToolUse: [{ matcher: '*', hooks: [progressHook] }],
      },
      resume: config.sessionId,
    },
  });

  return response;
}
```

---

## 6. API Endpoints

**Base Path:** `/ai-agent/*`

### 6.1 Task Management
```typescript
POST /ai-agent/tasks
Body: {
  description: string;
  initialState?: Record<string, any>;
  budgetUsd?: number;
  sessionId?: string;
}
Response: { taskId, status, estimatedTime }

GET /ai-agent/tasks/:taskId
Response: { task, progress, currentStep, workflowJson? }

GET /ai-agent/tasks
Response: { tasks[], pagination }

POST /ai-agent/tasks/:taskId/cancel
Response: { success }
```

### 6.2 Session Management
```typescript
POST /ai-agent/sessions
Body: { budgetUsd?: number }
Response: { sessionId, expiresAt }

GET /ai-agent/sessions/:sessionId
Response: { session, tasks[] }

DELETE /ai-agent/sessions/:sessionId
Response: { success }
```

### 6.3 Status & Health
```typescript
GET /ai-agent/status
Response: { queueLength, activeTasks, avgResponseTime }

GET /ai-agent/health
Response: { healthy, claudeCodeRuntime, apiConnectivity }
```

---

## 7. WebSocket Events

**Channel:** `agent:task:{taskId}`

### Event Types
```typescript
interface AgentProgressEvent {
  type: 'agent:progress';
  payload: {
    taskId: string;
    currentStep: string;
    progress: number; // 0-100
    message?: string;
  };
}

interface AgentCompleteEvent {
  type: 'agent:complete';
  payload: {
    taskId: string;
    workflowId: string;
    workflowJson: any;
    validationResult: any;
    tokensUsed: number;
    costUsd: string;
  };
}

interface AgentErrorEvent {
  type: 'agent:error';
  payload: {
    taskId: string;
    error: string;
    retriesRemaining: number;
  };
}
```

---

## 8. In-Memory Task Queue

**File:** `/apps/api/src/plugins/ai-agent-workscript/services/TaskQueue.ts`

```typescript
export class TaskQueue {
  private queue: AgentTask[] = [];
  private processing: Map<string, AgentTask> = new Map();
  private maxConcurrent = 3;

  async enqueue(task: AgentTask): Promise<void> {
    this.queue.push(task);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.processing.size >= this.maxConcurrent) return;

    const task = this.queue.shift();
    if (!task) return;

    this.processing.set(task.id, task);

    try {
      await this.executeTask(task);
    } finally {
      this.processing.delete(task.id);
      this.processNext();
    }
  }

  private async executeTask(task: AgentTask): Promise<void> {
    const agentService = new AgentService();
    await agentService.executeWithRetry(task);
  }
}
```

**Note:** For production, this will be replaced with BullMQ + Redis for multi-instance support.

---

## 9. Agent Playground UI Component

**Location:** `/apps/frontend/src/components/AgentPlayground.tsx`

### Features
- Natural language input textarea
- Real-time progress display (WebSocket)
- Generated workflow JSON viewer
- Validation results panel
- Cost tracking display
- Download workflow button

### Tech Stack
- React 19 + TypeScript
- Shadcn/ui components (Textarea, Card, Badge, Button)
- WebSocket hook for real-time updates
- Code syntax highlighting (react-json-view or similar)

---

## 10. Deployment Configuration

### 10.1 Environment Variables
```bash
# Add to /apps/api/.env

# Claude Agent SDK
CLAUDE_API_KEY=sk-ant-your-api-key
CLAUDE_AGENT_BUDGET_PER_TASK=1.00
CLAUDE_AGENT_BUDGET_PER_SESSION=5.00
CLAUDE_AGENT_BUDGET_PER_USER=50.00
CLAUDE_AGENT_MAX_CONCURRENT=3

# Agent settings
AGENT_SESSION_TIMEOUT_MINUTES=60
AGENT_MAX_RETRIES=3
AGENT_ENABLE_PLAYGROUND=true
```

### 10.2 Ubuntu VPS Setup

**Prerequisites:**
```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Verify installation
claude-code --version
```

**PM2 Ecosystem (for production):**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'workscript-api',
    script: 'bun',
    args: 'run apps/api/src/index.ts',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3013,
    },
  }],
};
```

**Start:**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 10.3 Systemd Service (alternative)
```ini
# /etc/systemd/system/workscript.service
[Unit]
Description=Workscript API with AI Agent
After=network.target mysql.service

[Service]
Type=simple
User=workscript
WorkingDirectory=/path/to/workscript
EnvironmentFile=/path/to/workscript/.env
ExecStart=/usr/bin/bun run apps/api/src/index.ts
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## 11. Implementation Steps

### Phase 1: Core Plugin Setup
1. **Create plugin structure** following directory layout above
2. **Implement database schema** (agent.schema.ts)
3. **Run migration:** `cd apps/api && bun run db:push`
4. **Create repositories** for AgentTask and AgentSession CRUD
5. **Implement plugin.ts** with SaaSPlugin interface

### Phase 2: MCP Tools & Agent Harness
6. **Install Claude Agent SDK:**
   ```bash
   cd apps/api
   bun add @anthropic-ai/claude-agent-sdk zod
   ```
7. **Implement MCP tools** (FetchNodeDocs, GenerateWorkflow, etc.)
8. **Create agent harness** with system prompt and configuration
9. **Implement subagents** (ComplexityAnalyzer, WorkflowValidator, WorkflowOptimizer)
10. **Add lifecycle hooks** for progress tracking

### Phase 3: API & Services
11. **Implement TaskQueue service** (in-memory)
12. **Create AgentService** for orchestration
13. **Build API routes** (tasks.ts, sessions.ts)
14. **Add WebSocket broadcasting** for progress events
15. **Implement authentication middleware** (JWT/API key)

### Phase 4: UI Playground
16. **Create AgentPlayground component** in frontend
17. **Add WebSocket hook** for real-time updates
18. **Integrate with API** (task creation, status polling)
19. **Add workflow viewer** with syntax highlighting
20. **Mount in dev environment** (route: `/playground`)

### Phase 5: Testing & Deployment
21. **Write integration tests** for API endpoints
22. **Test agent with example prompts**
23. **Configure environment variables** for production
24. **Deploy to Ubuntu VPS** (PM2 or systemd)
25. **Set up monitoring** (logs, health checks)

---

## 12. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Queue** | In-memory | Simplify MVP, scale later with BullMQ |
| **API Access** | Public with auth | Enables external integrations |
| **Budget** | $1.00/task | Balanced for complex workflows |
| **Runtime** | Bun (existing) | Consistency with stack |
| **Agent SDK** | Claude Agent SDK | Native Anthropic support |
| **Session Storage** | MySQL | Reuse existing infrastructure |
| **WebSocket** | Existing manager | Already integrated |
| **Validation** | Existing endpoints | Reuse battle-tested logic |

---

## 13. Scalability Path

**MVP → Production Migration:**

1. **Task Queue:**
   - Replace in-memory queue with BullMQ + Redis
   - Add job priorities and scheduling
   - Enable multi-instance worker support

2. **Horizontal Scaling:**
   - Enable PM2 cluster mode
   - Add Nginx load balancer
   - Redis for session caching

3. **Monitoring:**
   - Add Prometheus metrics
   - Grafana dashboards
   - Alert configuration

4. **Advanced Features:**
   - Workflow templates library
   - Agent fine-tuning with examples
   - Cost optimization suggestions

---

## 14. Critical Files to Create/Modify

### New Files (Core Implementation)
1. `/apps/api/src/plugins/ai-agent-workscript/plugin.ts`
2. `/apps/api/src/plugins/ai-agent-workscript/schema/agent.schema.ts`
3. `/apps/api/src/plugins/ai-agent-workscript/agent/harness.ts`
4. `/apps/api/src/plugins/ai-agent-workscript/mcp-tools/index.ts`
5. `/apps/api/src/plugins/ai-agent-workscript/services/AgentService.ts`
6. `/apps/api/src/plugins/ai-agent-workscript/services/TaskQueue.ts`
7. `/apps/api/src/plugins/ai-agent-workscript/routes/tasks.ts`

### New Files (UI Playground)
8. `/apps/frontend/src/components/AgentPlayground.tsx`
9. `/apps/frontend/src/hooks/useAgentWebSocket.ts`

### Modified Files
10. `/apps/api/package.json` - Add Claude Agent SDK dependency
11. `/apps/api/.env.example` - Add agent configuration variables

---

## 15. Testing Strategy

### Integration Tests
```typescript
describe('AI Agent API', () => {
  it('should create task from natural language', async () => {
    const response = await request(app)
      .post('/ai-agent/tasks')
      .send({ description: 'Filter active users and sort by created date' })
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('taskId');
  });

  it('should generate valid workflow', async () => {
    // Wait for completion or use WebSocket to monitor
    const task = await waitForTaskCompletion(taskId);

    expect(task.status).toBe('completed');
    expect(task.workflowJson).toBeDefined();
    expect(task.validationResult.valid).toBe(true);
  });
});
```

### Agent Testing Prompts
1. "Create a workflow that filters active users, sorts by score, and logs the result"
2. "Build a data pipeline that fetches user data, validates required fields, and saves to database"
3. "Generate a workflow that uses AI to analyze text and stores the results"

---

## 16. Success Criteria

✅ **MVP Complete When:**
- [ ] Agent plugin loads successfully at server startup
- [ ] POST /ai-agent/tasks creates and queues tasks
- [ ] Agent generates valid workflows from natural language
- [ ] Generated workflows pass validation
- [ ] Workflows save to database and filesystem
- [ ] WebSocket broadcasts progress events
- [ ] Playground UI displays real-time progress
- [ ] Authentication protects all endpoints
- [ ] Budget limits enforced ($1.00 per task)
- [ ] Error handling and retry logic works
- [ ] Agent session resumption works
- [ ] Deployed to Ubuntu VPS with PM2/systemd

---

## 17. Future Enhancements (Post-MVP)

1. **Multi-agent collaboration** - Agents that can call other agents
2. **Workflow templates library** - Pre-built patterns
3. **Agent learning** - Improve from user feedback
4. **Batch processing** - Generate multiple workflows
5. **Version control** - Track workflow iterations
6. **A/B testing** - Compare workflow variants
7. **Cost optimization** - Auto-suggest cheaper alternatives

---

## Estimated Effort

- **Phase 1-2 (Core + Agent):** 2-3 days
- **Phase 3 (API + Services):** 1-2 days
- **Phase 4 (UI Playground):** 1 day
- **Phase 5 (Testing + Deployment):** 1 day

**Total MVP:** 5-7 days for a single developer

---

## Dependencies to Install

```bash
# API (apps/api)
bun add @anthropic-ai/claude-agent-sdk zod

# Frontend (apps/frontend)
bun add react-json-view  # For workflow JSON viewer
```

---

## Reference Documentation

- **Claude Agent SDK Docs:** https://docs.anthropic.com/en/agent-sdk/overview
- **Workscript Plugin Pattern:** `/apps/api/src/plugins/workscript/plugin.ts`
- **SaaSPlugin Interface:** `/apps/api/src/core/plugins/types.ts`
- **new-workflow Skill:** `/.claude/skills/new-workflow/SKILL.md`
- **Reflection API:** `/apps/api/src/plugins/workscript/reflection/`
