/**
 * @fileoverview Connection Repository for OAuth Integrations
 *
 * This module provides a centralized data access layer for OAuth connections
 * and OAuth state tokens. It encapsulates all database operations using
 * Drizzle ORM with type-safe queries.
 *
 * Features:
 * - CRUD operations for OAuth connections
 * - State token management for CSRF protection
 * - Usage tracking (lastUsedAt, lastRefreshedAt)
 * - Error tracking for failed operations
 * - Automatic cleanup of expired states
 * - Singleton pattern for consistent database access
 *
 * @module integrations/repositories/connectionRepository
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const repository = ConnectionRepository.getInstance();
 *
 * // Create a new connection
 * const connection = await repository.create({
 *   name: 'Google - user@gmail.com',
 *   provider: 'google',
 *   accountEmail: 'user@gmail.com',
 *   accessToken: 'ya29...',
 *   refreshToken: '1//0e...',
 * });
 *
 * // Find by ID
 * const found = await repository.findById(connection.id);
 *
 * // Update tokens
 * await repository.update(connection.id, {
 *   accessToken: 'new_token',
 *   expiresAt: new Date(Date.now() + 3600000),
 * });
 * ```
 */

import { eq, and, lt, isNull } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import {
  db,
  oauthConnections,
  oauthStates,
  type OAuthConnection,
  type NewOAuthConnection,
  type OAuthState,
  type NewOAuthState,
} from '../../../db';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Filter options for finding connections
 */
export interface ConnectionFilters {
  /** Filter by OAuth provider (e.g., 'google') */
  provider?: string;

  /** Filter by user who created the connection */
  createdBy?: string;

  /** Filter by tenant ID */
  tenantId?: string;

  /** Filter by active status */
  isActive?: boolean;
}

/**
 * Update data for connection tokens
 */
export interface ConnectionTokenUpdate {
  accessToken?: string;
  refreshToken?: string | null;
  expiresAt?: Date | null;
  scope?: string | null;
  lastRefreshedAt?: Date;
  isActive?: boolean;
  lastError?: string | null;
}

// =============================================================================
// CONNECTION REPOSITORY CLASS
// =============================================================================

/**
 * Repository class for OAuth connection data access.
 *
 * This class provides all CRUD operations for OAuth connections and state
 * tokens. It uses the singleton pattern to ensure consistent database access
 * throughout the application.
 *
 * @example
 * ```typescript
 * const repo = ConnectionRepository.getInstance();
 *
 * // Find all Google connections for a user
 * const connections = await repo.findByProvider('google', {
 *   createdBy: 'user_123',
 * });
 * ```
 */
export class ConnectionRepository {
  // Singleton instance
  private static instance: ConnectionRepository;

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {
    // Private constructor - use getInstance()
  }

  /**
   * Get the singleton instance of ConnectionRepository.
   *
   * @returns The shared ConnectionRepository instance
   *
   * @example
   * ```typescript
   * const repo = ConnectionRepository.getInstance();
   * ```
   */
  static getInstance(): ConnectionRepository {
    if (!ConnectionRepository.instance) {
      ConnectionRepository.instance = new ConnectionRepository();
    }
    return ConnectionRepository.instance;
  }

  // ===========================================================================
  // CONNECTION CRUD OPERATIONS
  // ===========================================================================

  /**
   * Create a new OAuth connection.
   *
   * @param data - The connection data to insert
   * @returns The created connection with generated ID
   *
   * @example
   * ```typescript
   * const connection = await repo.create({
   *   name: 'Google - user@gmail.com',
   *   provider: 'google',
   *   accountEmail: 'user@gmail.com',
   *   accountId: 'user@gmail.com',
   *   accessToken: 'ya29.xxx',
   *   refreshToken: '1//0exxx',
   *   tokenType: 'Bearer',
   *   expiresAt: new Date(Date.now() + 3600000),
   *   isActive: true,
   * });
   * ```
   */
  async create(data: NewOAuthConnection): Promise<OAuthConnection> {
    // Generate ID if not provided
    const id = data.id || createId();
    const connectionData = { ...data, id };

    await db.insert(oauthConnections).values(connectionData);

    // Return the created connection
    const created = await this.findById(id);
    if (!created) {
      throw new Error('Failed to create connection: could not retrieve after insert');
    }
    return created;
  }

  /**
   * Find a connection by its ID.
   *
   * @param id - The unique connection identifier
   * @returns The connection or null if not found
   *
   * @example
   * ```typescript
   * const connection = await repo.findById('clg4xyz123');
   * if (connection) {
   *   console.log('Found:', connection.name);
   * }
   * ```
   */
  async findById(id: string): Promise<OAuthConnection | null> {
    const [result] = await db
      .select()
      .from(oauthConnections)
      .where(eq(oauthConnections.id, id))
      .limit(1);

    return result || null;
  }

  /**
   * Find all connections for a specific provider.
   *
   * @param provider - The OAuth provider ID (e.g., 'google')
   * @param filters - Optional filters for createdBy and tenantId
   * @returns Array of matching connections
   *
   * @example
   * ```typescript
   * // All Google connections
   * const googleConnections = await repo.findByProvider('google');
   *
   * // Google connections for a specific user
   * const userConnections = await repo.findByProvider('google', {
   *   createdBy: 'user_123',
   * });
   * ```
   */
  async findByProvider(
    provider: string,
    filters?: { createdBy?: string; tenantId?: string }
  ): Promise<OAuthConnection[]> {
    const conditions = [eq(oauthConnections.provider, provider)];

    if (filters?.createdBy) {
      conditions.push(eq(oauthConnections.createdBy, filters.createdBy));
    }
    if (filters?.tenantId) {
      conditions.push(eq(oauthConnections.tenantId, filters.tenantId));
    }

    return db
      .select()
      .from(oauthConnections)
      .where(and(...conditions));
  }

  /**
   * Find connections by account email.
   *
   * @param email - The email address to search for
   * @param provider - Optional: filter by provider
   * @returns Array of matching connections
   *
   * @example
   * ```typescript
   * // Find all connections for an email
   * const connections = await repo.findByAccountEmail('user@gmail.com');
   *
   * // Find only Google connections for an email
   * const googleConnections = await repo.findByAccountEmail('user@gmail.com', 'google');
   * ```
   */
  async findByAccountEmail(
    email: string,
    provider?: string
  ): Promise<OAuthConnection[]> {
    const conditions = [eq(oauthConnections.accountEmail, email)];

    if (provider) {
      conditions.push(eq(oauthConnections.provider, provider));
    }

    return db
      .select()
      .from(oauthConnections)
      .where(and(...conditions));
  }

  /**
   * Find all connections with optional filters.
   *
   * @param filters - Optional filters for provider, createdBy, isActive
   * @returns Array of matching connections
   *
   * @example
   * ```typescript
   * // All connections
   * const all = await repo.findAll();
   *
   * // Active Google connections
   * const activeGoogle = await repo.findAll({
   *   provider: 'google',
   *   isActive: true,
   * });
   * ```
   */
  async findAll(filters?: ConnectionFilters): Promise<OAuthConnection[]> {
    const conditions: ReturnType<typeof eq>[] = [];

    if (filters?.provider) {
      conditions.push(eq(oauthConnections.provider, filters.provider));
    }
    if (filters?.createdBy) {
      conditions.push(eq(oauthConnections.createdBy, filters.createdBy));
    }
    if (filters?.tenantId) {
      conditions.push(eq(oauthConnections.tenantId, filters.tenantId));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(oauthConnections.isActive, filters.isActive));
    }

    if (conditions.length === 0) {
      return db.select().from(oauthConnections);
    }

    return db
      .select()
      .from(oauthConnections)
      .where(and(...conditions));
  }

  /**
   * Update a connection by ID.
   *
   * @param id - The connection ID to update
   * @param updates - The fields to update
   * @returns The updated connection or null if not found
   *
   * @example
   * ```typescript
   * const updated = await repo.update('clg4xyz123', {
   *   name: 'Personal Gmail',
   *   accessToken: 'new_token',
   *   expiresAt: new Date(Date.now() + 3600000),
   * });
   * ```
   */
  async update(
    id: string,
    updates: Partial<NewOAuthConnection>
  ): Promise<OAuthConnection | null> {
    await db
      .update(oauthConnections)
      .set(updates)
      .where(eq(oauthConnections.id, id));

    return this.findById(id);
  }

  /**
   * Delete a connection by ID.
   *
   * @param id - The connection ID to delete
   * @returns True if deleted, false if not found
   *
   * @example
   * ```typescript
   * const deleted = await repo.delete('clg4xyz123');
   * if (deleted) {
   *   console.log('Connection removed');
   * }
   * ```
   */
  async delete(id: string): Promise<boolean> {
    const result = await db
      .delete(oauthConnections)
      .where(eq(oauthConnections.id, id));

    // MySQL returns affected rows via affectedRows property
    return (result as unknown as { affectedRows: number }).affectedRows > 0;
  }

  // ===========================================================================
  // USAGE TRACKING
  // ===========================================================================

  /**
   * Update the last used timestamp for a connection.
   *
   * Called when a token is retrieved for API use.
   *
   * @param id - The connection ID
   *
   * @example
   * ```typescript
   * // Update usage timestamp before returning token
   * await repo.updateLastUsed('clg4xyz123');
   * ```
   */
  async updateLastUsed(id: string): Promise<void> {
    await db
      .update(oauthConnections)
      .set({ lastUsedAt: new Date() })
      .where(eq(oauthConnections.id, id));
  }

  /**
   * Record an error on a connection and mark it as inactive.
   *
   * @param id - The connection ID
   * @param error - The error message to record
   *
   * @example
   * ```typescript
   * // Record token refresh failure
   * await repo.updateError(
   *   'clg4xyz123',
   *   'Refresh token expired or revoked. Re-authentication required.'
   * );
   * ```
   */
  async updateError(id: string, error: string): Promise<void> {
    await db
      .update(oauthConnections)
      .set({
        lastError: error,
        lastErrorAt: new Date(),
        isActive: false,
      })
      .where(eq(oauthConnections.id, id));
  }

  /**
   * Clear error state and reactivate a connection.
   *
   * @param id - The connection ID
   *
   * @example
   * ```typescript
   * // Clear error after successful operation
   * await repo.clearError('clg4xyz123');
   * ```
   */
  async clearError(id: string): Promise<void> {
    await db
      .update(oauthConnections)
      .set({
        lastError: null,
        lastErrorAt: null,
        isActive: true,
      })
      .where(eq(oauthConnections.id, id));
  }

  /**
   * Update tokens after a successful refresh.
   *
   * @param id - The connection ID
   * @param tokenUpdate - The new token data
   *
   * @example
   * ```typescript
   * await repo.updateTokens('clg4xyz123', {
   *   accessToken: 'new_access_token',
   *   refreshToken: 'new_refresh_token', // May be null if not returned
   *   expiresAt: new Date(Date.now() + 3600000),
   *   lastRefreshedAt: new Date(),
   *   isActive: true,
   *   lastError: null,
   * });
   * ```
   */
  async updateTokens(id: string, tokenUpdate: ConnectionTokenUpdate): Promise<void> {
    await db
      .update(oauthConnections)
      .set(tokenUpdate)
      .where(eq(oauthConnections.id, id));
  }

  // ===========================================================================
  // STATE MANAGEMENT (CSRF PROTECTION)
  // ===========================================================================

  /**
   * Create a new OAuth state for CSRF protection.
   *
   * @param data - The state data to insert
   * @returns The created state
   *
   * @example
   * ```typescript
   * const state = await repo.createState({
   *   state: 'random_state_token',
   *   provider: 'google',
   *   codeVerifier: 'pkce_verifier',
   *   expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
   *   metadata: { userId: 'user_123' },
   * });
   * ```
   */
  async createState(data: NewOAuthState): Promise<OAuthState> {
    // Generate ID if not provided
    const id = createId();
    const stateData = { ...data, id };

    await db.insert(oauthStates).values(stateData);

    // Return the created state
    const created = await this.findState(data.state);
    if (!created) {
      throw new Error('Failed to create state: could not retrieve after insert');
    }
    return created;
  }

  /**
   * Find an OAuth state by its token value.
   *
   * @param state - The state token to find
   * @returns The state or null if not found
   *
   * @example
   * ```typescript
   * const state = await repo.findState('random_state_token');
   * if (state && state.expiresAt > new Date()) {
   *   // State is valid
   * }
   * ```
   */
  async findState(state: string): Promise<OAuthState | null> {
    const [result] = await db
      .select()
      .from(oauthStates)
      .where(eq(oauthStates.state, state))
      .limit(1);

    return result || null;
  }

  /**
   * Delete an OAuth state after successful use.
   *
   * States should be deleted immediately after validation to prevent
   * replay attacks.
   *
   * @param state - The state token to delete
   *
   * @example
   * ```typescript
   * // After validating state in callback
   * await repo.deleteState('random_state_token');
   * ```
   */
  async deleteState(state: string): Promise<void> {
    await db.delete(oauthStates).where(eq(oauthStates.state, state));
  }

  /**
   * Delete an OAuth state by ID.
   *
   * @param id - The state record ID
   *
   * @example
   * ```typescript
   * await repo.deleteStateById('state_record_id');
   * ```
   */
  async deleteStateById(id: string): Promise<void> {
    await db.delete(oauthStates).where(eq(oauthStates.id, id));
  }

  /**
   * Clean up expired OAuth states.
   *
   * Should be called periodically (e.g., via cron job) to remove
   * expired state tokens from the database.
   *
   * @returns Number of states deleted
   *
   * @example
   * ```typescript
   * // Run cleanup every 5 minutes
   * const deleted = await repo.cleanupExpiredStates();
   * console.log(`Cleaned up ${deleted} expired states`);
   * ```
   */
  async cleanupExpiredStates(): Promise<number> {
    const result = await db
      .delete(oauthStates)
      .where(lt(oauthStates.expiresAt, new Date()));

    return (result as unknown as { affectedRows: number }).affectedRows;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Check if a connection exists by ID.
   *
   * @param id - The connection ID to check
   * @returns True if the connection exists
   *
   * @example
   * ```typescript
   * if (await repo.exists('clg4xyz123')) {
   *   // Connection exists
   * }
   * ```
   */
  async exists(id: string): Promise<boolean> {
    const connection = await this.findById(id);
    return connection !== null;
  }

  /**
   * Find a connection by provider and account ID (unique combination).
   *
   * @param provider - The OAuth provider ID
   * @param accountId - The provider-specific account ID
   * @param tenantId - Optional tenant ID for multi-tenant filtering
   * @returns The connection or null if not found
   *
   * @example
   * ```typescript
   * const existing = await repo.findByProviderAndAccount(
   *   'google',
   *   'user@gmail.com',
   *   'tenant_123'
   * );
   * ```
   */
  async findByProviderAndAccount(
    provider: string,
    accountId: string,
    tenantId?: string | null
  ): Promise<OAuthConnection | null> {
    const conditions = [
      eq(oauthConnections.provider, provider),
      eq(oauthConnections.accountId, accountId),
    ];

    // Handle null tenantId comparison properly for MySQL
    // In MySQL, NULL = NULL returns NULL (falsy), so we must use IS NULL
    if (tenantId === null || tenantId === undefined) {
      conditions.push(isNull(oauthConnections.tenantId));
    } else {
      conditions.push(eq(oauthConnections.tenantId, tenantId));
    }

    const [result] = await db
      .select()
      .from(oauthConnections)
      .where(and(...conditions))
      .limit(1);

    return result || null;
  }

  /**
   * Count connections matching filters.
   *
   * @param filters - Optional filters
   * @returns The count of matching connections
   *
   * @example
   * ```typescript
   * const activeCount = await repo.count({ isActive: true });
   * ```
   */
  async count(filters?: ConnectionFilters): Promise<number> {
    const connections = await this.findAll(filters);
    return connections.length;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Get the shared ConnectionRepository instance.
 *
 * @returns The singleton ConnectionRepository instance
 *
 * @example
 * ```typescript
 * import { getConnectionRepository } from './connectionRepository';
 *
 * const repo = getConnectionRepository();
 * const connection = await repo.findById('clg4xyz123');
 * ```
 */
export function getConnectionRepository(): ConnectionRepository {
  return ConnectionRepository.getInstance();
}

// Default export for convenience
export default ConnectionRepository;
