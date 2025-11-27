/**
 * @fileoverview Provider Registry for OAuth Integrations System
 *
 * This module provides a singleton registry for managing OAuth provider instances.
 * Providers are registered at application startup and can be retrieved by ID
 * for use in OAuth flows.
 *
 * @module integrations/providers/registry
 * @version 1.0.0
 */

import type { OAuthProvider, ProviderMetadata } from './types';

/**
 * Singleton registry for OAuth providers.
 *
 * The ProviderRegistry maintains a collection of OAuth provider instances
 * and provides methods for registration, retrieval, and discovery.
 *
 * @example
 * ```typescript
 * // Get the singleton instance
 * const registry = ProviderRegistry.getInstance();
 *
 * // Register a provider
 * registry.register(googleProvider);
 *
 * // Get a provider by ID
 * const provider = registry.get('google');
 * if (provider) {
 *   const authUrl = provider.getAuthorizationUrl({ usePKCE: true });
 * }
 *
 * // List all providers
 * const allProviders = registry.getAll();
 * ```
 */
export class ProviderRegistry {
  /** Singleton instance */
  private static instance: ProviderRegistry;

  /** Map of provider ID to provider instance */
  private providers: Map<string, OAuthProvider> = new Map();

  /**
   * Private constructor to enforce singleton pattern.
   */
  private constructor() {}

  /**
   * Get the singleton instance of ProviderRegistry.
   *
   * @returns The ProviderRegistry singleton instance
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * ```
   */
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  /**
   * Register an OAuth provider.
   *
   * If a provider with the same ID already exists, it will be replaced.
   *
   * @param provider - The OAuth provider instance to register
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * registry.register(new GoogleProvider(config));
   * ```
   */
  public register(provider: OAuthProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister an OAuth provider by ID.
   *
   * @param providerId - The ID of the provider to unregister
   * @returns True if the provider was removed, false if not found
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const wasRemoved = registry.unregister('google');
   * ```
   */
  public unregister(providerId: string): boolean {
    return this.providers.delete(providerId);
  }

  /**
   * Get an OAuth provider by ID.
   *
   * @param providerId - The ID of the provider to retrieve
   * @returns The provider instance, or undefined if not found
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const provider = registry.get('google');
   * if (provider) {
   *   // Use the provider
   * }
   * ```
   */
  public get(providerId: string): OAuthProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Check if a provider is registered.
   *
   * @param providerId - The ID of the provider to check
   * @returns True if the provider is registered
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * if (registry.has('google')) {
   *   // Google OAuth is available
   * }
   * ```
   */
  public has(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get all registered OAuth providers.
   *
   * @returns Array of all registered provider instances
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const providers = registry.getAll();
   * providers.forEach(p => console.log(p.name));
   * ```
   */
  public getAll(): OAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all registered provider IDs.
   *
   * @returns Array of provider IDs
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const ids = registry.getAllIds(); // ['google', 'twitter', ...]
   * ```
   */
  public getAllIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get public metadata for all registered providers.
   *
   * This is useful for API responses where you want to expose
   * provider information without exposing internal implementation.
   *
   * @returns Array of provider metadata objects
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * const metadata = registry.getAllMetadata();
   * // Returns array of { id, name, version, defaultScopes, supportsPKCE, supportsRefresh }
   * ```
   */
  public getAllMetadata(): ProviderMetadata[] {
    return this.getAll().map((provider) => ({
      id: provider.id,
      name: provider.name,
      version: provider.version,
      defaultScopes: provider.defaultScopes,
      supportsPKCE: provider.supportsPKCE,
      supportsRefresh: provider.supportsRefresh,
    }));
  }

  /**
   * Get the total number of registered providers.
   *
   * @returns The count of registered providers
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * console.log(`${registry.count()} providers registered`);
   * ```
   */
  public count(): number {
    return this.providers.size;
  }

  /**
   * Clear all registered providers.
   *
   * This is primarily useful for testing scenarios.
   *
   * @example
   * ```typescript
   * const registry = ProviderRegistry.getInstance();
   * registry.clear();
   * ```
   */
  public clear(): void {
    this.providers.clear();
  }

  /**
   * Reset the singleton instance.
   *
   * This is primarily useful for testing scenarios where you need
   * a fresh registry instance.
   *
   * @internal
   */
  public static resetInstance(): void {
    if (ProviderRegistry.instance) {
      ProviderRegistry.instance.clear();
    }
    ProviderRegistry.instance = undefined as unknown as ProviderRegistry;
  }
}

/**
 * Convenience function to get the ProviderRegistry singleton.
 *
 * @returns The ProviderRegistry singleton instance
 *
 * @example
 * ```typescript
 * import { getProviderRegistry } from './registry';
 *
 * const registry = getProviderRegistry();
 * const provider = registry.get('google');
 * ```
 */
export function getProviderRegistry(): ProviderRegistry {
  return ProviderRegistry.getInstance();
}

export default ProviderRegistry;
