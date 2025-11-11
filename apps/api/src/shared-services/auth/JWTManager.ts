/**
 * JWT Token Manager
 *
 * Handles all JWT (JSON Web Token) operations: generation, validation, and verification.
 *
 * ============ HOW JWT AUTHENTICATION WORKS ============
 *
 * **JWT (JSON Web Token) is a stateless authentication method:**
 *
 * 1. USER LOGS IN
 *    ```
 *    POST /auth/login { email, password }
 *    ↓ (server verifies password)
 *    Returns: { accessToken, refreshToken }
 *    ```
 *
 * 2. TOKEN FORMAT - JWT has 3 parts separated by dots (.)
 *    ```
 *    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
 *    eyJ1c2VySWQiOiIxMjMiLCJlbWFpbCI6Im...
 *    SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 *
 *    [HEADER].[PAYLOAD].[SIGNATURE]
 *    ```
 *
 * 3. HEADER - Specifies algorithm and type
 *    ```json
 *    {
 *      "alg": "HS256",      // HMAC using SHA-256
 *      "typ": "JWT"         // This is a JWT
 *    }
 *    ```
 *
 * 4. PAYLOAD - Contains user claims (not secret!)
 *    ```json
 *    {
 *      "userId": "user_123",
 *      "email": "user@example.com",
 *      "role": "user",
 *      "permissions": ["workflow:read"],
 *      "exp": 1674567890,   // Expiration time (Unix timestamp)
 *      "iat": 1674564290    // Issued at time (Unix timestamp)
 *    }
 *    ```
 *
 * 5. SIGNATURE - Prevents tampering
 *    ```
 *    HMACSHA256(
 *      base64UrlEncode(header) + "." + base64UrlEncode(payload),
 *      secret
 *    )
 *    ```
 *
 * **KEY SECURITY POINTS:**
 * ✓ Payload is Base64 encoded (not encrypted) - anyone can read it
 * ✓ Signature proves it wasn't tampered with - only server knows secret
 * ✓ If someone modifies payload, signature won't match - server rejects it
 * ✓ Token is STATELESS - no database lookup needed for validation
 * ✓ But tokens can't be revoked mid-life (live until expiry)
 *
 * **TWO TOKEN SYSTEM (Access + Refresh):**
 *
 * Access Token (Short-lived: 15 minutes)
 * ├─ Contains full user info
 * ├─ Used with every request
 * ├─ If stolen, limited damage (15 min window)
 * └─ Expires quickly, forces refresh
 *
 * Refresh Token (Long-lived: 7 days)
 * ├─ Contains only userId
 * ├─ Stored securely (httpOnly cookie or secure storage)
 * ├─ Used only to get new access token
 * ├─ If stolen, more damage but usually detected
 * └─ Stored in database for revocation
 *
 * **FLOW:**
 * 1. Client stores both tokens
 * 2. Client sends access token with each request
 * 3. When access token expires (401 response)
 * 4. Client sends refresh token to get new access token
 * 5. Server validates refresh token, issues new access token
 * 6. Client retries original request with new token
 *
 * @module auth/JWTManager
 * @see https://jwt.io for interactive JWT debugging
 * @see https://tools.ietf.org/html/rfc7519 for JWT specification
 */

import { sign, verify } from 'hono/jwt';
import { JWTPayload, RefreshTokenPayload, AuthErrorCode, AuthException, JWTConfig } from './types';

/**
 * JWT Manager Class
 *
 * Provides all JWT token operations with proper expiration and rotation.
 *
 * **Responsibilities:**
 * - Generate access tokens (short-lived, full user info)
 * - Generate refresh tokens (long-lived, minimal info)
 * - Verify tokens haven't been tampered with
 * - Decode tokens to extract claims
 * - Handle token expiration checking
 *
 * **Design Pattern:** Singleton (use JWTManager.getInstance())
 *
 * @class JWTManager
 * @example
 * const jwtManager = JWTManager.getInstance();
 *
 * // Generate tokens on login
 * const { accessToken, refreshToken } = await jwtManager.generateTokens({
 *   userId: user.id,
 *   email: user.email,
 *   role: user.role,
 *   permissions: user.permissions
 * });
 *
 * // Verify access token on each request
 * const payload = await jwtManager.verifyAccessToken(token);
 * if (!payload) {
 *   // Token invalid or expired
 *   return refreshToken();
 * }
 */
export class JWTManager {
  // Singleton instance
  private static instance: JWTManager | null = null;

  // Configuration
  private readonly config: JWTConfig;

  /**
   * Private constructor - use getInstance() instead
   *
   * @param config JWT configuration from environment
   */
  private constructor(config?: Partial<JWTConfig>) {
    this.config = {
      secret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
      refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
      accessExpiry: parseInt(process.env.JWT_ACCESS_EXPIRY || '900', 10),   // 15 min default
      refreshExpiry: parseInt(process.env.JWT_REFRESH_EXPIRY || '604800', 10), // 7 days default
      ...config,
    };

    // Validate secrets in production
    if (process.env.NODE_ENV === 'production') {
      if (
        this.config.secret.length < 32 ||
        this.config.refreshSecret.length < 32
      ) {
        throw new Error(
          'JWT_SECRET and JWT_REFRESH_SECRET must be at least 32 characters in production'
        );
      }
    }
  }

  /**
   * Get singleton instance
   *
   * **Pattern:** Singleton ensures only one JWTManager exists,
   * reusing the same secret configuration throughout the app.
   *
   * @static
   * @returns {JWTManager} The singleton instance
   * @example
   * const jwtManager = JWTManager.getInstance();
   */
  static getInstance(config?: Partial<JWTConfig>): JWTManager {
    if (!JWTManager.instance) {
      JWTManager.instance = new JWTManager(config);
    }
    return JWTManager.instance;
  }

  /**
   * Reset singleton (for testing)
   *
   * @static
   * @internal
   */
  static resetInstance(): void {
    JWTManager.instance = null;
  }

  /**
   * Generate access and refresh tokens for a user
   *
   * **Usage:** Called on successful login/registration
   *
   * **Process:**
   * 1. Create access token (short-lived, full user info)
   * 2. Create refresh token (long-lived, minimal info)
   * 3. Both are signed with their respective secrets
   * 4. Client stores both tokens
   *
   * **Security:**
   * - Access token expires in 15 minutes (limited exposure if stolen)
   * - Refresh token expires in 7 days (longer but can be revoked in DB)
   * - Separate secrets prevent using access token as refresh token
   *
   * @param {Omit<JWTPayload, 'exp' | 'iat'>} payload User info to encode
   * @returns {Promise<{ accessToken: string; refreshToken: string }>}
   * @throws {AuthException} If token generation fails
   *
   * @example
   * const tokens = await jwtManager.generateTokens({
   *   userId: 'user_123',
   *   email: 'user@example.com',
   *   role: 'user',
   *   permissions: ['workflow:read'],
   *   tenantId: 'tenant_456'
   * });
   * // Returns: { accessToken: 'eyJ...', refreshToken: 'eyJ...' }
   */
  async generateTokens(
    payload: Omit<JWTPayload, 'exp' | 'iat'>
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const now = Math.floor(Date.now() / 1000); // Current time in Unix timestamp

      // **ACCESS TOKEN** - Short-lived token with full payload
      // Includes all user information for quick permission checking
      const accessTokenPayload: JWTPayload = {
        ...payload,
        iat: now,
        exp: now + this.config.accessExpiry, // 15 minutes later
      };

      // Sign with access secret - prevents using refresh token as access token
      const accessToken = await sign(
        accessTokenPayload,
        this.config.secret,
        'HS256'
      );

      // **REFRESH TOKEN** - Long-lived token with minimal payload
      // Only includes userId to keep it simple
      // Even if stolen, attacker can't impersonate user (no role/permissions)
      const refreshTokenPayload: RefreshTokenPayload = {
        userId: payload.userId,
        iat: now,
        exp: now + this.config.refreshExpiry, // 7 days later
      };

      // Sign with refresh secret - different from access token secret
      const refreshToken = await sign(
        refreshTokenPayload,
        this.config.refreshSecret,
        'HS256'
      );

      return { accessToken, refreshToken };
    } catch (error) {
      console.error('[JWTManager] Token generation failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_TOKEN,
        'Failed to generate tokens',
        500
      );
    }
  }

  /**
   * Verify and decode an access token
   *
   * **Usage:** Called on every protected API request
   *
   * **Process:**
   * 1. Extract token from Authorization header
   * 2. Verify signature matches (detects tampering)
   * 3. Check expiration hasn't passed
   * 4. Return decoded payload if valid
   *
   * **Return value:**
   * - Returns full JWTPayload if valid (includes user info)
   * - Returns null if invalid or expired
   * - Never throws (graceful handling)
   *
   * **Security:**
   * - Signature verification: If payload was modified, signature won't match
   * - Expiration check: If > exp timestamp, token is invalid
   * - Error handling: Catching all errors (prevents leaking info via error messages)
   *
   * @param {string} token The JWT token to verify
   * @returns {Promise<JWTPayload | null>} Decoded payload if valid, null otherwise
   *
   * @example
   * const payload = await jwtManager.verifyAccessToken(token);
   * if (payload) {
   *   console.log('User:', payload.userId);
   *   console.log('Role:', payload.role);
   * } else {
   *   console.log('Invalid or expired token');
   * }
   */
  async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      // Hono's verify function:
      // 1. Decodes the token
      // 2. Verifies signature
      // 3. Throws if invalid
      // 4. Doesn't check expiration (we must check manually)

      const payload = (await verify(
        token,
        this.config.secret,
        'HS256'
      )) as JWTPayload;

      // Manually check expiration (verify doesn't do this)
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        // Token expired
        return null;
      }

      return payload;
    } catch (error) {
      // Silently fail - token is invalid for any reason
      // (signature mismatch, malformed, etc.)
      return null;
    }
  }

  /**
   * Verify and decode a refresh token
   *
   * **Usage:** Called when access token expires and client needs new one
   *
   * **Process:**
   * 1. Verify signature (detects tampering)
   * 2. Check expiration
   * 3. Return minimal payload if valid
   *
   * **Difference from access token:**
   * - Uses different secret (refreshSecret vs secret)
   * - Returns minimal payload (only userId)
   * - Client uses this to get new access token
   *
   * @param {string} token The refresh token to verify
   * @returns {Promise<RefreshTokenPayload | null>} Decoded payload if valid, null otherwise
   *
   * @example
   * const payload = await jwtManager.verifyRefreshToken(refreshToken);
   * if (payload) {
   *   // Refresh token is valid, issue new access token
   *   const user = await getUserById(payload.userId);
   *   const newAccessToken = await jwtManager.generateAccessToken(user);
   * }
   */
  async verifyRefreshToken(
    token: string
  ): Promise<RefreshTokenPayload | null> {
    try {
      const payload = (await verify(
        token,
        this.config.refreshSecret,
        'HS256'
      )) as RefreshTokenPayload;

      // Check expiration manually
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate new access token from a valid refresh token
   *
   * **Usage:** When client's access token expires
   *
   * **Process:**
   * 1. Verify refresh token is valid
   * 2. Fetch fresh user data from database
   * 3. Generate new access token with current user info
   *
   * **Why fetch fresh user data?**
   * - User's permissions might have changed since login
   * - User's role might have been updated
   * - User might be deactivated
   * - Database lookup prevents stale data
   *
   * @param {string} refreshToken The refresh token
   * @param {Function} getUserById Function to fetch user from database
   * @returns {Promise<string | null>} New access token or null if refresh token invalid
   *
   * @example
   * const newAccessToken = await jwtManager.refreshAccessToken(
   *   refreshToken,
   *   (userId) => db.query.users.findFirst({ where: eq(users.id, userId) })
   * );
   */
  async refreshAccessToken(
    refreshToken: string,
    getUserById: (userId: string) => Promise<any>
  ): Promise<string | null> {
    try {
      // 1. Verify refresh token
      const payload = await this.verifyRefreshToken(refreshToken);
      if (!payload) {
        return null; // Refresh token invalid or expired
      }

      // 2. Fetch fresh user data
      const user = await getUserById(payload.userId);
      if (!user) {
        return null; // User not found
      }

      // 3. Generate new access token with fresh user data
      const { accessToken } = await this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        tenantId: user.tenantId,
      });

      return accessToken;
    } catch (error) {
      console.error('[JWTManager] Token refresh failed:', error);
      return null;
    }
  }

  /**
   * Decode a token without verifying signature (unsafe, for debugging only)
   *
   * **WARNING:** This does NOT verify the token!
   * Anyone can create a fake token with this payload.
   * Only use for debugging or when you absolutely need unverified info.
   *
   * **DO NOT USE IN PRODUCTION AUTHENTICATION**
   *
   * @param {string} token The JWT token
   * @returns {JWTPayload | null} Decoded payload (unverified!)
   * @internal
   */
  decodeWithoutVerification(token: string): JWTPayload | null {
    try {
      // Split token into parts
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      // Decode payload (middle part)
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf-8')
      );

      return payload as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get time until token expires
   *
   * Useful for checking if token should be refreshed soon.
   *
   * @param {string} token The JWT token
   * @returns {number} Milliseconds until expiration, or -1 if expired/invalid
   *
   * @example
   * const msUntilExpiry = jwtManager.getTimeUntilExpiry(token);
   * if (msUntilExpiry < 60000) { // Less than 1 minute
   *   console.log('Token expiring soon, refresh now');
   * }
   */
  getTimeUntilExpiry(token: string): number {
    const payload = this.decodeWithoutVerification(token);
    if (!payload?.exp) return -1;

    const expiryMs = payload.exp * 1000;
    const nowMs = Date.now();
    return expiryMs - nowMs;
  }

  /**
   * Check if token is expired
   *
   * @param {string} token The JWT token
   * @returns {boolean} True if token is expired
   *
   * @example
   * if (jwtManager.isTokenExpired(token)) {
   *   console.log('Token has expired');
   * }
   */
  isTokenExpired(token: string): boolean {
    return this.getTimeUntilExpiry(token) <= 0;
  }

  /**
   * Check if token expires soon (within specified milliseconds)
   *
   * Useful for proactive token refresh.
   *
   * @param {string} token The JWT token
   * @param {number} thresholdMs Milliseconds before expiry (default: 60 seconds)
   * @returns {boolean} True if token expires within threshold
   *
   * @example
   * if (jwtManager.expiresWithin(token, 60000)) { // Within 1 minute
   *   console.log('Refresh token now');
   * }
   */
  expiresWithin(token: string, thresholdMs: number = 60000): boolean {
    return this.getTimeUntilExpiry(token) <= thresholdMs;
  }

  /**
   * Get configuration (for testing)
   *
   * @internal
   * @returns {JWTConfig} Current JWT configuration
   */
  getConfig(): JWTConfig {
    return { ...this.config };
  }
}

// Export singleton instance getter
export const getJWTManager = () => JWTManager.getInstance();
