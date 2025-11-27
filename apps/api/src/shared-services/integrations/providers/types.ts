/**
 * @fileoverview Type definitions for the OAuth Integrations System
 *
 * This module defines all TypeScript interfaces, types, and error classes
 * used throughout the OAuth integrations system. It provides a unified
 * type system for OAuth providers, tokens, user profiles, and connections.
 *
 * @module integrations/providers/types
 * @version 1.0.0
 */

// =============================================================================
// PROVIDER CONFIGURATION
// =============================================================================

/**
 * Configuration required to initialize an OAuth provider.
 *
 * @example
 * ```typescript
 * const config: OAuthProviderConfig = {
 *   clientId: process.env.GOOGLE_CLIENT_ID,
 *   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
 *   redirectUri: 'http://localhost:3013/integrations/oauth/google/callback',
 *   scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
 * };
 * ```
 */
export interface OAuthProviderConfig {
  /** OAuth client ID from the provider's developer console */
  clientId: string;

  /** OAuth client secret from the provider's developer console */
  clientSecret: string;

  /** The URI where the provider will redirect after authorization */
  redirectUri: string;

  /** List of OAuth scopes to request during authorization */
  scopes: string[];
}

// =============================================================================
// TOKEN TYPES
// =============================================================================

/**
 * Normalized OAuth tokens returned from token exchange or refresh operations.
 *
 * This interface provides a consistent structure for tokens across all OAuth
 * providers, regardless of their raw response format.
 *
 * @example
 * ```typescript
 * const tokens: OAuthTokens = {
 *   accessToken: 'ya29.a0AfB_byC...',
 *   refreshToken: '1//0eXXXX...',
 *   tokenType: 'Bearer',
 *   expiresIn: 3600,
 *   expiresAt: new Date(Date.now() + 3600 * 1000),
 *   scope: 'https://www.googleapis.com/auth/gmail.readonly',
 * };
 * ```
 */
export interface OAuthTokens {
  /** The access token for API requests */
  accessToken: string;

  /** The refresh token for obtaining new access tokens (may not be returned on refresh) */
  refreshToken?: string;

  /** Token type, typically "Bearer" */
  tokenType: string;

  /** Number of seconds until the access token expires */
  expiresIn?: number;

  /** Absolute timestamp when the access token expires */
  expiresAt?: Date;

  /** Space-separated list of granted scopes */
  scope?: string;

  /** Raw response from the provider for debugging/logging */
  raw?: Record<string, unknown>;
}

// =============================================================================
// USER PROFILE
// =============================================================================

/**
 * Normalized user profile information from an OAuth provider.
 *
 * This interface provides a consistent structure for user information
 * across different OAuth providers.
 *
 * @example
 * ```typescript
 * const profile: OAuthUserProfile = {
 *   id: 'user@gmail.com',
 *   email: 'user@gmail.com',
 *   name: 'John Doe',
 *   picture: 'https://lh3.googleusercontent.com/...',
 * };
 * ```
 */
export interface OAuthUserProfile {
  /** Unique identifier for the user from the provider */
  id: string;

  /** User's email address (may not be available for all providers) */
  email?: string;

  /** User's display name */
  name?: string;

  /** URL to the user's profile picture */
  picture?: string;

  /** Raw profile response from the provider */
  raw?: Record<string, unknown>;
}

// =============================================================================
// AUTHORIZATION URL
// =============================================================================

/**
 * Options for generating an OAuth authorization URL.
 *
 * @example
 * ```typescript
 * const options: AuthUrlOptions = {
 *   scopes: ['https://www.googleapis.com/auth/gmail.send'],
 *   usePKCE: true,
 *   accessType: 'offline',
 *   prompt: 'consent',
 * };
 * ```
 */
export interface AuthUrlOptions {
  /** Custom scopes to request (overrides provider default) */
  scopes?: string[];

  /** Pre-generated state token (will be generated if not provided) */
  state?: string;

  /** Whether to use PKCE flow (recommended for all providers that support it) */
  usePKCE?: boolean;

  /**
   * The prompt behavior for the authorization screen:
   * - 'consent': Force the consent screen to be shown
   * - 'select_account': Allow user to select from multiple accounts
   * - 'none': Don't show any UI (will fail if interaction is needed)
   */
  prompt?: 'consent' | 'select_account' | 'none';

  /** Hint to the provider about which user to authenticate */
  loginHint?: string;

  /**
   * Access type for the token:
   * - 'offline': Request a refresh token (recommended)
   * - 'online': No refresh token (access token only)
   */
  accessType?: 'online' | 'offline';
}

/**
 * Result from generating an OAuth authorization URL.
 *
 * @example
 * ```typescript
 * const result: AuthUrlResult = {
 *   url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
 *   state: 'abc123xyz',
 *   codeVerifier: 'pkce_verifier_string',
 * };
 * ```
 */
export interface AuthUrlResult {
  /** The complete authorization URL to redirect the user to */
  url: string;

  /** The state token for CSRF protection */
  state: string;

  /** The PKCE code verifier (must be stored and used during token exchange) */
  codeVerifier?: string;
}

// =============================================================================
// OAUTH PROVIDER INTERFACE
// =============================================================================

/**
 * Interface that all OAuth providers must implement.
 *
 * This interface defines the contract for OAuth providers, ensuring
 * consistent behavior across different provider implementations.
 *
 * @example
 * ```typescript
 * class GoogleProvider implements OAuthProvider {
 *   readonly id = 'google';
 *   readonly name = 'Google';
 *   readonly version = '1.0.0';
 *   readonly defaultScopes = ['email', 'profile'];
 *   readonly supportsPKCE = true;
 *   readonly supportsRefresh = true;
 *
 *   getAuthorizationUrl(options?: AuthUrlOptions): AuthUrlResult { ... }
 *   async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> { ... }
 *   async refreshToken(refreshToken: string): Promise<OAuthTokens> { ... }
 *   async getUserProfile(accessToken: string): Promise<OAuthUserProfile> { ... }
 * }
 * ```
 */
export interface OAuthProvider {
  /** Unique identifier for the provider (e.g., 'google', 'twitter') */
  readonly id: string;

  /** Human-readable name of the provider */
  readonly name: string;

  /** Version of the provider implementation */
  readonly version: string;

  /** Default OAuth scopes requested by this provider */
  readonly defaultScopes: string[];

  /** Whether this provider supports PKCE flow */
  readonly supportsPKCE: boolean;

  /** Whether this provider supports token refresh */
  readonly supportsRefresh: boolean;

  /**
   * Generate an authorization URL for the OAuth flow.
   *
   * @param options - Options for customizing the authorization request
   * @returns The authorization URL, state token, and optional PKCE verifier
   */
  getAuthorizationUrl(options?: AuthUrlOptions): AuthUrlResult;

  /**
   * Exchange an authorization code for tokens.
   *
   * @param code - The authorization code from the OAuth callback
   * @param codeVerifier - The PKCE code verifier (required if PKCE was used)
   * @returns The OAuth tokens
   * @throws {IntegrationError} If the exchange fails
   */
  exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens>;

  /**
   * Refresh an expired access token.
   *
   * @param refreshToken - The refresh token from the original authorization
   * @returns New OAuth tokens (may not include a new refresh token)
   * @throws {IntegrationError} If refresh fails (e.g., refresh token expired)
   */
  refreshToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Get the user's profile from the provider.
   *
   * @param accessToken - A valid access token
   * @returns The user's profile information
   * @throws {IntegrationError} If the profile cannot be retrieved
   */
  getUserProfile(accessToken: string): Promise<OAuthUserProfile>;

  /**
   * Revoke an access or refresh token (optional).
   *
   * @param token - The token to revoke
   */
  revokeToken?(token: string): Promise<void>;

  /**
   * Validate an access token (optional).
   *
   * @param accessToken - The token to validate
   * @returns True if the token is valid
   */
  validateToken?(accessToken: string): Promise<boolean>;
}

// =============================================================================
// CONNECTION TYPES
// =============================================================================

/**
 * Summary of a connection suitable for listing (without sensitive data).
 *
 * This interface is used when listing connections in API responses,
 * ensuring tokens are never exposed.
 *
 * @example
 * ```typescript
 * const summary: ConnectionSummary = {
 *   id: 'clg4xyz123...',
 *   name: 'Google - user@gmail.com',
 *   provider: 'google',
 *   accountEmail: 'user@gmail.com',
 *   isActive: true,
 *   expiresAt: new Date('2024-01-15T12:00:00Z'),
 *   lastUsedAt: new Date('2024-01-14T10:30:00Z'),
 *   createdAt: new Date('2024-01-01T00:00:00Z'),
 * };
 * ```
 */
export interface ConnectionSummary {
  /** Unique identifier for the connection */
  id: string;

  /** User-defined or auto-generated name for the connection */
  name: string;

  /** The OAuth provider ID */
  provider: string;

  /** Email address of the connected account */
  accountEmail?: string;

  /** Display name of the connected account */
  accountName?: string;

  /** Whether the connection is currently active and tokens are valid */
  isActive: boolean;

  /** When the access token expires (null if unknown) */
  expiresAt?: Date | null;

  /** When the connection was last used to get a token */
  lastUsedAt?: Date | null;

  /** When the connection was created */
  createdAt: Date;
}

/**
 * Full connection data with decrypted tokens for internal use.
 *
 * This interface is used internally when tokens need to be accessed
 * for API calls. It should NEVER be returned directly in API responses.
 *
 * @internal
 */
export interface DecryptedConnection {
  /** Unique identifier for the connection */
  id: string;

  /** User-defined or auto-generated name for the connection */
  name: string;

  /** The OAuth provider ID */
  provider: string;

  /** Provider-specific unique identifier for the account */
  accountId?: string | null;

  /** Email address of the connected account */
  accountEmail?: string | null;

  /** Display name of the connected account */
  accountName?: string | null;

  /** The current access token (never expose in API responses!) */
  accessToken: string;

  /** The refresh token (never expose in API responses!) */
  refreshToken?: string | null;

  /** Token type, typically "Bearer" */
  tokenType: string;

  /** Space-separated list of granted scopes */
  scope?: string | null;

  /** When the access token expires */
  expiresAt?: Date | null;

  /** Whether the connection is currently active */
  isActive: boolean;

  /** Provider-specific metadata */
  providerData?: Record<string, unknown> | null;
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Error codes for integration-related errors.
 *
 * These codes help identify the type of error that occurred and
 * determine the appropriate action (e.g., re-authentication required).
 */
export const ErrorCodes = {
  /** The requested OAuth provider is not registered */
  PROVIDER_NOT_FOUND: 'PROVIDER_NOT_FOUND',

  /** The requested connection does not exist */
  CONNECTION_NOT_FOUND: 'CONNECTION_NOT_FOUND',

  /** The OAuth state token is invalid or not found */
  INVALID_STATE: 'INVALID_STATE',

  /** The OAuth state token has expired (10 minute limit) */
  STATE_EXPIRED: 'STATE_EXPIRED',

  /** Failed to exchange authorization code for tokens */
  TOKEN_EXCHANGE_FAILED: 'TOKEN_EXCHANGE_FAILED',

  /** The refresh token is expired or revoked, re-authentication required */
  REFRESH_TOKEN_EXPIRED: 'REFRESH_TOKEN_EXPIRED',

  /** The provider configuration is invalid or incomplete */
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',

  /** An unexpected error occurred during the OAuth flow */
  OAUTH_ERROR: 'OAUTH_ERROR',

  /** The access token is invalid or expired */
  INVALID_TOKEN: 'INVALID_TOKEN',
} as const;

/** Type for error code values */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Custom error class for integration-related errors.
 *
 * This error class provides structured error information including
 * an error code, provider context, and additional details.
 *
 * @example
 * ```typescript
 * throw new IntegrationError(
 *   'Connection not found',
 *   ErrorCodes.CONNECTION_NOT_FOUND,
 *   'google',
 *   { connectionId: 'clg4xyz123' }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Handling integration errors
 * try {
 *   await manager.getValidToken(connectionId);
 * } catch (error) {
 *   if (error instanceof IntegrationError) {
 *     if (error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED) {
 *       // Redirect user to re-authenticate
 *     }
 *   }
 *   throw error;
 * }
 * ```
 */
export class IntegrationError extends Error {
  /** Error code for programmatic handling */
  public readonly code: ErrorCode;

  /** The OAuth provider related to this error (if applicable) */
  public readonly provider?: string;

  /** Additional error details for debugging */
  public readonly details?: Record<string, unknown>;

  /**
   * Create a new IntegrationError.
   *
   * @param message - Human-readable error message
   * @param code - Error code from ErrorCodes
   * @param provider - The OAuth provider ID (optional)
   * @param details - Additional error details (optional)
   */
  constructor(
    message: string,
    code: ErrorCode,
    provider?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'IntegrationError';
    this.code = code;
    this.provider = provider;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IntegrationError);
    }
  }

  /**
   * Check if this error indicates re-authentication is required.
   *
   * @returns True if the user needs to re-authenticate
   */
  requiresReauthentication(): boolean {
    return (
      this.code === ErrorCodes.REFRESH_TOKEN_EXPIRED ||
      this.code === ErrorCodes.INVALID_TOKEN
    );
  }

  /**
   * Convert the error to a JSON-serializable object.
   *
   * @returns JSON-safe error representation
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      provider: this.provider,
      details: this.details,
      requiresReauth: this.requiresReauthentication(),
    };
  }
}

// =============================================================================
// PROVIDER METADATA
// =============================================================================

/**
 * Public metadata about an OAuth provider (safe to expose in API responses).
 *
 * @example
 * ```typescript
 * const metadata: ProviderMetadata = {
 *   id: 'google',
 *   name: 'Google',
 *   version: '1.0.0',
 *   defaultScopes: ['email', 'profile', 'gmail.readonly'],
 *   supportsPKCE: true,
 *   supportsRefresh: true,
 * };
 * ```
 */
export interface ProviderMetadata {
  /** Unique identifier for the provider */
  id: string;

  /** Human-readable name */
  name: string;

  /** Provider implementation version */
  version: string;

  /** Default scopes requested */
  defaultScopes: string[];

  /** Whether PKCE is supported */
  supportsPKCE: boolean;

  /** Whether token refresh is supported */
  supportsRefresh: boolean;
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Metadata stored with OAuth state tokens for context during callback.
 */
export interface OAuthStateMetadata {
  /** User ID initiating the OAuth flow */
  userId?: string;

  /** Tenant ID for multi-tenant applications */
  tenantId?: string;

  /** Custom redirect URL after OAuth completion */
  redirectUrl?: string;

  /** Additional custom metadata */
  [key: string]: unknown;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard success response for API endpoints.
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Standard error response for API endpoints.
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: ErrorCode;
  details?: Record<string, unknown>;
  requiresReauth?: boolean;
}

/**
 * Union type for API responses.
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;
