/**
 * Integration Type Definitions
 *
 * Type definitions for the Integrations UI feature.
 * These types define the structure for OAuth providers, connections,
 * and API responses used in the frontend.
 *
 * @module integration.types
 */

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * OAuth Provider Metadata
 *
 * Public metadata about an OAuth provider returned from the API.
 * This interface is safe to expose in the frontend - no sensitive data.
 *
 * @example
 * ```typescript
 * const provider: ProviderMetadata = {
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
  /** Unique identifier for the provider (e.g., 'google', 'microsoft') */
  id: string;

  /** Human-readable name of the provider */
  name: string;

  /** Provider implementation version */
  version: string;

  /** Default OAuth scopes requested by this provider */
  defaultScopes: string[];

  /** Whether this provider supports PKCE flow */
  supportsPKCE: boolean;

  /** Whether this provider supports token refresh */
  supportsRefresh: boolean;
}

// =============================================================================
// CONNECTION TYPES
// =============================================================================

/**
 * Connection Summary
 *
 * Summary of an OAuth connection suitable for listing in the UI.
 * Contains all display information but no sensitive token data.
 *
 * @example
 * ```typescript
 * const connection: ConnectionSummary = {
 *   id: 'clg4xyz123...',
 *   name: 'Work Gmail',
 *   provider: 'google',
 *   accountEmail: 'user@gmail.com',
 *   accountName: 'John Doe',
 *   isActive: true,
 *   expiresAt: '2024-01-15T12:00:00Z',
 *   lastUsedAt: '2024-01-14T10:30:00Z',
 *   createdAt: '2024-01-01T00:00:00Z',
 * };
 * ```
 */
export interface ConnectionSummary {
  /** Unique identifier for the connection (CUID2) */
  id: string;

  /** User-defined or auto-generated name for the connection */
  name: string;

  /** The OAuth provider ID (e.g., 'google') */
  provider: string;

  /** Email address of the connected account */
  accountEmail?: string | null;

  /** Display name of the connected account from the provider */
  accountName?: string | null;

  /** Whether the connection is currently active and tokens are valid */
  isActive: boolean;

  /** When the access token expires (ISO 8601 string or null if unknown) */
  expiresAt?: Date | string | null;

  /** When the connection was last used to make an API call */
  lastUsedAt?: Date | string | null;

  /** When the tokens were last refreshed */
  lastRefreshedAt?: Date | string | null;

  /** Last error message if any operation failed */
  lastError?: string | null;

  /** When the last error occurred */
  lastErrorAt?: Date | string | null;

  /** When the connection was created */
  createdAt: Date | string;

  /** When the connection was last updated */
  updatedAt?: Date | string;
}

/**
 * Connection Details
 *
 * Extended connection information for single connection view.
 * Includes additional metadata fields not shown in list view.
 */
export interface ConnectionDetails extends ConnectionSummary {
  /** User ID who created this connection */
  createdBy?: string | null;

  /** Tenant ID for multi-tenant applications */
  tenantId?: string | null;

  /** Space-separated list of granted OAuth scopes */
  scope?: string | null;
}

// =============================================================================
// TEST CONNECTION TYPES
// =============================================================================

/**
 * Test Connection Result
 *
 * Result from testing a connection's validity.
 *
 * @example
 * ```typescript
 * // Valid connection
 * const validResult: TestConnectionResult = { valid: true };
 *
 * // Invalid connection
 * const invalidResult: TestConnectionResult = {
 *   valid: false,
 *   error: 'Refresh token expired or revoked',
 * };
 * ```
 */
export interface TestConnectionResult {
  /** Whether the connection is valid and working */
  valid: boolean;

  /** Error message if the connection test failed */
  error?: string;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Providers Response
 *
 * API response for listing OAuth providers.
 */
export interface ProvidersResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Number of providers returned */
  count: number;

  /** Array of provider metadata */
  providers: ProviderMetadata[];
}

/**
 * Single Provider Response
 *
 * API response for getting a single provider's details.
 */
export interface ProviderResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Provider metadata */
  provider: ProviderMetadata;
}

/**
 * Connections Response
 *
 * API response for listing OAuth connections.
 */
export interface ConnectionsResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Number of connections returned */
  count: number;

  /** Array of connection summaries */
  connections: ConnectionSummary[];
}

/**
 * Single Connection Response
 *
 * API response for getting a single connection's details.
 */
export interface ConnectionResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Connection details */
  connection: ConnectionSummary;
}

/**
 * Test Connection Response
 *
 * API response for testing a connection.
 */
export interface TestConnectionResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Test result */
  result: TestConnectionResult;
}

/**
 * Rename Connection Response
 *
 * API response for renaming a connection.
 */
export interface RenameConnectionResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Updated connection (partial, contains id, name, provider) */
  connection: Pick<ConnectionSummary, 'id' | 'name' | 'provider'>;
}

/**
 * Delete Connection Response
 *
 * API response for deleting a connection.
 */
export interface DeleteConnectionResponse {
  /** Whether the request was successful */
  success: boolean;

  /** Success message */
  message: string;
}

/**
 * OAuth Callback Success Response
 *
 * API response for successful OAuth callback.
 */
export interface OAuthCallbackSuccessResponse {
  /** Whether the request was successful */
  success: true;

  /** Success message */
  message: string;

  /** Created/updated connection details */
  connection: Pick<
    ConnectionSummary,
    'id' | 'name' | 'provider' | 'accountEmail' | 'accountName'
  >;
}

/**
 * OAuth Callback Error Response
 *
 * API response for failed OAuth callback.
 */
export interface OAuthCallbackErrorResponse {
  /** Whether the request was successful */
  success: false;

  /** Error message */
  error: string;

  /** Error code for programmatic handling */
  code?: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Whether re-authentication is required */
  requiresReauth?: boolean;
}

/**
 * OAuth Callback Response
 *
 * Union type for OAuth callback responses.
 */
export type OAuthCallbackResponse =
  | OAuthCallbackSuccessResponse
  | OAuthCallbackErrorResponse;

/**
 * Integration API Error Response
 *
 * Standard error response for integration API endpoints.
 */
export interface IntegrationApiError {
  /** Whether the request was successful (always false) */
  success: false;

  /** Error message */
  error: string;

  /** Error code from backend */
  code?: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Whether re-authentication is required */
  requiresReauth?: boolean;
}

// =============================================================================
// OAUTH FLOW TYPES
// =============================================================================

/**
 * OAuth Initiate Parameters
 *
 * Optional parameters for initiating an OAuth flow.
 */
export interface OAuthInitiateParams {
  /** User ID to associate with the connection */
  userId?: string;

  /** Tenant ID for multi-tenant applications */
  tenantId?: string;

  /** Custom redirect URL after OAuth completion */
  redirect?: string;
}

/**
 * OAuth Callback URL Parameters
 *
 * URL parameters received on the OAuth callback page.
 */
export interface OAuthCallbackParams {
  /** Whether the OAuth flow was successful */
  success?: string;

  /** Error message if OAuth failed */
  error?: string;

  /** Error code from the backend */
  code?: string;

  /** Connected account email (on success) */
  email?: string;

  /** Provider name (on success) */
  provider?: string;

  /** Connection ID (on success) */
  connectionId?: string;
}

// =============================================================================
// CONNECTION STATUS TYPES
// =============================================================================

/**
 * Connection Status
 *
 * Computed status of a connection based on isActive and expiresAt.
 */
export type ConnectionStatusType =
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'needs_reauth';

/**
 * Connection Status Info
 *
 * Full status information including display label and styling variant.
 */
export interface ConnectionStatusInfo {
  /** The status type */
  status: ConnectionStatusType;

  /** Human-readable label for the status */
  label: string;

  /** Badge variant for styling */
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
}

// =============================================================================
// FILTER & QUERY TYPES
// =============================================================================

/**
 * Connections Filter
 *
 * Filter parameters for listing connections.
 */
export interface ConnectionsFilter {
  /** Filter by provider (e.g., 'google') */
  provider?: string;

  /** Filter by user who created the connection */
  createdBy?: string;
}

// =============================================================================
// ERROR CODES
// =============================================================================

/**
 * Integration Error Codes
 *
 * Error codes returned by the integration API.
 * Matches the backend ErrorCodes enum.
 */
export const IntegrationErrorCodes = {
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

/** Type for integration error code values */
export type IntegrationErrorCode =
  (typeof IntegrationErrorCodes)[keyof typeof IntegrationErrorCodes];
