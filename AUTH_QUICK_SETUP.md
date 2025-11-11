# Authentication System - Quick Setup Guide

**Time to integrate:** 30-60 minutes
**Difficulty:** Medium
**Status:** Ready to implement

---

## Step 1: Run Database Migrations (10 minutes)

```bash
cd apps/api

# Generate migrations from auth.schema.ts
bun run db:generate

# Apply migrations to database
bun run db:push

# Verify tables were created
# Check that these tables exist:
# - users
# - api_keys
# - refresh_tokens
# - sessions
# - password_resets
# - login_attempts
```

---

## Step 2: Update Main Server (15 minutes)

**File:** `apps/api/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { initializeAuth } from './shared-services/auth';  // ADD THIS
import { authenticate } from './shared-services/auth';    // ADD THIS
import authRoutes from './routes/auth';                   // ADD THIS
import apiKeyRoutes from './routes/apikeys';              // ADD THIS
import { join } from 'path';
import { pluginLoader, pluginRegistry } from './core/plugins';

// ... existing code ...

async function startServer() {
  try {
    console.log('[Server] Starting Workscript API Server...');

    // Initialize auth system (ADD THIS)
    await initializeAuth();

    const app = new Hono();

    // Middleware
    app.use('*', cors({
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    }));
    app.use('*', honoLogger());

    // Health check endpoint (public)
    app.get('/health', (c) => {
      return c.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Root endpoint (public)
    app.get('/', (c) => {
      return c.json({
        name: 'Workscript API',
        version: '2.0.0',
        description: 'Modular workflow orchestration API with plugin system',
        endpoints: {
          health: '/health',
          plugins: '/api/plugins',
          auth: '/auth',
          apiKeys: '/api/keys',
        },
      });
    });

    // ============================================
    // PUBLIC ROUTES (Authentication)
    // ============================================

    // Auth routes (register, login, refresh, logout)
    app.route('/auth', authRoutes);                       // ADD THIS

    // ============================================
    // PROTECTED ROUTES
    // ============================================

    // Apply authentication to all /api routes
    app.use('/api/*', authenticate);                      // ADD THIS

    // API key management (protected)
    app.route('/api/keys', apiKeyRoutes);                 // ADD THIS

    // Load plugins
    pluginLoader.setApp(app);

    const pluginsDir = join(import.meta.dir, 'plugins');
    console.log(`[Server] Loading plugins from: ${pluginsDir}`);

    const results = await pluginLoader.loadPlugins({
      pluginsDir,
      autoEnable: true,
    });

    for (const result of results) {
      if (result.success && result.plugin) {
        pluginRegistry.registerPlugin(result.plugin);
      }
    }

    // Plugin management endpoints (protected by /api/*)
    app.get('/api/plugins', (c) => {
      const plugins = pluginRegistry.getAllPluginsMetadata();
      const stats = pluginRegistry.getStatistics();

      return c.json({
        plugins,
        statistics: stats,
      });
    });

    // ... rest of existing code ...

    // Start server
    const port = parseInt(process.env.PORT || '3013', 10);
    console.log(`[Server] Starting server on port ${port}...`);

    // ... existing server startup code ...

  } catch (error) {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
```

---

## Step 3: Protect Plugin Routes (15 minutes)

**File:** `apps/api/src/plugins/workscript/workflows/index.ts` (example)

```typescript
import { Hono } from 'hono';
import { authenticate, requirePermission } from '../../../shared-services/auth/middleware';  // ADD THIS
import { Permission } from '../../../shared-services/auth/types';                            // ADD THIS
import { db } from '../../../db';
import { eq, and } from 'drizzle-orm';
// ... other imports ...

const workflows = new Hono();

// Apply authentication to ALL routes in this router
workflows.use('/*', authenticate);                        // ADD THIS

/**
 * GET /workflows
 * List workflows (filter by user)
 */
workflows.get('/', async (c) => {
  const user = c.get('user');  // Now available!

  // Filter by userId
  const userWorkflows = await db.query.workflows.findMany({
    where: eq(workflows.userId, user.id)  // Security: only show user's workflows
  });

  return c.json({
    success: true,
    data: userWorkflows
  });
});

/**
 * POST /workflows
 * Create workflow (requires permission)
 */
workflows.post('/',
  requirePermission(Permission.WORKFLOW_CREATE),  // ADD THIS
  async (c) => {
    const user = c.get('user');
    const body = await c.req.json();

    // Create workflow for this user
    const newWorkflow = {
      id: crypto.randomUUID(),
      ...body,
      userId: user.id,        // IMPORTANT: Associate with user
      tenantId: user.tenantId // Optional: multi-tenancy
    };

    await db.insert(workflows).values(newWorkflow);

    return c.json({
      success: true,
      data: newWorkflow
    }, 201);
  }
);

/**
 * GET /workflows/:id
 * Get workflow (verify ownership)
 */
workflows.get('/:id', async (c) => {
  const user = c.get('user');
  const workflowId = c.req.param('id');

  const workflow = await db.query.workflows.findFirst({
    where: and(
      eq(workflows.id, workflowId),
      eq(workflows.userId, user.id)  // Verify ownership
    )
  });

  if (!workflow) {
    return c.json(
      { success: false, error: 'Workflow not found' },
      404
    );
  }

  return c.json({ success: true, data: workflow });
});

/**
 * PUT /workflows/:id
 * Update workflow (requires permission)
 */
workflows.put('/:id',
  requirePermission(Permission.WORKFLOW_UPDATE),  // ADD THIS
  async (c) => {
    const user = c.get('user');
    const workflowId = c.req.param('id');
    const updates = await c.req.json();

    // Verify ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, user.id)
      )
    });

    if (!workflow) {
      return c.json(
        { success: false, error: 'Not found or unauthorized' },
        404
      );
    }

    // Update
    await db.update(workflows)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workflows.id, workflowId));

    const updated = await db.query.workflows.findFirst({
      where: eq(workflows.id, workflowId)
    });

    return c.json({ success: true, data: updated });
  }
);

/**
 * DELETE /workflows/:id
 * Delete workflow (requires permission)
 */
workflows.delete('/:id',
  requirePermission(Permission.WORKFLOW_DELETE),  // ADD THIS
  async (c) => {
    const user = c.get('user');
    const workflowId = c.req.param('id');

    // Verify ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, user.id)
      )
    });

    if (!workflow) {
      return c.json(
        { success: false, error: 'Not found or unauthorized' },
        404
      );
    }

    // Delete
    await db.delete(workflows).where(eq(workflows.id, workflowId));

    return c.json({ success: true, message: 'Deleted' });
  }
);

/**
 * POST /workflows/:id/execute
 * Execute workflow (requires permission)
 */
workflows.post('/:id/execute',
  requirePermission(Permission.WORKFLOW_EXECUTE),  // ADD THIS
  async (c) => {
    const user = c.get('user');
    const workflowId = c.req.param('id');

    // Verify ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, workflowId),
        eq(workflows.userId, user.id)
      )
    });

    if (!workflow) {
      return c.json(
        { success: false, error: 'Not found or unauthorized' },
        404
      );
    }

    // Execute workflow
    const result = await workflowService.executeWorkflow(workflow);

    return c.json({ success: true, data: result });
  }
);

export default workflows;
```

---

## Step 4: Update Plugin Schema (10 minutes - Optional)

**File:** `apps/api/src/plugins/workscript/schema/workscript.schema.ts`

Add userId and tenantId to workflow table:

```typescript
export const workflows = mysqlTable('workflows', {
  id: varchar('id', { length: 128 }).primaryKey(),

  // NEW: User association
  userId: varchar('user_id', { length: 128 }).notNull(),

  // NEW: Multi-tenancy (optional)
  tenantId: varchar('tenant_id', { length: 128 }),

  // ... existing fields ...
  name: varchar('name', { length: 255 }).notNull(),
  definition: json('definition').notNull(),
  // ... etc ...

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
}, (table) => ({
  // NEW: Indexes for performance
  userIdx: index('workflows_user_idx').on(table.userId),
  tenantIdx: index('workflows_tenant_idx').on(table.tenantId),
  // ... existing indexes ...
}));
```

Then run:
```bash
bun run db:generate  # Generate migration
bun run db:push      # Apply to database
```

---

## Step 5: Test Everything (10 minutes)

### Test 1: Register User

```bash
curl -X POST http://localhost:3013/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123"
  }'

# Expected response:
# {
#   "success": true,
#   "data": {
#     "user": { "id": "...", "email": "..." },
#     "accessToken": "eyJ...",
#     "refreshToken": "eyJ...",
#     "expiresIn": 900
#   }
# }
```

### Test 2: Access Protected Route

```bash
# Replace with actual token from registration
ACCESS_TOKEN="eyJ..."

curl http://localhost:3013/api/plugins \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected: List of plugins
```

### Test 3: Verify Permission Check

```bash
curl -X POST http://localhost:3013/workscript/workflows \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "definition": {}
  }'

# Expected: Workflow created with userId set
```

---

## Congratulations! 🎉

Your authentication system is now live!

### What You Can Do Now:

✅ Users can register and login
✅ API key creation and validation
✅ Protected routes with permissions
✅ Multi-user support
✅ Rate limiting
✅ Account lockout

### Next Steps (Optional):

- [ ] Create integration tests
- [ ] Add email verification
- [ ] Add password reset email
- [ ] Implement OAuth (Google, GitHub)
- [ ] Add 2FA support
- [ ] Setup audit logging
- [ ] Configure Redis for sessions

---

## Troubleshooting

**Problem:** "Database tables not found"
**Solution:** Run `bun run db:push` again

**Problem:** "Unauthorized on auth routes"
**Solution:** Make sure auth routes are mounted BEFORE app.use('/api/*', authenticate)

**Problem:** "Token not working"
**Solution:** Check JWT_SECRET and JWT_REFRESH_SECRET in .env are set

**Problem:** "User data missing in handler"
**Solution:** Make sure `authenticate` middleware is applied before your handler

**More help:** See `apps/api/src/shared-services/auth/README.md`

---

**Auth system is ready! Happy coding! 🚀**
