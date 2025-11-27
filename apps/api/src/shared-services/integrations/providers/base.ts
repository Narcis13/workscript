/**
 * @fileoverview Base class for OAuth providers
 *
 * This module provides an abstract base class that implements common
 * functionality for OAuth providers, including PKCE and state generation.
 * All OAuth provider implementations should extend this class.
 *
 * @module integrations/providers/base
 * @version 1.0.0
 */

import { createHash, randomBytes } from 'crypto';
import type {
  OAuthProvider,
  OAuthProviderConfig,
  AuthUrlOptions,
  AuthUrlResult,
  OAuthTokens,
  OAuthUserProfile,
} from './types';

// =============================================================================
// PKCE TYPES
// =============================================================================

/**
 * PKCE (Proof Key for Code Exchange) values for secure OAuth flows.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7636
 */
export interface PKCEValues {
  /** The code verifier - a high-entropy cryptographic random string */
  codeVerifier: string;

  /**
   * The code challenge - derived from the code verifier using SHA256
   * This is sent in the authorization request
   */
  codeChallenge: string;
}

// =============================================================================
// BASE PROVIDER CLASS
// =============================================================================

/**
 * Abstract base class for OAuth providers.
 *
 * This class provides common implementation for OAuth providers including:
 * - PKCE generation (code_verifier and code_challenge)
 * - State token generation for CSRF protection
 * - Configuration management
 *
 * Provider implementations must extend this class and implement
 * the abstract properties and methods.
 *
 * @example
 * ```typescript
 * class GoogleProvider extends OAuthProviderBase {
 *   readonly id = 'google';
 *   readonly name = 'Google';
 *   readonly version = '1.0.0';
 *   readonly defaultScopes = ['email', 'profile'];
 *   readonly supportsPKCE = true;
 *   readonly supportsRefresh = true;
 *
 *   getAuthorizationUrl(options?: AuthUrlOptions): AuthUrlResult {
 *     const state = this.generateState();
 *     const pkce = this.generatePKCE();
 *     // ... build URL
 *     return { url, state, codeVerifier: pkce.codeVerifier };
 *   }
 *
 *   // ... implement other abstract methods
 * }
 * ```
 *
 * @abstract
 */
export abstract class OAuthProviderBase implements OAuthProvider {
  // ===========================================================================
  // ABSTRACT PROPERTIES (must be implemented by subclasses)
  // ===========================================================================

  /**
   * Unique identifier for this provider (e.g., 'google', 'twitter').
   * Must be unique across all registered providers.
   */
  abstract readonly id: string;

  /**
   * Human-readable name of the provider (e.g., 'Google', 'Twitter').
   * Used for display purposes.
   */
  abstract readonly name: string;

  /**
   * Version of this provider implementation.
   * Use semantic versioning (e.g., '1.0.0').
   */
  abstract readonly version: string;

  /**
   * Default OAuth scopes requested by this provider.
   * Can be overridden in AuthUrlOptions.
   */
  abstract readonly defaultScopes: string[];

  /**
   * Whether this provider supports PKCE (Proof Key for Code Exchange).
   * Recommended to be true for all providers that support it.
   */
  abstract readonly supportsPKCE: boolean;

  /**
   * Whether this provider supports token refresh.
   * Most OAuth 2.0 providers support refresh tokens.
   */
  abstract readonly supportsRefresh: boolean;

  // ===========================================================================
  // PROTECTED CONFIGURATION
  // ===========================================================================

  /**
   * Provider configuration containing credentials and settings.
   * Protected so subclasses can access it.
   */
  protected readonly config: OAuthProviderConfig;

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  /**
   * Create a new OAuth provider instance.
   *
   * @param config - Provider configuration including credentials
   * @throws {Error} If required configuration is missing
   *
   * @example
   * ```typescript
   * const provider = new GoogleProvider({
   *   clientId: process.env.GOOGLE_CLIENT_ID!,
   *   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
   *   redirectUri: 'http://localhost:3013/integrations/oauth/google/callback',
   *   scopes: ['email', 'profile'],
   * });
   * ```
   */
  constructor(config: OAuthProviderConfig) {
    if (!config.clientId) {
      throw new Error('OAuth provider config: clientId is required');
    }
    if (!config.clientSecret) {
      throw new Error('OAuth provider config: clientSecret is required');
    }
    if (!config.redirectUri) {
      throw new Error('OAuth provider config: redirectUri is required');
    }

    this.config = config;
  }

  // ===========================================================================
  // ABSTRACT METHODS (must be implemented by subclasses)
  // ===========================================================================

  /**
   * Generate an authorization URL for the OAuth flow.
   *
   * Subclasses must implement this to build the provider-specific
   * authorization URL with all required parameters.
   *
   * @param options - Options for customizing the authorization request
   * @returns The authorization URL, state token, and optional PKCE verifier
   */
  abstract getAuthorizationUrl(options?: AuthUrlOptions): AuthUrlResult;

  /**
   * Exchange an authorization code for tokens.
   *
   * Subclasses must implement this to handle the token exchange
   * with the provider's token endpoint.
   *
   * @param code - The authorization code from the OAuth callback
   * @param codeVerifier - The PKCE code verifier (required if PKCE was used)
   * @returns The OAuth tokens (access token, refresh token, etc.)
   * @throws {IntegrationError} If the exchange fails
   */
  abstract exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens>;

  /**
   * Refresh an expired access token.
   *
   * Subclasses must implement this to obtain new access tokens
   * using the refresh token.
   *
   * @param refreshToken - The refresh token from the original authorization
   * @returns New OAuth tokens (may not include a new refresh token)
   * @throws {IntegrationError} If refresh fails
   */
  abstract refreshToken(refreshToken: string): Promise<OAuthTokens>;

  /**
   * Get the user's profile from the provider.
   *
   * Subclasses must implement this to fetch user information
   * using the access token.
   *
   * @param accessToken - A valid access token
   * @returns The user's profile information
   * @throws {IntegrationError} If the profile cannot be retrieved
   */
  abstract getUserProfile(accessToken: string): Promise<OAuthUserProfile>;

  // ===========================================================================
  // PROTECTED HELPER METHODS
  // ===========================================================================

  /**
   * Generate PKCE values for secure OAuth flows.
   *
   * PKCE (Proof Key for Code Exchange) is an extension to the OAuth 2.0
   * Authorization Code flow that prevents authorization code interception attacks.
   *
   * The code_verifier is a cryptographically random string that is:
   * - Generated using crypto.randomBytes (32 bytes = 256 bits of entropy)
   * - Encoded as base64url (URL-safe characters)
   * - Between 43 and 128 characters long (this generates ~43 characters)
   *
   * The code_challenge is:
   * - A SHA256 hash of the code_verifier
   * - Encoded as base64url
   *
   * @returns PKCE values containing codeVerifier and codeChallenge
   *
   * @see https://datatracker.ietf.org/doc/html/rfc7636
   *
   * @example
   * ```typescript
   * const pkce = this.generatePKCE();
   * // pkce.codeVerifier: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
   * // pkce.codeChallenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
   * ```
   *
   * @protected
   */
  protected generatePKCE(): PKCEValues {
    // Generate a cryptographically random code verifier
    // 32 bytes provides 256 bits of entropy
    const codeVerifier = this.base64UrlEncode(randomBytes(32));

    // Generate the code challenge by hashing the verifier with SHA256
    const codeChallenge = this.base64UrlEncode(
      createHash('sha256').update(codeVerifier).digest()
    );

    return {
      codeVerifier,
      codeChallenge,
    };
  }

  /**
   * Generate a cryptographically random state token for CSRF protection.
   *
   * The state parameter is used to prevent cross-site request forgery (CSRF)
   * attacks during the OAuth flow. It is:
   * - Generated using crypto.randomBytes (32 bytes = 256 bits of entropy)
   * - Encoded as base64url (URL-safe characters)
   * - Stored on the server and validated during callback
   *
   * @returns A random state token (base64url encoded, ~43 characters)
   *
   * @example
   * ```typescript
   * const state = this.generateState();
   * // state: "KVrZjUHvBgMYKNdQl9pZzwXRN2uWxJq..."
   * ```
   *
   * @protected
   */
  protected generateState(): string {
    // Generate 32 bytes of random data (256 bits of entropy)
    return this.base64UrlEncode(randomBytes(32));
  }

  /**
   * Encode a buffer as base64url (URL-safe base64).
   *
   * Base64url encoding replaces characters that are not URL-safe:
   * - '+' is replaced with '-'
   * - '/' is replaced with '_'
   * - Padding '=' characters are removed
   *
   * This encoding is required for OAuth PKCE and state parameters.
   *
   * @param buffer - The buffer to encode
   * @returns Base64url encoded string
   *
   * @see https://datatracker.ietf.org/doc/html/rfc4648#section-5
   *
   * @protected
   */
  protected base64UrlEncode(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Get the effective scopes for an authorization request.
   *
   * Returns custom scopes from options if provided,
   * otherwise returns the provider's default scopes,
   * falling back to the config scopes if no defaults are set.
   *
   * @param options - Authorization options that may contain custom scopes
   * @returns Array of scope strings to request
   *
   * @protected
   */
  protected getEffectiveScopes(options?: AuthUrlOptions): string[] {
    if (options?.scopes && options.scopes.length > 0) {
      return options.scopes;
    }
    if (this.defaultScopes && this.defaultScopes.length > 0) {
      return this.defaultScopes;
    }
    return this.config.scopes;
  }

  // ===========================================================================
  // OPTIONAL METHODS (can be overridden by subclasses)
  // ===========================================================================

  /**
   * Revoke an access or refresh token.
   *
   * This method is optional. Subclasses can override it to implement
   * token revocation if the provider supports it.
   *
   * @param token - The token to revoke
   * @throws {Error} If not implemented by the provider
   */
  async revokeToken(_token: string): Promise<void> {
    throw new Error(`Token revocation not implemented for ${this.name} provider`);
  }

  /**
   * Validate an access token.
   *
   * This method is optional. Subclasses can override it to implement
   * token validation if the provider supports it.
   *
   * Default implementation makes a getUserProfile call to validate.
   *
   * @param accessToken - The token to validate
   * @returns True if the token is valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.getUserProfile(accessToken);
      return true;
    } catch {
      return false;
    }
  }
}

export default OAuthProviderBase;
