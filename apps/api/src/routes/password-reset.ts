/**
 * Password Reset Routes
 *
 * Handles password reset flow with secure token-based authentication.
 *
 * **Flow:**
 * 1. User requests reset → POST /password-reset/request
 * 2. System sends email with token
 * 3. User clicks link → GET /password-reset/validate
 * 4. User enters new password → POST /password-reset/complete
 *
 * **Security Features:**
 * - Tokens are hashed in database
 * - Tokens expire in 30 minutes
 * - Tokens can only be used once
 * - Rate limiting prevents abuse
 * - No user enumeration (always returns success)
 *
 * @module routes/password-reset
 */

import { Hono } from 'hono';
import { AuthManager } from '../shared-services/auth/AuthManager';
import { rateLimiter } from '../shared-services/auth/middleware';

const passwordResetRoutes = new Hono();
const authManager = AuthManager.getInstance();

/**
 * POST /password-reset/request
 *
 * Request a password reset email.
 *
 * **Security:**
 * - Rate limited to 3 requests per 15 minutes per IP
 * - Does not reveal if email exists
 * - Always returns success (prevents user enumeration)
 *
 * @body {string} email - User email address
 * @returns {200} Success message (always, even if email doesn't exist)
 *
 * @example
 * POST /password-reset/request
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "If your email exists, you will receive a password reset link"
 * }
 */
passwordResetRoutes.post(
  '/request',
  rateLimiter({ maxRequests: 3, windowSeconds: 900 }), // 3 requests per 15 minutes
  async (c) => {
    try {
      const body = await c.req.json();
      const { email } = body;

      if (!email || typeof email !== 'string') {
        return c.json(
          {
            success: false,
            error: 'Email is required'
          },
          400
        );
      }

      // Get IP address for audit trail
      const ipAddress = c.req.header('x-forwarded-for') ||
                       c.req.header('x-real-ip') ||
                       'unknown';

      // Request password reset
      await authManager.requestPasswordReset(email, ipAddress);

      // Always return success (don't reveal if email exists)
      return c.json({
        success: true,
        message: 'If your email exists, you will receive a password reset link'
      });
    } catch (error) {
      console.error('[PasswordReset] Request failed:', error);

      // Still return success to prevent user enumeration
      return c.json({
        success: true,
        message: 'If your email exists, you will receive a password reset link'
      });
    }
  }
);

/**
 * POST /password-reset/validate
 *
 * Validate a password reset token.
 *
 * Used by frontend to check if token is valid before showing reset form.
 *
 * @body {string} token - Reset token from email link
 * @returns {200} Token validity status
 *
 * @example
 * POST /password-reset/validate
 * {
 *   "token": "abc123xyz456..."
 * }
 *
 * Response (valid):
 * {
 *   "valid": true
 * }
 *
 * Response (invalid/expired):
 * {
 *   "valid": false,
 *   "error": "Invalid or expired token"
 * }
 */
passwordResetRoutes.post('/validate', async (c) => {
  try {
    const body = await c.req.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return c.json(
        {
          valid: false,
          error: 'Token is required'
        },
        400
      );
    }

    // Validate token
    const userId = await authManager.validatePasswordResetToken(token);

    if (!userId) {
      return c.json({
        valid: false,
        error: 'Invalid or expired token'
      });
    }

    return c.json({
      valid: true
    });
  } catch (error) {
    console.error('[PasswordReset] Validation failed:', error);
    return c.json(
      {
        valid: false,
        error: 'Token validation failed'
      },
      500
    );
  }
});

/**
 * POST /password-reset/complete
 *
 * Complete password reset with new password.
 *
 * **Security:**
 * - Validates password strength
 * - Marks token as used (prevents reuse)
 * - Revokes all existing sessions (logout all devices)
 * - Returns new tokens for immediate login
 *
 * @body {string} token - Reset token from email
 * @body {string} newPassword - New password (min 8 chars, uppercase, lowercase, number)
 * @returns {200} Success with new tokens for immediate login
 *
 * @example
 * POST /password-reset/complete
 * {
 *   "token": "abc123xyz456...",
 *   "newPassword": "NewSecure123"
 * }
 *
 * Response (success):
 * {
 *   "success": true,
 *   "message": "Password reset successfully",
 *   "accessToken": "eyJhbG...",
 *   "refreshToken": "eyJhbG..."
 * }
 *
 * Response (failure):
 * {
 *   "success": false,
 *   "error": "Invalid or expired token"
 * }
 */
passwordResetRoutes.post('/complete', async (c) => {
  try {
    const body = await c.req.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return c.json(
        {
          success: false,
          error: 'Token is required'
        },
        400
      );
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return c.json(
        {
          success: false,
          error: 'New password is required'
        },
        400
      );
    }

    // Complete password reset
    const tokens = await authManager.completePasswordReset(token, newPassword);

    return c.json({
      success: true,
      message: 'Password reset successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } catch (error: any) {
    console.error('[PasswordReset] Complete failed:', error);

    return c.json(
      {
        success: false,
        error: error.message || 'Password reset failed'
      },
      error.status || 500
    );
  }
});

export default passwordResetRoutes;
