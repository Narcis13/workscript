/**
 * Authentication & Authorization Module Exports
 *
 * Central import point for all auth-related functionality.
 *
 * **Module Structure:**
 *
 * ├─ types.ts
 * │  └─ All TypeScript interfaces, enums, and error classes
 * │
 * ├─ JWTManager.ts
 * │  └─ JWT token generation and verification
 * │
 * ├─ SessionManager.ts
 * │  └─ Session-based authentication
 * │
 * ├─ APIKeyManager.ts
 * │  └─ API key generation and validation
 * │
 * ├─ PermissionManager.ts
 * │  └─ Role-based access control (RBAC)
 * │
 * ├─ AuthManager.ts (coming next)
 * │  └─ Main authentication orchestrator
 * │
 * ├─ middleware.ts (coming next)
 * │  └─ Hono middleware for authentication
 * │
 * └─ utils/
 *    ├─ security.ts
 *    └─ validation.ts
 *
 * **Quick Start:**
 *
 * ```typescript
 * import {
 *   AuthManager,
 *   JWTManager,
 *   APIKeyManager,
 *   PermissionManager,
 *   SessionManager,
 *   authenticate,
 *   requirePermission,
 *   Permission,
 *   Role
 * } from '@workscript/auth';
 *
 * // Get managers
 * const authManager = AuthManager.getInstance();
 * const permissions = PermissionManager.getInstance();
 *
 * // Register user
 * const result = await authManager.register('user@example.com', 'password');
 *
 * // Check permissions
 * if (permissions.hasUserPermission(user, Permission.WORKFLOW_CREATE)) {
 *   // User can create workflows
 * }
 * ```
 *
 * @module auth
 */

// ============================================
// Type Exports
// ============================================

export {
  // Enums
  Role,
  Permission,
  AuthErrorCode,

  // User types
  type User,
  type SafeUser,
  type RegisterRequest,
  type LoginRequest,
  type UpdateUserRequest,

  // Token types
  type JWTPayload,
  type RefreshTokenPayload,
  type TokenPair,
  type AuthResult,

  // API Key types
  type ApiKeyData,
  type ApiKeyResponse,
  type CreateApiKeyRequest,

  // Session types
  type SessionData,

  // Context types
  type AuthContext,

  // Response types
  type ApiResponse,
  type ApiErrorResponse,
  type PaginatedResponse,

  // Configuration types
  type JWTConfig,
  type AuthConfig,

  // Exceptions
  AuthException,
} from './types';

// ============================================
// Manager Exports
// ============================================

export { JWTManager, getJWTManager } from './JWTManager';
export { SessionManager, getSessionManager } from './SessionManager';
export { APIKeyManager, getAPIKeyManager } from './APIKeyManager';
export { PermissionManager, getPermissionManager } from './PermissionManager';
export { AuthManager, getAuthManager } from './AuthManager';

// ============================================
// Middleware Exports
// ============================================

export {
  authenticate,
  optionalAuth,
  requirePermission,
  requireRole,
  rateLimiter,
  ownsResource,
} from './middleware';

// ============================================
// Convenience Functions
// ============================================

/**
 * Initialize all auth managers
 *
 * Call this once on server startup.
 *
 * @returns {Promise<void>}
 *
 * @example
 * import { initializeAuth } from '@workscript/auth';
 *
 * // In server startup
 * await initializeAuth();
 */
export async function initializeAuth(): Promise<void> {
  try {
    // Initialize all managers (they initialize on getInstance)
    const _jwtManager = JWTManager.getInstance();
    const _sessionManager = SessionManager.getInstance();
    const _apiKeyManager = APIKeyManager.getInstance();
    const _permissionManager = PermissionManager.getInstance();
    const _authManager = AuthManager.getInstance();

    console.log('[Auth] All managers initialized successfully');
  } catch (error) {
    console.error('[Auth] Initialization failed:', error);
    throw error;
  }
}

/**
 * Get all managers at once
 *
 * Convenience function for accessing all managers.
 *
 * @returns {Object} All manager instances
 *
 * @example
 * const { jwtManager, sessionManager, apiKeyManager, permissionManager } = getAuthManagers();
 */
export function getAuthManagers() {
  return {
    authManager: AuthManager.getInstance(),
    jwtManager: JWTManager.getInstance(),
    sessionManager: SessionManager.getInstance(),
    apiKeyManager: APIKeyManager.getInstance(),
    permissionManager: PermissionManager.getInstance(),
  };
}

// ============================================
// Re-export from db module for convenience
// ============================================

export type {
  User as DbUser,
  NewUser,
  ApiKey as DbApiKey,
  NewApiKey,
  RefreshToken as DbRefreshToken,
  NewRefreshToken,
  Session as DbSession,
  NewSession,
  PasswordReset as DbPasswordReset,
  NewPasswordReset,
  LoginAttempt as DbLoginAttempt,
  NewLoginAttempt,
} from '../../db';
