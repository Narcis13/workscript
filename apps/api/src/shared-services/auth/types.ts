/**
 * Authentication & Authorization Type Definitions
 *
 * This file defines all TypeScript interfaces, enums, and types used throughout
 * the authentication and authorization system. These types ensure type safety
 * and provide clear contracts for all auth operations.
 *
 * **Architecture:**
 * - Role-Based Access Control (RBAC) with role and permission hierarchy
 * - Multi-tenancy support with tenantId
 * - Multiple auth methods: JWT, Sessions, API Keys
 * - User authentication and authorization flow types
 *
 * @module auth/types
 * @example
 * import { User, Permission, Role } from './types';
 *
 * const user: User = {
 *   id: 'user_123',
 *   email: 'user@example.com',
 *   role: Role.USER,
 *   permissions: [Permission.WORKFLOW_READ]
 * };
 */

// ============================================
// ENUMS - Fixed set of values
// ============================================

/**
 * Role Enum
 *
 * Defines the three main user roles in the system:
 * - ADMIN: Full system access, can manage users and settings
 * - USER: Standard user, can create/manage own workflows and automations
 * - API: For API key authentication, read-only access
 *
 * Used with PermissionManager to determine what actions are allowed.
 *
 * **Permission Hierarchy:**
 * - ADMIN: All permissions
 * - USER: Workflow and automation permissions
 * - API: Read and execute permissions only
 *
 * @enum {string}
 */
export enum Role {
  ADMIN = 'admin',      // Full system access
  USER = 'user',        // Standard user
  API = 'api'           // API key access (limited read/execute)
}

/**
 * Permission Enum
 *
 * Fine-grained permissions for RBAC. Permissions are granted to users
 * either by role (via PermissionManager) or individually.
 *
 * **Format:** `resource:action`
 * - resource: what can be accessed (workflow, automation, user, system)
 * - action: what can be done (create, read, update, delete, execute, manage)
 *
 * **Workflow Permissions:**
 * - WORKFLOW_CREATE: Can create new workflows
 * - WORKFLOW_READ: Can view workflows
 * - WORKFLOW_UPDATE: Can modify workflows
 * - WORKFLOW_DELETE: Can delete workflows
 * - WORKFLOW_EXECUTE: Can run workflows
 *
 * **Automation Permissions:**
 * - AUTOMATION_CREATE: Can create automation rules
 * - AUTOMATION_READ: Can view automations
 * - AUTOMATION_UPDATE: Can modify automations
 * - AUTOMATION_DELETE: Can delete automations
 * - AUTOMATION_EXECUTE: Can trigger automations
 *
 * **Admin Permissions:**
 * - USER_MANAGE: Can create/delete/modify users
 * - API_KEY_MANAGE: Can create/revoke API keys
 * - SYSTEM_CONFIG: Can modify system settings
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

  // Execution permissions
  EXECUTION_READ = 'execution:read',
  EXECUTION_EXPORT = 'execution:export',
  EXECUTION_RERUN = 'execution:rerun',

  // Resource permissions
  RESOURCE_CREATE = 'resource:create',
  RESOURCE_READ = 'resource:read',
  RESOURCE_UPDATE = 'resource:update',
  RESOURCE_DELETE = 'resource:delete',

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
 *
 * **Key Fields:**
 * - id: Unique user identifier (CUID2)
 * - email: User's email address
 * - passwordHash: Bcrypt hash of password (never include in responses)
 * - role: User's role (admin, user, api)
 * - permissions: Array of custom permissions (overrides role defaults)
 * - tenantId: For multi-tenancy (optional)
 * - emailVerified: Whether email verification is complete
 * - isActive: Soft delete flag
 * - lastLoginAt: Last successful login timestamp
 * - createdAt: Account creation timestamp
 * - updatedAt: Last profile update
 *
 * **Security Notes:**
 * - passwordHash should NEVER be included in API responses
 * - Always return User without passwordHash field
 * - Create SafeUser type for responses (see SafeUser below)
 *
 * @interface User
 */
export interface User {
  id: string;
  email: string;
  passwordHash?: string;        // Never expose in responses
  role: Role;
  permissions: Permission[];
  tenantId?: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * SafeUser Interface
 *
 * User type safe for sending to clients. Excludes passwordHash and sensitive fields.
 *
 * Always return this type from API endpoints instead of User.
 *
 * @interface SafeUser
 */
export interface SafeUser {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
  tenantId?: string;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Registration Request
 *
 * Data structure for user registration endpoint.
 *
 * @interface RegisterRequest
 */
export interface RegisterRequest {
  email: string;        // User's email (will be validated)
  password: string;     // Password (will be hashed with bcrypt)
}

/**
 * Login Request
 *
 * Data structure for login endpoint.
 *
 * @interface LoginRequest
 */
export interface LoginRequest {
  email: string;        // User's email
  password: string;     // User's password (will be verified against hash)
}

/**
 * User Update Request
 *
 * Data structure for updating user profile.
 *
 * @interface UpdateUserRequest
 */
export interface UpdateUserRequest {
  email?: string;
  role?: Role;
  permissions?: Permission[];
  emailVerified?: boolean;
  isActive?: boolean;
}

// ============================================
// TOKEN TYPES
// ============================================

/**
 * JWT Payload Interface
 *
 * The claims/data included in the JWT token.
 *
 * **Token Flow:**
 * 1. User logs in with email/password
 * 2. Server creates JWTPayload with user info
 * 3. Server signs payload to create JWT token
 * 4. Server returns token to client
 * 5. Client sends token with each request (Authorization header)
 * 6. Server verifies signature and validates claims
 *
 * **Key Fields:**
 * - userId: Who this token belongs to
 * - email: User's email (for easy reference)
 * - role: User's role (for quick permission checks)
 * - permissions: User's permissions (for authorization)
 * - tenantId: User's tenant (for multi-tenant filtering)
 * - exp: Expiration time (Unix timestamp) - added by JWTManager
 * - iat: Issued at time (Unix timestamp) - added by JWTManager
 *
 * **Security Notes:**
 * - Include only necessary info (avoid sensitive data)
 * - Token is Base64 encoded but NOT encrypted (don't put secrets)
 * - Anyone can read the payload, but only server can verify signature
 * - Always validate token before using claims
 *
 * @interface JWTPayload
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: Role;
  permissions: Permission[];
  tenantId?: string;
  exp?: number;           // Expiration timestamp (set by JWTManager)
  iat?: number;           // Issued at timestamp (set by JWTManager)
}

/**
 * Refresh Token Payload
 *
 * Minimal payload for refresh tokens (only include userId).
 *
 * **Why minimal?**
 * - Refresh tokens have long expiry (7 days)
 * - If compromised, don't want to leak much info
 * - Refresh token is only used to get new access token
 * - Client should never send refresh token with requests
 *
 * @interface RefreshTokenPayload
 */
export interface RefreshTokenPayload {
  userId: string;
  exp?: number;
  iat?: number;
}

/**
 * Token Pair
 *
 * Both access and refresh tokens returned after login.
 *
 * **Usage:**
 * - accessToken: Use for API requests (Authorization header)
 * - refreshToken: Store securely, use to get new access token when it expires
 *
 * **Client Storage Recommendation:**
 * ```typescript
 * // Option 1: localStorage (simple, but vulnerable to XSS)
 * localStorage.setItem('accessToken', tokens.accessToken);
 * localStorage.setItem('refreshToken', tokens.refreshToken);
 *
 * // Option 2: httpOnly cookies (more secure, but requires CORS setup)
 * // Server sets cookie in response headers (more secure)
 * ```
 *
 * @interface TokenPair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Result
 *
 * Returned from login/register endpoints.
 *
 * @interface AuthResult
 */
export interface AuthResult {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;       // Access token expiry in seconds
}

// ============================================
// API KEY TYPES
// ============================================

/**
 * API Key Data
 *
 * Represents an API key record (without the actual key value).
 *
 * **Security:**
 * - Actual key is NEVER stored (only hash)
 * - Actual key is ONLY returned on creation
 * - On validation, incoming key is hashed and compared
 * - This way, if DB is compromised, keys can't be used
 *
 * @interface ApiKeyData
 */
export interface ApiKeyData {
  id: string;
  userId: string;
  name: string;
  permissions: Permission[];
  rateLimit: number;
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * Create API Key Request
 *
 * Data for creating a new API key.
 *
 * @interface CreateApiKeyRequest
 */
export interface CreateApiKeyRequest {
  name: string;                  // Human-readable name
  permissions?: Permission[];    // Specific permissions (optional, defaults to user's)
  rateLimit?: number;           // Requests per hour (optional, defaults to 1000)
  expiresAt?: Date;             // When key expires (optional, no expiry if null)
}

/**
 * API Key Response
 *
 * Returned when creating an API key. Includes the actual key value (one-time display).
 *
 * @interface ApiKeyResponse
 */
export interface ApiKeyResponse extends ApiKeyData {
  key: string;  // The actual API key (only returned on creation)
}

// ============================================
// SESSION TYPES
// ============================================

/**
 * Session Data
 *
 * Server-side session information.
 *
 * **SessionManager stores this in Redis or database.**
 *
 * @interface SessionData
 */
export interface SessionData {
  userId: string;
  email: string;
  role: Role;
  tenantId?: string;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
}

// ============================================
// CONTEXT TYPES
// ============================================

/**
 * Authenticated Context
 *
 * User information attached to Hono context after authentication.
 *
 * **Usage in Hono routes:**
 * ```typescript
 * app.get('/protected', authenticate, async (c: Context<{ Variables: AuthContext }>) => {
 *   const user = c.get('user');
 *   console.log('Authenticated user:', user.userId);
 *   // Now you can use user info
 * });
 * ```
 *
 * @interface AuthContext
 */
export interface AuthContext {
  user?: SafeUser & {
    // Additional runtime context
    authMethod?: 'jwt' | 'session' | 'apikey';  // How user was authenticated
    tokenExpiry?: Date;                         // When token/session expires
  };
}

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * API Response Success
 *
 * Standard successful API response.
 *
 * @interface ApiResponse
 */
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * API Response Error
 *
 * Standard error API response.
 *
 * @interface ApiErrorResponse
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;          // Error code for programmatic handling
  details?: Record<string, any>;
}

/**
 * Paginated Response
 *
 * For endpoints that return lists with pagination.
 *
 * @interface PaginatedResponse
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================
// ERROR TYPES
// ============================================

/**
 * Authentication Error
 *
 * Error codes returned by auth endpoints.
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
  INVALID_API_KEY = 'INVALID_API_KEY',
  API_KEY_EXPIRED = 'API_KEY_EXPIRED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PASSWORD_RESET_TOKEN_INVALID = 'PASSWORD_RESET_TOKEN_INVALID',
  PASSWORD_RESET_TOKEN_EXPIRED = 'PASSWORD_RESET_TOKEN_EXPIRED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_INPUT = 'INVALID_INPUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
}

/**
 * Authentication Exception
 *
 * Custom exception for auth errors with detailed info.
 *
 * **Usage:**
 * ```typescript
 * if (!user) {
 *   throw new AuthException(AuthErrorCode.USER_NOT_FOUND, 'User not found', 404);
 * }
 * ```
 *
 * @class AuthException
 */
export class AuthException extends Error {
  constructor(
    public code: AuthErrorCode,
    public message: string,
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthException';
  }
}

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * JWT Config
 *
 * Configuration for JWT token generation and validation.
 *
 * @interface JWTConfig
 */
export interface JWTConfig {
  secret: string;
  refreshSecret: string;
  accessExpiry: number;      // In seconds (e.g., 900 = 15 minutes)
  refreshExpiry: number;     // In seconds (e.g., 604800 = 7 days)
}

/**
 * Auth Config
 *
 * Complete authentication configuration loaded from environment variables.
 *
 * @interface AuthConfig
 */
export interface AuthConfig {
  jwt: JWTConfig;
  bcryptRounds: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  passwordResetExpiry: number;
  sessionExpiry: number;
  redisUrl?: string;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Utility type to get user from context safely
 *
 * @example
 * const user: ExtractUserFromContext<typeof c> = c.get('user');
 */
export type ExtractUserFromContext<C extends { get: any }> = ReturnType<C['get']> extends SafeUser | undefined
  ? ReturnType<C['get']>
  : never;
