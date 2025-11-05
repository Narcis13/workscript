/**
 * Plugin System - Public API
 *
 * Central export point for the plugin system.
 * Import everything related to plugins from this module.
 */

// Export all types
export type {
  SaaSPlugin,
  PluginMetadata,
  PluginRoute,
  PluginNode,
  PluginSchema,
  AIManifest,
  PluginLifecycle,
  PluginContext,
  PluginLogger,
  PluginValidationResult,
  PluginLoadResult,
  PluginRegistryEntry,
  PluginDiscoveryOptions,
  PluginHealthStatus,
} from './types';

// Export loader and registry instances
export { pluginLoader, PluginLoader } from './loader';
export { pluginRegistry, PluginRegistry } from './registry';
