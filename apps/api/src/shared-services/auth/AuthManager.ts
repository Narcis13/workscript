/**
 * Authentication Manager (Main Orchestrator)
 *
 * Central hub that orchestrates all authentication operations.
 *
 * ============ COMPLETE AUTH FLOW ============
 *
 * **REGISTRATION:**
 * 1. User submits email + password
 * 2. Validate inputs (format, length, strength)
 * 3. Check if email already exists
 * 4. Hash password with bcrypt (10 rounds)
 * 5. Create user in database
 * 6. Generate tokens (access + refresh)
 * 7. Return tokens to user
 *
 * **LOGIN:**
 * 1. User submits email + password
 * 2. Find user by email
 * 3. Compare password hash (bcrypt.compare)
 * 4. Check if account is active
 * 5. Track failed login attempt (for security)
 * 6. Generate tokens
 * 7. Return tokens to user
 *
 * **TOKEN REFRESH:**
 * 1. Client sends refresh token
 * 2. Verify refresh token signature
 * 3. Check if token is still in database (for revocation)
 * 4. Fetch fresh user data
 * 5. Generate new access token
 * 6. Return new access token
 *
 * **LOGOUT:**
 * 1. Delete refresh token from database
 * 2. Clear session (if using sessions)
 * 3. Client deletes local tokens
 * 4. Token works until expiry (JWT trade-off)
 *
 * @module auth/AuthManager
 */

import bcryptjs from 'bcryptjs';
import { db } from '../../db';
import {
  users,
  apiKeys,
  refreshTokens,
  loginAttempts,
  User,
  NewUser,
  Permission,
  Role,
  SafeUser,
  RegisterRequest,
  LoginRequest,
  UpdateUserRequest,
  AuthResult,
  TokenPair,
  AuthException,
  AuthErrorCode,
} from '../../db';
import { JWTManager } from './JWTManager';
import { SessionManager } from './SessionManager';
import { APIKeyManager } from './APIKeyManager';
import { PermissionManager } from './PermissionManager';
import { eq, and, gt } from 'drizzle-orm';

/**
 * Authentication Manager Class
 *
 * **Responsibilities:**
 * - User registration and account creation
 * - Login with email/password verification
 * - Token generation and refresh
 * - User profile management
 * - Password reset workflows
 * - Account security (lockout, failed attempts)
 *
 * **Design:** Singleton pattern with orchestration of other managers
 *
 * @class AuthManager
 * @example
 * const authManager = AuthManager.getInstance();
 *
 * // Register
 * const result = await authManager.register('user@example.com', 'password123');
 * // Returns: { user, accessToken, refreshToken }
 *
 * // Login
 * const result = await authManager.login('user@example.com', 'password123');
 *
 * // Refresh token
 * const { accessToken } = await authManager.refreshAccessToken(refreshToken);
 */
export class AuthManager {
  private static instance: AuthManager | null = null;

  // Manager instances
  private readonly jwtManager = JWTManager.getInstance();
  private readonly sessionManager = SessionManager.getInstance();
  private readonly apiKeyManager = APIKeyManager.getInstance();
  private readonly permissionManager = PermissionManager.getInstance();

  // Configuration from environment
  private readonly bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  private readonly maxLoginAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
  private readonly lockoutDuration = parseInt(process.env.LOCKOUT_DURATION || '900', 10); // 15 min

  /**
   * Private constructor - use getInstance()
   */
  private constructor() {}

  /**
   * Get singleton instance
   *
   * @static
   * @returns {AuthManager}
   */
  static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  /**
   * Register a new user
   *
   * **Process:**
   * 1. Validate email and password
   * 2. Check if email already exists
   * 3. Hash password with bcrypt
   * 4. Create user in database
   * 5. Generate tokens
   * 6. Return user and tokens
   *
   * **Validation:**
   * - Email: Valid format
   * - Password: Minimum 8 characters, complexity
   *
   * **Security:**
   * - Password never logged or exposed
   * - Hash stored in database, not password
   * - Bcrypt automatically handles salting
   *
   * @param {RegisterRequest} request Email and password
   * @returns {Promise<AuthResult>} User info and tokens
   * @throws {AuthException} If validation or creation fails
   *
   * @example
   * try {
   *   const result = await authManager.register({
   *     email: 'user@example.com',
   *     password: 'SecurePass123'
   *   });
   *   console.log('User registered:', result.user.id);
   *   console.log('Access token:', result.accessToken);
   * } catch (error) {
   *   if (error.code === 'USER_ALREADY_EXISTS') {
   *     console.log('Email already registered');
   *   }
   * }
   */
  async register(request: RegisterRequest): Promise<AuthResult> {
    try {
      // 1. Validate inputs
      this.validateEmail(request.email);
      this.validatePassword(request.password);

      // 2. Check if email already exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, request.email.toLowerCase()),
      });

      if (existingUser) {
        throw new AuthException(
          AuthErrorCode.USER_ALREADY_EXISTS,
          'Email already registered',
          409
        );
      }

      // 3. Hash password
      const passwordHash = await bcryptjs.hash(request.password, this.bcryptRounds);

      // 4. Create user
      const userId = crypto.randomUUID();
      const now = new Date();

      const newUser: NewUser = {
        id: userId,
        email: request.email.toLowerCase(),
        passwordHash,
        role: Role.USER,
        permissions: [],
        emailVerified: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(users).values(newUser);

      // 5. Fetch created user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new AuthException(
          AuthErrorCode.USER_NOT_FOUND,
          'Failed to create user',
          500
        );
      }

      // 6. Generate tokens
      const { accessToken, refreshToken } = await this.jwtManager.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      });

      // 7. Store refresh token
      await this.storeRefreshToken(user.id, refreshToken);

      // Return safe user (without password hash)
      return {
        user: this.toSafeUser(user),
        accessToken,
        refreshToken,
        expiresIn: 900, // 15 minutes
      };
    } catch (error) {
      if (error instanceof AuthException) throw error;

      console.error('[AuthManager] Registration failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Registration failed',
        500
      );
    }
  }

  /**
   * Login with email and password
   *
   * **Process:**
   * 1. Find user by email
   * 2. Verify password matches hash
   * 3. Check account is active
   * 4. Check not locked out
   * 5. Verify email (if required)
   * 6. Clear failed login attempts
   * 7. Generate tokens
   * 8. Return user and tokens
   *
   * **Security:**
   * - Failed attempts tracked
   * - Account lockout after N failures
   * - Timing-safe comparison (bcrypt.compare)
   * - No user enumeration (don't reveal if email exists)
   *
   * @param {LoginRequest} request Email and password
   * @returns {Promise<AuthResult>} User info and tokens
   * @throws {AuthException} If login fails
   *
   * @example
   * try {
   *   const result = await authManager.login({
   *     email: 'user@example.com',
   *     password: 'password'
   *   });
   *   // User authenticated, use tokens
   * } catch (error) {
   *   console.log('Login failed:', error.message);
   * }
   */
  async login(request: LoginRequest, ipAddress?: string): Promise<AuthResult> {
    try {
      // 1. Find user
      const user = await db.query.users.findFirst({
        where: eq(users.email, request.email.toLowerCase()),
      });

      if (!user) {
        // Don't reveal if email exists (security best practice)
        // Still track attempt for rate limiting
        if (ipAddress) {
          await this.trackLoginAttempt(request.email, ipAddress);
        }
        throw new AuthException(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      // 2. Check account is active
      if (!user.isActive) {
        throw new AuthException(
          AuthErrorCode.ACCOUNT_INACTIVE,
          'Account is inactive',
          403
        );
      }

      // 3. Check not locked out
      if (await this.isAccountLockedOut(user.email)) {
        throw new AuthException(
          AuthErrorCode.ACCOUNT_LOCKED,
          'Account is locked. Try again in 15 minutes',
          429
        );
      }

      // 4. Verify password
      const passwordHash = user.passwordHash;
      if (!passwordHash) {
        // User registered via OAuth (no password)
        throw new AuthException(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      const passwordValid = await bcryptjs.compare(request.password, passwordHash);

      if (!passwordValid) {
        // Track failed attempt
        if (ipAddress) {
          await this.trackLoginAttempt(user.email, ipAddress);
        }
        throw new AuthException(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Invalid email or password',
          401
        );
      }

      // 5. Check email verified (optional, for security)
      // if (!user.emailVerified) {
      //   throw new AuthException(
      //     AuthErrorCode.EMAIL_NOT_VERIFIED,
      //     'Please verify your email before logging in',
      //     403
      //   );
      // }

      // 6. Clear failed login attempts
      await this.clearLoginAttempts(user.email);

      // 7. Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // 8. Generate tokens
      const { accessToken, refreshToken } = await this.jwtManager.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      });

      // Store refresh token
      await this.storeRefreshToken(user.id, refreshToken);

      return {
        user: this.toSafeUser(user),
        accessToken,
        refreshToken,
        expiresIn: 900,
      };
    } catch (error) {
      if (error instanceof AuthException) throw error;

      console.error('[AuthManager] Login failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Login failed',
        500
      );
    }
  }

  /**
   * Refresh access token using refresh token
   *
   * Called when access token expires.
   *
   * **Process:**
   * 1. Verify refresh token is valid
   * 2. Check token exists in database (for revocation)
   * 3. Fetch fresh user data
   * 4. Generate new access token
   * 5. Return new token
   *
   * @param {string} refreshToken The refresh token
   * @returns {Promise<TokenPair>} New tokens
   * @throws {AuthException} If refresh token invalid
   *
   * @example
   * try {
   *   const { accessToken } = await authManager.refreshAccessToken(refreshToken);
   *   // Use new token in Authorization header
   * } catch (error) {
   *   // Refresh token invalid or expired
   *   // User must login again
   * }
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenPair> {
    try {
      // 1. Verify refresh token signature
      const payload = await this.jwtManager.verifyRefreshToken(refreshToken);
      if (!payload) {
        throw new AuthException(
          AuthErrorCode.INVALID_TOKEN,
          'Invalid or expired refresh token',
          401
        );
      }

      // 2. Check token exists in database (for revocation)
      const tokenRecord = await db.query.refreshTokens.findFirst({
        where: eq(refreshTokens.token, refreshToken),
      });

      if (!tokenRecord) {
        throw new AuthException(
          AuthErrorCode.INVALID_TOKEN,
          'Refresh token has been revoked',
          401
        );
      }

      // 3. Fetch fresh user data
      const user = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!user) {
        throw new AuthException(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      if (!user.isActive) {
        throw new AuthException(
          AuthErrorCode.ACCOUNT_INACTIVE,
          'Account is inactive',
          403
        );
      }

      // 4. Generate new tokens
      const newTokens = await this.jwtManager.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      });

      // Store new refresh token
      await this.storeRefreshToken(user.id, newTokens.refreshToken);

      // Invalidate old refresh token
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken));

      return newTokens;
    } catch (error) {
      if (error instanceof AuthException) throw error;

      console.error('[AuthManager] Token refresh failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_TOKEN,
        'Token refresh failed',
        500
      );
    }
  }

  /**
   * Logout a user
   *
   * **Process:**
   * 1. Delete refresh token from database
   * 2. Invalidate session (if using sessions)
   * 3. Client deletes local tokens
   *
   * **Note:** Access token still valid until expiry (JWT trade-off)
   * Use short expiry times (15 min) to minimize risk.
   *
   * @param {string} refreshToken The refresh token to invalidate
   * @returns {Promise<boolean>} True if logout successful
   *
   * @example
   * await authManager.logout(refreshToken);
   * // Client should clear localStorage tokens
   */
  async logout(refreshToken: string): Promise<boolean> {
    try {
      // Delete refresh token from database
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.token, refreshToken));

      return true;
    } catch (error) {
      console.error('[AuthManager] Logout failed:', error);
      return false;
    }
  }

  /**
   * Get user by ID
   *
   * @param {string} userId User ID
   * @returns {Promise<SafeUser | null>} User data or null
   */
  async getUser(userId: string): Promise<SafeUser | null> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      return user ? this.toSafeUser(user) : null;
    } catch (error) {
      console.error('[AuthManager] Failed to get user:', error);
      return null;
    }
  }

  /**
   * Update user profile
   *
   * @param {string} userId User ID
   * @param {UpdateUserRequest} updates Fields to update
   * @returns {Promise<SafeUser>} Updated user
   * @throws {AuthException} If update fails
   */
  async updateUser(userId: string, updates: UpdateUserRequest): Promise<SafeUser> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new AuthException(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      // Update user
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.email) {
        // Check email not already used
        const existing = await db.query.users.findFirst({
          where: and(
            eq(users.email, updates.email.toLowerCase()),
            eq(users.id, userId, false)
          ),
        });
        if (existing) {
          throw new AuthException(
            AuthErrorCode.INVALID_CREDENTIALS,
            'Email already in use',
            409
          );
        }
        updateData.email = updates.email.toLowerCase();
      }

      if (updates.role) {
        updateData.role = updates.role;
      }

      if (updates.permissions) {
        updateData.permissions = JSON.stringify(updates.permissions);
      }

      if (updates.emailVerified !== undefined) {
        updateData.emailVerified = updates.emailVerified;
      }

      if (updates.isActive !== undefined) {
        updateData.isActive = updates.isActive;
      }

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId));

      const updated = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!updated) {
        throw new AuthException(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found after update',
          500
        );
      }

      return this.toSafeUser(updated);
    } catch (error) {
      if (error instanceof AuthException) throw error;

      console.error('[AuthManager] User update failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'User update failed',
        500
      );
    }
  }

  /**
   * Change user password
   *
   * @param {string} userId User ID
   * @param {string} currentPassword Current password (for verification)
   * @param {string} newPassword New password
   * @returns {Promise<boolean>} True if changed
   * @throws {AuthException} If change fails
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    try {
      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        throw new AuthException(
          AuthErrorCode.USER_NOT_FOUND,
          'User not found',
          404
        );
      }

      // Verify current password
      if (!user.passwordHash) {
        throw new AuthException(
          AuthErrorCode.INVALID_CREDENTIALS,
          'User does not have password',
          400
        );
      }

      const valid = await bcryptjs.compare(currentPassword, user.passwordHash);
      if (!valid) {
        throw new AuthException(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Current password is incorrect',
          401
        );
      }

      // Validate new password
      this.validatePassword(newPassword);

      // Hash and update
      const newHash = await bcryptjs.hash(newPassword, this.bcryptRounds);

      await db
        .update(users)
        .set({ passwordHash: newHash, updatedAt: new Date() })
        .where(eq(users.id, userId));

      // Invalidate all refresh tokens for security
      await db
        .delete(refreshTokens)
        .where(eq(refreshTokens.userId, userId));

      return true;
    } catch (error) {
      if (error instanceof AuthException) throw error;

      console.error('[AuthManager] Password change failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Password change failed',
        500
      );
    }
  }

  /**
   * Request password reset
   *
   * @param {string} email User email
   * @returns {Promise<string>} Reset token (send via email)
   */
  async requestPasswordReset(email: string): Promise<string> {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });

      if (!user) {
        // Don't reveal if email exists
        return crypto.randomUUID();
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // TODO: Store in database
      // await db.insert(passwordResets).values({
      //   id: crypto.randomUUID(),
      //   userId: user.id,
      //   token: hashToken(token),
      //   expiresAt,
      //   createdAt: new Date()
      // });

      return token; // Send via email to user
    } catch (error) {
      console.error('[AuthManager] Password reset request failed:', error);
      return '';
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Convert User to SafeUser (remove password hash)
   *
   * @private
   */
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    return {
      ...safe,
      permissions: typeof safe.permissions === 'string'
        ? JSON.parse(safe.permissions)
        : safe.permissions || [],
    };
  }

  /**
   * Validate email format
   *
   * @private
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Invalid email format',
        400
      );
    }
  }

  /**
   * Validate password strength
   *
   * **Requirements:**
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   *
   * @private
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Password must be at least 8 characters',
        400
      );
    }

    if (!/[A-Z]/.test(password)) {
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Password must contain uppercase letter',
        400
      );
    }

    if (!/[a-z]/.test(password)) {
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Password must contain lowercase letter',
        400
      );
    }

    if (!/\d/.test(password)) {
      throw new AuthException(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Password must contain number',
        400
      );
    }
  }

  /**
   * Store refresh token in database
   *
   * @private
   */
  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.insert(refreshTokens).values({
      id: crypto.randomUUID(),
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    });
  }

  /**
   * Track failed login attempt
   *
   * @private
   */
  private async trackLoginAttempt(email: string, ipAddress: string): Promise<void> {
    try {
      await db.insert(loginAttempts).values({
        id: crypto.randomUUID(),
        email,
        ipAddress,
        createdAt: new Date(),
      });
    } catch (error) {
      console.error('[AuthManager] Failed to track login attempt:', error);
    }
  }

  /**
   * Clear failed login attempts
   *
   * @private
   */
  private async clearLoginAttempts(email: string): Promise<void> {
    try {
      await db
        .delete(loginAttempts)
        .where(eq(loginAttempts.email, email));
    } catch (error) {
      console.error('[AuthManager] Failed to clear login attempts:', error);
    }
  }

  /**
   * Check if account is locked out
   *
   * @private
   */
  private async isAccountLockedOut(email: string): Promise<boolean> {
    try {
      const lockoutThreshold = new Date(Date.now() - this.lockoutDuration * 1000);

      const recentFailures = await db.query.loginAttempts.findMany({
        where: and(
          eq(loginAttempts.email, email),
          gt(loginAttempts.createdAt, lockoutThreshold)
        ),
      });

      return recentFailures.length >= this.maxLoginAttempts;
    } catch (error) {
      console.error('[AuthManager] Failed to check lockout:', error);
      return false;
    }
  }
}

// Export singleton getter
export const getAuthManager = () => AuthManager.getInstance();
