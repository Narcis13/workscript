/**
 * API Keys Management Routes
 *
 * REST API endpoints for managing API keys.
 *
 * **Endpoints:**
 * GET    /api/keys            - List user's API keys
 * POST   /api/keys            - Create new API key
 * GET    /api/keys/:id        - Get API key details
 * PUT    /api/keys/:id        - Update API key
 * DELETE /api/keys/:id        - Revoke API key
 *
 * **Authorization:**
 * All endpoints require authentication.
 * Users can only manage their own keys (admins can manage any).
 *
 * @module routes/apikeys
 */

import { Hono } from 'hono';
import { Context } from 'hono';
import { APIKeyManager } from '../shared-services/auth/APIKeyManager';
import { authenticate, requirePermission, ownsResource } from '../shared-services/auth/middleware';
import { AuthContext, Permission, CreateApiKeyRequest } from '../shared-services/auth/types';

// Initialize API key manager
const apiKeyManager = APIKeyManager.getInstance();

// Create routes
const apiKeyRoutes = new Hono<{ Variables: AuthContext }>();

/**
 * GET /api/keys
 *
 * List all API keys for the authenticated user.
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "key_123",
 *       "name": "Production API",
 *       "permissions": ["workflow:read", "workflow:execute"],
 *       "rateLimit": 1000,
 *       "lastUsedAt": "2024-01-01T00:00:00Z",
 *       "expiresAt": null,
 *       "createdAt": "2024-01-01T00:00:00Z"
 *     },
 *     { ... }
 *   ]
 * }
 * ```
 *
 * **Security:**
 * - Actual API key is NEVER returned (only on creation)
 * - Only shows metadata (ID, name, last used, etc.)
 * - Users see only their own keys (admins see all)
 *
 * @route GET /api/keys
 */
apiKeyRoutes.get(
  '/',
  authenticate,
  async (c: Context<{ Variables: AuthContext }>) => {
    try {
      const user = c.get('user');

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Not authenticated',
          },
          401
        );
      }

      // Get user's API keys
      const keys = await apiKeyManager.getKeysForUser(user.id);

      return c.json(
        {
          success: true,
          data: keys,
        },
        200
      );
    } catch (error) {
      console.error('[API Keys Routes] List error:', error);

      return c.json(
        {
          success: false,
          error: 'Failed to list API keys',
        },
        500
      );
    }
  }
);

/**
 * POST /api/keys
 *
 * Create a new API key.
 *
 * **Request:**
 * ```json
 * {
 *   "name": "Mobile App Integration",
 *   "permissions": ["workflow:read", "workflow:execute"],
 *   "rateLimit": 500,
 *   "expiresAt": "2025-12-31T23:59:59Z"
 * }
 * ```
 *
 * **Response (201):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "key_456",
 *     "name": "Mobile App Integration",
 *     "key": "wks_live_a7f3b2c9e1d4f5a8b2c7e1f4a8b2c7e1",
 *     "permissions": ["workflow:read", "workflow:execute"],
 *     "rateLimit": 500,
 *     "expiresAt": "2025-12-31T23:59:59Z",
 *     "createdAt": "2024-01-01T00:00:00Z"
 *   }
 * }
 * ```
 *
 * **Important:**
 * - `key` field is ONLY returned on creation
 * - User must save key immediately - can't retrieve later
 * - If lost, user must delete and create new key
 *
 * **Parameters:**
 * - `name` (required): Human-readable name for the key
 * - `permissions` (optional): Array of permissions (defaults to user's read/execute)
 * - `rateLimit` (optional): Requests per hour (defaults to 1000)
 * - `expiresAt` (optional): When key expires (no expiry if omitted)
 *
 * **Errors:**
 * - 400: Invalid request data
 * - 401: Not authenticated
 * - 500: Creation failed
 *
 * @route POST /api/keys
 */
apiKeyRoutes.post(
  '/',
  authenticate,
  async (c: Context<{ Variables: AuthContext }>) => {
    try {
      const user = c.get('user');

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Not authenticated',
          },
          401
        );
      }

      const body = await c.req.json();

      if (!body.name) {
        return c.json(
          {
            success: false,
            error: 'API key name is required',
          },
          400
        );
      }

      // Create API key
      const request: CreateApiKeyRequest = {
        name: body.name,
        permissions: body.permissions,
        rateLimit: body.rateLimit,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      };

      const result = await apiKeyManager.createKey(user.id, request);

      return c.json(
        {
          success: true,
          data: result,
          warning: 'Save your API key immediately. You will not be able to see it again!',
        },
        201
      );
    } catch (error: any) {
      console.error('[API Keys Routes] Creation error:', error);

      return c.json(
        {
          success: false,
          error: error.message || 'Failed to create API key',
          code: error.code,
        },
        error.statusCode || 500
      );
    }
  }
);

/**
 * DELETE /api/keys/:id
 *
 * Revoke (delete) an API key.
 *
 * Once deleted, the key can no longer be used for authentication.
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "API key revoked successfully"
 * }
 * ```
 *
 * **Errors:**
 * - 401: Not authenticated
 * - 403: Key doesn't belong to user
 * - 404: Key not found
 * - 500: Revocation failed
 *
 * **URL Parameters:**
 * - `id`: API key ID (from GET /api/keys response)
 *
 * @route DELETE /api/keys/:id
 */
apiKeyRoutes.delete(
  '/:id',
  authenticate,
  async (c: Context<{ Variables: AuthContext }>) => {
    try {
      const user = c.get('user');

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Not authenticated',
          },
          401
        );
      }

      const keyId = c.req.param('id');

      if (!keyId) {
        return c.json(
          {
            success: false,
            error: 'Key ID is required',
          },
          400
        );
      }

      // Revoke key
      const success = await apiKeyManager.revokeKey(keyId, user.id);

      if (!success) {
        return c.json(
          {
            success: false,
            error: 'Key not found or unauthorized',
          },
          404
        );
      }

      return c.json(
        {
          success: true,
          message: 'API key revoked successfully',
        },
        200
      );
    } catch (error: any) {
      console.error('[API Keys Routes] Revocation error:', error);

      return c.json(
        {
          success: false,
          error: error.message || 'Failed to revoke API key',
        },
        error.statusCode || 500
      );
    }
  }
);

/**
 * PUT /api/keys/:id
 *
 * Update API key settings (name, permissions, rate limit).
 *
 * **Note:** Cannot change the key value itself.
 * To rotate keys, delete and create new one.
 *
 * **Request:**
 * ```json
 * {
 *   "name": "New name",
 *   "permissions": ["workflow:read"],
 *   "rateLimit": 2000
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "API key updated successfully"
 * }
 * ```
 *
 * @route PUT /api/keys/:id
 */
apiKeyRoutes.put(
  '/:id',
  authenticate,
  async (c: Context<{ Variables: AuthContext }>) => {
    try {
      const user = c.get('user');

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Not authenticated',
          },
          401
        );
      }

      const keyId = c.req.param('id');
      const body = await c.req.json();

      // Extract updateable fields from request body
      const updates: {
        name?: string;
        permissions?: Permission[];
        rateLimit?: number;
        expiresAt?: Date | null;
      } = {};

      if (body.name !== undefined) {
        updates.name = body.name;
      }

      if (body.permissions !== undefined) {
        updates.permissions = body.permissions;
      }

      if (body.rateLimit !== undefined) {
        updates.rateLimit = body.rateLimit;
      }

      if (body.expiresAt !== undefined) {
        updates.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
      }

      // Validate that at least one field is being updated
      if (Object.keys(updates).length === 0) {
        return c.json(
          {
            success: false,
            error: 'No fields provided for update',
          },
          400
        );
      }

      // Update the API key
      const updatedKey = await apiKeyManager.updateKey(keyId, user.userId, updates);

      if (!updatedKey) {
        return c.json(
          {
            success: false,
            error: 'API key not found',
          },
          404
        );
      }

      // Return updated key data (without revealing the actual key)
      return c.json(
        {
          success: true,
          message: 'API key updated successfully',
          data: {
            id: updatedKey.id,
            userId: updatedKey.userId,
            name: updatedKey.name,
            permissions: updatedKey.permissions,
            rateLimit: updatedKey.rateLimit,
            lastUsedAt: updatedKey.lastUsedAt,
            expiresAt: updatedKey.expiresAt,
            createdAt: updatedKey.createdAt,
          },
        },
        200
      );
    } catch (error: any) {
      console.error('[API Keys Routes] Update error:', error);

      return c.json(
        {
          success: false,
          error: error.message || 'Failed to update API key',
        },
        error.statusCode || 500
      );
    }
  }
);

export default apiKeyRoutes;
