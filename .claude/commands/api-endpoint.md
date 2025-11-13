---
description: Create a new API endpoint in the Hono server with full integration
---

You are helping create a new API endpoint for the Hono server.

## API Endpoint Creation Workflow

### Step 1: Understand Requirements

Ask the user:
1. What is the endpoint purpose?
2. What HTTP method(s)? (GET, POST, PUT, DELETE, PATCH)
3. What is the route path? (e.g., `/api/workflows/:id`)
4. What are the request parameters/body?
5. What should the response look like?
6. Does it need authentication?
7. Does it interact with database?
8. Should it emit WebSocket events?

### Step 2: Architecture Placement

API endpoints go in `/server/src/api/`:
- `/api/workflows.ts` - Workflow-related endpoints
- `/api/automations.ts` - Automation endpoints
- `/api/executions.ts` - Execution endpoints
- Or create new file for new resource type

### Step 3: Implementation Checklist

Create endpoint with:

1. **Route Definition:**
```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const app = new Hono();

// Request validation schema
const requestSchema = z.object({
  field1: z.string(),
  field2: z.number().optional()
});

app.post('/resource', zValidator('json', requestSchema), async (c) => {
  const data = c.req.valid('json');
  // Implementation
});
```

2. **Service Integration:**
- Use WorkflowService for workflow operations
- Use database repositories for data access
- Use WebSocketManager for real-time updates

3. **Error Handling:**
- Use try-catch blocks
- Return appropriate HTTP status codes
- Provide detailed error messages

4. **Response Format:**
```typescript
return c.json({
  success: true,
  data: result,
  message: 'Operation completed successfully'
}, 200);
```

5. **Middleware:**
- Add authentication if needed
- Add request logging
- Add rate limiting if needed

### Step 4: Testing

Create tests in `/server/__tests__/api/`:
```typescript
import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('POST /api/resource', () => {
  it('should create resource successfully', async () => {
    const res = await app.request('/api/resource', {
      method: 'POST',
      body: JSON.stringify({ field1: 'value' }),
      headers: { 'Content-Type': 'application/json' }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
```

### Step 5: Documentation

Update API documentation with:
- Endpoint URL and method
- Request parameters/body schema
- Response format
- Error codes and messages
- Example usage with curl

### Step 6: WebSocket Integration (if needed)

```typescript
import { getWebSocketManager } from '../services/WebSocketManager';

const wsManager = getWebSocketManager();
wsManager.broadcast('channel-name', {
  type: 'event-type',
  data: eventData
});
```

Now, what API endpoint would you like to create?
