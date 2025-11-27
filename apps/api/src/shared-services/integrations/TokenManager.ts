/**
 * @fileoverview Token Manager for OAuth Integrations System
 *
 * This module provides automatic token refresh management for OAuth connections.
 * It handles:
 * - Token expiration checking with 60-second buffer
 * - Automatic token refresh using provider refresh tokens
 * - Database updates after successful refresh
 * - Error handling for expired/revoked refresh tokens
 * - Connection deactivation on unrecoverable errors
 *
 * The TokenManager uses the singleton pattern to ensure consistent token
 * management throughout the application.
 *
 * @module integrations/TokenManager
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * const tokenManager = TokenManager.getInstance();
 *
 * // Get a valid token for a connection (auto-refresh if needed)
 * const accessToken = await tokenManager.ensureValidToken(connection);
 *
 * // Force refresh a token
 * const newTokens = await tokenManager.refreshToken(connectionId);
 * ```
 */

import { ConnectionRepository } from './repositories/connectionRepository';
import { ProviderRegistry } from './providers/registry';
import { IntegrationError, ErrorCodes, type OAuthTokens } from './providers/types';
import type { OAuthConnection } from '../../db';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Buffer time (in milliseconds) before actual token expiry.
 * Tokens are considered expired 60 seconds before their actual expiry time
 * to provide a safety margin for API calls.
 */
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

// =============================================================================
// TOKEN MANAGER CLASS
// =============================================================================

/**
 * Singleton manager for OAuth token lifecycle.
 *
 * TokenManager handles automatic token refresh when access tokens expire,
 * ensuring seamless API access for OAuth-protected services.
 *
 * **Key Features:**
 * - Checks token expiry with configurable buffer (default: 60 seconds)
 * - Automatically refreshes expired tokens using refresh tokens
 * - Updates database with new tokens after refresh
 * - Handles errors gracefully (invalid_grant marks connection inactive)
 * - Preserves refresh tokens that aren't returned by provider (Google behavior)
 *
 * @example
 * ```typescript
 * const tokenManager = TokenManager.getInstance();
 *
 * // Ensure token is valid before making API calls
 * const connection = await repository.findById(connectionId);
 * const accessToken = await tokenManager.ensureValidToken(connection);
 *
 * // Use accessToken for API requests
 * const response = await fetch('https://api.example.com/data', {
 *   headers: { Authorization: `Bearer ${accessToken}` }
 * });
 * ```
 */
export class TokenManager {
  // Singleton instance
  private static instance: TokenManager;

  // Dependencies
  private repository: ConnectionRepository;
  private registry: ProviderRegistry;

  /**
   * Private constructor to enforce singleton pattern.
   * Use TokenManager.getInstance() to get the shared instance.
   */
  private constructor() {
    this.repository = ConnectionRepository.getInstance();
    this.registry = ProviderRegistry.getInstance();
  }

  /**
   * Get the singleton instance of TokenManager.
   *
   * @returns The shared TokenManager instance
   *
   * @example
   * ```typescript
   * const tokenManager = TokenManager.getInstance();
   * ```
   */
  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Reset the singleton instance.
   *
   * This is primarily useful for testing scenarios where you need
   * a fresh TokenManager instance.
   *
   * @internal
   */
  public static resetInstance(): void {
    TokenManager.instance = undefined as unknown as TokenManager;
  }

  // ===========================================================================
  // TOKEN VALIDATION
  // ===========================================================================

  /**
   * Check if a token has expired or is about to expire.
   *
   * Tokens are considered expired if they expire within the buffer period
   * (default: 60 seconds) to ensure API calls have time to complete.
   *
   * @param expiresAt - The token's expiration timestamp (null = expired)
   * @returns True if the token is expired or about to expire
   *
   * @example
   * ```typescript
   * const tokenManager = TokenManager.getInstance();
   *
   * // Check if token needs refresh
   * if (tokenManager.isTokenExpired(connection.expiresAt)) {
   *   // Token needs refresh
   * }
   * ```
   */
  public isTokenExpired(expiresAt: Date | null): boolean {
    // No expiration date = consider expired
    if (!expiresAt) {
      return true;
    }

    // Check if current time + buffer is past expiration
    const now = new Date().getTime();
    const expiryTime = new Date(expiresAt).getTime();

    return now >= expiryTime - TOKEN_EXPIRY_BUFFER_MS;
  }

  /**
   * Get the time remaining until a token expires.
   *
   * @param expiresAt - The token's expiration timestamp
   * @returns Milliseconds until expiry (negative if already expired)
   *
   * @example
   * ```typescript
   * const remaining = tokenManager.getTimeUntilExpiry(connection.expiresAt);
   * console.log(`Token expires in ${Math.floor(remaining / 1000)} seconds`);
   * ```
   */
  public getTimeUntilExpiry(expiresAt: Date | null): number {
    if (!expiresAt) {
      return -1;
    }

    const now = new Date().getTime();
    const expiryTime = new Date(expiresAt).getTime();

    return expiryTime - now;
  }

  // ===========================================================================
  // TOKEN REFRESH
  // ===========================================================================

  /**
   * Ensure a valid access token is available for a connection.
   *
   * This method checks if the current token is valid and automatically
   * refreshes it if expired. It's the primary method for getting tokens
   * that are ready for API use.
   *
   * **Behavior:**
   * 1. If token is still valid: update lastUsedAt and return it
   * 2. If token is expired: refresh using refresh token
   * 3. If no refresh token: throw REFRESH_TOKEN_EXPIRED error
   *
   * @param connection - The OAuth connection to get a token for
   * @returns A valid access token ready for API use
   * @throws {IntegrationError} If token cannot be obtained or refreshed
   *
   * @example
   * ```typescript
   * const tokenManager = TokenManager.getInstance();
   * const connection = await repository.findById(connectionId);
   *
   * try {
   *   const accessToken = await tokenManager.ensureValidToken(connection);
   *   // Use token for API calls
   * } catch (error) {
   *   if (error instanceof IntegrationError &&
   *       error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED) {
   *     // User needs to re-authenticate
   *   }
   * }
   * ```
   */
  public async ensureValidToken(connection: OAuthConnection): Promise<string> {
    // Validate connection has an access token
    if (!connection.accessToken) {
      throw new IntegrationError(
        'Connection has no access token',
        ErrorCodes.INVALID_TOKEN,
        connection.provider,
        { connectionId: connection.id }
      );
    }

    // Check if token is still valid
    if (!this.isTokenExpired(connection.expiresAt)) {
      // Token is valid, update last used timestamp
      await this.repository.updateLastUsed(connection.id);
      return connection.accessToken;
    }

    // Token is expired, attempt refresh
    if (!connection.refreshToken) {
      throw new IntegrationError(
        'No refresh token available. Re-authentication required.',
        ErrorCodes.REFRESH_TOKEN_EXPIRED,
        connection.provider,
        { connectionId: connection.id }
      );
    }

    // Refresh the token and return the new access token
    const newTokens = await this.refreshToken(connection.id);
    return newTokens.accessToken;
  }

  /**
   * Refresh tokens for a connection.
   *
   * This method uses the provider's refresh token to obtain new access
   * (and optionally refresh) tokens. The database is updated with the
   * new tokens on success.
   *
   * **Important Notes:**
   * - Google doesn't return a new refresh token on refresh, so the
   *   original refresh token is preserved
   * - If refresh fails with invalid_grant, the connection is marked
   *   as inactive and requires re-authentication
   * - All errors are recorded in the connection's lastError field
   *
   * @param connectionId - The ID of the connection to refresh
   * @returns The new OAuth tokens
   * @throws {IntegrationError} If connection not found, provider not found,
   *         or refresh fails
   *
   * @example
   * ```typescript
   * const tokenManager = TokenManager.getInstance();
   *
   * try {
   *   const newTokens = await tokenManager.refreshToken('connection_id');
   *   console.log('Token refreshed, expires at:', newTokens.expiresAt);
   * } catch (error) {
   *   if (error instanceof IntegrationError) {
   *     if (error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED) {
   *       console.log('User must re-authenticate');
   *     }
   *   }
   * }
   * ```
   */
  public async refreshToken(connectionId: string): Promise<OAuthTokens> {
    // Get the connection from database
    const connection = await this.repository.findById(connectionId);
    if (!connection) {
      throw new IntegrationError(
        'Connection not found',
        ErrorCodes.CONNECTION_NOT_FOUND,
        undefined,
        { connectionId }
      );
    }

    // Validate refresh token exists
    if (!connection.refreshToken) {
      throw new IntegrationError(
        'No refresh token available. Re-authentication required.',
        ErrorCodes.REFRESH_TOKEN_EXPIRED,
        connection.provider,
        { connectionId }
      );
    }

    // Get the provider
    const provider = this.registry.get(connection.provider);
    if (!provider) {
      throw new IntegrationError(
        `Provider '${connection.provider}' not found`,
        ErrorCodes.PROVIDER_NOT_FOUND,
        connection.provider,
        { connectionId }
      );
    }

    // Check if provider supports refresh
    if (!provider.supportsRefresh) {
      throw new IntegrationError(
        `Provider '${connection.provider}' does not support token refresh`,
        ErrorCodes.INVALID_CONFIGURATION,
        connection.provider,
        { connectionId }
      );
    }

    try {
      // Call provider's refresh token method
      const newTokens = await provider.refreshToken(connection.refreshToken);

      // Google doesn't return a new refresh token on refresh
      // Preserve the original refresh token if not returned
      const refreshToken = newTokens.refreshToken || connection.refreshToken;

      // Update the connection in database
      await this.repository.updateTokens(connectionId, {
        accessToken: newTokens.accessToken,
        refreshToken: refreshToken,
        expiresAt: newTokens.expiresAt || null,
        scope: newTokens.scope || connection.scope,
        lastRefreshedAt: new Date(),
        isActive: true,
        lastError: null,
      });

      // Update last used timestamp
      await this.repository.updateLastUsed(connectionId);

      // Return the new tokens (with preserved refresh token)
      return {
        ...newTokens,
        refreshToken: refreshToken,
      };
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : 'Unknown error during token refresh';

      // Check for invalid_grant error (refresh token expired/revoked)
      const isInvalidGrant =
        errorMessage.toLowerCase().includes('invalid_grant') ||
        errorMessage.toLowerCase().includes('token has been expired') ||
        errorMessage.toLowerCase().includes('token has been revoked');

      if (isInvalidGrant) {
        // Mark connection as inactive with specific error
        await this.repository.updateError(
          connectionId,
          'Refresh token expired or revoked. Re-authentication required.'
        );

        throw new IntegrationError(
          'Refresh token expired or revoked. Re-authentication required.',
          ErrorCodes.REFRESH_TOKEN_EXPIRED,
          connection.provider,
          {
            connectionId,
            originalError: errorMessage,
          }
        );
      }

      // For other errors, record but don't deactivate immediately
      // Note: Using the repository's updateError would set isActive=false
      // which we don't want for transient errors, so we use updateTokens instead
      await this.repository.updateTokens(connectionId, {
        lastError: errorMessage,
        isActive: true, // Keep active for transient errors
      });

      // Re-throw the error
      throw new IntegrationError(
        `Token refresh failed: ${errorMessage}`,
        ErrorCodes.OAUTH_ERROR,
        connection.provider,
        {
          connectionId,
          originalError: errorMessage,
        }
      );
    }
  }

  // ===========================================================================
  // ENCRYPTION (PLACEHOLDER FOR FUTURE)
  // ===========================================================================

  /**
   * Encrypt a token for secure storage.
   *
   * @param token - The plain text token to encrypt
   * @returns The encrypted token
   *
   * @remarks
   * This method is a placeholder for future encryption implementation.
   * Currently returns the token unchanged.
   *
   * @internal
   */
  public encryptToken(token: string): string {
    // TODO: Implement AES-256-GCM encryption
    // For now, return token unchanged
    return token;
  }

  /**
   * Decrypt a stored token.
   *
   * @param encryptedToken - The encrypted token to decrypt
   * @returns The decrypted plain text token
   *
   * @remarks
   * This method is a placeholder for future decryption implementation.
   * Currently returns the token unchanged.
   *
   * @internal
   */
  public decryptToken(encryptedToken: string): string {
    // TODO: Implement AES-256-GCM decryption
    // For now, return token unchanged
    return encryptedToken;
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

/**
 * Get the shared TokenManager instance.
 *
 * @returns The singleton TokenManager instance
 *
 * @example
 * ```typescript
 * import { getTokenManager } from './TokenManager';
 *
 * const tokenManager = getTokenManager();
 * const accessToken = await tokenManager.ensureValidToken(connection);
 * ```
 */
export function getTokenManager(): TokenManager {
  return TokenManager.getInstance();
}

// Default export for convenience
export default TokenManager;
