# Authentication & Authorization System

Complete authentication and authorization implementation for the Workscript API server with JWT tokens, API keys, and role-based access control (RBAC).

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** 2024

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Authentication Methods](#authentication-methods)
4. [Authorization (RBAC)](#authorization-rbac)
5. [API Endpoints](#api-endpoints)
6. [Integration Guide](#integration-guide)
7. [Security Best Practices](#security-best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Initialize Auth System

```typescript
import { initializeAuth } from '@workscript/auth';

// In server startup (before routing)
await initializeAuth();
```

### 2. Add Auth Middleware to Server

```typescript
import { Hono } from 'hono';
import { authenticate, requirePermission } from '@workscript/auth';
import { Permission } from '@workscript/auth';
import authRoutes from './routes/auth';
import apiKeyRoutes from './routes/apikeys';

const app = new Hono();

// Mount auth routes (public)
app.route('/auth', authRoutes);
app.route('/api/keys', apiKeyRoutes); // Protected, see below

// Protect all /api routes
app.use('/api/*', authenticate);

// Example: Protected route with permission check
app.post('/workflows',
  requirePermission(Permission.WORKFLOW_CREATE),
  async (c) => {
    const user = c.get('user');
    // Create workflow for this user
  }
);
```

### 3. Test Registration & Login

```bash
# Register
curl -X POST http://localhost:3013/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'

# Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  }
}

# Login
curl -X POST http://localhost:3013/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### 4. Access Protected Resources

```bash
# Use access token
curl http://localhost:3013/api/workflows \
  -H "Authorization: Bearer <accessToken>"

# Or use API key
curl http://localhost:3013/api/workflows \
  -H "X-API-Key: wks_live_xxx..."
```

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    HONO API SERVER                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Authentication Middleware               │   │
│  │  (JWT | API Key | Session)                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Authorization Middleware (RBAC)            │   │
│  │  (Check permissions)                                 │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Route Handlers                           │   │
│  │  (Access c.get('user'))                             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
    ┌─────────┐         ┌─────────┐        ┌──────────┐
    │ Database│         │  Redis  │        │ In-Memory│
    │ (MySQL) │         │(optional)│        │(fallback)│
    └─────────┘         └─────────┘        └──────────┘
```

### Component Architecture

```
┌─────────────────────────────────────────┐
│         Shared Services Module          │
│    (apps/api/src/shared-services/auth)  │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │       AuthManager                │  │
│  │  (Orchestrates all auth ops)     │  │
│  └──────────────────────────────────┘  │
│           ↓  ↓  ↓  ↓                    │
│  ┌──────────────────────────────────┐  │
│  │  JWTManager  APIKeyManager        │  │
│  │  SessionManager PermissionManager │  │
│  └──────────────────────────────────┘  │
│           ↓                              │
│  ┌──────────────────────────────────┐  │
│  │       Database Layer             │  │
│  │  (users, api_keys, sessions...)  │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## Authentication Methods

### Method 1: JWT (Stateless) - Recommended

**Best For:** APIs, SPAs, microservices
**Pros:** Stateless, scalable, no database lookup
**Cons:** Can't revoke mid-life, tokens stored in browser

#### How JWT Works

```
1. User logs in
   ↓
2. Server creates JWT with user info
   JWT = Base64(header) + Base64(payload) + HMAC-SHA256(signature)
   ↓
3. Server returns JWT to client
   ↓
4. Client stores JWT in localStorage
   ↓
5. Client sends JWT with each request
   Authorization: Bearer eyJ...
   ↓
6. Server verifies signature (detects tampering)
   ↓
7. Server checks expiration
   ↓
8. If valid, allows request
   If expired, return 401 (client refreshes token)
```

#### Token Structure

```typescript
// Access Token (15 minute expiry)
{
  "userId": "user_123",
  "email": "user@example.com",
  "role": "user",
  "permissions": ["workflow:read", "workflow:create"],
  "tenantId": "tenant_456",  // optional
  "exp": 1704067890,          // expiration timestamp
  "iat": 1704067290           // issued at timestamp
}

// Refresh Token (7 day expiry)
{
  "userId": "user_123",
  "exp": 1704672690,
  "iat": 1704067290
}
```

#### Client Usage

```typescript
// Store tokens after login
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// Send with requests
fetch('/api/workflows', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
  }
});

// When token expires
const response = await fetch('/auth/refresh', {
  method: 'POST',
  body: JSON.stringify({
    refreshToken: localStorage.getItem('refreshToken')
  })
});

// Update tokens
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// Retry original request
```

### Method 2: API Keys

**Best For:** Server-to-server, integrations, long-lived access
**Pros:** Revocable, trackable, no expiry needed
**Cons:** Must be stored securely, potential exposure

#### Format

```
wks_live_abcd1234efgh5678ijkl9012mnop3456
└─┬──┘ └┬┘  └───────────┬───────────┘
  │     │              │
prefix environment    random part
(workscript)(live/test)
```

#### Usage

```typescript
// Create API key
const response = await fetch('/api/keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    name: 'Mobile App',
    permissions: ['workflow:read', 'workflow:execute'],
    rateLimit: 500,
    expiresAt: '2025-12-31T23:59:59Z'
  })
});

const { key } = response.data; // SAVE THIS IMMEDIATELY
// Once you navigate away, can't retrieve again!

// Use API key
fetch('/api/workflows', {
  headers: {
    'X-API-Key': key
  }
});
```

#### Security

```typescript
// On server (never expose this)
const plainKey = "wks_live_abc123...";  // User sees this
const hashedKey = SHA256(plainKey);      // We store this

// On validation
const incomingKey = request.headers['x-api-key'];
const incomingHash = SHA256(incomingKey);
if (incomingHash === storedHash) {
  // Valid!
}
```

### Method 3: Sessions (Optional)

**Best For:** Traditional web apps
**Pros:** Can revoke immediately, server-side control
**Cons:** Requires database lookup per request, sticky sessions needed

#### Architecture

```typescript
// On login
const sessionId = await sessionManager.createSession({
  userId: user.id,
  email: user.email,
  role: user.role,
  lastActivity: new Date()
});

// Server sends as httpOnly cookie
response.set('Set-Cookie', `sessionId=${sessionId}; HttpOnly; Secure`);

// On request, server validates
const session = await sessionManager.getSession(sessionId);
if (session && !isExpired(session)) {
  // User authenticated
}
```

---

## Authorization (RBAC)

### Role Hierarchy

```
┌─────────────────────────────────────────────────┐
│                    ADMIN                        │
│  - All permissions                              │
│  - Can manage users                             │
│  - Can configure system                         │
├─────────────────────────────────────────────────┤
│                    USER                         │
│  - Create/read/update/delete workflows          │
│  - Create/read/update/delete automations        │
│  - Manage own API keys                          │
├─────────────────────────────────────────────────┤
│                    API                          │
│  - Read workflows (read-only)                   │
│  - Execute workflows                           │
│  - No creation/modification allowed             │
└─────────────────────────────────────────────────┘
```

### Permission System

```typescript
// Available permissions
export enum Permission {
  // Workflow
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',

  // Automation
  AUTOMATION_CREATE = 'automation:create',
  AUTOMATION_READ = 'automation:read',
  // ... etc
}
```

### Usage Examples

```typescript
import {
  authenticate,
  requirePermission,
  requireRole,
  Permission
} from '@workscript/auth';

const app = new Hono();

// Require specific permission
app.post('/workflows',
  authenticate,
  requirePermission(Permission.WORKFLOW_CREATE),
  async (c) => { /* ... */ }
);

// Require specific role
app.post('/admin/users',
  authenticate,
  requireRole('admin'),
  async (c) => { /* ... */ }
);

// Check in handler
app.get('/dashboard', authenticate, async (c) => {
  const user = c.get('user');

  if (user.role === 'admin') {
    // Show admin dashboard
  }
});
```

---

## API Endpoints

### Authentication Endpoints

#### POST /auth/register

Register new user.

```bash
curl -X POST http://localhost:3013/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900
  }
}
```

#### POST /auth/login

Login with credentials.

```bash
curl -X POST http://localhost:3013/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

#### POST /auth/refresh

Get new access token.

```bash
curl -X POST http://localhost:3013/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJ..." }'
```

#### POST /auth/logout

Logout (invalidate refresh token).

```bash
curl -X POST http://localhost:3013/auth/logout \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "eyJ..." }'
```

#### GET /auth/me

Get current user info (requires auth).

```bash
curl http://localhost:3013/auth/me \
  -H "Authorization: Bearer <accessToken>"
```

#### POST /auth/change-password

Change password (requires auth).

```bash
curl -X POST http://localhost:3013/auth/change-password \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123",
    "newPassword": "NewPass456"
  }'
```

### API Keys Endpoints

#### GET /api/keys

List user's API keys (requires auth).

```bash
curl http://localhost:3013/api/keys \
  -H "Authorization: Bearer <accessToken>"
```

#### POST /api/keys

Create new API key.

```bash
curl -X POST http://localhost:3013/api/keys \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production",
    "permissions": ["workflow:read", "workflow:execute"],
    "rateLimit": 1000,
    "expiresAt": "2025-12-31T23:59:59Z"
  }'
```

**Important:** Save the returned `key` immediately. You won't see it again!

#### DELETE /api/keys/:id

Revoke an API key.

```bash
curl -X DELETE http://localhost:3013/api/keys/key_123 \
  -H "Authorization: Bearer <accessToken>"
```

---

## Integration Guide

### Protecting Plugin Routes

**In your plugin:**

```typescript
import { Hono } from 'hono';
import {
  authenticate,
  requirePermission,
  Permission
} from '../../shared-services/auth/middleware';

const workflows = new Hono();

// Apply auth to all routes in this router
workflows.use('/*', authenticate);

// Create workflow (requires permission)
workflows.post('/',
  requirePermission(Permission.WORKFLOW_CREATE),
  async (c) => {
    const user = c.get('user');
    // User is now authenticated and authorized

    // Associate workflow with user
    const workflow = {
      // ... workflow data
      userId: user.id,
      tenantId: user.tenantId
    };
  }
);

// List workflows (filter by user)
workflows.get('/', async (c) => {
  const user = c.get('user');

  const userWorkflows = await db.query.workflows.findMany({
    where: eq(workflows.userId, user.id)
  });
});
```

### Frontend Integration

```typescript
// services/auth.ts
export class AuthService {
  private baseURL = 'http://localhost:3013';

  async register(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    this.saveTokens(data.data);
    return data.data.user;
  }

  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    this.saveTokens(data.data);
    return data.data.user;
  }

  private saveTokens(data: any) {
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
  }

  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${this.getAccessToken()}`);

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      await this.refreshToken();
      headers.set('Authorization', `Bearer ${this.getAccessToken()}`);
      response = await fetch(url, { ...options, headers });
    }

    return response;
  }

  private async refreshToken() {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refreshToken: localStorage.getItem('refreshToken')
      })
    });

    const data = await response.json();
    this.saveTokens(data.data);
  }
}
```

---

## Security Best Practices

### 1. Password Security

- **Minimum 8 characters**
- **Must include uppercase, lowercase, number**
- **Hashed with bcrypt (10 rounds)**
- **Never log passwords**
- **Use HTTPS in production**

### 2. Token Security

- **Access tokens:** 15-minute expiry (short)
- **Refresh tokens:** 7-day expiry (longer)
- **Separate secrets for each token type**
- **Token rotation on refresh**
- **httpOnly cookies for refresh tokens** (not localStorage)

### 3. API Key Security

- **Never commit keys to version control**
- **Rotate keys regularly**
- **Use specific permissions (not wildcard)**
- **Set reasonable rate limits**
- **Monitor last-used timestamps**
- **Delete unused keys**

### 4. Account Security

- **Account lockout after 5 failed logins**
- **15-minute lockout duration**
- **Failed attempt tracking**
- **Email verification (optional)**
- **Password reset via email**

### 5. CORS & HTTPS

```typescript
import { cors } from 'hono/cors';

app.use('*', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### 6. Rate Limiting

```typescript
import { rateLimiter } from '@workscript/auth';

// Limit login attempts
app.post('/auth/login',
  rateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 }),
  async (c) => { /* ... */ }
);

// Limit API access
app.use('/api/*',
  rateLimiter({ maxRequests: 1000, windowMs: 60 * 60 * 1000 }),
  authenticate
);
```

---

## Troubleshooting

### "Unauthorized" on Protected Routes

**Problem:** Getting 401 errors on authenticated requests.

**Solution:**
1. Check token is being sent: `Authorization: Bearer <token>`
2. Verify token is not expired: Use `/auth/me` to check
3. If expired, refresh: Use `/auth/refresh` endpoint
4. Check CORS settings allow your frontend URL

### "Insufficient Permissions"

**Problem:** Getting 403 errors despite being authenticated.

**Solution:**
1. Check user's role: `GET /auth/me`
2. Check required permission for endpoint
3. Ask admin to grant permission
4. Or create API key with specific permissions

### "Account Locked"

**Problem:** Getting 429 "Account Locked" errors.

**Solution:**
1. Wait 15 minutes before retrying
2. Check password is correct
3. Reset password if needed
4. Contact admin if issue persists

### API Key Not Working

**Problem:** API key returns 401 even though it's valid.

**Solution:**
1. Verify key format: `wks_live_xxx` or `wks_test_xxx`
2. Check header: `X-API-Key: <key>`
3. Verify key hasn't expired
4. Verify key has required permissions
5. Check rate limit not exceeded

---

## Advanced Topics

### Multi-Tenancy

```typescript
// Each user has optional tenantId
const user = {
  id: 'user_123',
  email: 'user@example.com',
  tenantId: 'tenant_456'  // optional
};

// Filter resources by tenant
const workflows = await db.query.workflows.findMany({
  where: and(
    eq(workflows.userId, user.id),
    eq(workflows.tenantId, user.tenantId)  // tenant isolation
  )
});
```

### Custom Permissions

```typescript
// Grant custom permission beyond role
await authManager.updateUser(user.id, {
  permissions: ['workflow:admin', 'system:audit']
});

// Check in middleware
if (permissionManager.hasUserPermission(user, 'workflow:admin')) {
  // Grant special access
}
```

### Audit Logging

```typescript
// All auth events are logged
// - Login attempts (successful and failed)
// - Token refresh
// - Password changes
// - API key creation/revocation

// Check login_attempts table
const recentFailures = await db.query.loginAttempts.findMany({
  where: and(
    eq(loginAttempts.email, 'user@example.com'),
    gt(loginAttempts.createdAt, oneHourAgo)
  )
});
```

---

## Environment Configuration

**See `.env` file for all auth settings:**

```env
# JWT secrets (change in production!)
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=different-secret-key-min-32-chars

# Token expiry (in seconds)
JWT_ACCESS_EXPIRY=900          # 15 minutes
JWT_REFRESH_EXPIRY=604800      # 7 days

# Security
BCRYPT_ROUNDS=10               # Password hash strength
MAX_LOGIN_ATTEMPTS=5           # Before lockout
LOCKOUT_DURATION=900           # 15 minutes

# Rate limiting
API_KEY_RATE_LIMIT=1000        # Requests per hour
```

---

## Contributing

When extending the auth system:

1. **Add types** to `types.ts`
2. **Implement logic** in appropriate manager
3. **Add middleware** for Hono integration
4. **Create routes** for public endpoints
5. **Document** with JSDoc and examples
6. **Test** with unit and integration tests

---

## Support

For questions or issues:

1. Check this README
2. Review inline code documentation
3. Check `/docs/` folder for detailed guides
4. Open an issue in the repository

---

**Happy authenticating! 🔐**
