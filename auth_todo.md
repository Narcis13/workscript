# Authentication Implementation TODO

**Version:** 2.0.0
**Date:** November 2025
**Status:** 95% Code Complete, Integration Pending
**Progress:** 3,800+ lines implemented, 4 critical integration tasks remaining

---

## 📊 Executive Summary

The authentication system is **95% feature-complete** with production-ready code quality, comprehensive documentation, and strong security foundations. However, the system **cannot yet be used** because:

1. ❌ **Auth routes are not mounted** in the main API server
2. ❌ **Environment variables** are not documented
3. ❌ **Database schema** hasn't been migrated
4. ❌ **Testing suite** does not exist

### What's Already Built ✅

**Completed Implementations:**
- ✅ JWT Manager (531 lines) - Access/refresh token generation and validation
- ✅ API Key Manager (457 lines) - Stripe-style key generation, hashing, validation
- ✅ Permission Manager (374 lines) - RBAC with 3 roles and 14 permissions
- ✅ Session Manager (429 lines) - Stateful session management with auto-cleanup
- ✅ Auth Manager (903 lines) - User registration, login, logout, password management
- ✅ Middleware Suite (532 lines) - Authentication, authorization, rate limiting
- ✅ Auth Routes (550 lines) - Register, login, logout, refresh, change password
- ✅ API Key Routes (376 lines) - List, create, revoke, revoke all keys
- ✅ Database Schema (601 lines) - 6 tables with proper indexing
- ✅ Type System (576 lines) - Complete TypeScript definitions with JSDoc
- ✅ Documentation (876+ lines) - Comprehensive README with examples

**Total Implementation:** ~5,800 lines of production-ready code

### What Needs to Be Done

**Critical (4 tasks - 8 hours)**
1. Mount auth routes in main server
2. Create `.env.example` file
3. Document database migration process
4. Add basic integration tests

**High Priority (4 tasks - 20 hours)**
5. Implement password reset flow
6. Implement email verification flow
7. Protect plugin routes with auth middleware
8. Add Redis-based rate limiting

**Medium Priority (4 tasks - 12 hours)**
9. Complete API key update endpoint
10. Enable session authentication
11. Fix CORS configuration
12. Expand integration documentation

**Testing & Documentation (6 tasks - 16 hours)**
13. Unit tests for all managers
14. Integration tests for routes
15. End-to-end auth flow tests
16. Security testing guide
17. Migration guide with seed data
18. Plugin integration examples

**Total Remaining Effort:** ~56 hours (1.5-2 weeks for one developer)

---

## 🚨 CRITICAL FIXES (DO FIRST)

### 1. ❌ Mount Auth Routes in Main Server

**Status:** NOT STARTED
**Priority:** 🔴 CRITICAL
**Effort:** 15 minutes
**Impact:** Auth system completely inaccessible without this

#### What's the Problem?

The auth routes are fully implemented in:
- `/apps/api/src/routes/auth.ts` (550 lines, complete)
- `/apps/api/src/routes/apikeys.ts` (376 lines, complete)

But they are **NOT imported or mounted** in the main server file (`/apps/api/src/index.ts`), so:
- ❌ `/auth/register` endpoint doesn't exist
- ❌ `/auth/login` endpoint doesn't exist
- ❌ `/api/keys` endpoints don't exist
- **Result:** Users cannot authenticate at all

#### Educational Context: Why Routes Need Mounting

In Hono, routes are defined in separate files but must be explicitly mounted on the main app instance. Think of it like building a house - you can build all the rooms (routes) in a factory, but you need to assemble them into the main structure (app).

```typescript
// Routes are DEFINED somewhere...
export const authRoutes = new Hono().post('/register', /* ... */);

// But they must be MOUNTED on main app...
app.route('/auth', authRoutes);  // WITHOUT THIS LINE, routes don't work!
```

#### Files to Modify

**File:** `/apps/api/src/index.ts`
**Current State:** No auth routes imported or mounted

#### Solution Steps

1. Import auth routes after line 35 (after other imports):
   ```typescript
   import authRoutes from './routes/auth';
   import apiKeyRoutes from './routes/apikeys';
   ```

2. Mount routes after line 45 (after other route mounting):
   ```typescript
   // Authentication routes
   app.route('/auth', authRoutes);
   app.route('/api/keys', apiKeyRoutes);
   ```

#### Acceptance Criteria

- [ ] `GET http://localhost:3000/auth/me` returns 401 (no token) instead of 404 (not found)
- [ ] `POST http://localhost:3000/auth/register` returns validation error instead of 404
- [ ] `POST http://localhost:3000/auth/login` returns validation error instead of 404
- [ ] All auth routes are documented in Swagger/API docs

#### How to Verify

```bash
# After making changes, test with:
curl -X GET http://localhost:3000/auth/me
# Should return: { "error": "Missing or invalid token" }
# NOT: { "error": "Not Found" }
```

---

### 2. ❌ Create Environment Configuration File

**Status:** NOT STARTED
**Priority:** 🔴 CRITICAL
**Effort:** 30 minutes
**Impact:** Developers don't know what variables to set, defaults are insecure

#### What's the Problem?

The auth system requires 12+ environment variables, but:
- ❌ No `.env.example` file exists
- ❌ Code has unsafe defaults (`dev-secret-key-change-in-production`)
- ❌ Developers have no reference for what variables are needed
- ❌ Secret length requirements not documented

#### Educational Context: Why Environment Variables Matter

Environment variables are how you pass **secrets and configuration** to your application without committing them to git. This is critical for security:

```typescript
// ❌ BAD - Secret in code (commits to git, exposed!)
const JWT_SECRET = 'my-super-secret-key';

// ✅ GOOD - Secret from environment
const JWT_SECRET = process.env.JWT_SECRET;
// Then in .env file (not committed):
// JWT_SECRET=your-actual-secret-key
```

Production deployments (like Vercel, Railway, AWS) let you set these variables securely without exposing them in code.

#### File to Create

**File:** `/apps/api/.env.example`

This file shows what variables are needed. It's **safe to commit to git** because it has placeholder values.

#### Content Template

```bash
# ==============================================================================
# Authentication Configuration
# ==============================================================================

# JWT Secret (access tokens) - Used to sign and verify short-lived access tokens
# Min 32 characters, must be cryptographically random
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-jwt-secret-min-32-chars-change-this-in-production

# JWT Refresh Secret (refresh tokens) - Different from JWT_SECRET for security
# Min 32 characters, must be cryptographically random
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_REFRESH_SECRET=your-jwt-refresh-secret-min-32-chars-change-this-in-production

# JWT Expiration Times (in seconds)
JWT_ACCESS_EXPIRY=900              # 15 minutes - short-lived for security
JWT_REFRESH_EXPIRY=604800          # 7 days - allows refresh without re-login

# ==============================================================================
# Password Security Configuration
# ==============================================================================

# Bcrypt rounds - Higher = more secure but slower
# Recommended: 10 (balances security and performance)
# Production: 12+ (more secure, slower)
BCRYPT_ROUNDS=10

# ==============================================================================
# Account Security Configuration
# ==============================================================================

# Failed login attempt limits
MAX_LOGIN_ATTEMPTS=5               # Lock account after 5 failed attempts
LOCKOUT_DURATION=900               # 15 minutes lockout duration

# ==============================================================================
# API Key Configuration
# ==============================================================================

API_KEY_RATE_LIMIT=1000            # Requests per hour per API key
API_KEY_DEFAULT_EXPIRY=31536000    # 1 year in seconds

# ==============================================================================
# Session Configuration (if using session-based auth)
# ==============================================================================

SESSION_EXPIRY=86400               # 24 hours

# ==============================================================================
# Rate Limiting Configuration
# ==============================================================================

# In-memory rate limiter settings (for development)
RATE_LIMIT_WINDOW=3600             # Time window in seconds (1 hour)
RATE_LIMIT_MAX_REQUESTS=100        # Max requests per window per IP

# Redis Configuration (for production rate limiting)
# Only set these if you want to use Redis instead of in-memory storage
# REDIS_URL=redis://localhost:6379
# REDIS_PASSWORD=your-redis-password

# ==============================================================================
# Email Configuration (for password reset and email verification)
# ==============================================================================

# SMTP Configuration for sending emails
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=true                  # Use TLS
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-specific-password
# EMAIL_FROM=noreply@yourapp.com

# Email Templates
# EMAIL_VERIFICATION_EXPIRY=86400    # 24 hours
# PASSWORD_RESET_EXPIRY=1800        # 30 minutes

# ==============================================================================
# Application Configuration
# ==============================================================================

NODE_ENV=development               # development|production|test
PORT=3000
CLIENT_URL=http://localhost:5173   # Frontend URL for CORS

# ==============================================================================
# Database Configuration
# ==============================================================================

DATABASE_URL=mysql://user:password@localhost:3306/workscript_dev

# ==============================================================================
# IMPORTANT SECURITY NOTES
# ==============================================================================

# 1. NEVER commit your actual .env file to git
#    - Add `.env` to .gitignore
#    - Only commit `.env.example` with placeholders
#
# 2. In production, set these variables:
#    - Vercel: Settings → Environment Variables
#    - Railway: Settings → Variables
#    - AWS: CloudFormation Parameters or Secrets Manager
#    - Docker: --env-file or docker-compose.yml
#
# 3. Secret generation for production:
#    $ node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
#
# 4. Rotate secrets periodically (every 90 days recommended)
#
# 5. Never log or print secrets
```

#### File Location Context

```
/apps/api/
├── .env                  # ← Actual secrets (NOT in git)
├── .env.example          # ← Template (safe to commit)
├── .env.test             # ← Test environment
├── .env.production       # ← Production template
└── ...
```

#### Acceptance Criteria

- [ ] `.env.example` exists in `/apps/api/`
- [ ] All 12+ required variables are documented with descriptions
- [ ] Each variable has a comment explaining what it does
- [ ] Examples and safe defaults are provided
- [ ] Security warnings are included
- [ ] Instructions for generating secrets are provided
- [ ] `.env` is in `.gitignore` (never commit actual secrets)

#### How to Verify

```bash
# After creating .env.example, verify:
head -20 /apps/api/.env.example
# Should show JWT_SECRET and other variables

# Verify .env is ignored:
grep "^\.env$" /apps/api/.gitignore
# Should output: .env
```

---

### 3. ❌ Document & Run Database Migrations

**Status:** PARTIAL (schema defined, migration not run)
**Priority:** 🔴 CRITICAL
**Effort:** 45 minutes
**Impact:** Auth tables don't exist in database, system cannot function

#### What's the Problem?

The auth database schema is fully defined in `/apps/api/src/db/schema/auth.schema.ts` (601 lines), but:
- ❌ Database migration hasn't been run (`bun run db:push`)
- ❌ No instructions for setting up the database
- ❌ Developers don't know the expected database state
- ❌ No seed data for testing

#### Educational Context: What Are Database Migrations?

A **migration** is the process of creating database tables and schemas. Think of it like deploying code:

```
Code Version Control:
  my-feature.ts (in git) → deploy → actually runs on server

Database Version Control:
  auth.schema.ts (in git) → migrate → creates tables on database
```

Drizzle ORM (which this project uses) handles creating tables from TypeScript definitions.

#### Step 1: Verify Database Connection

Before running migrations, verify the database is set up:

```bash
cd /apps/api

# Check that .env has DATABASE_URL set:
grep DATABASE_URL .env

# Should output something like:
# DATABASE_URL=mysql://user:password@localhost:3306/workscript_dev
```

#### Step 2: Generate Migration Files

```bash
cd /apps/api

# This generates SQL migration files from schema definitions
bun run db:generate

# Output should show:
# ✓ Generated migration: [timestamp]_init
```

#### Step 3: Push Schema to Database

```bash
cd /apps/api

# This creates the actual tables in the database
bun run db:push

# Output should show:
# ✓ auth_users table created
# ✓ auth_api_keys table created
# ✓ auth_refresh_tokens table created
# ✓ auth_sessions table created
# ✓ auth_password_resets table created
# ✓ auth_login_attempts table created
```

#### Step 4: Verify Tables Were Created

```bash
cd /apps/api

# Open Drizzle Studio to see the tables
bun run db:studio

# Or use MySQL directly:
mysql -u user -p workscript_dev

mysql> SHOW TABLES;
# Should list:
# - auth_users
# - auth_api_keys
# - auth_refresh_tokens
# - auth_sessions
# - auth_password_resets
# - auth_login_attempts

mysql> DESCRIBE auth_users;
# Should show: id, email, passwordHash, role, etc.
```

#### Database Schema Overview

**Table 1: `auth_users`** (6 indexes)
```
Columns:
- id (Primary Key, CUID2)
- email (Unique)
- passwordHash
- firstName, lastName
- role (ENUM: admin|user|api)
- emailVerified
- emailVerificationToken, emailVerificationTokenExpiry
- lastLoginAt
- loginAttempts, lockedUntil
- createdAt, updatedAt

Indexes:
- email (for fast lookups)
- role (for role-based queries)
- lastLoginAt (for analytics)
- emailVerified (for finding unverified accounts)
- lockedUntil (for lockout checks)
- createdAt (for pagination)
```

**Table 2: `auth_api_keys`** (3 indexes)
```
Columns:
- id (Primary Key)
- userId (Foreign Key)
- name
- keyHash (SHA-256, stored not plain)
- permissions (JSON array)
- rateLimit
- expiresAt
- lastUsedAt
- revokedAt
- createdAt, updatedAt

Indexes:
- userId (for finding user's keys)
- keyHash (for validation)
- expiresAt (for expiration cleanup)
```

**Table 3: `auth_refresh_tokens`** (2 indexes)
```
Columns:
- id (Primary Key)
- userId (Foreign Key)
- token (hashed)
- expiresAt
- revokedAt
- createdAt

Indexes:
- userId (for user's tokens)
- expiresAt (for cleanup)
```

**Table 4: `auth_sessions`** (2 indexes)
```
Columns:
- id (Primary Key)
- userId (Foreign Key)
- ipAddress
- userAgent
- expiresAt
- createdAt

Indexes:
- userId (for user's sessions)
- expiresAt (for cleanup)
```

**Table 5: `auth_password_resets`** (3 indexes)
```
Columns:
- id (Primary Key)
- userId (Foreign Key)
- token (hashed)
- expiresAt
- usedAt
- ipAddress
- createdAt

Indexes:
- userId (for user's requests)
- token (for validation)
- expiresAt (for cleanup)
```

**Table 6: `auth_login_attempts`** (3 indexes)
```
Columns:
- id (Primary Key)
- userId or email
- ipAddress
- success (boolean)
- attemptedAt
- createdAt

Indexes:
- userId (for user's history)
- ipAddress (for brute-force detection)
- attemptedAt (for cleanup)
```

#### Files to Create/Modify

1. **Create:** `docs/DATABASE_SETUP.md`
   - Step-by-step database setup guide
   - Migration instructions
   - Seed data creation
   - Troubleshooting section

2. **Modify:** `docs/ENVIRONMENT_SETUP.md`
   - Add database section
   - Link to DATABASE_SETUP.md

#### Acceptance Criteria

- [ ] Database migration has been run successfully
- [ ] All 6 auth tables exist in the database
- [ ] Database setup documentation exists
- [ ] Migration troubleshooting guide is provided
- [ ] Seed data script for development is created
- [ ] Database schema is verified in Drizzle Studio

#### How to Verify

```bash
# After migration, test that tables exist:
mysql -u user -p workscript_dev -e "SHOW TABLES;" | grep auth_
# Should output:
# auth_users
# auth_api_keys
# auth_refresh_tokens
# auth_sessions
# auth_password_resets
# auth_login_attempts

# Test that schema is correct:
mysql -u user -p workscript_dev -e "DESCRIBE auth_users;"
# Should show all columns with correct types
```

---

### 4. ❌ Add Basic Integration Tests

**Status:** NOT STARTED
**Priority:** 🔴 CRITICAL
**Effort:** 4-6 hours
**Impact:** Cannot verify auth system works, likely to have bugs

#### What's the Problem?

The auth system has **zero test coverage**:
- ❌ No unit tests for any managers
- ❌ No integration tests for routes
- ❌ No e2e tests for auth flows
- **Risk:** Bugs can be introduced without detection

#### Educational Context: Why Testing Matters

Tests serve two purposes:
1. **Catch bugs** - Find problems before users do
2. **Prevent regressions** - Ensure changes don't break existing features

```typescript
// Without tests, you can't be sure this works:
const result = await authManager.login(email, password);
// Does it return the right format?
// Does it handle bad passwords correctly?
// Does it lock the account after 5 attempts?
// Only tests can answer these questions!

// With tests, you have confidence:
test('should lock account after 5 failed attempts', async () => {
  for (let i = 0; i < 5; i++) {
    await expect(authManager.login(email, wrongPassword))
      .rejects.toThrow('Invalid credentials');
  }

  const lockedUser = await db.query.users.findFirst({ where: { email } });
  expect(lockedUser?.lockedUntil).toBeDefined();
});
```

#### Files to Create

```
apps/api/src/shared-services/auth/__tests__/
├── JWTManager.test.ts
├── AuthManager.test.ts
├── PermissionManager.test.ts
├── APIKeyManager.test.ts
├── SessionManager.test.ts
├── middleware.test.ts
└── routes.integration.test.ts

apps/api/__tests__/
└── auth-flow.e2e.test.ts
```

#### Test Structure for Each File

**Example: `JWTManager.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JWTManager } from '../JWTManager';

describe('JWTManager', () => {
  let jwtManager: JWTManager;

  beforeAll(() => {
    jwtManager = new JWTManager();
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      // ARRANGE
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        role: Role.USER,
        permissions: [Permission.WORKFLOW_VIEW]
      };

      // ACT
      const { accessToken, refreshToken } = await jwtManager.generateTokens(payload);

      // ASSERT
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);
    });

    it('should access token be shorter-lived than refresh token', async () => {
      const payload = { /* ... */ };
      const { accessToken, refreshToken } = await jwtManager.generateTokens(payload);

      const accessDecoded = await jwtManager.decodeToken(accessToken);
      const refreshDecoded = await jwtManager.decodeToken(refreshToken);

      // Access token should expire sooner
      expect(accessDecoded.exp).toBeLessThan(refreshDecoded.exp);
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify valid token', async () => {
      const payload = { /* ... */ };
      const { accessToken } = await jwtManager.generateTokens(payload);

      const verified = await jwtManager.verifyAccessToken(accessToken);

      expect(verified).toBeDefined();
      expect(verified?.userId).toBe(payload.userId);
    });

    it('should return null for invalid token', async () => {
      const verified = await jwtManager.verifyAccessToken('invalid.token.here');
      expect(verified).toBeNull();
    });

    it('should reject expired token', async () => {
      // Create token with very short expiry (1 second)
      const shortToken = await jwtManager.generateTokens(
        { /* payload */ },
        { accessExpirySeconds: 1 }
      );

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      const verified = await jwtManager.verifyAccessToken(shortToken.accessToken);
      expect(verified).toBeNull();
    });
  });
});
```

#### Acceptance Criteria

- [ ] Test files created for all 6 managers
- [ ] At least 5 tests per manager (happy path + edge cases)
- [ ] Integration tests for auth routes
- [ ] E2E test for full login-logout flow
- [ ] All tests pass (`bun run test:auth`)
- [ ] Test coverage > 80%

#### How to Verify

```bash
cd /apps/api

# Run tests
bun run test:auth

# See coverage
bun run test:auth -- --coverage

# Should output something like:
# ✓ JWTManager.test.ts (8 tests)
# ✓ AuthManager.test.ts (12 tests)
# ✓ PermissionManager.test.ts (6 tests)
# ...
# Total: 50+ tests passing
```

---

## 🔴 HIGH PRIORITY FEATURES (Next Phase)

### 5. ❌ Implement Password Reset Flow

**Status:** 20% (token generation only)
**Priority:** 🔴 HIGH
**Effort:** 6-8 hours
**Dependencies:** Tasks 1-4 must be completed first
**Impact:** Users cannot recover forgotten passwords

#### What's Currently Done

- ✅ Token generation in `AuthManager.requestPasswordReset()` (lines 716-744)
- ✅ Database schema for `password_resets` table
- ✅ Token hashing infrastructure

#### What's Missing

- ❌ Store reset token in database
- ❌ Send reset email via SMTP
- ❌ Validate reset token endpoint
- ❌ Complete password reset endpoint
- ❌ Expiration enforcement (30 minutes)
- ❌ One-time use enforcement

#### Educational Context: How Password Resets Work

Password reset is a critical security flow:

```
User Flow:
1. User clicks "Forgot Password"
2. User enters email → Server generates token
3. Server stores token + expiry in database
4. Server sends email with reset link: https://app.com/reset?token=xyz123
5. User clicks link in email
6. Frontend validates token (calls backend)
7. User enters new password
8. Backend verifies token exists, not expired, not used
9. Backend updates user password, marks token as used
10. User can login with new password

Security Checks:
- Token should be cryptographically random (128 bits+)
- Token should only be valid for 30 minutes
- Token should be hashed in database (never store plaintext)
- Token should be one-time use (can't reset twice with same token)
- Token should be rate-limited (prevent brute-force)
```

#### Step-by-Step Implementation

**Step 1: Complete `requestPasswordReset` in AuthManager**

```typescript
// apps/api/src/shared-services/auth/AuthManager.ts

async requestPasswordReset(email: string, ipAddress: string): Promise<void> {
  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email)
  });

  if (!user) {
    // Security: Don't reveal if email exists (no user enumeration)
    return;
  }

  // Generate cryptographically random token
  const token = crypto.randomBytes(32).toString('hex');

  // Hash token before storing (same as API keys)
  const tokenHash = await hashToken(token);

  // Calculate expiry (30 minutes from now)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // Store in database
  await db.insert(passwordResets).values({
    id: cuid2(),
    userId: user.id,
    token: tokenHash,  // ← Store hash, not plaintext
    expiresAt,
    ipAddress,
    createdAt: new Date()
  });

  // Send email with reset link
  await emailService.sendPasswordReset(user.email, token);

  // Log for audit trail
  console.log(`[Auth] Password reset requested for ${email} from ${ipAddress}`);
}
```

**Step 2: Create Password Reset Email Service**

```typescript
// apps/api/src/shared-services/email/EmailService.ts

export class EmailService {
  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    const html = `
      <h2>Password Reset Request</h2>
      <p>Click below to reset your password. Link expires in 30 minutes.</p>
      <a href="${resetLink}" style="padding: 10px 20px; background: blue; color: white;">
        Reset Password
      </a>
      <p>If you didn't request this, ignore this email.</p>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset - Workscript',
      html
    });
  }
}
```

**Step 3: Create Password Reset Routes**

```typescript
// apps/api/src/routes/password-reset.ts

const passwordResetRoutes = new Hono()
  .post('/request', async (c) => {
    // POST /password-reset/request
    // Request password reset (sends email)
    const { email } = c.req.json();

    try {
      await authManager.requestPasswordReset(
        email,
        c.req.header('x-forwarded-for') || 'unknown'
      );

      return c.json({
        success: true,
        message: 'If email exists, reset link will be sent'
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  })

  .post('/validate', optionalAuth, async (c) => {
    // POST /password-reset/validate
    // Validate that reset token is correct and not expired
    const { token } = c.req.json();

    try {
      const isValid = await authManager.validatePasswordResetToken(token);

      return c.json({ valid: isValid });
    } catch (error) {
      return c.json({ valid: false });
    }
  })

  .post('/complete', async (c) => {
    // POST /password-reset/complete
    // Actually reset the password
    const { token, newPassword } = c.req.json();

    try {
      await authManager.completePasswordReset(token, newPassword);

      return c.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      return c.json({ error: error.message }, 400);
    }
  });
```

#### Files to Create/Modify

1. **Modify:** `/apps/api/src/shared-services/auth/AuthManager.ts`
   - Complete `requestPasswordReset()`
   - Add `validatePasswordResetToken()`
   - Add `completePasswordReset()`

2. **Create:** `/apps/api/src/shared-services/email/EmailService.ts`
   - Implement SMTP integration
   - Email templates for reset, verification, etc.

3. **Create:** `/apps/api/src/routes/password-reset.ts`
   - POST `/password-reset/request`
   - POST `/password-reset/validate`
   - POST `/password-reset/complete`

4. **Modify:** `/apps/api/src/index.ts`
   - Mount password reset routes

#### Acceptance Criteria

- [ ] `requestPasswordReset()` stores token hash in database
- [ ] Reset email is sent with 30-minute expiry
- [ ] Token validation checks hash and expiry
- [ ] Password reset endpoint validates and updates password
- [ ] Token becomes unusable after password is reset
- [ ] Tests cover all scenarios (expired, invalid, success)

#### How to Verify

```bash
# Test password reset flow:
curl -X POST http://localhost:3000/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com"}'

# Check that email was sent and database was updated
mysql -u user -p workscript_dev -e "SELECT * FROM auth_password_resets WHERE userId='user_123';"

# Should show:
# id | userId | tokenHash | expiresAt | usedAt | ipAddress | createdAt
```

---

### 6. ❌ Implement Email Verification Flow

**Status:** 0% (schema only)
**Priority:** 🔴 HIGH
**Effort:** 6-8 hours
**Dependencies:** Tasks 1-4, 5 (email service)
**Impact:** Cannot enforce email verification before access

#### What's Currently Done

- ✅ `users.emailVerified` field in schema
- ✅ Email token fields in schema
- ❌ Everything else commented out

#### What's Missing

- ❌ Generate verification token on registration
- ❌ Send verification email
- ❌ Email verification endpoint
- ❌ Resend verification endpoint
- ❌ Enforce verification in login (configurable)

#### Educational Context: Email Verification Security

Email verification serves multiple purposes:

```
1. SPAM PREVENTION - Confirm user controls the email address
   - If you don't verify emails, spammers can register with fake addresses

2. COMMUNICATION - Ensure you can reach users
   - Users forget/mistype emails, verification catches this

3. FRAUD DETECTION - Catch automated attacks
   - Real users verify emails, bots don't

4. DOUBLE OPT-IN - Regulatory compliance (GDPR, CAN-SPAM)
   - Many regulations require confirmation of email address
```

#### Step-by-Step Implementation

**Step 1: Generate verification token on registration**

```typescript
// In AuthManager.register(), after user creation:

const emailVerificationToken = crypto.randomBytes(32).toString('hex');
const tokenHash = hashToken(emailVerificationToken);

// Update user with token
await db.update(users)
  .set({
    emailVerificationToken: tokenHash,
    emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
  })
  .where(eq(users.id, user.id));

// Send verification email
await emailService.sendVerificationEmail(
  user.email,
  emailVerificationToken
);
```

**Step 2: Create verification endpoints**

```typescript
// POST /auth/verify-email?token=xxx
// Verify email using token from link

// POST /auth/resend-verification
// Resend verification email (if not yet verified)
```

#### Files to Create/Modify

1. **Modify:** `/apps/api/src/shared-services/auth/AuthManager.ts`
   - Lines 347-353 (currently commented)
   - Add email verification logic
   - Add resend verification logic

2. **Modify:** `/apps/api/src/routes/auth.ts`
   - Add `GET /auth/verify-email?token=xxx`
   - Add `POST /auth/resend-verification`

3. **Modify:** `/apps/api/src/shared-services/email/EmailService.ts`
   - Add `sendVerificationEmail()` method

#### Acceptance Criteria

- [ ] Verification token generated on registration
- [ ] Verification email sent with 24-hour expiry
- [ ] Email verification endpoint validates token
- [ ] Verified status updates after successful verification
- [ ] Resend verification endpoint works
- [ ] Optional enforcement in login (config-based)

---

### 7. ❌ Protect Plugin Routes with Auth Middleware

**Status:** 0%
**Priority:** 🔴 HIGH
**Effort:** 4-6 hours
**Dependencies:** Task 1 (routes mounted)
**Impact:** Plugin endpoints are completely unprotected

#### What's the Problem?

All plugin routes in `/apps/api/src/plugins/` have **no authentication**:

```typescript
// Example from workscript plugin - COMPLETELY UNPROTECTED!

export const workflows = new Hono()
  .post('/', async (c) => {  // ❌ No authenticate middleware!
    // Anyone can POST here without logging in
    const workflow = c.req.json();
    return c.json(await db.insert(workflows).values(workflow));
  });
```

This means:
- ❌ Unauthenticated users can create workflows
- ❌ Users can access other users' data
- ❌ No rate limiting
- ❌ No permission checking

#### Educational Context: Middleware Pattern in Hono

Middleware in Hono works like layers:

```
Request → Logging → Authentication → Authorization → Rate Limit → Handler
   ↓         ✓            ✓             ✓             ✓           ✓
                                                                  Returns response
```

If any middleware fails, request never reaches handler:

```typescript
// Without auth middleware - handler runs for everyone
export const workflows = new Hono()
  .post('/', async (c) => { /* ... */ });

// With auth middleware - only authenticated users reach handler
export const workflows = new Hono()
  .post('/', authenticate, async (c) => {
    // c.get('user') is now available and guaranteed to exist
    const currentUser = c.get('user');
    // ...
  });

// With permission checking - only authorized users
export const workflows = new Hono()
  .post('/',
    authenticate,
    requirePermission(Permission.WORKFLOW_CREATE),
    async (c) => {
      // Only users with WORKFLOW_CREATE permission reach here
      // ...
    }
  );
```

#### Step-by-Step Implementation

**Step 1: Import auth middleware in plugins**

```typescript
// apps/api/src/plugins/workscript/routes/workflows.ts

import {
  authenticate,
  requirePermission,
  rateLimiter
} from '../../../shared-services/auth/middleware';
import { Permission } from '../../../shared-services/auth/types';

export const workflows = new Hono();

// List workflows (read permission needed)
workflows.get('/',
  authenticate,
  requirePermission(Permission.WORKFLOW_VIEW),
  async (c) => {
    const user = c.get('user');
    const userWorkflows = await db.query.workflows.findMany({
      where: eq(workflows.userId, user.userId)
    });
    return c.json(userWorkflows);
  }
);

// Create workflow (write permission needed)
workflows.post('/',
  authenticate,
  requirePermission(Permission.WORKFLOW_CREATE),
  rateLimiter({ maxRequests: 100, windowSeconds: 3600 }),
  async (c) => {
    const user = c.get('user');
    const data = await c.req.json();

    const workflow = await db.insert(workflowsTable).values({
      ...data,
      userId: user.userId,  // ← Ensure user ownership
      createdAt: new Date()
    });

    return c.json(workflow, 201);
  }
);

// Update workflow (write + ownership check)
workflows.put('/:id',
  authenticate,
  requirePermission(Permission.WORKFLOW_EDIT),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();

    // Check ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflowsTable.id, id),
        eq(workflowsTable.userId, user.userId)
      )
    });

    if (!workflow) {
      return c.json({ error: 'Not found' }, 404);
    }

    const updated = await db.update(workflowsTable)
      .set(await c.req.json())
      .where(eq(workflowsTable.id, id));

    return c.json(updated);
  }
);

// Delete workflow
workflows.delete('/:id',
  authenticate,
  requirePermission(Permission.WORKFLOW_DELETE),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();

    // Check ownership
    const workflow = await db.query.workflows.findFirst({
      where: and(
        eq(workflowsTable.id, id),
        eq(workflowsTable.userId, user.userId)
      )
    });

    if (!workflow) {
      return c.json({ error: 'Not found' }, 404);
    }

    await db.delete(workflowsTable).where(eq(workflowsTable.id, id));

    return c.json({ success: true });
  }
);
```

**Step 2: Apply same pattern to all plugin routes**

For each plugin (workscript, custom integrations, etc.):
1. Import auth middleware
2. Add `authenticate` to every non-public endpoint
3. Add `requirePermission()` based on operation
4. Check resource ownership before operations

**Step 3: Document required permissions for each endpoint**

```typescript
/**
 * List all workflows for current user
 *
 * **Required:** Authenticated + WORKFLOW_VIEW permission
 *
 * @route GET /workflows
 * @auth required (JWT or API Key)
 * @permission required WORKFLOW_VIEW
 *
 * @returns {Workflow[]} Array of workflows
 *
 * @example
 * GET /workflows HTTP/1.1
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *
 * Response:
 * [
 *   { id: "wf_123", name: "My Workflow", ... },
 *   { id: "wf_456", name: "Another Workflow", ... }
 * ]
 */
```

#### Files to Modify

For each plugin route file, add middleware:
- `/apps/api/src/plugins/workscript/routes/workflows.ts`
- `/apps/api/src/plugins/workscript/routes/automations.ts`
- `/apps/api/src/plugins/workscript/routes/executions.ts`
- Any other plugin route files

#### Acceptance Criteria

- [ ] All plugin routes require `authenticate` middleware
- [ ] Create/edit/delete operations require specific permissions
- [ ] Resource ownership is checked before modifications
- [ ] Rate limiting is applied to write operations
- [ ] Endpoints are documented with required auth/permissions
- [ ] Unauthenticated requests return 401
- [ ] Unauthorized requests return 403

#### How to Verify

```bash
# Test unauthenticated access (should fail):
curl -X GET http://localhost:3000/workflows
# Should return: { error: "Missing or invalid token" }, 401

# Test with valid token:
curl -X GET http://localhost:3000/workflows \
  -H "Authorization: Bearer eyJhbGc..."
# Should return workflows for that user

# Test with invalid permission:
# (API key with only "read" permissions trying to create)
curl -X POST http://localhost:3000/workflows \
  -H "X-API-Key: wks_live_..."
  -H "Content-Type: application/json"
  -d '{"name":"test"}'
# Should return: { error: "Insufficient permissions" }, 403
```

---

### 8. ❌ Production-Ready Rate Limiting with Redis

**Status:** 10% (in-memory only)
**Priority:** 🔴 HIGH
**Effort:** 4-6 hours
**Dependencies:** Redis setup
**Impact:** Rate limits reset on restart, not distributed

#### What's the Problem?

Current rate limiting in `middleware.ts` (lines 415-469) uses in-memory storage:

```typescript
// ❌ This loses data on restart and doesn't work across multiple servers
const store = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(options: RateLimitOptions) {
  return async (c: Context, next: NextHandler) => {
    const key = `${userId}:${path}`;
    const entry = store.get(key) || { count: 0, resetTime: Date.now() };

    // If using multiple servers, each has different 'store' → doesn't work!
  };
}
```

**Issues:**
- ❌ Limits reset when server restarts (users can spam again)
- ❌ In scaled deployments, each server has separate limits (users can bypass)
- ❌ Memory leak if cleanup doesn't work
- ❌ No persistence

#### Educational Context: Why Redis for Rate Limiting?

Rate limiting tracks request counts across time:

```
Redis stores: "user_123:api_rate_limit" → 45 requests
               "user_456:api_rate_limit" → 12 requests

When request comes:
1. Increment counter in Redis (atomic, instant)
2. Set expiry to 1 hour
3. Check if counter exceeds limit
4. Even if server restarts, Redis data persists!
5. Multiple servers can share same limits!
```

#### Step-by-Step Implementation

**Step 1: Install Redis**

```bash
# If using Docker:
docker run -d -p 6379:6379 redis:latest

# If on Mac with Homebrew:
brew install redis
brew services start redis

# Verify Redis is running:
redis-cli ping
# Should output: PONG
```

**Step 2: Install Redis client**

```bash
cd /apps/api
bun add ioredis
```

**Step 3: Create Redis Rate Limiter**

```typescript
// apps/api/src/shared-services/rate-limiting/RedisRateLimiter.ts

import Redis from 'ioredis';

export class RedisRateLimiter {
  private redis: Redis;

  constructor() {
    // Use REDIS_URL from environment, or default to local
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Check if request should be allowed
   *
   * @param key - Unique identifier (e.g., "user_123", "ip_192.168.1.1")
   * @param limit - Max requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns true if request is allowed, false if limit exceeded
   *
   * @example
   * // Allow 100 requests per hour per user
   * const allowed = await rateLimiter.checkLimit(
   *   `user_${userId}`,
   *   100,
   *   3600
   * );
   */
  async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const fullKey = `rate_limit:${key}`;

    // Get current count
    const current = await this.redis.incr(fullKey);

    // If first request in window, set expiry
    if (current === 1) {
      await this.redis.expire(fullKey, windowSeconds);
    }

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);

    // Get TTL (time until reset)
    const ttl = await this.redis.ttl(fullKey);
    const resetAt = new Date(Date.now() + ttl * 1000);

    return { allowed, remaining, resetAt };
  }

  /**
   * Get current request count
   */
  async getCount(key: string): Promise<number> {
    const count = await this.redis.get(`rate_limit:${key}`);
    return parseInt(count || '0', 10);
  }

  /**
   * Reset limit for a key (useful for admins or special cases)
   */
  async reset(key: string): Promise<void> {
    await this.redis.del(`rate_limit:${key}`);
  }

  /**
   * Cleanup (call on server shutdown)
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
```

**Step 4: Update middleware to use Redis**

```typescript
// apps/api/src/shared-services/auth/middleware.ts

import { RedisRateLimiter } from '../rate-limiting/RedisRateLimiter';

const rateLimiter = new RedisRateLimiter();

export function createRateLimitMiddleware(options: {
  requestsPerHour?: number;
  requestsPerMinute?: number;
}) {
  return async (c: Context, next: NextHandler) => {
    const user = c.get('user');
    if (!user) return next(); // Only rate limit authenticated users

    const limiterKey = `user_${user.userId}`;

    const { allowed, remaining, resetAt } = await rateLimiter.checkLimit(
      limiterKey,
      options.requestsPerHour || 1000,
      3600  // 1 hour
    );

    // Add rate limit headers
    c.header('X-RateLimit-Remaining', remaining.toString());
    c.header('X-RateLimit-Reset', resetAt.toISOString());

    if (!allowed) {
      return c.json(
        {
          error: 'Rate limit exceeded',
          resetAt,
          remaining: 0
        },
        429  // Too Many Requests
      );
    }

    return next();
  };
}
```

**Step 5: Apply to routes**

```typescript
// In plugin routes:
workflows.post('/',
  authenticate,
  requirePermission(Permission.WORKFLOW_CREATE),
  createRateLimitMiddleware({ requestsPerHour: 100 }),
  async (c) => { /* ... */ }
);
```

#### Files to Create/Modify

1. **Create:** `/apps/api/src/shared-services/rate-limiting/RedisRateLimiter.ts`
2. **Modify:** `/apps/api/src/shared-services/auth/middleware.ts`
   - Replace in-memory limiter with Redis version
3. **Modify:** `/apps/api/.env.example`
   - Add REDIS_URL configuration
4. **Create:** `/apps/api/src/shared-services/rate-limiting/__tests__/RedisRateLimiter.test.ts`

#### Acceptance Criteria

- [ ] Redis is installed and running
- [ ] RedisRateLimiter class created with atomic operations
- [ ] Rate limits persist across server restarts
- [ ] Multiple servers share the same limits
- [ ] Rate limit headers are returned
- [ ] 429 response returned when limit exceeded
- [ ] Tests cover limit checking, reset, and TTL

#### How to Verify

```bash
# Start Redis:
redis-cli

# Test rate limiting:
# Make 101 requests to an endpoint with 100/hour limit
for i in {1..101}; do
  curl -X POST http://localhost:3000/workflows \
    -H "Authorization: Bearer ..." \
    -H "Content-Type: application/json"
done

# The 101st request should return 429:
# { "error": "Rate limit exceeded", "remaining": 0, "resetAt": "..." }

# Verify in Redis:
redis-cli get "rate_limit:user_123"
# Should show: 101
```

---

## 📋 MEDIUM PRIORITY IMPROVEMENTS

### 9. ⚠️ Complete API Key Update Endpoint

**Status:** Stubbed (returns 501)
**Priority:** 🟡 MEDIUM
**Effort:** 2-3 hours
**Dependencies:** Tasks 1-4
**Impact:** Cannot update API key metadata without recreating key

#### Current State

In `/apps/api/src/routes/apikeys.ts` lines 331-373:

```typescript
// PUT /api/keys/:id
apiKeyRoutes.put('/:id',
  authenticate,
  requirePermission(Permission.API_KEY_MANAGE),
  async (c) => {
    // TODO: Implement update endpoint
    return c.json({ success: false, error: 'Not yet implemented' }, 501);
  }
);
```

#### What Should Be Implemented

```typescript
// Update API key metadata (name, rate limit, permissions)
// WITHOUT showing the key secret again

apiKeyRoutes.put('/:id',
  authenticate,
  requirePermission(Permission.API_KEY_MANAGE),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.param();
    const { name, rateLimit, permissions } = await c.req.json();

    // Validate input
    if (!name && !rateLimit && !permissions) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    // Check ownership
    const existingKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.id, id),
        eq(apiKeys.userId, user.userId)
      )
    });

    if (!existingKey) {
      return c.json({ error: 'API key not found' }, 404);
    }

    // Update
    const updated = await db.update(apiKeys)
      .set({
        ...(name && { name }),
        ...(rateLimit && { rateLimit }),
        ...(permissions && { permissions }),
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, id));

    // Return updated key (without secret)
    return c.json({
      id: updated.id,
      name: updated.name,
      keyPreview: existingKey.keyHash.slice(0, 8) + '...',
      rateLimit: updated.rateLimit,
      permissions: updated.permissions,
      expiresAt: updated.expiresAt,
      lastUsedAt: updated.lastUsedAt,
      updatedAt: updated.updatedAt
    });
  }
);
```

---

### 10. ⚠️ Enable Session Authentication

**Status:** Implemented but disabled
**Priority:** 🟡 MEDIUM
**Effort:** 2-3 hours
**Dependencies:** Tasks 1-4
**Impact:** Session-based auth not available

#### Current State

In `/apps/api/src/shared-services/auth/middleware.ts` lines 139-147:

```typescript
// 3. Check for Session (optional - would need session ID)
// const sessionId = getCookie(c, 'sessionId');
// if (sessionId) {
//   const session = await sessionManager.getSession(sessionId);
//   if (session) {
//     user = await db.query.users.findFirst({...});
//   }
// }
```

#### Why Sessions Are Useful

Some applications prefer sessions over JWTs:
- Session data lives on server (can be invalidated immediately)
- Especially useful for traditional web apps with cookies
- Can track multiple concurrent sessions per user

#### How to Enable

Uncomment and complete the session checking code in middleware, then update routes to set session cookies on login.

---

### 11. 🛡️ Fix CORS Configuration

**Status:** Too permissive
**Priority:** 🟡 MEDIUM
**Effort:** 1-2 hours
**Impact:** Security vulnerability, any origin can access API

#### Current State

In `/apps/api/src/index.ts` line 31:

```typescript
app.use('*', cors()); // ❌ Allows ANY origin!
```

#### Proper Configuration

```typescript
app.use('*', cors({
  origin: (origin) => {
    // In production, only allow your frontend
    const allowedOrigins = [
      'http://localhost:5173',  // Dev
      process.env.CLIENT_URL    // Production
    ];

    return allowedOrigins.includes(origin) ? origin : null;
  },
  credentials: true,  // Allow cookies
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  maxAge: 3600  // Cache CORS for 1 hour
}));
```

---

### 12. 📖 Expand Integration Documentation

**Status:** Basic README exists
**Priority:** 🟡 MEDIUM
**Effort:** 3-4 hours
**Impact:** Developers don't know how to use auth in plugins

#### Create Integration Guide

File: `/apps/api/src/shared-services/auth/INTEGRATION_GUIDE.md`

**Sections:**
1. Quick start (protect a route in 3 lines)
2. User context (how to access current user)
3. Permission checking (single vs. multiple)
4. Role checking
5. Custom authorization
6. WebSocket authentication
7. Error handling
8. Common patterns (ownership checks, etc.)

**Example:**

```markdown
# Auth Integration Guide

## Protecting a Route

```typescript
import { authenticate, requirePermission } from './auth/middleware';
import { Permission } from './auth/types';

router.post('/workflows',
  authenticate,
  requirePermission(Permission.WORKFLOW_CREATE),
  handler
);
```

## Accessing Current User

```typescript
handler = async (c) => {
  const user = c.get('user');  // AuthContext

  console.log(user.userId);           // "user_123"
  console.log(user.email);            // "user@example.com"
  console.log(user.role);             // Role.USER
  console.log(user.permissions);      // [Permission.WORKFLOW_VIEW, ...]
};
```

## Permission Checking

```typescript
// Require single permission
requirePermission(Permission.WORKFLOW_CREATE)

// Require any of multiple
requirePermission([Permission.ADMIN, Permission.WORKFLOW_ADMIN])

// Custom authorization
async (c, next) => {
  const user = c.get('user');
  const { tenantId } = c.req.param();

  // Check if user belongs to this tenant
  const tenant = await db.query.tenants.findFirst({
    where: and(
      eq(tenants.id, tenantId),
      eq(tenants.ownerId, user.userId)
    )
  });

  if (!tenant) return c.json({ error: 'Access denied' }, 403);
  return next();
}
```
```

---

## 🧪 TESTING & DOCUMENTATION (Critical for Quality)

### 13. 🧪 Comprehensive Test Suite

**Status:** 0% (no tests)
**Priority:** 🟡 HIGH
**Effort:** 12-16 hours
**Dependencies:** Tasks 1-4

#### Test Files to Create

```
apps/api/__tests__/
├── unit/
│   ├── JWTManager.test.ts
│   ├── AuthManager.test.ts
│   ├── PermissionManager.test.ts
│   ├── APIKeyManager.test.ts
│   └── SessionManager.test.ts
├── integration/
│   ├── auth-routes.test.ts
│   ├── apikey-routes.test.ts
│   ├── protected-routes.test.ts
│   └── rate-limiting.test.ts
└── e2e/
    ├── auth-flow.test.ts
    └── api-key-flow.test.ts
```

#### Test Coverage Goals

- ✅ 80%+ code coverage
- ✅ All managers tested
- ✅ All routes tested
- ✅ Error cases covered
- ✅ Security scenarios tested

---

### 14. 📚 Database Setup Documentation

**File:** `/apps/api/docs/DATABASE_SETUP.md`

**Contents:**
1. Database requirements (MySQL 8+)
2. Connection setup
3. Running migrations
4. Creating seed data
5. Troubleshooting
6. Performance tuning

---

### 15. 🔒 Security Testing Guide

**File:** `/apps/api/docs/SECURITY_TESTING.md`

**Test Cases:**
1. SQL injection prevention
2. XSS protection
3. CSRF protection
4. Rate limiting effectiveness
5. Token expiration
6. Password strength validation
7. Account lockout

---

### 16. 🚀 Migration & Deployment Guide

**File:** `/apps/api/docs/DEPLOYMENT.md`

**Sections:**
1. Setting up production secrets
2. Database migration in production
3. Health checks
4. Monitoring
5. Rollback procedures
6. Troubleshooting

---

## 🎯 Future Enhancements

### 17. OAuth Integration (Google/GitHub)

**Status:** 0%
**Priority:** 🔵 LOW (optional)
**Effort:** 8-10 hours
**Impact:** Social login support

Add OAuth strategies for:
- Google (for quick signup)
- GitHub (for developers)
- Integrate with existing user accounts

---

### 18. Admin User Management UI

**Status:** 0%
**Priority:** 🔵 LOW
**Effort:** 12-16 hours
**Impact:** Better admin experience

Create admin dashboard for:
- User management
- Permission assignment
- API key monitoring
- Audit logs

---

### 19. Audit Logging

**Status:** 0%
**Priority:** 🔵 LOW
**Effort:** 4-6 hours
**Impact:** Security compliance

Track:
- Login attempts
- API key usage
- Permission changes
- Password resets

---

## 📋 Implementation Checklist

### Phase 1: Critical Fixes (Must Do First) - 8 hours

- [ ] **Task 1** - Mount auth routes in main server (15 min)
  - [ ] Import auth routes in `/apps/api/src/index.ts`
  - [ ] Mount `/auth` routes
  - [ ] Mount `/api/keys` routes
  - [ ] Verify routes are accessible

- [ ] **Task 2** - Create environment configuration (30 min)
  - [ ] Create `/apps/api/.env.example`
  - [ ] Document all variables
  - [ ] Add security warnings
  - [ ] Update `.gitignore`

- [ ] **Task 3** - Database migrations (45 min)
  - [ ] Configure DATABASE_URL in `.env`
  - [ ] Run `bun run db:generate`
  - [ ] Run `bun run db:push`
  - [ ] Verify tables exist
  - [ ] Create documentation

- [ ] **Task 4** - Basic integration tests (4-6 hours)
  - [ ] Setup test environment
  - [ ] Create auth route tests
  - [ ] Create manager unit tests
  - [ ] All tests passing

### Phase 2: High Priority Features (16 hours)

- [ ] **Task 5** - Password reset flow (6-8 hours)
  - Requires: Task 1-4 complete, email service

- [ ] **Task 6** - Email verification (6-8 hours)
  - Requires: Task 1-4 complete, email service

- [ ] **Task 7** - Protect plugin routes (4-6 hours)
  - Requires: Task 1 complete

- [ ] **Task 8** - Redis rate limiting (4-6 hours)
  - Requires: Redis installation

### Phase 3: Medium Priority (8-12 hours)

- [ ] **Task 9** - API key update endpoint (2-3 hours)
- [ ] **Task 10** - Session authentication (2-3 hours)
- [ ] **Task 11** - CORS configuration (1-2 hours)
- [ ] **Task 12** - Integration documentation (3-4 hours)

### Phase 4: Testing & Documentation (16 hours)

- [ ] **Task 13** - Comprehensive tests (12-16 hours)
- [ ] **Task 14** - Database documentation (2-3 hours)
- [ ] **Task 15** - Security testing guide (2-3 hours)
- [ ] **Task 16** - Deployment guide (2-3 hours)

### Phase 5: Optional Enhancements (Future)

- [ ] **Task 17** - OAuth integration (8-10 hours)
- [ ] **Task 18** - Admin UI (12-16 hours)
- [ ] **Task 19** - Audit logging (4-6 hours)

---

## 🎓 Educational Value & Documentation Strategy

This TODO emphasizes **learning** alongside implementation:

### For Each Task:
1. **Problem Statement** - Why is this needed?
2. **Educational Context** - Core concepts explained
3. **Security Notes** - Important security considerations
4. **Step-by-Step Guide** - Detailed implementation steps
5. **Code Examples** - Real, production-ready code
6. **Verification Steps** - How to test it works

### Key Concepts Covered:
- JWT authentication and token rotation
- API key design and security
- Password hashing and strength validation
- Rate limiting strategies
- Database schema design
- Middleware patterns
- Authorization frameworks
- Email verification flows
- Session management
- WebSocket security

### Learning Resources in Code:
- Inline JSDoc comments (600+ lines in AuthManager alone)
- README files with examples
- Integration guide with real use cases
- Security best practices throughout
- Error messages that teach

---

## 📊 Success Metrics

### By Completion:
- ✅ 100% auth features working
- ✅ 80%+ code test coverage
- ✅ Zero security vulnerabilities
- ✅ All endpoints documented
- ✅ Production-ready deployment guide
- ✅ Comprehensive developer documentation

### After Deployment:
- ✅ 100% of API routes protected
- ✅ <1% false positive rate limits
- ✅ Zero account compromise incidents
- ✅ <100ms auth overhead per request
- ✅ 99.9% uptime for auth service

---

## 🔗 Related Documents

- **Implementation Details:** `/apps/api/src/shared-services/auth/README.md` (876 lines)
- **Architecture Overview:** `/auth_development.md`
- **Current Implementation:** Code at `/apps/api/src/shared-services/auth/`
- **Analysis Report:** `AUTHENTICATION_IMPLEMENTATION_SUMMARY.md`

---

## 📝 Version History

**v2.0.0** (November 2025) - Complete implementation analysis and comprehensive TODO
**v1.0.0** (October 2025) - Initial auth development plan

---

**Generated:** November 2025
**Status:** Ready for Implementation
**Estimated Total Effort:** 56+ hours (1.5-2 weeks for one developer)

