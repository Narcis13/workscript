/**
 * @fileoverview OAuth Integrations System - Main Entry Point
 *
 * This module provides the main entry point for the OAuth integrations system.
 * It exports all public APIs, types, and initialization functions needed to
 * work with OAuth connections.
 *
 * ## Quick Start
 *
 * ```typescript
 * import {
 *   IntegrationManager,
 *   initializeProviders,
 *   ProviderRegistry,
 * } from './shared-services/integrations';
 *
 * // 1. Initialize providers at application startup
 * initializeProviders();
 *
 * // 2. Use IntegrationManager for all operations
 * const manager = IntegrationManager.getInstance();
 *
 * // 3. Start an OAuth flow
 * const { authUrl, state } = await manager.initiateOAuth('google', {
 *   userId: 'user_123',
 * });
 *
 * // 4. Handle callback after user authorization
 * const connection = await manager.handleCallback('google', code, state);
 *
 * // 5. Get tokens for API calls
 * const accessToken = await manager.getValidToken(connection.id);
 * ```
 *
 * @module integrations
 * @version 1.0.0
 */

// =============================================================================
// INTEGRATION MANAGER EXPORTS
// =============================================================================

export {
  IntegrationManager,
  getIntegrationManager,
  type InitiateOAuthOptions,
  type InitiateOAuthResult,
  type TestConnectionResult,
  type ConnectionDetails,
} from './IntegrationManager';

// =============================================================================
// TOKEN MANAGER EXPORTS
// =============================================================================

export { TokenManager, getTokenManager } from './TokenManager';

// =============================================================================
// REPOSITORY EXPORTS
// =============================================================================

export {
  ConnectionRepository,
  getConnectionRepository,
  type ConnectionFilters,
  type ConnectionTokenUpdate,
} from './repositories/connectionRepository';

// =============================================================================
// PROVIDER SYSTEM EXPORTS
// =============================================================================

// Types
export type {
  OAuthProviderConfig,
  OAuthTokens,
  OAuthUserProfile,
  AuthUrlOptions,
  AuthUrlResult,
  OAuthProvider,
  ConnectionSummary,
  DecryptedConnection,
  ProviderMetadata,
  OAuthStateMetadata,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
  ErrorCode,
} from './providers';

// Error handling
export { IntegrationError, ErrorCodes } from './providers';

// Base class and helpers
export { OAuthProviderBase, type PKCEValues } from './providers';

// Registry
export { ProviderRegistry, getProviderRegistry } from './providers';

// Google provider
export {
  GoogleProvider,
  createGoogleProvider,
  GOOGLE_SCOPES,
  type GoogleScope,
} from './providers';

// Initialization
export { initializeProviders } from './providers';

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

/**
 * Default export provides quick access to the main facade.
 *
 * @example
 * ```typescript
 * import IntegrationManager from './shared-services/integrations';
 *
 * const manager = IntegrationManager.getInstance();
 * ```
 */
export { IntegrationManager as default } from './IntegrationManager';
