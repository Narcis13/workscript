/**
 * API Key Manager
 *
 * Manages API keys for programmatic/machine-to-machine authentication.
 *
 * ============ API KEY CONCEPT ============
 *
 * **What are API Keys?**
 * Tokens for server-to-server or third-party integrations.
 * Similar to Stripe, GitHub, or AWS API keys.
 *
 * **Format (Stripe-style):**
 * ```
 * wks_live_abcd1234efgh5678ijkl9012mnop3456
 * └─┬──┘ └┬┘  └───────────┬───────────┘
 *   │     │              │
 *   │  environment    random part
 *   │  (live/test)
 *   prefix (workscript)
 * ```
 *
 * **Security Model:**
 * 1. Generate random key on creation
 * 2. Hash with SHA-256 immediately
 * 3. Return unhashed key ONLY on creation
 * 4. Store only hash in database
 * 5. On validation: hash incoming key, compare with stored hash
 * 6. If database compromised, keys are useless (can't be used)
 *
 * **Why hash?**
 * - If DB is breached, attacker gets hashes, not keys
 * - Can't use a hash as a key (one-way function)
 * - Compare with passwords: bcrypt hashes, API keys: SHA-256 hashes
 * - Different algorithms because keys are random, passwords aren't
 *
 * **vs JWT:**
 * - JWT: Stateless, long claims, used with every request, can't revoke
 * - API Key: Stateful, short identifier, used as credential, can revoke
 * - API Keys: Better for long-lived access (integrations)
 * - JWT: Better for user sessions
 *
 * @module auth/APIKeyManager
 */

import { createHash, randomBytes } from 'crypto';
import { db } from '../../db';
import {
  apiKeys,
  ApiKey,
  NewApiKey,
  Permission,
  Role,
  SafeUser,
  AuthException,
  AuthErrorCode,
  ApiKeyData,
  ApiKeyResponse,
  CreateApiKeyRequest,
} from '../../db';
import { PermissionManager } from './PermissionManager';
import { eq, and, gt } from 'drizzle-orm';

/**
 * API Key Manager Class
 *
 * **Responsibilities:**
 * - Generate API keys (Stripe-style format with prefix)
 * - Hash keys securely (SHA-256)
 * - Validate API keys in requests
 * - Track key usage (last used timestamp)
 * - Manage key lifecycle (create, list, revoke, expire)
 *
 * **Design:** Singleton for consistent key handling
 *
 * @class APIKeyManager
 * @example
 * const keyManager = APIKeyManager.getInstance();
 *
 * // Create new API key
 * const result = await keyManager.createKey(user.id, {
 *   name: 'Production Integration',
 *   permissions: [Permission.WORKFLOW_EXECUTE]
 * });
 * console.log('Share with user:', result.key);
 * // Never show again - only on creation!
 *
 * // Validate key from request header
 * const keyData = await keyManager.validateKey(incomingKey);
 * if (keyData) {
 *   // Key valid, use keyData.userId and keyData.permissions
 * }
 */
export class APIKeyManager {
  private static instance: APIKeyManager | null = null;
  private permissionManager = PermissionManager.getInstance();

  // Configuration
  private readonly keyPrefix = 'wks'; // 'workscript' prefix
  private readonly environment = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  private readonly hashAlgorithm = 'sha256';

  /**
   * Private constructor - use getInstance()
   */
  private constructor() {}

  /**
   * Get singleton instance
   *
   * @static
   * @returns {APIKeyManager}
   */
  static getInstance(): APIKeyManager {
    if (!APIKeyManager.instance) {
      APIKeyManager.instance = new APIKeyManager();
    }
    return APIKeyManager.instance;
  }

  /**
   * Generate a new API key string
   *
   * **Format:** `wks_live_xxxxx` or `wks_test_xxxxx`
   *
   * **Security:**
   * - 32 random bytes = 256 bits of entropy
   * - Hex encoded = 64 characters
   * - Total length: 3 + 1 + 4 + 1 + 64 = 73 chars
   * - Collision probability: negligible
   *
   * @returns {string} Unhashed API key (return to user immediately)
   *
   * @example
   * const key = keyManager.generateKey();
   * // Returns: 'wks_test_a7f3b2c9e1d4f5a8b2c7e1f4a8b2c7e1'
   */
  private generateKey(): string {
    // Generate 32 random bytes = 256 bits of entropy
    const randomPart = randomBytes(32).toString('hex');

    // Format: wks_[live|test]_[random]
    return `${this.keyPrefix}_${this.environment}_${randomPart}`;
  }

  /**
   * Hash an API key using SHA-256
   *
   * **Why SHA-256?**
   * - One-way function: hash can't be reversed
   * - Fast: good for high-volume API requests
   * - Deterministic: same key always produces same hash
   * - Industry standard for secrets
   *
   * **Process:**
   * 1. Create hasher with SHA-256
   * 2. Update with key string
   * 3. Return hex digest (64 chars)
   *
   * @param {string} key The unhashed API key
   * @returns {string} SHA-256 hash of the key
   *
   * @example
   * const hash = keyManager.hashKey('wks_test_abc123');
   * // Returns: 'a7f3b2c9e1d4f5a8b2c7e1f4a8b2c7e1...'
   */
  private hashKey(key: string): string {
    return createHash(this.hashAlgorithm).update(key).digest('hex');
  }

  /**
   * Create a new API key for a user
   *
   * **Process:**
   * 1. Generate new random key
   * 2. Hash the key
   * 3. Store hash in database (not the key!)
   * 4. Return unhashed key (only this once)
   *
   * **Important:** Key is ONLY returned on creation.
   * Once user navigates away, can't retrieve it again.
   * User must save it securely.
   *
   * @param {string} userId User who owns this key
   * @param {CreateApiKeyRequest} request Key creation parameters
   * @returns {Promise<ApiKeyResponse>} Key response including unhashed key
   * @throws {AuthException} If creation fails
   *
   * @example
   * const result = await keyManager.createKey(user.id, {
   *   name: 'Mobile App',
   *   permissions: [Permission.WORKFLOW_EXECUTE],
   *   rateLimit: 500
   * });
   *
   * // result.key = 'wks_test_abc123...' (SHOW THIS TO USER)
   * // result.id = 'key_123...' (database ID)
   *
   * // Once user leaves, key is gone - can't recover!
   */
  async createKey(
    userId: string,
    request: CreateApiKeyRequest
  ): Promise<ApiKeyResponse> {
    try {
      // 1. Generate new random key
      const plainKey = this.generateKey();

      // 2. Hash for storage
      const hashedKey = this.hashKey(plainKey);

      // 3. Determine permissions
      const permissions = request.permissions || [
        Permission.WORKFLOW_READ,
        Permission.WORKFLOW_EXECUTE,
      ];

      // 4. Determine expiry
      let expiresAt: Date | null = null;
      if (request.expiresAt) {
        expiresAt = new Date(request.expiresAt);
      }

      // 5. Insert into database
      const keyId = crypto.randomUUID();
      const now = new Date();

      await db.insert(apiKeys).values({
        id: keyId,
        userId,
        name: request.name,
        keyHash: hashedKey,
        permissions: JSON.stringify(permissions),
        rateLimit: request.rateLimit || parseInt(process.env.API_KEY_RATE_LIMIT || '1000', 10),
        expiresAt,
        createdAt: now,
      });

      // 6. Return key response (including unhashed key)
      return {
        id: keyId,
        userId,
        name: request.name,
        key: plainKey, // ONLY TIME THIS IS RETURNED
        permissions,
        rateLimit: request.rateLimit || 1000,
        expiresAt,
        createdAt: now,
      };
    } catch (error) {
      console.error('[APIKeyManager] Key creation failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_API_KEY,
        'Failed to create API key',
        500
      );
    }
  }

  /**
   * Validate an API key from a request
   *
   * **Process:**
   * 1. Hash incoming key
   * 2. Look up hash in database
   * 3. Check if key is expired
   * 4. Update last used timestamp
   * 5. Return key data if valid
   *
   * **Usage:** In authentication middleware
   *
   * @param {string} plainKey The unhashed key from request header
   * @returns {Promise<ApiKeyData | null>} Key data if valid, null otherwise
   *
   * @example
   * const keyData = await keyManager.validateKey(req.headers['x-api-key']);
   * if (keyData) {
   *   console.log('Authenticated user:', keyData.userId);
   *   console.log('Permissions:', keyData.permissions);
   * } else {
   *   return c.json({ error: 'Invalid API key' }, 401);
   * }
   */
  async validateKey(plainKey: string): Promise<ApiKeyData | null> {
    try {
      // 1. Hash the incoming key
      const hashedKey = this.hashKey(plainKey);

      // 2. Look up in database
      const keyRecord = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.keyHash, hashedKey),
      });

      if (!keyRecord) {
        return null; // Key doesn't exist
      }

      // 3. Check if expired
      const now = new Date();
      if (keyRecord.expiresAt && keyRecord.expiresAt < now) {
        return null; // Key expired
      }

      // 4. Update last used timestamp
      await db
        .update(apiKeys)
        .set({ lastUsedAt: now })
        .where(eq(apiKeys.id, keyRecord.id));

      // 5. Return key data (without storing actual key)
      return {
        id: keyRecord.id,
        userId: keyRecord.userId,
        name: keyRecord.name,
        permissions: JSON.parse(keyRecord.permissions as string),
        rateLimit: keyRecord.rateLimit,
        lastUsedAt: keyRecord.lastUsedAt || undefined,
        expiresAt: keyRecord.expiresAt || undefined,
        createdAt: keyRecord.createdAt,
      };
    } catch (error) {
      console.error('[APIKeyManager] Key validation failed:', error);
      return null;
    }
  }

  /**
   * Get all keys for a user
   *
   * @param {string} userId User ID
   * @returns {Promise<ApiKeyData[]>} Array of user's API keys
   *
   * @example
   * const keys = await keyManager.getKeysForUser(user.id);
   * // Don't show actual keys, only IDs and metadata
   */
  async getKeysForUser(userId: string): Promise<ApiKeyData[]> {
    try {
      const records = await db.query.apiKeys.findMany({
        where: eq(apiKeys.userId, userId),
      });

      return records.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        permissions: JSON.parse(r.permissions as string),
        rateLimit: r.rateLimit,
        lastUsedAt: r.lastUsedAt || undefined,
        expiresAt: r.expiresAt || undefined,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      console.error('[APIKeyManager] Failed to get keys:', error);
      return [];
    }
  }

  /**
   * Delete (revoke) an API key
   *
   * @param {string} keyId Key ID
   * @param {string} userId Verify ownership
   * @returns {Promise<boolean>} True if key was deleted
   *
   * @example
   * const revoked = await keyManager.revokeKey(key.id, user.id);
   */
  async revokeKey(keyId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const key = await db.query.apiKeys.findFirst({
        where: eq(apiKeys.id, keyId),
      });

      if (!key || key.userId !== userId) {
        return false; // Not found or not owned by user
      }

      // Delete
      await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
      return true;
    } catch (error) {
      console.error('[APIKeyManager] Failed to revoke key:', error);
      return false;
    }
  }

  /**
   * Clean up expired keys
   *
   * Should be called periodically (e.g., daily via cron job)
   *
   * @returns {Promise<number>} Number of keys deleted
   *
   * @example
   * // In a scheduled job
   * const deleted = await keyManager.cleanupExpiredKeys();
   * console.log(`Deleted ${deleted} expired keys`);
   */
  async cleanupExpiredKeys(): Promise<number> {
    try {
      const now = new Date();

      const result = await db
        .delete(apiKeys)
        .where(and(gt(apiKeys.expiresAt, new Date('1970-01-01')), gt(now, apiKeys.expiresAt!)));

      return result.changes || 0;
    } catch (error) {
      console.error('[APIKeyManager] Cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Check if key has permission
   *
   * @param {ApiKeyData} keyData The API key
   * @param {Permission} permission Permission to check
   * @returns {boolean} True if key has permission
   *
   * @example
   * if (keyManager.hasPermission(keyData, Permission.WORKFLOW_EXECUTE)) {
   *   // Key can execute workflows
   * }
   */
  hasPermission(keyData: ApiKeyData, permission: Permission): boolean {
    return keyData.permissions.includes(permission);
  }

  /**
   * Check if key has any of multiple permissions
   *
   * @param {ApiKeyData} keyData The API key
   * @param {Permission[]} permissions Permissions to check
   * @returns {boolean} True if key has at least one
   */
  hasAnyPermission(keyData: ApiKeyData, permissions: Permission[]): boolean {
    return permissions.some((p) => this.hasPermission(keyData, p));
  }

  /**
   * Get key prefix (for documentation)
   *
   * @returns {string} The prefix used for keys
   * @example
   * const prefix = keyManager.getKeyPrefix();
   * console.log(`API keys start with: ${prefix}`);
   */
  getKeyPrefix(): string {
    return `${this.keyPrefix}_${this.environment}`;
  }
}

// Export singleton getter
export const getAPIKeyManager = () => APIKeyManager.getInstance();
