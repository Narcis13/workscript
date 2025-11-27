/**
 * Integrations API Service
 *
 * Provides functions for interacting with OAuth integration-related API endpoints.
 * All functions use the configured Axios client with automatic authentication.
 *
 * Features:
 * - Provider discovery and listing
 * - Connection CRUD operations
 * - Connection testing and validation
 * - OAuth flow URL generation
 * - Error handling with typed responses
 *
 * Requirements Coverage:
 * - Requirement 16: API Service Layer
 *
 * @module services/api/integrations.api
 */

import { apiClient } from './client';
import { config } from '../../lib/config';
import type {
  ProviderMetadata,
  ConnectionSummary,
  ConnectionDetails,
  TestConnectionResult,
  ProvidersResponse,
  ConnectionsResponse,
  ConnectionResponse,
  TestConnectionResponse,
  RenameConnectionResponse,
  DeleteConnectionResponse,
  OAuthInitiateParams,
  ConnectionsFilter,
} from '../../types/integration.types';

// ============================================
// CONSTANTS
// ============================================

/**
 * Base path for integration API endpoints
 */
const INTEGRATIONS_BASE_PATH = '/integrations';

/**
 * OAuth-related paths
 */
const OAUTH_PATH = `${INTEGRATIONS_BASE_PATH}/oauth`;

/**
 * Connections-related paths
 */
const CONNECTIONS_PATH = `${INTEGRATIONS_BASE_PATH}/connections`;

// ============================================
// PROVIDER API FUNCTIONS
// ============================================

/**
 * Fetch all available OAuth providers
 *
 * @returns Promise resolving to array of provider metadata
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * const providers = await fetchProviders();
 * // [{ id: 'google', name: 'Google', ... }, ...]
 * ```
 */
export async function fetchProviders(): Promise<ProviderMetadata[]> {
  const response = await apiClient.get<ProvidersResponse>(
    `${OAUTH_PATH}/providers`
  );

  // API returns { success: true, count: number, providers: ProviderMetadata[] }
  return response.data.providers || [];
}

/**
 * Fetch a single provider by ID
 *
 * @param providerId - Provider ID (e.g., 'google')
 * @returns Promise resolving to provider metadata
 * @throws Error if provider not found or request fails
 *
 * @example
 * ```typescript
 * const google = await fetchProvider('google');
 * // { id: 'google', name: 'Google', ... }
 * ```
 */
export async function fetchProvider(
  providerId: string
): Promise<ProviderMetadata> {
  const response = await apiClient.get<{
    success: boolean;
    provider: ProviderMetadata;
  }>(`${OAUTH_PATH}/${providerId}`);

  return response.data.provider;
}

// ============================================
// CONNECTION API FUNCTIONS
// ============================================

/**
 * Fetch all OAuth connections
 *
 * @param filter - Optional filter parameters
 * @returns Promise resolving to array of connection summaries
 * @throws Error if request fails
 *
 * @example
 * ```typescript
 * // Fetch all connections
 * const allConnections = await fetchConnections();
 *
 * // Fetch only Google connections
 * const googleConnections = await fetchConnections({ provider: 'google' });
 * ```
 */
export async function fetchConnections(
  filter?: ConnectionsFilter
): Promise<ConnectionSummary[]> {
  const params: Record<string, string> = {};

  if (filter?.provider) {
    params.provider = filter.provider;
  }
  if (filter?.createdBy) {
    params.createdBy = filter.createdBy;
  }

  const response = await apiClient.get<ConnectionsResponse>(CONNECTIONS_PATH, {
    params: Object.keys(params).length > 0 ? params : undefined,
  });

  // API returns { success: true, count: number, connections: ConnectionSummary[] }
  return response.data.connections || [];
}

/**
 * Fetch a single connection by ID
 *
 * @param id - Connection ID (CUID2)
 * @returns Promise resolving to connection details
 * @throws Error if connection not found or request fails
 *
 * @example
 * ```typescript
 * const connection = await fetchConnection('clg4xyz123...');
 * ```
 */
export async function fetchConnection(id: string): Promise<ConnectionDetails> {
  const response = await apiClient.get<ConnectionResponse>(
    `${CONNECTIONS_PATH}/${id}`
  );

  // API returns { success: true, connection: ConnectionSummary }
  return response.data.connection as ConnectionDetails;
}

/**
 * Rename a connection
 *
 * @param id - Connection ID (CUID2)
 * @param name - New name for the connection
 * @returns Promise resolving to updated connection info
 * @throws Error if connection not found or request fails
 *
 * @example
 * ```typescript
 * const updated = await renameConnection('clg4xyz123...', 'Personal Gmail');
 * // { id: 'clg4xyz123...', name: 'Personal Gmail', provider: 'google' }
 * ```
 */
export async function renameConnection(
  id: string,
  name: string
): Promise<Pick<ConnectionSummary, 'id' | 'name' | 'provider'>> {
  const response = await apiClient.post<RenameConnectionResponse>(
    `${CONNECTIONS_PATH}/${id}/rename`,
    { name }
  );

  // API returns { success: true, connection: { id, name, provider } }
  return response.data.connection;
}

/**
 * Delete a connection
 *
 * @param id - Connection ID (CUID2)
 * @returns Promise resolving when deletion completes
 * @throws Error if connection not found or request fails
 *
 * @example
 * ```typescript
 * await deleteConnection('clg4xyz123...');
 * ```
 */
export async function deleteConnection(id: string): Promise<void> {
  await apiClient.delete<DeleteConnectionResponse>(`${CONNECTIONS_PATH}/${id}`);
}

/**
 * Test if a connection is still valid
 *
 * Tests the connection by attempting to use the OAuth tokens.
 * This will refresh tokens if needed.
 *
 * @param id - Connection ID (CUID2)
 * @returns Promise resolving to test result
 * @throws Error if connection not found or request fails
 *
 * @example
 * ```typescript
 * const result = await testConnection('clg4xyz123...');
 * if (result.valid) {
 *   console.log('Connection is working!');
 * } else {
 *   console.error('Connection failed:', result.error);
 * }
 * ```
 */
export async function testConnection(
  id: string
): Promise<TestConnectionResult> {
  const response = await apiClient.post<TestConnectionResponse>(
    `${CONNECTIONS_PATH}/${id}/test`
  );

  // API returns { success: true, result: { valid: boolean, error?: string } }
  return response.data.result;
}

/**
 * Get the valid access token for a connection
 *
 * This endpoint refreshes the token if needed and returns a valid access token.
 *
 * @param id - Connection ID (CUID2)
 * @returns Promise resolving to access token string
 * @throws Error if connection not found, requires reauth, or request fails
 *
 * @example
 * ```typescript
 * const token = await getConnectionToken('clg4xyz123...');
 * // Use token for API calls
 * ```
 */
export async function getConnectionToken(id: string): Promise<string> {
  const response = await apiClient.get<{ success: boolean; token: string }>(
    `${CONNECTIONS_PATH}/${id}/token`
  );

  return response.data.token;
}

/**
 * Manually trigger a token refresh for a connection
 *
 * @param providerId - Provider ID (e.g., 'google')
 * @param connectionId - Connection ID (CUID2)
 * @returns Promise resolving to new expiration time
 * @throws Error if refresh fails or connection not found
 *
 * @example
 * ```typescript
 * const result = await refreshConnectionToken('google', 'clg4xyz123...');
 * console.log('Token expires at:', result.expiresAt);
 * ```
 */
export async function refreshConnectionToken(
  providerId: string,
  connectionId: string
): Promise<{ expiresAt: string | null }> {
  const response = await apiClient.post<{
    success: boolean;
    message: string;
    expiresAt: string | null;
  }>(`${OAUTH_PATH}/${providerId}/${connectionId}/refresh`);

  return { expiresAt: response.data.expiresAt };
}

// ============================================
// OAUTH FLOW FUNCTIONS
// ============================================

/**
 * Get OAuth authorization URL
 *
 * Constructs the URL to initiate the OAuth flow for a provider.
 * The URL redirects the user to the provider's authorization page.
 *
 * @param providerId - Provider ID (e.g., 'google')
 * @param params - Optional parameters for the OAuth flow
 * @returns The complete OAuth authorization URL
 *
 * @example
 * ```typescript
 * // Basic usage - redirects back to default callback
 * const url = getOAuthAuthUrl('google');
 *
 * // With custom redirect after OAuth completion
 * const url = getOAuthAuthUrl('google', {
 *   userId: 'user_123',
 *   tenantId: 'tenant_456',
 *   redirect: '/integrations?success=true'
 * });
 *
 * // Navigate to start OAuth flow
 * window.location.href = url;
 * ```
 */
export function getOAuthAuthUrl(
  providerId: string,
  params?: OAuthInitiateParams
): string {
  const baseUrl = `${config.apiUrl}${OAUTH_PATH}/${providerId}/auth`;

  // If no params, return base URL
  if (!params) {
    return baseUrl;
  }

  // Build query string from params
  const queryParams = new URLSearchParams();

  if (params.userId) {
    queryParams.set('userId', params.userId);
  }
  if (params.tenantId) {
    queryParams.set('tenantId', params.tenantId);
  }
  if (params.redirect) {
    queryParams.set('redirect', params.redirect);
  }

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Initiate OAuth flow by redirecting to the provider
 *
 * Convenience function that builds the OAuth URL and redirects.
 *
 * @param providerId - Provider ID (e.g., 'google')
 * @param params - Optional parameters for the OAuth flow
 *
 * @example
 * ```typescript
 * // Start OAuth flow for Google
 * initiateOAuthFlow('google');
 * ```
 */
export function initiateOAuthFlow(
  providerId: string,
  params?: OAuthInitiateParams
): void {
  const url = getOAuthAuthUrl(providerId, params);
  window.location.href = url;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if a connection needs re-authentication
 *
 * Based on connection status and error state.
 *
 * @param connection - Connection to check
 * @returns true if re-authentication is required
 *
 * @example
 * ```typescript
 * if (connectionNeedsReauth(connection)) {
 *   // Show re-authentication prompt
 * }
 * ```
 */
export function connectionNeedsReauth(connection: ConnectionSummary): boolean {
  // Inactive connections need reauth
  if (!connection.isActive) {
    return true;
  }

  // Check for specific error messages that indicate reauth is needed
  if (connection.lastError) {
    const errorLower = connection.lastError.toLowerCase();
    return (
      errorLower.includes('refresh token expired') ||
      errorLower.includes('token revoked') ||
      errorLower.includes('invalid_grant') ||
      errorLower.includes('re-authentication required')
    );
  }

  return false;
}

/**
 * Check if a connection's token is expired or expiring soon
 *
 * @param connection - Connection to check
 * @param thresholdMinutes - Minutes before expiry to consider "expiring soon" (default: 5)
 * @returns 'valid' | 'expiring_soon' | 'expired' | 'unknown'
 *
 * @example
 * ```typescript
 * const status = getConnectionTokenStatus(connection);
 * if (status === 'expired') {
 *   // Token needs refresh
 * }
 * ```
 */
export function getConnectionTokenStatus(
  connection: ConnectionSummary,
  thresholdMinutes: number = 5
): 'valid' | 'expiring_soon' | 'expired' | 'unknown' {
  if (!connection.expiresAt) {
    return 'unknown';
  }

  const expiresAt = new Date(connection.expiresAt).getTime();
  const now = Date.now();
  const thresholdMs = thresholdMinutes * 60 * 1000;

  if (now >= expiresAt) {
    return 'expired';
  }

  if (expiresAt - now < thresholdMs) {
    return 'expiring_soon';
  }

  return 'valid';
}

/**
 * Format connection display name
 *
 * Returns a user-friendly display name for a connection.
 *
 * @param connection - Connection to format
 * @returns Formatted display name
 *
 * @example
 * ```typescript
 * const displayName = formatConnectionName(connection);
 * // "Work Gmail (john@example.com)" or "Google Connection"
 * ```
 */
export function formatConnectionName(connection: ConnectionSummary): string {
  if (connection.name) {
    if (connection.accountEmail && !connection.name.includes(connection.accountEmail)) {
      return `${connection.name} (${connection.accountEmail})`;
    }
    return connection.name;
  }

  if (connection.accountEmail) {
    return connection.accountEmail;
  }

  return `${connection.provider} Connection`;
}
