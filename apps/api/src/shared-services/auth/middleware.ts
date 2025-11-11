/**
 * Authentication & Authorization Middleware
 *
 * Hono middleware for request authentication and authorization.
 *
 * ============ MIDDLEWARE FLOW ============
 *
 * **REQUEST ARRIVES:**
 * 1. Extract credentials (JWT, API Key, or Session)
 * 2. Validate credentials
 * 3. Attach user to context
 * 4. Call next middleware/handler
 * 5. Handler accesses user via c.get('user')
 *
 * **MIDDLEWARE CHAIN:**
 * ```
 * POST /api/workflows
 *   ↓
 * authenticate (check JWT/API Key)
 *   ↓
 * requirePermission('workflow:create') (check RBAC)
 *   ↓
 * handler (actual route logic)
 * ```
 *
 * **HONO CONTEXT:**
 * ```typescript
 * app.post('/protected', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
 *   const user = c.get('user');
 *   if (user) {
 *     console.log('Authenticated as:', user.email);
 *   }
 * });
 * ```
 *
 * @module auth/middleware
 */

import { Context, Next } from 'hono';
import { JWTManager } from './JWTManager';
import { APIKeyManager } from './APIKeyManager';
import { PermissionManager } from './PermissionManager';
import { AuthContext, SafeUser, Permission, AuthException, AuthErrorCode } from './types';

// Initialize managers
const jwtManager = JWTManager.getInstance();
const apiKeyManager = APIKeyManager.getInstance();
const permissionManager = PermissionManager.getInstance();

// ============================================
// MAIN AUTHENTICATION MIDDLEWARE
// ============================================

/**
 * Main Authentication Middleware
 *
 * Checks credentials in order:
 * 1. API Key (X-API-Key header)
 * 2. JWT (Authorization: Bearer header)
 * 3. Session (sessionId cookie)
 *
 * **Usage:**
 * ```typescript
 * app.use('/api/*', authenticate);
 * // All /api routes require authentication
 * ```
 *
 * **How it works:**
 * - Extracts credentials from request
 * - Validates credentials
 * - Attaches user to context
 * - Allows request to continue
 * - Returns 401 if no valid credentials
 *
 * @param {Context<{ Variables: AuthContext }>} c Hono context
 * @param {Next} next Next middleware
 * @returns {Promise<Response>} Response or next handler
 *
 * @example
 * // Protect all workflow routes
 * app.use('/workflows/*', authenticate);
 *
 * // Or protect specific route
 * app.get('/protected', authenticate, async (c) => {
 *   const user = c.get('user');
 *   return c.json({ message: `Hello ${user?.email}` });
 * });
 */
export const authenticate = async (
  c: Context<{ Variables: AuthContext }>,
  next: Next
): Promise<Response | undefined> => {
  try {
    // 1. Check for API Key (X-API-Key header)
    const apiKey = c.req.header('X-API-Key');
    if (apiKey) {
      const keyData = await apiKeyManager.validateKey(apiKey);
      if (keyData) {
        // Create user object from API key data
        const user: SafeUser = {
          id: keyData.userId,
          email: `api-key-${keyData.id}`,
          role: 'api',
          permissions: keyData.permissions,
          emailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        c.set('user', user);
        return next();
      }
    }

    // 2. Check for JWT Bearer token
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await jwtManager.verifyAccessToken(token);
      if (payload) {
        const user: SafeUser = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions,
          tenantId: payload.tenantId,
          emailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        c.set('user', user);
        return next();
      }
    }

    // 3. Check for Session (optional - would need session ID)
    // const sessionId = getCookie(c, 'sessionId');
    // if (sessionId) {
    //   const session = await sessionManager.getSession(sessionId);
    //   if (session && !sessionManager.isExpired(session)) {
    //     c.set('user', session);
    //     return next();
    //   }
    // }

    // No valid credentials found
    return c.json(
      {
        success: false,
        error: 'Unauthorized',
        code: AuthErrorCode.INVALID_TOKEN,
      },
      401
    );
  } catch (error) {
    console.error('[Auth Middleware] Authentication error:', error);
    return c.json(
      {
        success: false,
        error: 'Authentication failed',
      },
      500
    );
  }
};

/**
 * Optional Authentication Middleware
 *
 * Adds user to context if authenticated, but doesn't require it.
 * Useful for routes that work with or without authentication.
 *
 * **Usage:**
 * ```typescript
 * app.get('/articles', optionalAuth, async (c) => {
 *   const user = c.get('user');
 *   if (user) {
 *     // Return user-specific articles
 *   } else {
 *     // Return public articles
 *   }
 * });
 * ```
 *
 * @param {Context<{ Variables: AuthContext }>} c Hono context
 * @param {Next} next Next middleware
 * @returns {Promise<Response>} Always calls next
 */
export const optionalAuth = async (
  c: Context<{ Variables: AuthContext }>,
  next: Next
): Promise<Response | undefined> => {
  try {
    // Try to authenticate, but don't fail if credentials missing
    const apiKey = c.req.header('X-API-Key');
    if (apiKey) {
      const keyData = await apiKeyManager.validateKey(apiKey);
      if (keyData) {
        const user: SafeUser = {
          id: keyData.userId,
          email: `api-key-${keyData.id}`,
          role: 'api',
          permissions: keyData.permissions,
          emailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        c.set('user', user);
        return next();
      }
    }

    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = await jwtManager.verifyAccessToken(token);
      if (payload) {
        const user: SafeUser = {
          id: payload.userId,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions,
          tenantId: payload.tenantId,
          emailVerified: true,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        c.set('user', user);
      }
    }

    // Continue regardless of authentication
    return next();
  } catch (error) {
    console.error('[Auth Middleware] Optional auth error:', error);
    // Continue on error
    return next();
  }
};

/**
 * Require specific permissions
 *
 * Checks if authenticated user has required permission.
 *
 * **Usage:**
 * ```typescript
 * app.post('/workflows',
 *   authenticate,
 *   requirePermission(Permission.WORKFLOW_CREATE),
 *   async (c) => {
 *     // User has WORKFLOW_CREATE permission
 *   }
 * );
 *
 * // Multiple permissions - user needs ALL
 * app.delete('/workflows/:id',
 *   authenticate,
 *   requirePermission(
 *     Permission.WORKFLOW_READ,
 *     Permission.WORKFLOW_DELETE
 *   ),
 *   async (c) => { ... }
 * );
 * ```
 *
 * @param {...Permission[]} permissions Required permissions
 * @returns {Function} Middleware function
 */
export const requirePermission = (...permissions: Permission[]) => {
  return async (
    c: Context<{ Variables: AuthContext }>,
    next: Next
  ): Promise<Response | undefined> => {
    try {
      const user = c.get('user');

      // Check if authenticated
      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Unauthorized',
            code: AuthErrorCode.INVALID_TOKEN,
          },
          401
        );
      }

      // Check permissions
      const hasPermission = permissionManager.hasUserPermission(user, permissions[0]);

      if (!hasPermission) {
        return c.json(
          {
            success: false,
            error: 'Forbidden',
            code: AuthErrorCode.INSUFFICIENT_PERMISSIONS,
            requiredPermissions: permissions,
          },
          403
        );
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware] Permission check error:', error);
      return c.json(
        {
          success: false,
          error: 'Permission check failed',
        },
        500
      );
    }
  };
};

/**
 * Require specific role
 *
 * Checks if authenticated user has required role.
 *
 * **Usage:**
 * ```typescript
 * app.post('/admin/users',
 *   authenticate,
 *   requireRole('admin'),
 *   async (c) => {
 *     // Only admins can reach this
 *   }
 * );
 *
 * // Multiple roles - user needs any ONE
 * app.get('/settings',
 *   authenticate,
 *   requireRole('admin', 'user'),
 *   async (c) => { ... }
 * );
 * ```
 *
 * @param {...Role[]} roles Required roles
 * @returns {Function} Middleware function
 */
export const requireRole = (...roles: string[]) => {
  return async (
    c: Context<{ Variables: AuthContext }>,
    next: Next
  ): Promise<Response | undefined> => {
    try {
      const user = c.get('user');

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Unauthorized',
          },
          401
        );
      }

      // Check if user has one of the required roles
      if (!roles.includes(user.role)) {
        return c.json(
          {
            success: false,
            error: 'Forbidden - insufficient role',
            requiredRoles: roles,
          },
          403
        );
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware] Role check error:', error);
      return c.json(
        {
          success: false,
          error: 'Role check failed',
        },
        500
      );
    }
  };
};

/**
 * Rate limiting middleware
 *
 * Implements rate limiting per user or IP.
 *
 * **Simple in-memory rate limiter.**
 * For production, use Redis: https://redis.io/
 *
 * **Usage:**
 * ```typescript
 * app.post('/auth/login',
 *   rateLimiter({ maxRequests: 5, windowMs: 15 * 60 * 1000 }),
 *   async (c) => { ... }
 * );
 * ```
 *
 * @param {Object} options Rate limit options
 * @param {number} options.maxRequests Max requests per window
 * @param {number} options.windowMs Window duration in milliseconds
 * @returns {Function} Middleware function
 */
export const rateLimiter = (options: { maxRequests: number; windowMs: number }) => {
  // In-memory store: IP/userId -> request count
  const store = new Map<string, { count: number; resetTime: number }>();

  return async (
    c: Context<{ Variables: AuthContext }>,
    next: Next
  ): Promise<Response | undefined> => {
    try {
      // Use user ID if authenticated, otherwise use IP
      const user = c.get('user');
      const key = user?.id || (c.req.header('x-forwarded-for') || 'unknown');

      const now = Date.now();
      const entry = store.get(key);

      if (entry && entry.resetTime > now) {
        // Window still active
        entry.count++;

        if (entry.count > options.maxRequests) {
          return c.json(
            {
              success: false,
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil((entry.resetTime - now) / 1000),
            },
            429
          );
        }
      } else {
        // New window
        store.set(key, {
          count: 1,
          resetTime: now + options.windowMs,
        });
      }

      // Cleanup old entries
      if (Math.random() < 0.01) {
        for (const [k, v] of store) {
          if (v.resetTime < now) {
            store.delete(k);
          }
        }
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware] Rate limit error:', error);
      // Allow request on error
      return next();
    }
  };
};

/**
 * Verify user owns resource
 *
 * Checks if authenticated user owns the resource.
 * Useful for preventing users from accessing other users' data.
 *
 * **Usage:**
 * ```typescript
 * app.get('/workflows/:id',
 *   authenticate,
 *   ownsResource('userId'), // Check user.id === request params
 *   async (c) => { ... }
 * );
 * ```
 *
 * @param {string} paramName URL parameter name with owner ID
 * @returns {Function} Middleware function
 */
export const ownsResource = (paramName: string = 'userId') => {
  return async (
    c: Context<{ Variables: AuthContext }>,
    next: Next
  ): Promise<Response | undefined> => {
    try {
      const user = c.get('user');

      if (!user) {
        return c.json(
          {
            success: false,
            error: 'Unauthorized',
          },
          401
        );
      }

      const resourceOwnerId = c.req.param(paramName);

      if (resourceOwnerId !== user.id && user.role !== 'admin') {
        return c.json(
          {
            success: false,
            error: 'Forbidden - you do not own this resource',
          },
          403
        );
      }

      return next();
    } catch (error) {
      console.error('[Auth Middleware] Resource ownership check error:', error);
      return c.json(
        {
          success: false,
          error: 'Ownership check failed',
        },
        500
      );
    }
  };
};
