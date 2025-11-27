/**
 * OAuth Integrations Database Schema
 *
 * This schema provides a comprehensive OAuth integrations system supporting:
 * - Multiple OAuth providers (Google, Twitter, LinkedIn, etc.)
 * - Multiple connections per provider per user
 * - Secure token storage with future encryption support
 * - CSRF protection via state tokens with expiration
 * - Automatic token refresh tracking
 * - Multi-tenancy support via tenantId column
 *
 * @module integrations.schema
 * @example
 * import { db } from '../index';
 * import { oauthConnections, eq } from 'drizzle-orm';
 *
 * // Find connections by provider
 * const connections = await db.query.oauthConnections.findMany({
 *   where: eq(oauthConnections.provider, 'google')
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
 * OAuth Connections Table
 *
 * Stores OAuth2 connections with tokens and metadata for third-party service integrations.
 *
 * **Key Fields:**
 * - id: Unique connection identifier (CUID2)
 * - name: User-friendly connection name (e.g., "Work Gmail", "Personal Google")
 * - provider: OAuth provider identifier (e.g., 'google', 'twitter', 'linkedin')
 * - accountId: Provider-specific account identifier
 * - accountEmail: Email associated with the connected account
 * - accessToken/refreshToken: OAuth tokens (stored plain initially, encrypted columns available)
 * - expiresAt: When the access token expires
 * - isActive: Whether connection is usable (false when tokens are revoked/expired)
 *
 * **Security Notes:**
 * - Tokens are stored in plain text initially; use encrypted columns when encryption is implemented
 * - Never expose tokens in API responses (except dedicated token endpoint)
 * - Access tokens are short-lived (~1 hour), refresh tokens are long-lived
 * - Track last_error for connections that need re-authentication
 *
 * **Indexes:**
 * - provider: Filter connections by OAuth provider
 * - created_by: Find all connections for a user
 * - tenant_id: Multi-tenant isolation
 * - account_email: Find connections by email
 * - Composite unique: Prevent duplicate provider+account+tenant combinations
 */
export const oauthConnections = mysqlTable('oauth_connections', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // Connection name (user-facing, editable)
  name: varchar('name', { length: 255 })
    .notNull(),
    // Examples: "Work Gmail", "Personal Google", "Company Twitter"
    // Auto-generated on creation: "{Provider} - {email}"

  // OAuth provider identifier
  provider: varchar('provider', { length: 50 })
    .notNull(),
    // Values: 'google', 'twitter', 'linkedin', 'github', etc.
    // Must match registered provider ID in ProviderRegistry

  // Ownership and multi-tenancy
  createdBy: varchar('created_by', { length: 128 }),
    // User ID who created this connection
    // Nullable for system-level connections

  tenantId: varchar('tenant_id', { length: 128 }),
    // Optional: Associates connection with a specific tenant/agency/workspace
    // Enforced in queries for multi-tenant isolation

  // Provider account information
  accountId: varchar('account_id', { length: 255 }),
    // Provider-specific account identifier
    // For Google: email address or user ID
    // Used for deduplication and connection identification

  accountEmail: varchar('account_email', { length: 255 }),
    // Email address associated with the OAuth account
    // Displayed in UI for connection identification

  accountName: varchar('account_name', { length: 255 }),
    // Display name from the OAuth provider
    // For Google: user's full name from profile

  // Token storage (plain text)
  accessToken: text('access_token'),
    // OAuth2 access token
    // Short-lived (typically 1 hour for Google)
    // Used for API requests

  refreshToken: text('refresh_token'),
    // OAuth2 refresh token
    // Long-lived, used to obtain new access tokens
    // May be null if provider doesn't issue refresh tokens

  // Token storage (encrypted - for future use)
  accessTokenEncrypted: text('access_token_encrypted'),
    // AES-256 encrypted access token
    // Use when encryption is enabled

  refreshTokenEncrypted: text('refresh_token_encrypted'),
    // AES-256 encrypted refresh token
    // Use when encryption is enabled

  // Encryption metadata
  encryptionVersion: int('encryption_version'),
    // Tracks encryption method used
    // 0 or null = plain text (access_token/refresh_token columns)
    // 1 = AES-256-GCM (encrypted columns)
    // Allows gradual migration to encryption

  // Token metadata
  tokenType: varchar('token_type', { length: 50 })
    .default('Bearer'),
    // OAuth2 token type (almost always 'Bearer')

  scope: text('scope'),
    // Space-separated list of granted OAuth scopes
    // Example: "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly"

  expiresAt: timestamp('expires_at'),
    // When the access token expires
    // Used to determine if token refresh is needed
    // TokenManager adds 60-second buffer before expiry

  // Connection status
  isActive: boolean('is_active')
    .default(true)
    .notNull(),
    // false when: tokens revoked, refresh failed, manually deactivated
    // Inactive connections need re-authentication

  // Usage tracking
  lastUsedAt: timestamp('last_used_at'),
    // Last time token was used for an API request
    // Updated by TokenManager.ensureValidToken()

  lastRefreshedAt: timestamp('last_refreshed_at'),
    // Last time tokens were refreshed
    // Updated after successful token refresh

  // Error tracking
  lastError: text('last_error'),
    // Error message from last failed operation
    // Examples: "Refresh token expired", "Token revoked by user"
    // Cleared on successful refresh

  lastErrorAt: timestamp('last_error_at'),
    // When the last error occurred
    // Used for debugging and user notification

  // Provider-specific data
  providerData: json('provider_data'),
    // Additional provider-specific metadata
    // For Google: raw profile response
    // Stored as JSON object

  // Timestamps
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at')
    .defaultNow()
    .onUpdateNow()
    .notNull(),
}, (table) => ({
  // **Provider lookup** - Filter connections by OAuth provider
  providerIdx: index('oauth_connections_provider_idx').on(table.provider),

  // **User lookup** - Find all connections for a user
  createdByIdx: index('oauth_connections_created_by_idx').on(table.createdBy),

  // **Tenant isolation** - Fast filtering for multi-tenant apps
  tenantIdx: index('oauth_connections_tenant_idx').on(table.tenantId),

  // **Email lookup** - Find connections by account email
  accountEmailIdx: index('oauth_connections_account_email_idx').on(table.accountEmail),

  // **Status filtering** - Find active/inactive connections
  isActiveIdx: index('oauth_connections_is_active_idx').on(table.isActive),

  // **Unique constraint** - Prevent duplicate connections for same account
  // One connection per provider+account+tenant combination
  providerAccountTenantUnique: unique('oauth_connections_provider_account_tenant_unique')
    .on(table.provider, table.accountId, table.tenantId),
}));

/**
 * OAuth States Table
 *
 * Stores temporary state tokens for CSRF protection during OAuth flows.
 *
 * **OAuth Flow:**
 * 1. User initiates OAuth → generate state token → store in this table
 * 2. Redirect to provider with state parameter
 * 3. Provider redirects back with same state
 * 4. Validate state exists and hasn't expired
 * 5. Delete state record after successful validation
 *
 * **Security Notes:**
 * - State tokens are cryptographically random (32+ bytes)
 * - States expire after 10 minutes to prevent replay attacks
 * - States are deleted after use (one-time use)
 * - Code verifier stored for PKCE flows
 *
 * **Key Fields:**
 * - id: Record identifier
 * - state: The random state token (sent to OAuth provider)
 * - provider: Which OAuth provider this state is for
 * - codeVerifier: PKCE code verifier (for enhanced security)
 * - expiresAt: When this state becomes invalid
 * - metadata: JSON object with additional context (userId, tenantId)
 */
export const oauthStates = mysqlTable('oauth_states', {
  // Primary identifier
  id: varchar('id', { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),

  // State token (sent to OAuth provider, returned in callback)
  state: varchar('state', { length: 128 })
    .notNull(),
    // Format: base64url encoded random bytes (43 chars for 32 bytes)
    // Must be unpredictable and unique
    // Used for CSRF protection

  // OAuth provider identifier
  provider: varchar('provider', { length: 50 })
    .notNull(),
    // Values: 'google', 'twitter', 'linkedin', etc.
    // Used to route callback to correct provider

  // PKCE code verifier (for enhanced security)
  codeVerifier: text('code_verifier'),
    // Random string used in PKCE flow
    // Stored during auth initiation, used during code exchange
    // Null if PKCE not used

  // Redirect URL after OAuth completion
  redirectUrl: varchar('redirect_url', { length: 500 }),
    // Where to redirect user after OAuth completes
    // Optional: defaults to success page if not specified

  // Additional metadata
  metadata: json('metadata'),
    // JSON object with context for callback handling
    // Contains: { userId, tenantId, customData }
    // Used to associate connection with user/tenant

  // Ownership
  createdBy: varchar('created_by', { length: 128 }),
    // User ID who initiated the OAuth flow
    // Used for connection ownership

  tenantId: varchar('tenant_id', { length: 128 }),
    // Tenant context for multi-tenant apps

  // Expiration
  expiresAt: timestamp('expires_at')
    .notNull(),
    // State expires 10 minutes after creation
    // Expired states cannot be used

  // Timestamp
  createdAt: timestamp('created_at')
    .defaultNow()
    .notNull(),
}, (table) => ({
  // **State lookup** - Primary lookup during callback (must be fast)
  stateIdx: index('oauth_states_state_idx').on(table.state),

  // **Expiration cleanup** - Find expired states for deletion
  expiresAtIdx: index('oauth_states_expires_at_idx').on(table.expiresAt),

  // **Provider filtering** - Optional filtering by provider
  providerIdx: index('oauth_states_provider_idx').on(table.provider),
}));

/**
 * Type Exports
 *
 * Export TypeScript types inferred from schema for use throughout the application.
 * Drizzle infers types automatically from table definitions.
 */

// OAuth Connection types
export type OAuthConnection = typeof oauthConnections.$inferSelect;
export type NewOAuthConnection = typeof oauthConnections.$inferInsert;

// OAuth State types
export type OAuthState = typeof oauthStates.$inferSelect;
export type NewOAuthState = typeof oauthStates.$inferInsert;
