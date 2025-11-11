/**
 * Authentication Routes
 *
 * REST API endpoints for user authentication and account management.
 *
 * **Endpoints:**
 * POST   /auth/register        - User registration
 * POST   /auth/login          - User login
 * POST   /auth/refresh        - Refresh access token
 * POST   /auth/logout         - Logout (invalidate refresh token)
 * POST   /auth/change-password - Change password
 * GET    /auth/me             - Get current user info
 *
 * @module routes/auth
 */

import { Hono } from 'hono';
import { Context } from 'hono';
import { AuthManager } from '../shared-services/auth/AuthManager';
import { authenticate } from '../shared-services/auth/middleware';
import { AuthContext, RegisterRequest, LoginRequest } from '../shared-services/auth/types';

// Initialize auth manager
const authManager = AuthManager.getInstance();

// Create auth router
const authRoutes = new Hono<{ Variables: AuthContext }>();

/**
 * POST /auth/register
 *
 * Register a new user account.
 *
 * **Request:**
 * ```json
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123"
 * }
 * ```
 *
 * **Response (201):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "user": {
 *       "id": "user_123",
 *       "email": "user@example.com",
 *       "role": "user",
 *       "createdAt": "2024-01-01T00:00:00Z"
 *     },
 *     "accessToken": "eyJ...",
 *     "refreshToken": "eyJ...",
 *     "expiresIn": 900
 *   }
 * }
 * ```
 *
 * **Errors:**
 * - 400: Invalid email/password format
 * - 409: Email already registered
 * - 500: Server error
 *
 * **Password Requirements:**
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * @route POST /auth/register
 */
authRoutes.post('/register', async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const body = await c.req.json();

    // Validate input
    if (!body.email || !body.password) {
      return c.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        400
      );
    }

    // Register user
    const result = await authManager.register({
      email: body.email,
      password: body.password,
    });

    return c.json(
      {
        success: true,
        data: result,
      },
      201
    );
  } catch (error: any) {
    console.error('[Auth Routes] Registration error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Registration failed',
        code: error.code,
      },
      error.statusCode || 500
    );
  }
});

/**
 * POST /auth/login
 *
 * Authenticate user with email and password.
 *
 * **Request:**
 * ```json
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123"
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "user": { ... },
 *     "accessToken": "eyJ...",
 *     "refreshToken": "eyJ...",
 *     "expiresIn": 900
 *   }
 * }
 * ```
 *
 * **Errors:**
 * - 401: Invalid credentials
 * - 403: Account inactive or locked
 * - 429: Account locked (too many failed attempts)
 * - 500: Server error
 *
 * **Security Features:**
 * - Bcrypt password verification
 * - Account lockout (5 failed attempts)
 * - Failed login attempt tracking
 * - 15-minute lockout duration
 *
 * @route POST /auth/login
 */
authRoutes.post('/login', async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const body = await c.req.json();

    // Validate input
    if (!body.email || !body.password) {
      return c.json(
        {
          success: false,
          error: 'Email and password are required',
        },
        400
      );
    }

    // Get client IP for security tracking
    const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

    // Login user
    const result = await authManager.login(
      {
        email: body.email,
        password: body.password,
      },
      ipAddress
    );

    return c.json(
      {
        success: true,
        data: result,
      },
      200
    );
  } catch (error: any) {
    console.error('[Auth Routes] Login error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Login failed',
        code: error.code,
      },
      error.statusCode || 500
    );
  }
});

/**
 * POST /auth/refresh
 *
 * Get a new access token using refresh token.
 *
 * Called when access token expires (typically after 15 minutes).
 *
 * **Request:**
 * ```json
 * {
 *   "refreshToken": "eyJ..."
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "accessToken": "eyJ...",
 *     "refreshToken": "eyJ..." (new refresh token)
 *   }
 * }
 * ```
 *
 * **Errors:**
 * - 400: No refresh token provided
 * - 401: Invalid or expired refresh token
 * - 401: Refresh token revoked
 * - 404: User not found
 * - 403: Account inactive
 * - 500: Server error
 *
 * **Token Rotation:**
 * - Old refresh token is invalidated
 * - New refresh token is issued
 * - Prevents token reuse attacks
 *
 * **Client Implementation:**
 * ```typescript
 * // When access token expires
 * const response = await fetch('/auth/refresh', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ refreshToken: storedRefreshToken })
 * });
 *
 * const { data } = await response.json();
 * localStorage.setItem('accessToken', data.accessToken);
 * localStorage.setItem('refreshToken', data.refreshToken);
 *
 * // Retry original request
 * ```
 *
 * @route POST /auth/refresh
 */
authRoutes.post('/refresh', async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const body = await c.req.json();

    if (!body.refreshToken) {
      return c.json(
        {
          success: false,
          error: 'Refresh token is required',
        },
        400
      );
    }

    // Refresh tokens
    const tokens = await authManager.refreshAccessToken(body.refreshToken);

    return c.json(
      {
        success: true,
        data: tokens,
      },
      200
    );
  } catch (error: any) {
    console.error('[Auth Routes] Refresh error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Token refresh failed',
        code: error.code,
      },
      error.statusCode || 500
    );
  }
});

/**
 * POST /auth/logout
 *
 * Invalidate refresh token and logout user.
 *
 * **Request:**
 * ```json
 * {
 *   "refreshToken": "eyJ..."
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Logged out successfully"
 * }
 * ```
 *
 * **Security:**
 * - Refresh token is deleted from database
 * - Can't be used to get new access tokens
 * - Access token still valid until expiry (JWT limitation)
 * - Use short expiry times (15 min) to minimize risk
 *
 * **Client Implementation:**
 * ```typescript
 * // On logout
 * await fetch('/auth/logout', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ refreshToken: storedRefreshToken })
 * });
 *
 * // Clear local storage
 * localStorage.removeItem('accessToken');
 * localStorage.removeItem('refreshToken');
 *
 * // Redirect to login
 * window.location.href = '/login';
 * ```
 *
 * @route POST /auth/logout
 */
authRoutes.post('/logout', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
  try {
    const body = await c.req.json();

    if (body.refreshToken) {
      await authManager.logout(body.refreshToken);
    }

    return c.json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      200
    );
  } catch (error: any) {
    console.error('[Auth Routes] Logout error:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Logout failed',
      },
      error.statusCode || 500
    );
  }
});

/**
 * GET /auth/me
 *
 * Get current authenticated user's information.
 *
 * Requires authentication (JWT or API Key).
 *
 * **Request Headers:**
 * ```
 * Authorization: Bearer <accessToken>
 * // or
 * X-API-Key: <apiKey>
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "user_123",
 *     "email": "user@example.com",
 *     "role": "user",
 *     "permissions": ["workflow:create", "workflow:read"],
 *     "emailVerified": true,
 *     "isActive": true,
 *     "lastLoginAt": "2024-01-01T00:00:00Z",
 *     "createdAt": "2024-01-01T00:00:00Z",
 *     "updatedAt": "2024-01-01T00:00:00Z"
 *   }
 * }
 * ```
 *
 * **Errors:**
 * - 401: Not authenticated
 * - 404: User not found
 * - 500: Server error
 *
 * @route GET /auth/me
 */
authRoutes.get('/me', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
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

    return c.json(
      {
        success: true,
        data: user,
      },
      200
    );
  } catch (error) {
    console.error('[Auth Routes] Get user error:', error);

    return c.json(
      {
        success: false,
        error: 'Failed to get user',
      },
      500
    );
  }
});

/**
 * POST /auth/change-password
 *
 * Change user's password.
 *
 * Requires authentication.
 *
 * **Request:**
 * ```json
 * {
 *   "currentPassword": "OldPassword123",
 *   "newPassword": "NewPassword456"
 * }
 * ```
 *
 * **Response (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "Password changed successfully"
 * }
 * ```
 *
 * **Errors:**
 * - 401: Not authenticated
 * - 401: Current password incorrect
 * - 400: New password doesn't meet requirements
 * - 404: User not found
 * - 500: Server error
 *
 * **Security:**
 * - Current password must be verified
 * - New password must meet strength requirements
 * - All refresh tokens are invalidated (forces re-login on all devices)
 * - Old password hash is completely replaced
 *
 * @route POST /auth/change-password
 */
authRoutes.post(
  '/change-password',
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

      if (!body.currentPassword || !body.newPassword) {
        return c.json(
          {
            success: false,
            error: 'Current password and new password are required',
          },
          400
        );
      }

      // Change password
      const success = await authManager.changePassword(
        user.id,
        body.currentPassword,
        body.newPassword
      );

      if (!success) {
        return c.json(
          {
            success: false,
            error: 'Failed to change password',
          },
          500
        );
      }

      return c.json(
        {
          success: true,
          message: 'Password changed successfully',
        },
        200
      );
    } catch (error: any) {
      console.error('[Auth Routes] Change password error:', error);

      return c.json(
        {
          success: false,
          error: error.message || 'Password change failed',
          code: error.code,
        },
        error.statusCode || 500
      );
    }
  }
);

export default authRoutes;
