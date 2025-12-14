/**
 * @fileoverview Integration Manager - Main Facade for OAuth Integrations
 *
 * This module provides a centralized entry point for all OAuth integration
 * operations. It acts as a facade that coordinates between the TokenManager,
 * ConnectionRepository, and ProviderRegistry to provide a unified API for:
 *
 * - Initiating OAuth flows
 * - Handling OAuth callbacks
 * - Managing connections (list, get, rename, delete)
 * - Testing connections
 * - Getting valid tokens with automatic refresh
 *
 * The IntegrationManager uses the singleton pattern to ensure consistent
 * state management across the application.
 *
 * @module integrations/IntegrationManager
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const manager = IntegrationManager.getInstance();
 *
 * // Start OAuth flow
 * const { authUrl, state } = await manager.initiateOAuth('google', {
 *   userId: 'user_123',
 *   tenantId: 'tenant_456',
 * });
 *
 * // Handle callback (after user authorizes)
 * const connection = await manager.handleCallback('google', code, state);
 *
 * // Get a valid token for API calls
 * const accessToken = await manager.getValidToken(connection.id);
 * ```
 */

import { createId } from '@paralleldrive/cuid2';
import { ConnectionRepository } from './repositories/connectionRepository';
import { TokenManager } from './TokenManager';
import { ProviderRegistry } from './providers/registry';
import {
  IntegrationError,
  ErrorCodes,
  type ConnectionSummary,
  type OAuthStateMetadata,
} from './providers/types';
import type { OAuthConnection } from '../../db';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Options for initiating an OAuth flow.
 */
export interface InitiateOAuthOptions {
  /** Custom OAuth scopes to request (overrides provider defaults) */
  scopes?: string[];

  /** User ID to associate with the connection */
  userId?: string;

  /** Tenant ID for multi-tenant applications */
  tenantId?: string;

  /** Custom redirect URL after OAuth completion */
  redirectUrl?: string;
}

/**
 * Result from initiating an OAuth flow.
 */
export interface InitiateOAuthResult {
  /** The authorization URL to redirect the user to */
  authUrl: string;

  /** The state token for CSRF validation */
  state: string;
}

/**
 * Result from testing a connection.
 */
export interface TestConnectionResult {
  /** Whether the connection is valid and working */
  valid: boolean;

  /** Error message if the connection test failed */
  error?: string;
}

/**
 * Connection details returned in API responses (without sensitive data).
 */
export interface ConnectionDetails {
  id: string;
  name: string;
  provider: string;
  accountEmail?: string | null;
  accountName?: string | null;
  isActive: boolean;
  expiresAt?: Date | null;
  lastUsedAt?: Date | null;
  lastRefreshedAt?: Date | null;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// INTEGRATION MANAGER CLASS
// =============================================================================

/**
 * Main facade for OAuth integration operations.
 *
 * IntegrationManager provides a unified interface for managing OAuth
 * connections, handling OAuth flows, and retrieving valid tokens for
 * API calls.
 *
 * **Key Features:**
 * - Singleton pattern for consistent state management
 * - OAuth flow initiation with PKCE support
 * - Secure callback handling with CSRF protection
 * - Connection CRUD operations
 * - Token retrieval with automatic refresh
 * - Connection health testing
 *
 * @example
 * ```typescript
 * const manager = IntegrationManager.getInstance();
 *
 * // List all connections
 * const connections = await manager.getConnections();
 *
 * // Get a specific connection
 * const connection = await manager.getConnection('connection_id');
 *
 * // Test if a connection is still valid
 * const { valid, error } = await manager.testConnection('connection_id');
 *
 * // Get a valid access token for API calls
 * const token = await manager.getValidToken('connection_id');
 * ```
 */
export class IntegrationManager {
  // Singleton instance
  private static instance: IntegrationManager;

  // Dependencies
  private repository: ConnectionRepository;
  private tokenManager: TokenManager;
  private registry: ProviderRegistry;

  /**
   * Private constructor to enforce singleton pattern.
   * Use IntegrationManager.getInstance() to get the shared instance.
   */
  private constructor() {
    this.repository = ConnectionRepository.getInstance();
    this.tokenManager = TokenManager.getInstance();
    this.registry = ProviderRegistry.getInstance();
  }

  /**
   * Get the singleton instance of IntegrationManager.
   *
   * @returns The shared IntegrationManager instance
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   * ```
   */
  public static getInstance(): IntegrationManager {
    if (!IntegrationManager.instance) {
      IntegrationManager.instance = new IntegrationManager();
    }
    return IntegrationManager.instance;
  }

  /**
   * Reset the singleton instance.
   *
   * This is primarily useful for testing scenarios where you need
   * a fresh IntegrationManager instance.
   *
   * @internal
   */
  public static resetInstance(): void {
    IntegrationManager.instance = undefined as unknown as IntegrationManager;
  }

  // ===========================================================================
  // CONNECTION LISTING & RETRIEVAL
  // ===========================================================================

  /**
   * Get all connections matching the specified filters.
   *
   * Returns connection summaries without sensitive token data.
   *
   * @param filters - Optional filters for provider and createdBy
   * @returns Array of connection summaries
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   *
   * // Get all connections
   * const allConnections = await manager.getConnections();
   *
   * // Get only Google connections
   * const googleConnections = await manager.getConnections({
   *   provider: 'google',
   * });
   *
   * // Get connections for a specific user
   * const userConnections = await manager.getConnections({
   *   createdBy: 'user_123',
   * });
   * ```
   */
  public async getConnections(filters?: {
    provider?: string;
    createdBy?: string;
  }): Promise<ConnectionSummary[]> {
    const connections = await this.repository.findAll(filters);
    return connections.map(this.toConnectionSummary);
  }

  /**
   * Convert a database connection to a ConnectionSummary.
   *
   * This strips sensitive token data for safe API responses.
   *
   * @param conn - The database connection record
   * @returns A safe connection summary
   */
  private toConnectionSummary(conn: OAuthConnection): ConnectionSummary {
    return {
      id: conn.id,
      name: conn.name,
      provider: conn.provider,
      accountEmail: conn.accountEmail || undefined,
      accountName: conn.accountName || undefined,
      isActive: conn.isActive,
      expiresAt: conn.expiresAt,
      lastUsedAt: conn.lastUsedAt,
      createdAt: conn.createdAt,
    };
  }

  /**
   * Get a specific connection by ID.
   *
   * Returns the full connection record (but tokens are still in DB only).
   *
   * @param id - The connection ID
   * @returns The connection or null if not found
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   * const connection = await manager.getConnection('clg4xyz123');
   *
   * if (connection) {
   *   console.log(`Found: ${connection.name}`);
   * }
   * ```
   */
  public async getConnection(id: string): Promise<OAuthConnection | null> {
    return this.repository.findById(id);
  }

  /**
   * Get connection details for API response (without tokens).
   *
   * @param id - The connection ID
   * @returns Connection details or null if not found
   *
   * @example
   * ```typescript
   * const details = await manager.getConnectionDetails('connection_id');
   * // Safe to include in API response
   * ```
   */
  public async getConnectionDetails(id: string): Promise<ConnectionDetails | null> {
    const connection = await this.repository.findById(id);
    if (!connection) {
      return null;
    }

    return {
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
      accountEmail: connection.accountEmail,
      accountName: connection.accountName,
      isActive: connection.isActive,
      expiresAt: connection.expiresAt,
      lastUsedAt: connection.lastUsedAt,
      lastRefreshedAt: connection.lastRefreshedAt,
      lastError: connection.lastError,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  /**
   * Delete a connection by ID.
   *
   * This permanently removes the connection and its tokens from the database.
   *
   * @param id - The connection ID to delete
   * @returns True if deleted, false if not found
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   * const deleted = await manager.deleteConnection('clg4xyz123');
   *
   * if (deleted) {
   *   console.log('Connection removed');
   * } else {
   *   console.log('Connection not found');
   * }
   * ```
   */
  public async deleteConnection(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  /**
   * Rename a connection.
   *
   * @param id - The connection ID to rename
   * @param name - The new name for the connection
   * @returns The updated connection or null if not found
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   * const updated = await manager.renameConnection(
   *   'clg4xyz123',
   *   'Personal Gmail'
   * );
   *
   * if (updated) {
   *   console.log(`Renamed to: ${updated.name}`);
   * }
   * ```
   */
  public async renameConnection(
    id: string,
    name: string
  ): Promise<OAuthConnection | null> {
    return this.repository.update(id, { name });
  }

  // ===========================================================================
  // OAUTH FLOW - INITIATION
  // ===========================================================================

  /**
   * Initiate an OAuth flow for a provider.
   *
   * This generates an authorization URL and stores the OAuth state for
   * CSRF protection. The user should be redirected to the returned authUrl.
   *
   * **Security Features:**
   * - PKCE is automatically enabled for providers that support it
   * - State tokens expire after 10 minutes
   * - access_type=offline ensures refresh tokens are obtained
   * - prompt=consent forces consent screen for fresh refresh token
   *
   * @param providerId - The OAuth provider ID (e.g., 'google')
   * @param options - Optional settings for the OAuth flow
   * @returns The authorization URL and state token
   * @throws {IntegrationError} If the provider is not found
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   *
   * try {
   *   const { authUrl, state } = await manager.initiateOAuth('google', {
   *     userId: 'user_123',
   *     tenantId: 'tenant_456',
   *     scopes: ['https://www.googleapis.com/auth/gmail.send'],
   *   });
   *
   *   // Redirect user to authUrl
   *   res.redirect(authUrl);
   * } catch (error) {
   *   if (error instanceof IntegrationError) {
   *     console.error(`OAuth error: ${error.message}`);
   *   }
   * }
   * ```
   */
  public async initiateOAuth(
    providerId: string,
    options?: InitiateOAuthOptions
  ): Promise<InitiateOAuthResult> {
    // Get the provider
    const provider = this.registry.get(providerId);
    if (!provider) {
      throw new IntegrationError(
        `Provider '${providerId}' not found`,
        ErrorCodes.PROVIDER_NOT_FOUND,
        providerId
      );
    }

    // Generate authorization URL with PKCE if supported
    const authResult = provider.getAuthorizationUrl({
      scopes: options?.scopes,
      usePKCE: provider.supportsPKCE,
      accessType: 'offline',
      prompt: 'consent',
    });

    // Calculate state expiration (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Build metadata for the state record
    const metadata: OAuthStateMetadata = {};
    if (options?.userId) {
      metadata.userId = options.userId;
    }
    if (options?.tenantId) {
      metadata.tenantId = options.tenantId;
    }
    if (options?.redirectUrl) {
      metadata.redirectUrl = options.redirectUrl;
    }

    // Store state for CSRF protection
    await this.repository.createState({
      state: authResult.state,
      provider: providerId,
      codeVerifier: authResult.codeVerifier || null,
      redirectUrl: options?.redirectUrl || null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
      createdBy: options?.userId || null,
      tenantId: options?.tenantId || null,
      expiresAt,
    });

    return {
      authUrl: authResult.url,
      state: authResult.state,
    };
  }

  // ===========================================================================
  // OAUTH FLOW - CALLBACK HANDLING
  // ===========================================================================

  /**
   * Handle an OAuth callback from a provider.
   *
   * This validates the state, exchanges the authorization code for tokens,
   * fetches the user profile, and creates or updates the connection.
   *
   * **Security Features:**
   * - State validation prevents CSRF attacks
   * - Expired states are rejected
   * - States are deleted after use to prevent replay attacks
   * - PKCE code verifier is used if stored
   *
   * @param providerId - The OAuth provider ID
   * @param code - The authorization code from the callback
   * @param state - The state parameter for CSRF validation
   * @returns The created or updated connection
   * @throws {IntegrationError} If state is invalid/expired, provider not found,
   *         or token exchange fails
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   *
   * try {
   *   const connection = await manager.handleCallback(
   *     'google',
   *     'authorization_code_from_google',
   *     'state_from_query_params'
   *   );
   *
   *   console.log(`Connected: ${connection.accountEmail}`);
   *   console.log(`Connection ID: ${connection.id}`);
   * } catch (error) {
   *   if (error instanceof IntegrationError) {
   *     if (error.code === ErrorCodes.INVALID_STATE) {
   *       console.error('Invalid state - possible CSRF attack');
   *     } else if (error.code === ErrorCodes.STATE_EXPIRED) {
   *       console.error('State expired - please try again');
   *     }
   *   }
   * }
   * ```
   */
  public async handleCallback(
    providerId: string,
    code: string,
    state: string
  ): Promise<OAuthConnection> {
    // Validate state
    const storedState = await this.repository.findState(state);
    if (!storedState) {
      throw new IntegrationError(
        'Invalid or expired state',
        ErrorCodes.INVALID_STATE,
        providerId
      );
    }

    // Check state expiration
    if (new Date(storedState.expiresAt) < new Date()) {
      // Delete expired state
      await this.repository.deleteState(state);
      throw new IntegrationError(
        'State has expired. Please restart the OAuth flow.',
        ErrorCodes.STATE_EXPIRED,
        providerId
      );
    }

    // Verify provider matches
    if (storedState.provider !== providerId) {
      await this.repository.deleteState(state);
      throw new IntegrationError(
        'State provider mismatch',
        ErrorCodes.INVALID_STATE,
        providerId
      );
    }

    // Get the provider
    const provider = this.registry.get(providerId);
    if (!provider) {
      await this.repository.deleteState(state);
      throw new IntegrationError(
        `Provider '${providerId}' not found`,
        ErrorCodes.PROVIDER_NOT_FOUND,
        providerId
      );
    }

    try {
      // Exchange authorization code for tokens
      const tokens = await provider.exchangeCode(
        code,
        storedState.codeVerifier || undefined
      );

      // Get user profile
      const profile = await provider.getUserProfile(tokens.accessToken);

      // Delete used state to prevent replay attacks
      await this.repository.deleteState(state);

      // Extract metadata from stored state
      const metadata = storedState.metadata as OAuthStateMetadata | null;
      const userId = metadata?.userId || storedState.createdBy;
      const tenantId = metadata?.tenantId || storedState.tenantId;

      // Check for existing connection with same provider + account + tenant
      const existingConnection = await this.repository.findByProviderAndAccount(
        providerId,
        profile.id,
        tenantId || null
      );

      if (existingConnection) {
        // Update existing connection with new tokens
        const updated = await this.repository.update(existingConnection.id, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || existingConnection.refreshToken,
          expiresAt: tokens.expiresAt || null,
          scope: tokens.scope || null,
          accountName: profile.name || existingConnection.accountName,
          isActive: true,
          lastError: null,
          lastRefreshedAt: new Date(),
        });

        if (!updated) {
          throw new Error('Failed to update existing connection');
        }

        return updated;
      }

      // Before creating a new connection, clean up old inactive connections
      // for the same email (fixes duplicate connections from reconnect flows)
      if (profile.email) {
        const oldConnections = await this.repository.findByAccountEmail(
          profile.email,
          providerId
        );

        // Delete inactive connections for the same email
        for (const oldConn of oldConnections) {
          if (!oldConn.isActive) {
            console.log(`[IntegrationManager] Cleaning up inactive connection: ${oldConn.id} (${oldConn.accountEmail})`);
            await this.repository.delete(oldConn.id);
          }
        }
      }

      // Create new connection
      const connectionId = createId();
      const connectionName = this.generateConnectionName(
        provider.name,
        profile.email || profile.name || profile.id
      );

      const newConnection = await this.repository.create({
        id: connectionId,
        name: connectionName,
        provider: providerId,
        createdBy: userId || null,
        tenantId: tenantId || null,
        accountId: profile.id,
        accountEmail: profile.email || null,
        accountName: profile.name || null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || null,
        tokenType: tokens.tokenType,
        scope: tokens.scope || null,
        expiresAt: tokens.expiresAt || null,
        isActive: true,
        providerData: profile.raw || null,
      });

      return newConnection;
    } catch (error) {
      // Clean up state on error
      await this.repository.deleteState(state).catch(() => {
        // Ignore cleanup errors
      });

      // Re-throw IntegrationErrors as-is
      if (error instanceof IntegrationError) {
        throw error;
      }

      // Wrap other errors
      throw new IntegrationError(
        'Failed to exchange authorization code',
        ErrorCodes.TOKEN_EXCHANGE_FAILED,
        providerId,
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }

  /**
   * Generate a human-readable connection name.
   *
   * @param providerName - The provider's display name
   * @param identifier - Email, name, or ID to identify the account
   * @returns A formatted connection name
   */
  private generateConnectionName(
    providerName: string,
    identifier: string
  ): string {
    return `${providerName} - ${identifier}`;
  }

  // ===========================================================================
  // TOKEN MANAGEMENT
  // ===========================================================================

  /**
   * Get a valid access token for a connection.
   *
   * This method automatically refreshes the token if it's expired or about
   * to expire (within 60 seconds). It's the primary method for getting
   * tokens ready for API calls.
   *
   * @param connectionId - The connection ID
   * @returns A valid access token
   * @throws {IntegrationError} If connection not found, inactive, or refresh fails
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   *
   * try {
   *   const accessToken = await manager.getValidToken('connection_id');
   *
   *   // Use token for API calls
   *   const response = await fetch('https://api.example.com/data', {
   *     headers: {
   *       Authorization: `Bearer ${accessToken}`,
   *     },
   *   });
   * } catch (error) {
   *   if (error instanceof IntegrationError) {
   *     if (error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED) {
   *       // User needs to re-authenticate
   *       console.log('Please reconnect your account');
   *     }
   *   }
   * }
   * ```
   */
  public async getValidToken(connectionId: string): Promise<string> {
    // Get the connection
    const connection = await this.repository.findById(connectionId);
    if (!connection) {
      throw new IntegrationError(
        'Connection not found',
        ErrorCodes.CONNECTION_NOT_FOUND,
        undefined,
        { connectionId }
      );
    }

    // Check if connection is active
    if (!connection.isActive) {
      throw new IntegrationError(
        'Connection is inactive. Re-authentication required.',
        ErrorCodes.REFRESH_TOKEN_EXPIRED,
        connection.provider,
        { connectionId, lastError: connection.lastError }
      );
    }

    // Use TokenManager to get/refresh token
    return this.tokenManager.ensureValidToken(connection);
  }

  // ===========================================================================
  // CONNECTION TESTING
  // ===========================================================================

  /**
   * Test if a connection is valid and working.
   *
   * This method attempts to get a valid token and verify it by fetching
   * the user profile from the provider.
   *
   * @param connectionId - The connection ID to test
   * @returns Test result with validity status and optional error message
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   *
   * const result = await manager.testConnection('connection_id');
   *
   * if (result.valid) {
   *   console.log('Connection is working!');
   * } else {
   *   console.error(`Connection failed: ${result.error}`);
   * }
   * ```
   */
  public async testConnection(connectionId: string): Promise<TestConnectionResult> {
    try {
      // Try to get a valid token (this will refresh if needed)
      const token = await this.getValidToken(connectionId);

      // Get the connection to find the provider
      const connection = await this.repository.findById(connectionId);
      if (!connection) {
        return { valid: false, error: 'Connection not found' };
      }

      // Get the provider
      const provider = this.registry.get(connection.provider);
      if (!provider) {
        return { valid: false, error: 'Provider not found' };
      }

      // Try to get user profile to verify token works
      await provider.getUserProfile(token);

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Check if a provider is available.
   *
   * @param providerId - The provider ID to check
   * @returns True if the provider is registered
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   * if (manager.hasProvider('google')) {
   *   console.log('Google OAuth is available');
   * }
   * ```
   */
  public hasProvider(providerId: string): boolean {
    return this.registry.has(providerId);
  }

  /**
   * Get connection by account email.
   *
   * Useful for finding connections when you know the user's email
   * but not the connection ID.
   *
   * @param email - The account email to search for
   * @param provider - Optional: filter by provider
   * @returns Array of matching connections
   *
   * @example
   * ```typescript
   * const manager = IntegrationManager.getInstance();
   *
   * // Find all connections for an email
   * const connections = await manager.findConnectionsByEmail('user@gmail.com');
   *
   * // Find only Google connections
   * const googleConnections = await manager.findConnectionsByEmail(
   *   'user@gmail.com',
   *   'google'
   * );
   * ```
   */
  public async findConnectionsByEmail(
    email: string,
    provider?: string
  ): Promise<OAuthConnection[]> {
    return this.repository.findByAccountEmail(email, provider);
  }

  /**
   * Cleanup expired OAuth states.
   *
   * This should be called periodically (e.g., via cron) to remove
   * expired state tokens from the database.
   *
   * @returns Number of expired states removed
   *
   * @example
   * ```typescript
   * // In a cron job or scheduled task
   * const manager = IntegrationManager.getInstance();
   * const cleaned = await manager.cleanupExpiredStates();
   * console.log(`Cleaned up ${cleaned} expired OAuth states`);
   * ```
   */
  public async cleanupExpiredStates(): Promise<number> {
    return this.repository.cleanupExpiredStates();
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Get the shared IntegrationManager instance.
 *
 * @returns The singleton IntegrationManager instance
 *
 * @example
 * ```typescript
 * import { getIntegrationManager } from './IntegrationManager';
 *
 * const manager = getIntegrationManager();
 * const connections = await manager.getConnections();
 * ```
 */
export function getIntegrationManager(): IntegrationManager {
  return IntegrationManager.getInstance();
}

// Default export for convenience
export default IntegrationManager;
