# Hono API Server Authentication & Authorization Implementation Plan

**Version:** 1.0.0  
**Date:** October 2025  
**Status:** Development Plan  
**Compatibility:** Designed for seamless NextJS/Clerk migration

---

## 🎯 Executive Summary

This document outlines a comprehensive authentication and authorization strategy for your Hono API server that:
- **Remains stable** during your NextJS migration
- **Supports multiple auth methods** (JWT, API Keys, Sessions)
- **Integrates seamlessly** with your workflow execution system
- **Scales** from MVP to enterprise
- **Compatible** with future Clerk integration

---

## 📋 Current State Analysis

### What You Have
- ✅ Hono API server with workflow execution
- ✅ WebSocket infrastructure for real-time updates
- ✅ Database layer with Drizzle ORM (MySQL)
- ✅ Google OAuth integration (for Gmail nodes)
- ✅ Working API endpoints

### What You Need
- 🔐 Authentication system (who is the user?)
- 🛡️ Authorization system (what can they do?)
- 🔑 API key management for programmatic access
- 🌐 WebSocket authentication
- 📊 Rate limiting per user/tenant
- 🔄 Session management

---

## 🏗️ Authentication Architecture

### Option 1: JWT-Based Authentication (Recommended) ⭐

**Why JWT?**
- Stateless (scales horizontally)
- Works with both REST and WebSocket
- Compatible with Clerk tokens
- Industry standard

```typescript
// server/src/auth/jwt.ts
import { sign, verify } from 'hono/jwt';
import { Context } from 'hono';

export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'api';
  permissions: string[];
  tenantId?: string; // For multi-tenancy
  exp?: number;
}

export class JWTManager {
  private readonly secret: string;
  private readonly refreshSecret: string;
  
  constructor() {
    this.secret = process.env.JWT_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;
  }
  
  async generateTokens(payload: Omit<JWTPayload, 'exp'>) {
    const accessToken = await sign(
      { ...payload, exp: Math.floor(Date.now() / 1000) + (60 * 15) }, // 15 min
      this.secret
    );
    
    const refreshToken = await sign(
      { userId: payload.userId, exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) }, // 7 days
      this.refreshSecret
    );
    
    return { accessToken, refreshToken };
  }
  
  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      return await verify(token, this.secret) as JWTPayload;
    } catch {
      return null;
    }
  }
  
  async verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      return await verify(token, this.refreshSecret) as { userId: string };
    } catch {
      return null;
    }
  }
}
```

### Option 2: Session-Based Authentication

```typescript
// server/src/auth/session.ts
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import Redis from 'ioredis';

export class SessionManager {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }
  
  async createSession(userId: string, data: any): Promise<string> {
    const sessionId = crypto.randomUUID();
    await this.redis.setex(
      `session:${sessionId}`,
      60 * 60 * 24, // 24 hours
      JSON.stringify({ userId, ...data })
    );
    return sessionId;
  }
  
  async getSession(sessionId: string) {
    const data = await this.redis.get(`session:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async deleteSession(sessionId: string) {
    await this.redis.del(`session:${sessionId}`);
  }
}
```

### Option 3: API Key Authentication (For Programmatic Access)

```typescript
// server/src/auth/apikey.ts
import { createHash, randomBytes } from 'crypto';
import { db } from '../db';
import { apiKeys } from '../db/schema';

export class APIKeyManager {
  generateAPIKey(): string {
    // Format: wks_live_xxxxxxxxxxxxx (similar to Stripe)
    const prefix = process.env.NODE_ENV === 'production' ? 'wks_live_' : 'wks_test_';
    const key = randomBytes(32).toString('hex');
    return `${prefix}${key}`;
  }
  
  hashAPIKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
  
  async createAPIKey(userId: string, name: string, permissions: string[]) {
    const apiKey = this.generateAPIKey();
    const hashedKey = this.hashAPIKey(apiKey);
    
    await db.insert(apiKeys).values({
      id: crypto.randomUUID(),
      userId,
      name,
      keyHash: hashedKey,
      permissions: JSON.stringify(permissions),
      lastUsedAt: null,
      createdAt: new Date()
    });
    
    return apiKey; // Return unhashed key ONLY on creation
  }
  
  async validateAPIKey(apiKey: string) {
    const hashedKey = this.hashAPIKey(apiKey);
    const keyData = await db.query.apiKeys.findFirst({
      where: eq(apiKeys.keyHash, hashedKey)
    });
    
    if (keyData) {
      // Update last used timestamp
      await db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyData.id));
    }
    
    return keyData;
  }
}
```

---

## 🛡️ Authorization System (RBAC)

### Role-Based Access Control

```typescript
// server/src/auth/rbac.ts
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  API = 'api'
}

export enum Permission {
  // Workflow permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',
  
  // Automation permissions
  AUTOMATION_CREATE = 'automation:create',
  AUTOMATION_READ = 'automation:read',
  AUTOMATION_UPDATE = 'automation:update',
  AUTOMATION_DELETE = 'automation:delete',
  
  // Admin permissions
  USER_MANAGE = 'user:manage',
  API_KEY_MANAGE = 'apikey:manage',
  SYSTEM_CONFIG = 'system:config'
}

export const RolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission), // All permissions
  [Role.USER]: [
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_EXECUTE,
    Permission.AUTOMATION_CREATE,
    Permission.AUTOMATION_READ,
    Permission.AUTOMATION_UPDATE,
    Permission.AUTOMATION_DELETE,
  ],
  [Role.API]: [
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_EXECUTE,
    Permission.AUTOMATION_READ,
  ]
};

export class RBAC {
  hasPermission(userRole: Role, permission: Permission): boolean {
    return RolePermissions[userRole]?.includes(permission) ?? false;
  }
  
  hasAnyPermission(userRole: Role, permissions: Permission[]): boolean {
    return permissions.some(p => this.hasPermission(userRole, p));
  }
  
  hasAllPermissions(userRole: Role, permissions: Permission[]): boolean {
    return permissions.every(p => this.hasPermission(userRole, p));
  }
}
```

---

## 🔧 Implementation in Hono

### 1. Authentication Middleware

```typescript
// server/src/middleware/auth.ts
import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { bearerAuth } from 'hono/bearer-auth';
import { JWTManager } from '../auth/jwt';
import { APIKeyManager } from '../auth/apikey';
import { RBAC, Permission } from '../auth/rbac';

const jwtManager = new JWTManager();
const apiKeyManager = new APIKeyManager();
const rbac = new RBAC();

export interface AuthContext {
  user?: {
    userId: string;
    email: string;
    role: string;
    permissions: string[];
    tenantId?: string;
  };
}

// Main authentication middleware
export const authenticate = async (c: Context<{ Variables: AuthContext }>, next: Next) => {
  // 1. Check for API Key
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    const keyData = await apiKeyManager.validateAPIKey(apiKey);
    if (keyData) {
      c.set('user', {
        userId: keyData.userId,
        email: 'api@system',
        role: 'api',
        permissions: JSON.parse(keyData.permissions),
        tenantId: keyData.tenantId
      });
      return next();
    }
  }
  
  // 2. Check for JWT Bearer token
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = await jwtManager.verifyAccessToken(token);
    if (payload) {
      c.set('user', payload);
      return next();
    }
  }
  
  // 3. Check for session cookie (optional)
  const sessionId = getCookie(c, 'sessionId');
  if (sessionId) {
    // Implement session validation
  }
  
  return c.json({ error: 'Unauthorized' }, 401);
};

// Permission-based authorization middleware
export const requirePermission = (...permissions: Permission[]) => {
  return async (c: Context<{ Variables: AuthContext }>, next: Next) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    const hasPermission = permissions.every(p => 
      user.permissions.includes(p) || 
      rbac.hasPermission(user.role as any, p)
    );
    
    if (!hasPermission) {
      return c.json({ error: 'Forbidden' }, 403);
    }
    
    return next();
  };
};
```

### 2. Apply to Routes

```typescript
// server/src/api/workflows.ts
import { Hono } from 'hono';
import { authenticate, requirePermission } from '../middleware/auth';
import { Permission } from '../auth/rbac';

const app = new Hono();

// Public endpoints (no auth)
app.get('/public/status', (c) => {
  return c.json({ status: 'ok' });
});

// Protected endpoints
app.use('/*', authenticate); // Apply auth to all routes below

// List workflows (read permission)
app.get('/', 
  requirePermission(Permission.WORKFLOW_READ),
  async (c) => {
    const user = c.get('user');
    // Filter workflows by user/tenant
    const workflows = await db.query.workflows.findMany({
      where: eq(workflows.userId, user.userId)
    });
    return c.json(workflows);
  }
);

// Execute workflow (execute permission)
app.post('/:id/execute',
  requirePermission(Permission.WORKFLOW_EXECUTE),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    
    // Verify user owns this workflow
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflows.id, id),
        eq(workflows.userId, user.userId)
      )
    });
    
    if (!workflow) {
      return c.json({ error: 'Workflow not found' }, 404);
    }
    
    // Execute workflow
    const result = await workflowService.executeWorkflow(workflow);
    return c.json(result);
  }
);

// Create workflow (create permission)
app.post('/',
  requirePermission(Permission.WORKFLOW_CREATE),
  async (c) => {
    const user = c.get('user');
    const body = await c.req.json();
    
    const workflow = await db.insert(workflows).values({
      ...body,
      userId: user.userId,
      tenantId: user.tenantId
    });
    
    return c.json(workflow, 201);
  }
);

export default app;
```

### 3. WebSocket Authentication

```typescript
// server/src/services/WebSocketManager.ts
import { JWTManager } from '../auth/jwt';

export class AuthenticatedWebSocketManager extends WebSocketManager {
  private jwtManager = new JWTManager();
  
  async handleConnection(ws: WebSocket, request: Request) {
    // Extract token from query params or first message
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.send(JSON.stringify({ error: 'Authentication required' }));
      ws.close(1008, 'Authentication required');
      return;
    }
    
    const payload = await this.jwtManager.verifyAccessToken(token);
    if (!payload) {
      ws.send(JSON.stringify({ error: 'Invalid token' }));
      ws.close(1008, 'Invalid token');
      return;
    }
    
    // Store authenticated user with connection
    const client: AuthenticatedWebSocketClient = {
      id: crypto.randomUUID(),
      ws,
      userId: payload.userId,
      role: payload.role,
      permissions: payload.permissions,
      tenantId: payload.tenantId,
      metadata: {
        connectedAt: new Date(),
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    };
    
    this.clients.set(client.id, client);
    
    // Send authentication success
    ws.send(JSON.stringify({ 
      type: 'auth:success',
      userId: payload.userId 
    }));
  }
  
  // Override broadcast to respect permissions
  broadcastToTenant(tenantId: string, message: any) {
    this.clients.forEach(client => {
      if (client.tenantId === tenantId) {
        client.ws.send(JSON.stringify(message));
      }
    });
  }
}
```

---

## 🗄️ Database Schema

```typescript
// server/src/db/schema.ts
import { mysqlTable, varchar, text, json, timestamp, boolean, int } from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: varchar('role', { length: 50 }).default('user'),
  permissions: json('permissions').default([]),
  tenantId: varchar('tenant_id', { length: 36 }),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const apiKeys = mysqlTable('api_keys', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  keyHash: varchar('key_hash', { length: 64 }).unique().notNull(),
  permissions: json('permissions').default([]),
  rateLimit: int('rate_limit').default(1000), // requests per hour
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow()
});

export const refreshTokens = mysqlTable('refresh_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull(),
  token: varchar('token', { length: 512 }).unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});
```

---

## 🔌 Authentication Endpoints

```typescript
// server/src/api/auth.ts
import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { users, refreshTokens } from '../db/schema';
import { JWTManager } from '../auth/jwt';
import { setCookie, deleteCookie } from 'hono/cookie';

const app = new Hono();
const jwtManager = new JWTManager();

// Register
app.post('/register', async (c) => {
  const { email, password } = await c.req.json();
  
  // Validate input
  if (!email || !password) {
    return c.json({ error: 'Email and password required' }, 400);
  }
  
  // Check if user exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  
  if (existing) {
    return c.json({ error: 'User already exists' }, 409);
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create user
  const userId = crypto.randomUUID();
  await db.insert(users).values({
    id: userId,
    email,
    passwordHash,
    role: 'user'
  });
  
  // Generate tokens
  const { accessToken, refreshToken } = await jwtManager.generateTokens({
    userId,
    email,
    role: 'user',
    permissions: []
  });
  
  // Store refresh token
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    userId,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  });
  
  return c.json({ 
    accessToken, 
    refreshToken,
    user: { userId, email, role: 'user' }
  });
});

// Login
app.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });
  
  if (!user || !user.passwordHash) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }
  
  // Generate tokens
  const { accessToken, refreshToken } = await jwtManager.generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || []
  });
  
  // Store refresh token
  await db.insert(refreshTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    token: refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  
  return c.json({ 
    accessToken, 
    refreshToken,
    user: { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    }
  });
});

// Refresh token
app.post('/refresh', async (c) => {
  const { refreshToken } = await c.req.json();
  
  if (!refreshToken) {
    return c.json({ error: 'Refresh token required' }, 400);
  }
  
  // Verify refresh token
  const payload = await jwtManager.verifyRefreshToken(refreshToken);
  if (!payload) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
  
  // Check if token exists in DB
  const storedToken = await db.query.refreshTokens.findFirst({
    where: and(
      eq(refreshTokens.token, refreshToken),
      gt(refreshTokens.expiresAt, new Date())
    )
  });
  
  if (!storedToken) {
    return c.json({ error: 'Invalid refresh token' }, 401);
  }
  
  // Get user details
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId)
  });
  
  if (!user) {
    return c.json({ error: 'User not found' }, 404);
  }
  
  // Generate new access token
  const { accessToken } = await jwtManager.generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || []
  });
  
  return c.json({ accessToken });
});

// Logout
app.post('/logout', authenticate, async (c) => {
  const { refreshToken } = await c.req.json();
  
  if (refreshToken) {
    // Delete refresh token from DB
    await db.delete(refreshTokens)
      .where(eq(refreshTokens.token, refreshToken));
  }
  
  // Clear cookies if using sessions
  deleteCookie(c, 'sessionId');
  
  return c.json({ success: true });
});

export default app;
```

---

## 🔄 Client Integration

### JavaScript/TypeScript Client

```typescript
// client/src/services/AuthService.ts
export class AuthService {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3013';
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  
  constructor() {
    // Load tokens from localStorage
    this.accessToken = localStorage.getItem('accessToken');
    this.refreshToken = localStorage.getItem('refreshToken');
  }
  
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Login failed');
    }
    
    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken);
    return data.user;
  }
  
  async register(email: string, password: string) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (!response.ok) {
      throw new Error('Registration failed');
    }
    
    const data = await response.json();
    this.setTokens(data.accessToken, data.refreshToken);
    return data.user;
  }
  
  private setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
  
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers);
    
    if (this.accessToken) {
      headers.set('Authorization', `Bearer ${this.accessToken}`);
    }
    
    let response = await fetch(url, { ...options, headers });
    
    // If 401, try to refresh token
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      
      // Retry request with new token
      headers.set('Authorization', `Bearer ${this.accessToken}`);
      response = await fetch(url, { ...options, headers });
    }
    
    return response;
  }
  
  private async refreshAccessToken() {
    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: this.refreshToken })
    });
    
    if (!response.ok) {
      this.logout();
      throw new Error('Token refresh failed');
    }
    
    const data = await response.json();
    this.accessToken = data.accessToken;
    localStorage.setItem('accessToken', data.accessToken);
  }
  
  logout() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
  
  getAccessToken(): string | null {
    return this.accessToken;
  }
}

// Usage in WorkflowService
export class ClientWorkflowService {
  private authService = new AuthService();
  
  async executeWorkflow(workflowDef: WorkflowDefinition) {
    const response = await this.authService.makeAuthenticatedRequest(
      `${this.baseURL}/workflows/${workflowDef.id}/execute`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflowDef)
      }
    );
    
    if (!response.ok) {
      throw new Error('Workflow execution failed');
    }
    
    return response.json();
  }
  
  // WebSocket with authentication
  connectWebSocket() {
    const token = this.authService.getAccessToken();
    if (!token) {
      throw new Error('Authentication required for WebSocket');
    }
    
    const ws = new WebSocket(`${this.wsURL}?token=${token}`);
    
    ws.onopen = () => {
      console.log('WebSocket authenticated and connected');
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'auth:success') {
        console.log('WebSocket authentication successful');
      }
    };
    
    return ws;
  }
}
```

---

## 🚀 Migration Path to NextJS + Clerk

### Phase 1: Current Implementation (Now)
1. Implement JWT-based auth as described above
2. Use this for all API authentication
3. Store user data in your MySQL database

### Phase 2: NextJS Migration (Future)
1. Keep Hono API auth unchanged
2. Add Clerk to NextJS frontend
3. Use Clerk JWT in API calls

### Phase 3: Integration Strategy

```typescript
// nextjs-app/middleware.ts
import { authMiddleware } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export default authMiddleware({
  publicRoutes: ['/'],
  afterAuth(auth, req) {
    // If user is signed in via Clerk
    if (auth.userId) {
      // Pass Clerk token to API
      const response = NextResponse.next();
      response.headers.set('X-Clerk-User-Id', auth.userId);
      return response;
    }
  }
});

// In your API client
class NextAPIClient {
  async makeRequest(endpoint: string, options: RequestInit = {}) {
    const clerkToken = await getToken(); // From Clerk
    
    return fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${clerkToken}`,
        'X-Auth-Provider': 'clerk'
      }
    });
  }
}

// Update Hono to accept Clerk tokens
export const authenticate = async (c: Context, next: Next) => {
  const authProvider = c.req.header('X-Auth-Provider');
  
  if (authProvider === 'clerk') {
    // Verify Clerk JWT
    const clerkPayload = await verifyClerkToken(token);
    if (clerkPayload) {
      c.set('user', {
        userId: clerkPayload.sub,
        email: clerkPayload.email,
        role: 'user',
        permissions: []
      });
      return next();
    }
  }
  
  // Fall back to your JWT auth
  // ... existing JWT logic
};
```

---

## 📊 Implementation Timeline

### Week 1: Core Authentication
- [ ] Set up JWT manager
- [ ] Implement auth endpoints (register, login, logout, refresh)
- [ ] Create auth middleware
- [ ] Add database tables

### Week 2: Authorization & Integration
- [ ] Implement RBAC system
- [ ] Add permission checks to all endpoints
- [ ] Integrate WebSocket authentication
- [ ] Create API key management

### Week 3: Client Integration
- [ ] Build AuthService for client
- [ ] Update WorkflowService with auth
- [ ] Add auth UI components
- [ ] Test end-to-end flow

### Week 4: Production Readiness
- [ ] Add rate limiting
- [ ] Implement account verification
- [ ] Add password reset flow
- [ ] Security audit
- [ ] Documentation

---

## 🔒 Security Best Practices

1. **Token Security**
   - Short-lived access tokens (15 minutes)
   - Secure httpOnly cookies for refresh tokens
   - Token rotation on refresh

2. **Password Security**
   - Bcrypt with cost factor 10+
   - Password complexity requirements
   - Account lockout after failed attempts

3. **API Security**
   - Rate limiting per user/IP
   - CORS configuration
   - Input validation
   - SQL injection prevention (via Drizzle ORM)

4. **WebSocket Security**
   - Token validation on connection
   - Message validation
   - Connection limits

5. **Monitoring**
   - Log all auth events
   - Alert on suspicious activity
   - Regular security audits

---

## 🧪 Testing Strategy

```typescript
// server/src/auth/__tests__/jwt.test.ts
import { describe, it, expect } from 'bun:test';
import { JWTManager } from '../jwt';

describe('JWTManager', () => {
  const jwtManager = new JWTManager();
  
  it('should generate valid tokens', async () => {
    const payload = {
      userId: 'test-user',
      email: 'test@example.com',
      role: 'user',
      permissions: []
    };
    
    const { accessToken, refreshToken } = await jwtManager.generateTokens(payload);
    
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    
    const verified = await jwtManager.verifyAccessToken(accessToken);
    expect(verified?.userId).toBe('test-user');
  });
  
  it('should reject expired tokens', async () => {
    // Create token with immediate expiry
    const token = await sign(
      { userId: 'test', exp: Math.floor(Date.now() / 1000) - 1 },
      process.env.JWT_SECRET!
    );
    
    const verified = await jwtManager.verifyAccessToken(token);
    expect(verified).toBeNull();
  });
});
```

---

## 📝 Environment Variables

```bash
# .env.example
# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=different-secret-key-min-32-chars

# Optional: Session storage (if using sessions)
REDIS_URL=redis://localhost:6379

# Optional: OAuth providers (future)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Optional: Email verification
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=3600000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🎯 Quick Start Implementation

For MVP, start with the simplest approach:

1. **Use JWT authentication only** (skip sessions initially)
2. **Two roles: admin and user** (skip complex RBAC)
3. **No API keys initially** (add when needed)
4. **Basic auth endpoints** (register, login, refresh)
5. **Simple middleware** (authenticate all /api routes)

```typescript
// Minimal MVP implementation (1 day)
// server/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import authRoutes from './api/auth';
import workflowRoutes from './api/workflows';
import { authenticate } from './middleware/auth';

const app = new Hono();

app.use('*', cors());

// Public routes
app.route('/auth', authRoutes);

// Protected routes
app.use('/api/*', authenticate);
app.route('/api/workflows', workflowRoutes);

export default app;
```

This gives you a working auth system that:
- ✅ Protects your workflow execution
- ✅ Works with your existing architecture  
- ✅ Scales to thousands of users
- ✅ Ready for Clerk integration
- ✅ Can be implemented in 1-2 days

---

## 🆘 Common Issues & Solutions

### Issue 1: CORS errors with authentication
```typescript
// Solution: Configure CORS properly
app.use('*', cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true, // Important for cookies
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### Issue 2: WebSocket disconnections
```typescript
// Solution: Implement reconnection with auth
class ReconnectingWebSocket {
  private reconnectAttempts = 0;
  
  connect() {
    const token = this.authService.getAccessToken();
    this.ws = new WebSocket(`${url}?token=${token}`);
    
    this.ws.onclose = () => {
      if (this.reconnectAttempts < 5) {
        setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 1000 * Math.pow(2, this.reconnectAttempts));
      }
    };
  }
}
```

### Issue 3: Token expiry during long workflows
```typescript
// Solution: Refresh token before long operations
async executeWorkflow(workflowDef: WorkflowDefinition) {
  // Check token expiry
  const tokenExpiry = this.getTokenExpiry();
  if (tokenExpiry < Date.now() + 60000) { // Less than 1 minute
    await this.refreshAccessToken();
  }
  
  // Now execute workflow
  return this.workflowService.execute(workflowDef);
}
```

---

This comprehensive plan gives you everything needed to implement robust authentication and authorization for your Hono API server, with a clear migration path to your future NextJS + Clerk setup!