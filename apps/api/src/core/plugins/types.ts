/**
 * Plugin System Type Definitions
 *
 * Comprehensive TypeScript interfaces for the SaaS plugin architecture.
 * Enables modular, extensible plugin system with lifecycle hooks, routing,
 * database schemas, workflow nodes, and AI discoverability.
 */

import type { Hono } from 'hono';

/**
 * Plugin metadata for discovery and identification
 */
export interface PluginMetadata {
  /** Unique plugin identifier (kebab-case, e.g., 'formflow') */
  id: string;

  /** Human-readable plugin name */
  name: string;

  /** Semantic version (e.g., '1.0.0') */
  version: string;

  /** Plugin description */
  description?: string;

  /** Plugin author/maintainer */
  author?: string;

  /** Plugin homepage or repository URL */
  homepage?: string;

  /** Plugin license identifier (e.g., 'MIT', 'Apache-2.0') */
  license?: string;
}

/**
 * Route configuration for plugin API endpoints
 */
export interface PluginRoute {
  /** Base path for plugin routes (e.g., '/formflow') */
  basePath: string;

  /** Hono router instance with plugin-specific routes */
  router: Hono;
}

/**
 * Workflow node registration for plugin-provided nodes
 */
export interface PluginNode {
  /** Node type identifier */
  nodeType: string;

  /** Path to node implementation file */
  nodePath: string;

  /** Node category (e.g., 'data', 'integration', 'ui') */
  category?: string;
}

/**
 * Database schema definition for plugin tables
 */
export interface PluginSchema {
  /** Database tables for this plugin */
  tables: any[];

  /** Optional migration files */
  migrations?: string[];

  /** Table name prefix (e.g., 'formflow_') */
  tablePrefix?: string;
}

/**
 * AI manifest for LLM discoverability
 * Helps AI assistants understand plugin capabilities and usage
 *
 * This is a flexible schema that supports both simple and comprehensive documentation.
 * LLMs can parse this to understand what the plugin can do and how to use it.
 */
export interface AIManifest {
  /** Plugin capabilities description - list of what the plugin can do */
  capabilities: string[];

  /** When to use this plugin - guidance for LLMs on when to recommend this plugin */
  when_to_use: string;

  /** Example use cases - can be simple or detailed with steps, payloads, etc. */
  examples?: Array<{
    scenario: string;
    workflow?: string | Record<string, any>;
    expected_outcome?: string;
    /** Additional fields for complex examples */
    [key: string]: any;
  }>;

  /**
   * Available API endpoints - supports both flat array and grouped object formats
   * Flat format: Array<{ path, method, description, parameters? }>
   * Grouped format: { category: { description, routes: [...] } }
   */
  endpoints?: Array<{
    path: string;
    method: string;
    description: string;
    parameters?: Record<string, any>;
  }> | Record<string, {
    description?: string;
    routes?: Array<Record<string, any>>;
    [key: string]: any;
  }>;

  /** Available workflow nodes */
  nodes?: Array<{
    nodeType: string;
    description: string;
    inputs?: string[];
    outputs?: string[];
  }>;

  /** WebSocket configuration for real-time events */
  websocket?: {
    endpoint?: string;
    channel?: string;
    description?: string;
    events?: Array<{ type: string; payload?: string; description?: string }>;
    [key: string]: any;
  };

  /** Database schema documentation */
  schema?: Record<string, {
    description?: string;
    fields?: string[];
    [key: string]: any;
  }>;

  /** Node categories for organization */
  nodeCategories?: Record<string, string[]>;

  /** Allow additional custom fields for plugin-specific documentation */
  [key: string]: any;
}

/**
 * Plugin lifecycle hooks
 */
export interface PluginLifecycle {
  /**
   * Called when plugin is loaded (before routes are mounted)
   * Use for initialization, validation, and setup
   */
  onLoad?: (context: PluginContext) => Promise<void>;

  /**
   * Called when plugin is unloaded (graceful shutdown)
   * Use for cleanup, closing connections, etc.
   */
  onUnload?: () => Promise<void>;

  /**
   * Health check function for monitoring
   * Return true if plugin is healthy, false otherwise
   */
  healthCheck?: () => Promise<boolean>;
}

/**
 * Plugin context provided during lifecycle hooks
 */
export interface PluginContext {
  /** Hono app instance */
  app: Hono;

  /** Plugin metadata */
  metadata: PluginMetadata;

  /** Environment variables (read-only access) */
  env: Record<string, string | undefined>;

  /** Logger instance */
  logger?: PluginLogger;
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  info: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

/**
 * Main plugin interface
 * All plugins must implement this interface
 */
export interface SaaSPlugin extends PluginMetadata, PluginLifecycle {
  /** Whether plugin is enabled */
  enabled: boolean;

  /** Plugin dependencies (other plugin IDs) */
  dependencies?: string[];

  /** Required environment variables */
  requiredEnvVars?: string[];

  /** Optional environment variables */
  optionalEnvVars?: string[];

  /** Plugin routes configuration */
  routes?: PluginRoute;

  /** Database schema (if plugin needs tables) */
  schema?: PluginSchema;

  /** Workflow nodes provided by this plugin */
  nodes?: PluginNode[];

  /** AI manifest for LLM discoverability */
  aiManifest?: AIManifest;
}

/**
 * Plugin validation result
 */
export interface PluginValidationResult {
  /** Whether plugin is valid */
  valid: boolean;

  /** Validation errors (if any) */
  errors?: string[];

  /** Validation warnings (non-blocking) */
  warnings?: string[];
}

/**
 * Plugin load result
 */
export interface PluginLoadResult {
  /** Whether plugin loaded successfully */
  success: boolean;

  /** Plugin instance (if successful) */
  plugin?: SaaSPlugin;

  /** Error message (if failed) */
  error?: string;

  /** Load time in milliseconds */
  loadTime?: number;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  /** Plugin instance */
  plugin: SaaSPlugin;

  /** When plugin was loaded */
  loadedAt: Date;

  /** Plugin status */
  status: 'active' | 'inactive' | 'error';

  /** Error message (if status is 'error') */
  errorMessage?: string;
}

/**
 * Plugin discovery options
 */
export interface PluginDiscoveryOptions {
  /** Plugins directory path */
  pluginsDir: string;

  /** Whether to auto-enable discovered plugins */
  autoEnable?: boolean;

  /** Plugin IDs to explicitly enable */
  enabledPlugins?: string[];

  /** Plugin IDs to explicitly disable */
  disabledPlugins?: string[];
}

/**
 * Plugin health status
 */
export interface PluginHealthStatus {
  /** Plugin ID */
  pluginId: string;

  /** Plugin name */
  pluginName: string;

  /** Health status */
  healthy: boolean;

  /** Status message */
  message?: string;

  /** Last check timestamp */
  lastCheck: Date;
}
