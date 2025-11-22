/**
 * Authentication Type Definitions (Frontend)
 *
 * Type-safe TypeScript definitions for the authentication system.
 * These types match the backend API contract from /apps/api/src/shared-services/auth/types.ts
 *
 * @module types/auth
 */

// ============================================
// ENUMS - Must match backend exactly
// ============================================

/**
 * User Role
 *
 * Defines the three main user roles in the system:
 * - admin: Full system access, can manage users and settings
 * - user: Standard user, can create/manage own workflows and automations
 * - api: For API key authentication, read-only access
 *
 * @enum {string}
 */
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  API = 'api'
}

/**
 * Permission Strings
 *
 * Fine-grained permissions for RBAC.
 * Format: `resource:action`
 *
 * @enum {string}
 */
export enum Permission {
  // Workflow permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_EXECUTE = 'workflow:execute',

  // Automation permissions
  AUTOMATION_CREATE = 'automation:create',
  AUTOMATION_READ = 'automation:read',
  AUTOMATION_UPDATE = 'automation:update',
  AUTOMATION_DELETE = 'automation:delete',
  AUTOMATION_EXECUTE = 'automation:execute',

  // User management permissions
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_MANAGE = 'user:manage',

  // API Key permissions
  API_KEY_CREATE = 'apikey:create',
  API_KEY_READ = 'apikey:read',
  API_KEY_DELETE = 'apikey:delete',
  API_KEY_MANAGE = 'apikey:manage',

  // System permissions
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_AUDIT = 'system:audit'
}

// ============================================
// USER TYPES
// ============================================

/**
 * User Interface
 *
 * Represents a user account in the system.
 * This matches the SafeUser interface from the backend (excludes passwordHash).
 *
 * @interface User
 */
export interface User {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
  tenantId?: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: string; // ISO date string
  createdAt: string;    // ISO date string
  updatedAt: string;    // ISO date string
}

// ============================================
// AUTHENTICATION REQUEST/RESPONSE TYPES
// ============================================

/**
 * Login Request
 *
 * Data structure for POST /auth/login
 *
 * @interface LoginRequest
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login Response
 *
 * Response from POST /auth/login and POST /auth/register
 *
 * @interface LoginResponse
 */
export interface LoginResponse {
  success: true;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number; // Access token expiry in seconds (typically 900 = 15 min)
  };
}

/**
 * Register Request
 *
 * Data structure for POST /auth/register
 *
 * Password Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 *
 * @interface RegisterRequest
 */
export interface RegisterRequest {
  email: string;
  password: string;
}

/**
 * Register Response
 *
 * Response from POST /auth/register (same as LoginResponse)
 *
 * @interface RegisterResponse
 */
export interface RegisterResponse {
  success: true;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * Change Password Request
 *
 * Data structure for POST /auth/change-password
 *
 * @interface ChangePasswordRequest
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Change Password Response
 *
 * Response from POST /auth/change-password
 *
 * @interface ChangePasswordResponse
 */
export interface ChangePasswordResponse {
  success: true;
  message: string;
}

/**
 * Refresh Token Request
 *
 * Data structure for POST /auth/refresh
 *
 * @interface RefreshTokenRequest
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh Token Response
 *
 * Response from POST /auth/refresh
 *
 * @interface RefreshTokenResponse
 */
export interface RefreshTokenResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string; // New refresh token (token rotation)
  };
}

/**
 * Logout Request
 *
 * Data structure for POST /auth/logout
 *
 * @interface LogoutRequest
 */
export interface LogoutRequest {
  refreshToken: string;
}

/**
 * Logout Response
 *
 * Response from POST /auth/logout
 *
 * @interface LogoutResponse
 */
export interface LogoutResponse {
  success: true;
  message: string;
}

/**
 * Get Current User Response
 *
 * Response from GET /auth/me
 *
 * @interface GetCurrentUserResponse
 */
export interface GetCurrentUserResponse {
  success: true;
  data: User;
}

// ============================================
// TOKEN STORAGE
// ============================================

/**
 * Authentication Tokens
 *
 * Tokens stored in localStorage for authenticated requests
 *
 * @interface AuthTokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;    // Access token expiry in seconds
  expiryTimestamp: number; // Unix timestamp when access token expires
}

// ============================================
// ERROR RESPONSE TYPES
// ============================================

/**
 * API Error Response
 *
 * Standard error response from API
 *
 * @interface ApiErrorResponse
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string; // Error code for programmatic handling
  details?: Record<string, any>;
}

/**
 * Authentication Error Codes
 *
 * Error codes that can be returned from auth endpoints
 *
 * @enum {string}
 */
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  INVALID_TOKEN = 'INVALID_TOKEN',
  EXPIRED_TOKEN = 'EXPIRED_TOKEN',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_INPUT = 'INVALID_INPUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

// ============================================
// AUTHENTICATION CONTEXT TYPES
// ============================================

/**
 * Authentication Context Type
 *
 * Interface for the AuthContext Provider state and methods.
 * Used throughout the application to access authentication state.
 *
 * @interface AuthContextType
 */
export interface AuthContextType {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Methods
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (permission: Permission | string) => boolean;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Password Validation Result
 *
 * Used for password strength validation
 *
 * @interface PasswordValidation
 */
export interface PasswordValidation {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong';
  errors: string[];
}

/**
 * User List Item (for admin dashboard)
 *
 * Simplified user info for user list display
 *
 * @interface UserListItem
 */
export interface UserListItem {
  id: string;
  email: string;
  role: Role;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}
