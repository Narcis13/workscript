/**
 * Authentication & Authorization Database Schema
 *
 * This schema provides a complete authentication system supporting:
 * - User accounts with email/password authentication
 * - Role-based access control (RBAC) with permissions
 * - Session-based authentication with Redis storage
 * - API key authentication for programmatic access
 * - JWT refresh token tracking
 * - Password reset functionality
 * - Failed login attempt tracking for security
 * - Multi-tenancy support via tenantId column
 *
 * @module auth.schema
 * @example
 * import { db } from '../index';
 * import { users, eq } from 'drizzle-orm';
 *
 * // Find user by email
 * const user = await db.query.users.findFirst({
 *   where: eq(users.email, 'user@example.com')
 * });
 */

import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  int,
  json,
  index,
  unique
} from 'drizzle-orm/mysql-core';
import { createId } from '@paralleldrive/cuid2';

/**
 * Users Table
 *
 * Stores user account information, roles, and permissions.
 *
 * **Key Fields:**
 * - id: Unique user identifier (CUID2)
 * - email: User email address (unique, case-insensitive for lookups)
 * - passwordHash: Bcrypt hash of user's password (nullable for OAuth users)
 * - role: User's role ('admin', 'user', 'api') - used with RBAC system
 * - permissions: JSON array of custom permissions (overrides role permissions)
 * - tenantId: For multi-tenancy support (optional, for agency/workspace isolation)
 * - emailVerified: Whether email has been verified via confirmation link
 * - createdAt: Account creation timestamp
 * - updatedAt: Last profile update timestamp
 *
 * **Security Notes:**
 * - Password should NEVER be selected from database - always query only hash
 * - Email uniqueness enforced at database level
 * - Soft delete recommended instead of hard delete for audit trails
 *
 * **Indexes:**
 * - email: Quick lookup for login and user discovery
 * - tenantId: Fast filtering for multi-tenant queries
 * - createdAt: Timeline-based queries and analytics
 */
export const users = mysqlTable('users', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Authentication credentials
  email: varchar('email', { length: 255 })
    .notNull(),
    // Unique constraint is defined at table level (line 138)

  passwordHash: varchar('password_hash', { length: 255 }),
    // Nullable for OAuth-only users in future implementation

  // Authorization
  role: varchar('role', { length: 50 })
    .default('user')
    .notNull(),
    // Values: 'admin' | 'user' | 'api'
    // See PermissionManager.ts for role-to-permission mappings

  permissions: json('permissions')
    .default([])
    .notNull(),
    // JSON array of custom permissions that override role defaults
    // Example: ['workflow:admin', 'automation:execute']
    // Allows fine-grained permission assignment beyond roles

  // Multi-tenancy
  tenantId: varchar('tenant_id', { length: 128 }),
    // Optional: Associates user with a specific tenant/agency/workspace
    // If set, user can only access resources with matching tenantId
    // Enforced in middleware and repository queries

  // Email verification
  emailVerified: boolean('email_verified')
    .default(false)
    .notNull(),
    // If false, user should verify email via link before full access
    // Used for initial email verification flow

  // User profile
  firstName: varchar('first_name', { length: 255 }),
    // User's first name (optional)
    // Stored separately for personalization and audit trails

  // Email verification
  emailVerificationToken: varchar('email_verification_token', { length: 64 }),
    // Token sent via email for verification
    // Should be 32+ bytes (64 hex chars)
    // Null = email already verified

  emailVerificationTokenExpiry: timestamp('email_verification_token_expiry'),
    // When verification token expires
    // Typically 24 hours after creation
    // Expired tokens can't be used

  // Account status (soft delete pattern)
  isActive: boolean('is_active')
    .default(true)
    .notNull(),
    // Set to false instead of deleting for audit trail preservation

  // Metadata
  lastLoginAt: timestamp('last_login_at'),
    // When user last successfully authenticated
    // Useful for security audits and usage analytics

  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .onUpdateNow()
    .notNull(),
}, (table) => ({
  // **Email lookup index** - Critical for login performance
  emailIdx: index('users_email_idx').on(table.email),

  // **Tenant isolation index** - Fast filtering for multi-tenant apps
  tenantIdx: index('users_tenant_idx').on(table.tenantId),

  // **Status filtering** - Quickly find active users
  isActiveIdx: index('users_is_active_idx').on(table.isActive),

  // **Timeline queries** - Analytics and user analytics
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),

  // **Unique constraint** - Email must be globally unique
  emailUnique: unique('users_email_unique').on(table.email),
}));

/**
 * API Keys Table
 *
 * Manages API keys for programmatic access (similar to Stripe/GitHub)
 *
 * **Key Fields:**
 * - id: Unique API key record identifier
 * - userId: Which user owns this key
 * - name: Human-readable name (e.g., "Production Key", "CI/CD")
 * - keyHash: SHA-256 hash of actual key (key is NEVER stored plaintext)
 * - permissions: JSON array of permissions this key has
 * - rateLimit: Maximum requests per hour for this key
 * - lastUsedAt: Last successful authentication timestamp
 * - expiresAt: When this key becomes invalid (optional, no expiry if null)
 *
 * **Security Architecture:**
 *
 * API Keys follow the "unhashable secret" pattern:
 * 1. Generate random key on creation
 * 2. Hash it immediately
 * 3. Return unhashed key ONLY to user (one-time display)
 * 4. Store only hash in database
 * 5. On validation, hash incoming key and compare with stored hash
 *
 * This means if database is compromised, API keys can't be used.
 * Compare with bcrypt for passwords - similar security model.
 *
 * **Example Usage:**
 * ```typescript
 * // Creating an API key
 * const plainKey = "wks_live_abc123xyz789..."; // 48 chars, never shown again
 * const keyHash = sha256(plainKey);
 * // Store only keyHash in database
 *
 * // Validating incoming request
 * const incomingKey = request.headers['x-api-key'];
 * const incomingHash = sha256(incomingKey);
 * const isValid = incomingHash === storedKeyHash;
 * ```
 *
 * **Indexes:**
 * - userId: Find all keys for a user
 * - keyHash: Look up key by hash (most common operation)
 * - expiresAt: Clean up expired keys periodically
 */
export const apiKeys = mysqlTable('api_keys', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Foreign key to users table
  userId: varchar('user_id', { length: 128 })
    .notNull(),
    // References: users.id
    // If user is deleted, cascade delete should remove their keys

  // User-provided name for the key (for management UI)
  name: varchar('name', { length: 255 })
    .notNull(),
    // Examples: "Production", "Development", "CI/CD Pipeline", "Mobile App"
    // Allows multiple keys with different purposes/permissions

  // SHA-256 hash of the actual key (key itself is never stored)
  keyHash: varchar('key_hash', { length: 64 })
    .notNull(),
    // Format: sha256Hash of (prefix + randomBytes)
    // Length: 64 chars (256-bit hash in hex)
    // Example: "a7b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7"
    // Unique constraint is defined at table level (line 257)

  // Permissions associated with this key
  permissions: json('permissions')
    .default([])
    .notNull(),
    // JSON array of permission strings
    // Examples: ['workflow:read', 'automation:execute']
    // If empty, inherits all user's permissions
    // Can be more restrictive than user's permissions

  // Rate limiting
  rateLimit: int('rate_limit')
    .default(1000)
    .notNull(),
    // Maximum requests per hour for this API key
    // Default: 1000 req/hour ≈ 16 req/min
    // Can be customized per key for enterprise customers

  // Audit trail: When was this key last used?
  lastUsedAt: timestamp('last_used_at'),
    // Updated on successful authentication
    // Null = never used
    // Used for: security audits, identifying unused keys, cleanup

  // Key expiration
  expiresAt: timestamp('expires_at'),
    // Optional: If set, key becomes invalid after this time
    // Null = never expires
    // Used for: time-limited access (e.g., CI/CD tokens)
    // Middleware should check: expiresAt > NOW() before accepting key

  // Metadata
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, (table) => ({
  // **User lookup** - Find all keys for a specific user
  userIdx: index('api_keys_user_idx').on(table.userId),

  // **Hash lookup** - Most common operation during request auth
  keyHashIdx: index('api_keys_key_hash_idx').on(table.keyHash),

  // **Expiration check** - Find expired keys for cleanup
  expiresAtIdx: index('api_keys_expires_at_idx').on(table.expiresAt),

  // **Unique constraint** - Can't have duplicate key hashes
  keyHashUnique: unique('api_keys_key_hash_unique').on(table.keyHash),
}));

/**
 * Refresh Tokens Table
 *
 * Stores issued refresh tokens for JWT-based authentication.
 *
 * **Why store refresh tokens?**
 *
 * Token authentication flow:
 * 1. User logs in with email/password
 * 2. Server issues short-lived access token (15 min) + long-lived refresh token (7 days)
 * 3. Client stores both in localStorage
 * 4. Client sends access token with each request
 * 5. When access token expires, client sends refresh token to get new access token
 * 6. Server validates refresh token, issues new access token
 * 7. On logout, user's refresh tokens are invalidated
 *
 * **Why store in database?**
 * - Allows logout to work (refresh tokens don't work anymore)
 * - Allows tracking active sessions
 * - Allows "logout all devices" functionality
 * - Detects and revokes stolen tokens
 * - Enables per-device token management
 *
 * **Key Fields:**
 * - id: Record identifier
 * - userId: Which user this token belongs to
 * - token: The actual refresh token (stored as JWT string)
 * - expiresAt: When token becomes invalid
 * - createdAt: When it was issued
 *
 * **Alternative Design:**
 * Some systems don't store refresh tokens and rely on signature verification only.
 * This design stores them for:
 * - Logout support
 * - Revocation support
 * - Session tracking
 *
 * Trade-off: More database queries but better security/control.
 */
export const refreshTokens = mysqlTable('refresh_tokens', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Foreign key to users table
  userId: varchar('user_id', { length: 128 })
    .notNull(),
    // References: users.id
    // User who owns this refresh token

  // The actual token value
  token: varchar('token', { length: 512 })
    .notNull(),
    // JWT string format: header.payload.signature
    // Length: typically 300-400 chars
    // Stored as-is (we verify signature, not hash like API keys)
    // Unique constraint is defined at table level (line 338)

  // When does this token expire?
  expiresAt: timestamp('expires_at')
    .notNull(),
    // Typically 7 days after creation
    // Middleware checks: expiresAt > NOW() before accepting
    // Expired tokens should be cleaned up periodically

  // Audit trail
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, (table) => ({
  // **User lookup** - Find all tokens for a user (for logout-all)
  userIdx: index('refresh_tokens_user_idx').on(table.userId),

  // **Expiration check** - Find expired tokens for cleanup jobs
  expiresAtIdx: index('refresh_tokens_expires_at_idx').on(table.expiresAt),

  // **Unique constraint** - Can't reuse the same token
  tokenUnique: unique('refresh_tokens_token_unique').on(table.token),
}));

/**
 * Sessions Table
 *
 * Stores server-side session data for session-based authentication.
 *
 * **Session vs JWT:**
 *
 * JWT (Stateless):
 * - Client stores token
 * - No database lookup on each request
 * - Can't revoke mid-way (token valid until expiry)
 * - Better for APIs and microservices
 *
 * Sessions (Stateful):
 * - Server stores session data
 * - Database lookup on each request
 * - Can revoke immediately on logout
 * - Better for web apps with single server
 * - Requires sticky sessions in load-balanced setup
 *
 * **This Implementation:**
 * - Primary auth: JWT (stateless, scalable)
 * - Secondary option: Sessions (for backward compatibility or specific needs)
 * - In production, consider Redis instead of MySQL for session storage
 * - See SessionManager.ts for implementation details
 *
 * **Key Fields:**
 * - id: Session identifier (typically UUID from cookie)
 * - userId: Which user owns this session
 * - data: JSON object with session state (user info, preferences, etc.)
 * - expiresAt: When session becomes invalid
 * - createdAt: When session started
 */
export const sessions = mysqlTable('sessions', {
  // Primary identifier (typically sent as cookie value)
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Foreign key to users table
  userId: varchar('user_id', { length: 128 })
    .notNull(),
    // References: users.id

  // Session payload (JSON object)
  data: json('data')
    .default({})
    .notNull(),
    // Contains: user info, preferences, last activity, IP address, etc.
    // Example: { userId: "...", email: "...", lastActivity: "2024-01-01T..." }

  // When does session expire?
  expiresAt: timestamp('expires_at')
    .notNull(),
    // Typically 24 hours after creation
    // Can implement session extension on activity

  // Metadata
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .onUpdateNow()
    .notNull(),
}, (table) => ({
  // **User lookup** - Find sessions for a user
  userIdx: index('sessions_user_idx').on(table.userId),

  // **Expiration check** - Clean up expired sessions
  expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
}));

/**
 * Password Reset Tokens Table
 *
 * Manages password reset tokens sent via email.
 *
 * **Password Reset Flow:**
 * 1. User requests password reset (provides email)
 * 2. Server generates secure token (random string)
 * 3. Server sends reset link to email: "https://app.com/reset?token=xyz"
 * 4. User clicks link, token is validated
 * 5. User provides new password
 * 6. Server validates token is still valid and not expired
 * 7. If valid, update user's password hash and delete token
 *
 * **Security Considerations:**
 * - Token should be long and random (256 bits minimum)
 * - Token should expire after short period (30 min typical)
 * - Token should be used only once
 * - Token sent via email, not stored in browser (less attack surface)
 * - Consider rate limiting password reset requests
 *
 * **Key Fields:**
 * - id: Record identifier
 * - userId: Which user requested reset
 * - token: The reset token (hashed for security)
 * - expiresAt: When token expires
 * - usedAt: When token was used (marks as consumed)
 */
export const passwordResets = mysqlTable('password_resets', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Foreign key to users table
  userId: varchar('user_id', { length: 128 })
    .notNull(),
    // References: users.id
    // User who requested password reset

  // The reset token (should be hashed like API keys)
  token: varchar('token', { length: 256 })
    .notNull(),
    // Format: random hex string (128 chars = 512 bits)
    // Should be SHA-256 hash of original random token
    // Length: 64 chars for hash
    // Unique constraint is defined at table level (line 487)

  // When token expires (for security)
  expiresAt: timestamp('expires_at')
    .notNull(),
    // Typically 30 minutes after creation
    // Expired tokens can't be used

  // When was this token used? (null = unused)
  usedAt: timestamp('used_at'),
    // If not null, token was already used for password reset
    // Don't allow reuse of same token
    // Marks token as "consumed"

  // Security audit trail
  ipAddress: varchar('ip_address', { length: 45 }),
    // IP address that requested password reset
    // IPv4: max 15 chars, IPv6: max 45 chars
    // Used for: security audits, fraud detection

  // Audit trail
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, (table) => ({
  // **User lookup** - Find active reset tokens for user
  userIdx: index('password_resets_user_idx').on(table.userId),

  // **Expiration check** - Find expired tokens for cleanup
  expiresAtIdx: index('password_resets_expires_at_idx').on(table.expiresAt),

  // **Unique constraint** - Can't have duplicate tokens
  tokenUnique: unique('password_resets_token_unique').on(table.token),
}));

/**
 * Login Attempts Table
 *
 * Tracks failed login attempts for security purposes.
 *
 * **Why Track Failed Logins?**
 * - Detect brute force attacks
 * - Implement account lockout (after N failed attempts)
 * - Alert users of suspicious activity
 * - Maintain audit trail
 * - Implement progressive delays between attempts
 *
 * **Implementation Strategy:**
 * 1. On failed login, create record with email and IP
 * 2. Count recent failures for this email (last 1 hour)
 * 3. If count > threshold (e.g., 5), lock account temporarily
 * 4. On successful login, clear failures for that email
 * 5. Periodically clean up old failure records
 *
 * **Example Logic:**
 * ```typescript
 * const failures = await db
 *   .select({ count: sql`count(*)` })
 *   .from(loginAttempts)
 *   .where(and(
 *     eq(loginAttempts.email, email),
 *     gt(loginAttempts.createdAt, oneHourAgo)
 *   ));
 *
 * if (failures[0].count >= 5) {
 *   return { error: 'Account locked. Try again in 15 minutes.' };
 * }
 * ```
 *
 * **Key Fields:**
 * - id: Record identifier
 * - email: Email address that failed
 * - ipAddress: IP address of attacker
 * - userAgent: Browser info (useful for forensics)
 * - createdAt: When this attempt occurred
 */
export const loginAttempts = mysqlTable('login_attempts', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Which email address was attempted (not foreign key - might not exist yet)
  email: varchar('email', { length: 255 })
    .notNull(),
    // Doesn't reference users table
    // Failed login might be for non-existent account
    // Don't reveal whether email exists (security best practice)

  // Attacker's IP address
  ipAddress: varchar('ip_address', { length: 45 })
    .notNull(),
    // IPv4: max 15 chars
    // IPv6: max 45 chars (128-bit address in colon notation)
    // Used for: rate limiting per IP, geographic analysis

  // Browser/client identification
  userAgent: text('user_agent'),
    // HTTP User-Agent header
    // Useful for: identifying bot attacks, device analysis

  // Audit trail
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, (table) => ({
  // **Email lookup** - Find recent failures for this email
  emailIdx: index('login_attempts_email_idx').on(table.email),

  // **IP lookup** - Find recent failures from this IP (detect attacks)
  ipIdx: index('login_attempts_ip_address_idx').on(table.ipAddress),

  // **Time-based cleanup** - Find old records to delete
  createdAtIdx: index('login_attempts_created_at_idx').on(table.createdAt),
}));

/**
 * Type Exports
 *
 * Export TypeScript types inferred from schema for use throughout the application.
 * Drizzle infers types automatically from table definitions.
 */

// User types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// API Key types
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;

// Refresh Token types
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

// Session types
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// Password Reset types
export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;

// Login Attempt types
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type NewLoginAttempt = typeof loginAttempts.$inferInsert;
