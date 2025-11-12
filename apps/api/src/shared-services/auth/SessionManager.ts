/**
 * Session Manager
 *
 * Handles session-based authentication (alternative to JWT).
 *
 * ============ SESSION vs JWT ============
 *
 * **JWT (Stateless):**
 * - Token contains user data
 * - No database lookup needed
 * - Can't revoke immediately
 * - Scales horizontally (no server affinity needed)
 * - Better for APIs and SPAs
 *
 * **Sessions (Stateful):**
 * - Server stores user data
 * - Database lookup on each request
 * - Can revoke immediately
 * - Requires sticky sessions in load balancers
 * - Better for traditional web apps
 *
 * **This Implementation:**
 * - Uses Redis (fast) with fallback to in-memory
 * - Session ID sent as cookie (or custom header)
 * - Server stores user data server-side
 * - Can logout immediately
 * - Better for long-lived authenticated sessions
 *
 * @module auth/SessionManager
 */

import type { NewSession } from '../../db';
import { sessions } from '../../db';
import { db } from '../../db';
import { eq } from 'drizzle-orm';
import type { SessionData } from './types';
import { AuthException, AuthErrorCode } from './types';

/**
 * Session Manager Class
 *
 * **Responsibilities:**
 * - Create sessions for authenticated users
 * - Retrieve session data
 * - Delete sessions (logout)
 * - Extend session expiry
 * - Clean up expired sessions
 *
 * **Storage Options:**
 * 1. Redis: Fast, in-memory, distributed (production)
 * 2. MySQL: Durable, slower, for MVP (current)
 * 3. In-memory: Fast, loses on restart (dev only)
 *
 * **Design:** Singleton
 *
 * @class SessionManager
 * @example
 * const sessionManager = SessionManager.getInstance();
 *
 * // Create session
 * const sessionId = await sessionManager.createSession({
 *   userId: user.id,
 *   email: user.email,
 *   role: user.role,
 *   lastActivity: new Date(),
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent']
 * });
 *
 * // Set cookie: sessionId
 * // Client will send: Cookie: sessionId=...
 *
 * // Retrieve session
 * const session = await sessionManager.getSession(sessionId);
 * if (session && !sessionManager.isExpired(session)) {
 *   // Session valid, use session data
 * }
 *
 * // Logout
 * await sessionManager.deleteSession(sessionId);
 */
export class SessionManager {
  private static instance: SessionManager | null = null;

  // In-memory storage fallback (dev only)
  private memoryStore = new Map<string, { data: SessionData; expiresAt: number }>();

  // Configuration
  private readonly sessionExpiry = parseInt(process.env.SESSION_EXPIRY || '86400', 10); // 24 hours

  /**
   * Private constructor - use getInstance()
   */
  private constructor() {
    // Start cleanup job (every hour)
    this.startCleanupJob();
  }

  /**
   * Get singleton instance
   *
   * @static
   * @returns {SessionManager}
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session
   *
   * **Process:**
   * 1. Generate session ID
   * 2. Store session data (user info, metadata)
   * 3. Set expiry timestamp
   * 4. Return session ID (send as cookie)
   *
   * @param {SessionData} data User session data
   * @returns {Promise<string>} Session ID
   *
   * @example
   * const sessionId = await sessionManager.createSession({
   *   userId: 'user_123',
   *   email: 'user@example.com',
   *   role: 'user',
   *   lastActivity: new Date(),
   *   ipAddress: '192.168.1.1',
   *   userAgent: 'Mozilla/5.0...'
   * });
   */
  async createSession(data: SessionData): Promise<string> {
    try {
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + this.sessionExpiry * 1000);

      // Try database first, fallback to memory
      try {
        await db.insert(sessions).values({
          id: sessionId,
          userId: data.userId,
          data: JSON.stringify(data),
          expiresAt,
          createdAt: new Date(),
        });
      } catch (dbError) {
        console.warn('[SessionManager] Database insert failed, using memory:', dbError);
        // Fallback to memory store
        this.memoryStore.set(sessionId, {
          data,
          expiresAt: expiresAt.getTime(),
        });
      }

      return sessionId;
    } catch (error) {
      console.error('[SessionManager] Session creation failed:', error);
      throw new AuthException(
        AuthErrorCode.INVALID_TOKEN,
        'Failed to create session',
        500
      );
    }
  }

  /**
   * Get session data
   *
   * **Process:**
   * 1. Look up session ID in storage
   * 2. Check if expired
   * 3. Return data if valid
   *
   * @param {string} sessionId Session ID from cookie
   * @returns {Promise<SessionData | null>} Session data or null if invalid/expired
   *
   * @example
   * const session = await sessionManager.getSession(sessionId);
   * if (session) {
   *   console.log('User:', session.userId);
   * } else {
   *   console.log('Invalid or expired session');
   * }
   */
  async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      // Check memory store first (faster)
      const memSession = this.memoryStore.get(sessionId);
      if (memSession) {
        if (memSession.expiresAt > Date.now()) {
          return memSession.data;
        } else {
          // Expired
          this.memoryStore.delete(sessionId);
          return null;
        }
      }

      // Check database
      const session = await db.query.sessions.findFirst({
        where: eq(sessions.id, sessionId),
      });

      if (!session) {
        return null;
      }

      // Check expiration
      if (session.expiresAt < new Date()) {
        // Expired - delete it
        await db.delete(sessions).where(eq(sessions.id, sessionId));
        return null;
      }

      // Parse data
      const data = typeof session.data === 'string'
        ? JSON.parse(session.data)
        : session.data;

      return data as SessionData;
    } catch (error) {
      console.error('[SessionManager] Session retrieval failed:', error);
      return null;
    }
  }

  /**
   * Extend session expiry
   *
   * Called on user activity to keep session alive.
   *
   * @param {string} sessionId Session ID
   * @returns {Promise<boolean>} True if extended
   *
   * @example
   * // On user activity
   * await sessionManager.extendSession(sessionId);
   */
  async extendSession(sessionId: string): Promise<boolean> {
    try {
      const expiresAt = new Date(Date.now() + this.sessionExpiry * 1000);

      // Memory store
      const memSession = this.memoryStore.get(sessionId);
      if (memSession) {
        memSession.expiresAt = expiresAt.getTime();
        return true;
      }

      // Database
      await db
        .update(sessions)
        .set({ expiresAt })
        .where(eq(sessions.id, sessionId));

      return true;
    } catch (error) {
      console.error('[SessionManager] Session extension failed:', error);
      return false;
    }
  }

  /**
   * Delete a session (logout)
   *
   * @param {string} sessionId Session ID
   * @returns {Promise<boolean>} True if deleted
   *
   * @example
   * // On logout
   * await sessionManager.deleteSession(sessionId);
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Memory store
      const removed = this.memoryStore.delete(sessionId);

      // Database
      try {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
      } catch (dbError) {
        // Ignore - already removed from memory
      }

      return removed || true;
    } catch (error) {
      console.error('[SessionManager] Session deletion failed:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a user
   *
   * Used for "logout all devices" feature.
   *
   * @param {string} userId User ID
   * @returns {Promise<number>} Number of sessions deleted
   *
   * @example
   * // User clicks "logout all devices"
   * const count = await sessionManager.deleteUserSessions(user.id);
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      // Memory store
      let memCount = 0;
      for (const [sessionId, { data }] of this.memoryStore) {
        if (data.userId === userId) {
          this.memoryStore.delete(sessionId);
          memCount++;
        }
      }

      // Database
      let dbCount = 0;
      try {
        const result = await db
          .delete(sessions)
          .where(eq(sessions.userId, userId));
        dbCount = result.changes || 0;
      } catch (dbError) {
        // Ignore DB errors
      }

      return memCount + dbCount;
    } catch (error) {
      console.error('[SessionManager] Failed to delete user sessions:', error);
      return 0;
    }
  }

  /**
   * Check if session is expired
   *
   * @param {SessionData} session Session data
   * @returns {boolean} True if expired
   */
  isExpired(session: any): boolean {
    if (!session.expiresAt) {
      return false;
    }

    const expiresAt = new Date(session.expiresAt);
    return expiresAt < new Date();
  }

  /**
   * Clean up expired sessions
   *
   * Called periodically by cleanup job.
   *
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();

      // Memory store
      let memCount = 0;
      for (const [sessionId, { expiresAt }] of this.memoryStore) {
        if (expiresAt < now.getTime()) {
          this.memoryStore.delete(sessionId);
          memCount++;
        }
      }

      // Database
      let dbCount = 0;
      try {
        const result = await db
          .delete(sessions)
          .where(eq(sessions.expiresAt, now) as any);
        dbCount = result.changes || 0;
      } catch (dbError) {
        console.warn('[SessionManager] Database cleanup failed:', dbError);
      }

      return memCount + dbCount;
    } catch (error) {
      console.error('[SessionManager] Cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Start periodic cleanup job
   *
   * Removes expired sessions every hour.
   *
   * @private
   */
  private startCleanupJob(): void {
    // Run cleanup every hour
    const cleanupInterval = 60 * 60 * 1000; // 1 hour

    setInterval(async () => {
      try {
        const deleted = await this.cleanupExpiredSessions();
        if (deleted > 0) {
          console.log(`[SessionManager] Cleaned up ${deleted} expired sessions`);
        }
      } catch (error) {
        console.error('[SessionManager] Cleanup job failed:', error);
      }
    }, cleanupInterval);

    // Run first cleanup after 1 hour
    setTimeout(async () => {
      await this.cleanupExpiredSessions();
    }, cleanupInterval);
  }

  /**
   * Get session count (for monitoring)
   *
   * @returns {Promise<{ memory: number; database: number }>}
   */
  async getSessionStats(): Promise<{ memory: number; database: number }> {
    return {
      memory: this.memoryStore.size,
      database: 0, // Would need count query
    };
  }
}

// Export singleton getter
export const getSessionManager = () => SessionManager.getInstance();
