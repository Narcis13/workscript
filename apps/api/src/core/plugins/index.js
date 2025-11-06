/**
 * Plugin System - Public API
 *
 * Central export point for the plugin system.
 * Import everything related to plugins from this module.
 */
// Export loader and registry instances
export { pluginLoader, PluginLoader } from './loader';
export { pluginRegistry, PluginRegistry } from './registry';
