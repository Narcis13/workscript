/**
 * @fileoverview Google OAuth Provider Implementation
 *
 * This module provides the Google OAuth2 provider implementation for the
 * OAuth Integrations System. It uses the googleapis library to handle
 * authorization, token exchange, refresh, and user profile retrieval.
 *
 * Features:
 * - PKCE support for enhanced security
 * - Gmail and Google Profile scopes by default
 * - Automatic token refresh handling
 * - User profile retrieval via Gmail API
 *
 * @module integrations/providers/google
 * @version 1.0.0
 */

import { google } from 'googleapis';
import { OAuthProviderBase } from '../base';
import { IntegrationError, ErrorCodes } from '../types';
import type {
  OAuthProviderConfig,
  AuthUrlOptions,
  AuthUrlResult,
  OAuthTokens,
  OAuthUserProfile,
} from '../types';

// =============================================================================
// GOOGLE SCOPES
// =============================================================================

/**
 * Predefined Google OAuth scopes for easy reference.
 *
 * Use these constants when configuring the Google provider to ensure
 * correct scope URLs are used.
 *
 * @example
 * ```typescript
 * const provider = createGoogleProvider();
 * // Uses GMAIL_READONLY, GMAIL_SEND, USERINFO_EMAIL, USERINFO_PROFILE by default
 * ```
 */
export const GOOGLE_SCOPES = {
  /** Read-only access to Gmail messages and labels */
  GMAIL_READONLY: 'https://www.googleapis.com/auth/gmail.readonly',

  /** Send email on behalf of the user */
  GMAIL_SEND: 'https://www.googleapis.com/auth/gmail.send',

  /** Create, read, and send email (excludes delete/modify) */
  GMAIL_COMPOSE: 'https://www.googleapis.com/auth/gmail.compose',

  /** Full access to Gmail messages (read, send, delete, modify) */
  GMAIL_MODIFY: 'https://www.googleapis.com/auth/gmail.modify',

  /** Access user's email address */
  USERINFO_EMAIL: 'https://www.googleapis.com/auth/userinfo.email',

  /** Access user's basic profile info (name, picture) */
  USERINFO_PROFILE: 'https://www.googleapis.com/auth/userinfo.profile',

  /** Full Google Drive access */
  DRIVE: 'https://www.googleapis.com/auth/drive',

  /** Access to files created/opened by this app only */
  DRIVE_FILE: 'https://www.googleapis.com/auth/drive.file',

  /** Read-only access to Google Calendar */
  CALENDAR_READONLY: 'https://www.googleapis.com/auth/calendar.readonly',

  /** Full access to Google Calendar */
  CALENDAR: 'https://www.googleapis.com/auth/calendar',

  /** OpenID Connect scopes */
  OPENID: 'openid',
  EMAIL: 'email',
  PROFILE: 'profile',
} as const;

/** Type for Google scope values */
export type GoogleScope = (typeof GOOGLE_SCOPES)[keyof typeof GOOGLE_SCOPES];

// =============================================================================
// GOOGLE PROVIDER CLASS
// =============================================================================

/**
 * Google OAuth2 Provider implementation.
 *
 * This provider handles Google OAuth2 authentication flows including:
 * - Authorization URL generation with PKCE support
 * - Authorization code exchange for tokens
 * - Token refresh using refresh tokens
 * - User profile retrieval via Gmail API
 *
 * @example
 * ```typescript
 * const provider = new GoogleProvider({
 *   clientId: process.env.GOOGLE_CLIENT_ID!,
 *   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 *   redirectUri: 'http://localhost:3013/integrations/oauth/google/callback',
 *   scopes: [
 *     GOOGLE_SCOPES.GMAIL_READONLY,
 *     GOOGLE_SCOPES.GMAIL_SEND,
 *     GOOGLE_SCOPES.USERINFO_EMAIL,
 *     GOOGLE_SCOPES.USERINFO_PROFILE,
 *   ],
 * });
 *
 * // Generate authorization URL
 * const { url, state, codeVerifier } = provider.getAuthorizationUrl({
 *   usePKCE: true,
 *   accessType: 'offline',
 *   prompt: 'consent',
 * });
 *
 * // Exchange code for tokens
 * const tokens = await provider.exchangeCode(code, codeVerifier);
 *
 * // Get user profile
 * const profile = await provider.getUserProfile(tokens.accessToken);
 * ```
 */
export class GoogleProvider extends OAuthProviderBase {
  // ===========================================================================
  // PROVIDER METADATA
  // ===========================================================================

  /** Unique identifier for this provider */
  readonly id = 'google';

  /** Human-readable name */
  readonly name = 'Google';

  /** Provider implementation version */
  readonly version = '1.0.0';

  /**
   * Default OAuth scopes for Google.
   * Includes Gmail read/send and basic profile information.
   */
  readonly defaultScopes = [
    GOOGLE_SCOPES.GMAIL_READONLY,
    GOOGLE_SCOPES.GMAIL_SEND,
    GOOGLE_SCOPES.USERINFO_EMAIL,
    GOOGLE_SCOPES.USERINFO_PROFILE,
  ];

  /** Google supports PKCE for enhanced security */
  readonly supportsPKCE = true;

  /** Google supports refresh tokens for long-lived access */
  readonly supportsRefresh = true;

  // ===========================================================================
  // PRIVATE PROPERTIES
  // ===========================================================================

  /** Google OAuth2 client instance */
  private oauth2Client: InstanceType<typeof google.auth.OAuth2>;

  // ===========================================================================
  // CONSTRUCTOR
  // ===========================================================================

  /**
   * Create a new Google OAuth provider instance.
   *
   * @param config - Provider configuration with Google OAuth credentials
   */
  constructor(config: OAuthProviderConfig) {
    super(config);

    // Initialize the Google OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }

  // ===========================================================================
  // AUTHORIZATION URL GENERATION
  // ===========================================================================

  /**
   * Generate a Google OAuth authorization URL.
   *
   * This method creates a URL that users can be redirected to in order to
   * authorize access to their Google account. It supports PKCE and various
   * prompt options.
   *
   * @param options - Options for customizing the authorization request
   * @returns The authorization URL, state token, and optional PKCE verifier
   *
   * @example
   * ```typescript
   * const { url, state, codeVerifier } = provider.getAuthorizationUrl({
   *   usePKCE: true,
   *   accessType: 'offline',
   *   prompt: 'consent',
   * });
   *
   * // Store state and codeVerifier for callback validation
   * // Redirect user to url
   * ```
   */
  getAuthorizationUrl(options?: AuthUrlOptions): AuthUrlResult {
    // Generate state for CSRF protection
    const state = options?.state || this.generateState();

    // Get effective scopes
    const scopes = this.getEffectiveScopes(options);

    // Build authorization options
    const authOptions: {
      access_type: 'online' | 'offline';
      scope: string[];
      state: string;
      prompt?: string;
      login_hint?: string;
      code_challenge?: string;
      code_challenge_method?: 'S256';
    } = {
      access_type: options?.accessType || 'offline',
      scope: scopes,
      state,
    };

    // Add prompt if specified
    if (options?.prompt) {
      authOptions.prompt = options.prompt;
    }

    // Add login hint if specified
    if (options?.loginHint) {
      authOptions.login_hint = options.loginHint;
    }

    // Generate PKCE values if requested
    let codeVerifier: string | undefined;
    if (options?.usePKCE) {
      const pkce = this.generatePKCE();
      codeVerifier = pkce.codeVerifier;
      authOptions.code_challenge = pkce.codeChallenge;
      authOptions.code_challenge_method = 'S256';
    }

    // Generate the authorization URL
    // Note: Type assertion needed due to googleapis type definitions being overly strict
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = this.oauth2Client.generateAuthUrl(authOptions as any);

    return {
      url,
      state,
      codeVerifier,
    };
  }

  // ===========================================================================
  // TOKEN EXCHANGE
  // ===========================================================================

  /**
   * Exchange an authorization code for OAuth tokens.
   *
   * This method exchanges the authorization code received from the OAuth
   * callback for access and refresh tokens. If PKCE was used during
   * authorization, the code verifier must be provided.
   *
   * @param code - The authorization code from the OAuth callback
   * @param codeVerifier - The PKCE code verifier (required if PKCE was used)
   * @returns Normalized OAuth tokens
   * @throws {IntegrationError} If the token exchange fails
   *
   * @example
   * ```typescript
   * try {
   *   const tokens = await provider.exchangeCode(code, storedCodeVerifier);
   *   console.log('Access token:', tokens.accessToken);
   *   console.log('Refresh token:', tokens.refreshToken);
   *   console.log('Expires at:', tokens.expiresAt);
   * } catch (error) {
   *   if (error instanceof IntegrationError) {
   *     console.error('Token exchange failed:', error.message);
   *   }
   * }
   * ```
   */
  async exchangeCode(code: string, codeVerifier?: string): Promise<OAuthTokens> {
    try {
      // Build token request options
      const tokenOptions: { code: string; codeVerifier?: string } = { code };

      if (codeVerifier) {
        tokenOptions.codeVerifier = codeVerifier;
      }

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(tokenOptions);

      // Validate that we received an access token
      if (!tokens.access_token) {
        throw new IntegrationError(
          'No access token received from Google',
          ErrorCodes.TOKEN_EXCHANGE_FAILED,
          this.id
        );
      }

      // Calculate expiration time
      let expiresAt: Date | undefined;
      let expiresIn: number | undefined;

      if (tokens.expiry_date) {
        expiresAt = new Date(tokens.expiry_date);
        expiresIn = Math.floor((tokens.expiry_date - Date.now()) / 1000);
      }

      // Return normalized tokens
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenType: tokens.token_type || 'Bearer',
        expiresIn,
        expiresAt,
        scope: tokens.scope || undefined,
        raw: tokens as Record<string, unknown>,
      };
    } catch (error) {
      // Handle Google API errors
      if (error instanceof IntegrationError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new IntegrationError(
        `Failed to exchange authorization code: ${errorMessage}`,
        ErrorCodes.TOKEN_EXCHANGE_FAILED,
        this.id,
        { originalError: errorMessage }
      );
    }
  }

  // ===========================================================================
  // TOKEN REFRESH
  // ===========================================================================

  /**
   * Refresh an expired access token using a refresh token.
   *
   * Google typically does not return a new refresh token on refresh,
   * so the original refresh token should be preserved.
   *
   * @param refreshToken - The refresh token from the original authorization
   * @returns New OAuth tokens (usually without a new refresh token)
   * @throws {IntegrationError} If refresh fails (e.g., refresh token expired/revoked)
   *
   * @example
   * ```typescript
   * try {
   *   const newTokens = await provider.refreshToken(storedRefreshToken);
   *   // Update stored access token
   *   // Keep original refresh token if newTokens.refreshToken is undefined
   * } catch (error) {
   *   if (error instanceof IntegrationError) {
   *     if (error.code === ErrorCodes.REFRESH_TOKEN_EXPIRED) {
   *       // User needs to re-authenticate
   *     }
   *   }
   * }
   * ```
   */
  async refreshToken(refreshToken: string): Promise<OAuthTokens> {
    try {
      // Set the refresh token on the client
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      // Refresh the access token
      const { credentials } = await this.oauth2Client.refreshAccessToken();

      // Validate that we received an access token
      if (!credentials.access_token) {
        throw new IntegrationError(
          'No access token received from Google refresh',
          ErrorCodes.REFRESH_TOKEN_EXPIRED,
          this.id
        );
      }

      // Calculate expiration time
      let expiresAt: Date | undefined;
      let expiresIn: number | undefined;

      if (credentials.expiry_date) {
        expiresAt = new Date(credentials.expiry_date);
        expiresIn = Math.floor((credentials.expiry_date - Date.now()) / 1000);
      }

      // Return normalized tokens
      // Note: Google usually doesn't return a new refresh token
      return {
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || undefined,
        tokenType: credentials.token_type || 'Bearer',
        expiresIn,
        expiresAt,
        scope: credentials.scope || undefined,
        raw: credentials as Record<string, unknown>,
      };
    } catch (error) {
      // Handle Google API errors
      if (error instanceof IntegrationError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for invalid_grant error (refresh token expired or revoked)
      if (errorMessage.includes('invalid_grant')) {
        throw new IntegrationError(
          'Refresh token expired or revoked. Re-authentication required.',
          ErrorCodes.REFRESH_TOKEN_EXPIRED,
          this.id,
          { originalError: errorMessage }
        );
      }

      throw new IntegrationError(
        `Failed to refresh token: ${errorMessage}`,
        ErrorCodes.OAUTH_ERROR,
        this.id,
        { originalError: errorMessage }
      );
    }
  }

  // ===========================================================================
  // USER PROFILE
  // ===========================================================================

  /**
   * Get the user's profile from Google.
   *
   * This method uses the Gmail API to retrieve the user's profile,
   * including their email address. For more detailed profile information,
   * the userinfo.profile scope should be included.
   *
   * @param accessToken - A valid Google access token
   * @returns Normalized user profile information
   * @throws {IntegrationError} If profile retrieval fails
   *
   * @example
   * ```typescript
   * const profile = await provider.getUserProfile(accessToken);
   * console.log('Email:', profile.email);
   * console.log('ID:', profile.id);
   * ```
   */
  async getUserProfile(accessToken: string): Promise<OAuthUserProfile> {
    try {
      // Set credentials on the OAuth client
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      // Initialize Gmail API client
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get user's Gmail profile
      const { data: gmailProfile } = await gmail.users.getProfile({
        userId: 'me',
      });

      // Gmail profile provides email address
      const email = gmailProfile.emailAddress || undefined;

      // Try to get additional profile info from People API if available
      let name: string | undefined;
      let picture: string | undefined;
      let rawUserInfo: Record<string, unknown> = {};

      try {
        // Use oauth2 userinfo endpoint for additional profile data
        const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
        const { data: userInfo } = await oauth2.userinfo.get();

        name = userInfo.name || undefined;
        picture = userInfo.picture || undefined;
        rawUserInfo = userInfo as Record<string, unknown>;
      } catch {
        // userinfo.profile scope may not be granted, continue without it
      }

      return {
        id: email || gmailProfile.emailAddress || 'unknown',
        email,
        name,
        picture,
        raw: {
          gmail: gmailProfile,
          userInfo: rawUserInfo,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Check for invalid token errors
      if (
        errorMessage.includes('invalid_token') ||
        errorMessage.includes('Invalid Credentials') ||
        errorMessage.includes('401')
      ) {
        throw new IntegrationError(
          'Access token is invalid or expired',
          ErrorCodes.INVALID_TOKEN,
          this.id,
          { originalError: errorMessage }
        );
      }

      throw new IntegrationError(
        `Failed to get user profile: ${errorMessage}`,
        ErrorCodes.OAUTH_ERROR,
        this.id,
        { originalError: errorMessage }
      );
    }
  }

  // ===========================================================================
  // OPTIONAL METHODS
  // ===========================================================================

  /**
   * Revoke a Google OAuth token.
   *
   * This method revokes the token, effectively logging the user out of
   * your application's access to their Google account.
   *
   * @param token - The access token or refresh token to revoke
   * @throws {IntegrationError} If revocation fails
   *
   * @example
   * ```typescript
   * await provider.revokeToken(accessToken);
   * // Token is now invalid
   * ```
   */
  override async revokeToken(token: string): Promise<void> {
    try {
      await this.oauth2Client.revokeToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new IntegrationError(
        `Failed to revoke token: ${errorMessage}`,
        ErrorCodes.OAUTH_ERROR,
        this.id,
        { originalError: errorMessage }
      );
    }
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a Google OAuth provider instance from environment variables.
 *
 * This factory function creates a GoogleProvider instance using credentials
 * from environment variables. Returns null if required credentials are missing.
 *
 * Required environment variables:
 * - GOOGLE_CLIENT_ID: OAuth client ID from Google Cloud Console
 * - GOOGLE_CLIENT_SECRET: OAuth client secret from Google Cloud Console
 *
 * Optional environment variables:
 * - API_BASE_URL: Base URL for the API server (default: http://localhost:3013)
 *
 * @returns GoogleProvider instance, or null if credentials are missing
 *
 * @example
 * ```typescript
 * const provider = createGoogleProvider();
 * if (provider) {
 *   registry.register(provider);
 *   console.log('Google OAuth provider registered');
 * } else {
 *   console.warn('Google OAuth not configured - missing credentials');
 * }
 * ```
 */
export function createGoogleProvider(): GoogleProvider | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn(
      '[Integrations] Google OAuth credentials not configured. ' +
        'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.'
    );
    return null;
  }

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3013';
  const redirectUri = `${baseUrl}/integrations/oauth/google/callback`;

  return new GoogleProvider({
    clientId,
    clientSecret,
    redirectUri,
    scopes: [
      GOOGLE_SCOPES.GMAIL_READONLY,
      GOOGLE_SCOPES.GMAIL_SEND,
      GOOGLE_SCOPES.USERINFO_EMAIL,
      GOOGLE_SCOPES.USERINFO_PROFILE,
    ],
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export default GoogleProvider;
