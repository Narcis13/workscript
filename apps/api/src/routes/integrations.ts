/**
 * @fileoverview Integration Routes for OAuth Management
 *
 * This module provides REST API endpoints for managing OAuth integrations.
 * It includes routes for:
 * - Provider discovery and information
 * - OAuth flow initiation and callbacks
 * - Connection management (list, get, rename, delete, test)
 * - Token retrieval and refresh
 *
 * @module routes/integrations
 * @version 1.0.0
 *
 * @example
 * Base path: /integrations
 *
 * Provider routes:
 * - GET /oauth/providers - List all available providers
 * - GET /oauth/:provider - Get provider details
 * - GET /oauth/:provider/auth - Start OAuth flow
 * - GET /oauth/:provider/callback - OAuth callback handler
 * - POST /oauth/:provider/:id/refresh - Manual token refresh
 *
 * Connection routes:
 * - GET /connections - List all connections
 * - GET /connections/:id - Get connection details
 * - POST /connections/:id/rename - Rename a connection
 * - DELETE /connections/:id - Delete a connection
 * - POST /connections/:id/test - Test connection validity
 * - GET /connections/:id/token - Get a valid access token
 */

import { Hono } from 'hono';
import { IntegrationManager } from '../shared-services/integrations/IntegrationManager';
import { TokenManager } from '../shared-services/integrations/TokenManager';
import {
  ProviderRegistry,
  IntegrationError,
  ErrorCodes,
} from '../shared-services/integrations/providers';

// =============================================================================
// ROUTER INITIALIZATION
// =============================================================================

/**
 * Hono router for integration endpoints.
 */
const integrationsRouter = new Hono();

// =============================================================================
// PROVIDER DISCOVERY ROUTES
// =============================================================================

/**
 * GET /oauth/providers
 *
 * List all available OAuth providers.
 *
 * @returns {Object} List of registered providers
 * @returns {boolean} success - Always true on success
 * @returns {number} count - Number of registered providers
 * @returns {Array} providers - Array of provider metadata
 *
 * @example Response:
 * {
 *   "success": true,
 *   "count": 1,
 *   "providers": [
 *     {
 *       "id": "google",
 *       "name": "Google",
 *       "version": "1.0.0",
 *       "defaultScopes": ["email", "profile", "gmail.readonly"],
 *       "supportsPKCE": true,
 *       "supportsRefresh": true
 *     }
 *   ]
 * }
 */
integrationsRouter.get('/oauth/providers', async (c) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getAll().map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    defaultScopes: p.defaultScopes,
    supportsPKCE: p.supportsPKCE,
    supportsRefresh: p.supportsRefresh,
  }));

  return c.json({
    success: true,
    count: providers.length,
    providers,
  });
});

/**
 * GET /oauth/:provider
 *
 * Get details for a specific OAuth provider.
 *
 * @param {string} provider - The provider ID (e.g., 'google')
 *
 * @returns {Object} Provider details
 * @returns {boolean} success - True if provider found
 * @returns {Object} provider - Provider metadata
 *
 * @example Response (success):
 * {
 *   "success": true,
 *   "provider": {
 *     "id": "google",
 *     "name": "Google",
 *     "version": "1.0.0",
 *     "defaultScopes": ["email", "profile"],
 *     "supportsPKCE": true,
 *     "supportsRefresh": true
 *   }
 * }
 *
 * @example Response (not found):
 * { "success": false, "error": "Provider not found" }
 */
integrationsRouter.get('/oauth/:provider', async (c) => {
  const providerId = c.req.param('provider');
  const registry = ProviderRegistry.getInstance();
  const provider = registry.get(providerId);

  if (!provider) {
    return c.json({ success: false, error: 'Provider not found' }, 404);
  }

  return c.json({
    success: true,
    provider: {
      id: provider.id,
      name: provider.name,
      version: provider.version,
      defaultScopes: provider.defaultScopes,
      supportsPKCE: provider.supportsPKCE,
      supportsRefresh: provider.supportsRefresh,
    },
  });
});

// =============================================================================
// OAUTH FLOW ROUTES
// =============================================================================

/**
 * GET /oauth/:provider/auth
 *
 * Initiate an OAuth flow by redirecting the user to the provider's
 * authorization page.
 *
 * @param {string} provider - The provider ID (e.g., 'google')
 * @query {string} [userId] - User ID to associate with the connection
 * @query {string} [tenantId] - Tenant ID for multi-tenant applications
 * @query {string} [redirect] - Custom redirect URL after OAuth completion
 *
 * @returns Redirect to OAuth provider authorization page
 *
 * @example Request:
 * GET /integrations/oauth/google/auth?userId=user_123&tenantId=tenant_456
 *
 * @example Error Response:
 * { "success": false, "error": "Provider 'xyz' not found", "code": "PROVIDER_NOT_FOUND" }
 */
integrationsRouter.get('/oauth/:provider/auth', async (c) => {
  const providerId = c.req.param('provider');
  // Extract optional query parameters
  const userId = c.req.query('userId');
  const tenantId = c.req.query('tenantId');
  const redirect = c.req.query('redirect');

  try {
    const manager = IntegrationManager.getInstance();
    const { authUrl } = await manager.initiateOAuth(providerId, {
      userId,
      tenantId,
      redirectUrl: redirect,
    });

    // Redirect user to OAuth provider
    return c.redirect(authUrl);
  } catch (error) {
    if (error instanceof IntegrationError) {
      return c.json(
        { success: false, error: error.message, code: error.code },
        400
      );
    }
    throw error;
  }
});

/**
 * GET /oauth/:provider/callback
 *
 * Handle the OAuth callback from the provider after user authorization.
 *
 * This endpoint:
 * 1. Validates the state parameter for CSRF protection
 * 2. Exchanges the authorization code for tokens
 * 3. Fetches the user's profile
 * 4. Creates or updates the connection
 *
 * @param {string} provider - The provider ID (e.g., 'google')
 * @query {string} code - The authorization code from the provider
 * @query {string} state - The state token for CSRF validation
 * @query {string} [error] - Error code if authorization was denied
 * @query {string} [error_description] - Human-readable error description
 *
 * @returns {Object} Connection details on success
 *
 * @example Success Response:
 * {
 *   "success": true,
 *   "message": "Connection established successfully",
 *   "connection": {
 *     "id": "clg4xyz123...",
 *     "name": "Google - user@gmail.com",
 *     "provider": "google",
 *     "accountEmail": "user@gmail.com",
 *     "accountName": "John Doe"
 *   }
 * }
 *
 * @example Error Response:
 * {
 *   "success": false,
 *   "error": "Invalid or expired state",
 *   "code": "INVALID_STATE"
 * }
 */
integrationsRouter.get('/oauth/:provider/callback', async (c) => {
  const providerId = c.req.param('provider');
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  // Check if provider returned an error
  if (error) {
    return c.json(
      {
        success: false,
        error: `OAuth error: ${error}`,
        description: c.req.query('error_description'),
      },
      400
    );
  }

  // Validate required parameters
  if (!code || !state) {
    return c.json(
      {
        success: false,
        error: 'Missing code or state parameter',
      },
      400
    );
  }

  try {
    const manager = IntegrationManager.getInstance();
    const connection = await manager.handleCallback(providerId, code, state);

    // Return success with connection details (without tokens)
    return c.json({
      success: true,
      message: 'Connection established successfully',
      connection: {
        id: connection.id,
        name: connection.name,
        provider: connection.provider,
        accountEmail: connection.accountEmail,
        accountName: connection.accountName,
      },
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        400
      );
    }
    throw error;
  }
});

/**
 * POST /oauth/:provider/:id/refresh
 *
 * Manually trigger a token refresh for a connection.
 *
 * @param {string} provider - The provider ID (e.g., 'google')
 * @param {string} id - The connection ID to refresh
 *
 * @returns {Object} Refresh result with new expiration time
 *
 * @example Success Response:
 * {
 *   "success": true,
 *   "message": "Token refreshed successfully",
 *   "expiresAt": "2024-01-15T12:00:00Z"
 * }
 *
 * @example Error Response:
 * {
 *   "success": false,
 *   "error": "Refresh token expired or revoked",
 *   "code": "REFRESH_TOKEN_EXPIRED",
 *   "requiresReauth": true
 * }
 */
integrationsRouter.post('/oauth/:provider/:id/refresh', async (c) => {
  const id = c.req.param('id');

  try {
    const tokenManager = TokenManager.getInstance();
    const newTokens = await tokenManager.refreshToken(id);

    return c.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: newTokens.expiresAt,
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          requiresReauth: error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED,
        },
        400
      );
    }
    throw error;
  }
});

// =============================================================================
// CONNECTION MANAGEMENT ROUTES
// =============================================================================

/**
 * GET /connections
 *
 * List all OAuth connections.
 *
 * @query {string} [provider] - Filter by provider (e.g., 'google')
 * @query {string} [createdBy] - Filter by user ID who created the connection
 *
 * @returns {Object} List of connections (without tokens)
 *
 * @example Request:
 * GET /integrations/connections?provider=google
 *
 * @example Response:
 * {
 *   "success": true,
 *   "count": 2,
 *   "connections": [
 *     {
 *       "id": "clg4xyz123...",
 *       "name": "Google - user@gmail.com",
 *       "provider": "google",
 *       "accountEmail": "user@gmail.com",
 *       "isActive": true,
 *       "expiresAt": "2024-01-15T12:00:00Z",
 *       "lastUsedAt": "2024-01-14T10:30:00Z",
 *       "createdAt": "2024-01-01T00:00:00Z"
 *     }
 *   ]
 * }
 */
integrationsRouter.get('/connections', async (c) => {
  const provider = c.req.query('provider');
  const createdBy = c.req.query('createdBy');

  const manager = IntegrationManager.getInstance();
  const connections = await manager.getConnections({
    provider: provider || undefined,
    createdBy: createdBy || undefined,
  });

  return c.json({
    success: true,
    count: connections.length,
    connections,
  });
});

/**
 * GET /connections/:id
 *
 * Get details for a specific connection.
 *
 * @param {string} id - The connection ID
 *
 * @returns {Object} Connection details (without tokens)
 *
 * @example Success Response:
 * {
 *   "success": true,
 *   "connection": {
 *     "id": "clg4xyz123...",
 *     "name": "Google - user@gmail.com",
 *     "provider": "google",
 *     "accountEmail": "user@gmail.com",
 *     "accountName": "John Doe",
 *     "isActive": true,
 *     "expiresAt": "2024-01-15T12:00:00Z",
 *     "lastUsedAt": "2024-01-14T10:30:00Z",
 *     "lastRefreshedAt": "2024-01-14T00:00:00Z",
 *     "lastError": null,
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-01-14T00:00:00Z"
 *   }
 * }
 *
 * @example Error Response:
 * { "success": false, "error": "Connection not found" }
 */
integrationsRouter.get('/connections/:id', async (c) => {
  const id = c.req.param('id');
  const manager = IntegrationManager.getInstance();
  const connection = await manager.getConnectionDetails(id);

  if (!connection) {
    return c.json({ success: false, error: 'Connection not found' }, 404);
  }

  return c.json({
    success: true,
    connection,
  });
});

/**
 * POST /connections/:id/rename
 *
 * Rename a connection.
 *
 * @param {string} id - The connection ID
 * @body {string} name - The new name for the connection
 *
 * @returns {Object} Updated connection information
 *
 * @example Request Body:
 * { "name": "Personal Gmail" }
 *
 * @example Success Response:
 * {
 *   "success": true,
 *   "connection": {
 *     "id": "clg4xyz123...",
 *     "name": "Personal Gmail",
 *     "provider": "google"
 *   }
 * }
 *
 * @example Error Response:
 * { "success": false, "error": "Name is required" }
 */
integrationsRouter.post('/connections/:id/rename', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const { name } = body;

  if (!name || typeof name !== 'string') {
    return c.json({ success: false, error: 'Name is required' }, 400);
  }

  const manager = IntegrationManager.getInstance();
  const connection = await manager.renameConnection(id, name);

  if (!connection) {
    return c.json({ success: false, error: 'Connection not found' }, 404);
  }

  return c.json({
    success: true,
    connection: {
      id: connection.id,
      name: connection.name,
      provider: connection.provider,
    },
  });
});

/**
 * DELETE /connections/:id
 *
 * Delete a connection and its tokens.
 *
 * @param {string} id - The connection ID to delete
 *
 * @returns {Object} Deletion confirmation
 *
 * @example Success Response:
 * { "success": true, "message": "Connection deleted" }
 *
 * @example Error Response:
 * { "success": false, "error": "Connection not found" }
 */
integrationsRouter.delete('/connections/:id', async (c) => {
  const id = c.req.param('id');
  const manager = IntegrationManager.getInstance();
  const deleted = await manager.deleteConnection(id);

  if (!deleted) {
    return c.json({ success: false, error: 'Connection not found' }, 404);
  }

  return c.json({ success: true, message: 'Connection deleted' });
});

/**
 * POST /connections/:id/test
 *
 * Test if a connection is still valid and working.
 *
 * This endpoint attempts to get a valid token and verify it by fetching
 * the user's profile from the provider.
 *
 * @param {string} id - The connection ID to test
 *
 * @returns {Object} Test result
 *
 * @example Success Response:
 * { "success": true, "result": { "valid": true } }
 *
 * @example Failure Response:
 * {
 *   "success": true,
 *   "result": {
 *     "valid": false,
 *     "error": "Refresh token expired or revoked"
 *   }
 * }
 */
integrationsRouter.post('/connections/:id/test', async (c) => {
  const id = c.req.param('id');
  const manager = IntegrationManager.getInstance();
  const result = await manager.testConnection(id);

  return c.json({
    success: true,
    result,
  });
});

/**
 * GET /connections/:id/token
 *
 * Get a valid access token for a connection.
 *
 * This endpoint automatically refreshes the token if it's expired or
 * about to expire (within 60 seconds).
 *
 * **Security Note:** This endpoint should be protected and only accessible
 * to authorized services. The returned token can be used for API calls.
 *
 * @param {string} id - The connection ID
 *
 * @returns {Object} The access token
 *
 * @example Success Response:
 * {
 *   "success": true,
 *   "token": "ya29.a0AfB_byC..."
 * }
 *
 * @example Error Response (connection not found):
 * { "success": false, "error": "Connection not found", "code": "CONNECTION_NOT_FOUND" }
 *
 * @example Error Response (requires re-auth):
 * {
 *   "success": false,
 *   "error": "Connection is inactive. Re-authentication required.",
 *   "code": "REFRESH_TOKEN_EXPIRED",
 *   "requiresReauth": true
 * }
 */
integrationsRouter.get('/connections/:id/token', async (c) => {
  const id = c.req.param('id');

  try {
    const manager = IntegrationManager.getInstance();
    const token = await manager.getValidToken(id);

    return c.json({
      success: true,
      token,
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      const status = error.code === ErrorCodes.CONNECTION_NOT_FOUND ? 404 : 400;
      return c.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          requiresReauth: error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED,
        },
        status
      );
    }
    throw error;
  }
});

// =============================================================================
// EXPORT
// =============================================================================

export default integrationsRouter;
