/**
 * @fileoverview Provider System Exports
 *
 * This module provides the main entry point for the OAuth provider system.
 * It exports all types, the base class, registry, and individual providers.
 *
 * @module integrations/providers
 * @version 1.0.0
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

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
} from './types';

export { IntegrationError, ErrorCodes } from './types';

// =============================================================================
// BASE CLASS EXPORTS
// =============================================================================

export { OAuthProviderBase } from './base';
export type { PKCEValues } from './base';

// =============================================================================
// REGISTRY EXPORTS
// =============================================================================

export { ProviderRegistry, getProviderRegistry } from './registry';

// =============================================================================
// GOOGLE PROVIDER EXPORTS
// =============================================================================

export { GoogleProvider, createGoogleProvider, GOOGLE_SCOPES } from './google';
export type { GoogleScope } from './google';

// =============================================================================
// PROVIDER INITIALIZATION
// =============================================================================

/**
 * Initialize and register all available OAuth providers.
 *
 * This function should be called during application startup to register
 * all OAuth providers that have valid credentials configured.
 *
 * Providers are only registered if their required environment variables
 * are present. Missing credentials result in a warning log but do not
 * cause initialization to fail.
 *
 * @example
 * ```typescript
 * // In your application startup
 * import { initializeProviders } from './shared-services/integrations/providers';
 *
 * // Initialize all providers
 * initializeProviders();
 *
 * // Now providers are available via the registry
 * const registry = ProviderRegistry.getInstance();
 * const googleProvider = registry.get('google');
 * ```
 */
export function initializeProviders(): void {
  const { ProviderRegistry } = require('./registry');
  const { createGoogleProvider } = require('./google');

  const registry = ProviderRegistry.getInstance();

  // Register Google provider if credentials are available
  const googleProvider = createGoogleProvider();
  if (googleProvider) {
    registry.register(googleProvider);
    console.log('[Integrations] Registered Google OAuth provider');
  }

  // Log summary
  const count = registry.count();
  if (count > 0) {
    console.log(`[Integrations] Initialized ${count} OAuth provider(s)`);
  } else {
    console.warn(
      '[Integrations] No OAuth providers registered. ' +
        'Check environment variables for provider credentials.'
    );
  }

  // Future providers will be registered here:
  // - Twitter: createTwitterProvider()
  // - LinkedIn: createLinkedInProvider()
  // - etc.
}
