/**
 * Plugin Loader
 *
 * Core component for discovering, validating, and loading SaaS plugins.
 * Implements eager loading strategy - all plugins loaded at startup.
 */
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
/**
 * Simple console-based logger for plugin operations
 */
const createLogger = (pluginId) => ({
    info: (message, meta) => console.log(`[Plugin:${pluginId}] INFO:`, message, meta || ''),
    warn: (message, meta) => console.warn(`[Plugin:${pluginId}] WARN:`, message, meta || ''),
    error: (message, meta) => console.error(`[Plugin:${pluginId}] ERROR:`, message, meta || ''),
    debug: (message, meta) => console.debug(`[Plugin:${pluginId}] DEBUG:`, message, meta || ''),
});
/**
 * Plugin Loader - Singleton class for managing plugin discovery and loading
 */
export class PluginLoader {
    static instance;
    loadedPlugins = new Map();
    app = null;
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!PluginLoader.instance) {
            PluginLoader.instance = new PluginLoader();
        }
        return PluginLoader.instance;
    }
    /**
     * Set Hono app instance (must be called before loading plugins)
     */
    setApp(app) {
        this.app = app;
    }
    /**
     * Discover and load all plugins from the plugins directory
     */
    async loadPlugins(options) {
        if (!this.app) {
            throw new Error('Hono app not set. Call setApp() before loadPlugins()');
        }
        console.log('[PluginLoader] Starting plugin discovery...');
        console.log(`[PluginLoader] Plugins directory: ${options.pluginsDir}`);
        const results = [];
        try {
            // Check if plugins directory exists
            const dirExists = await this.directoryExists(options.pluginsDir);
            if (!dirExists) {
                console.warn(`[PluginLoader] Plugins directory does not exist: ${options.pluginsDir}`);
                return results;
            }
            // Discover plugin directories
            const pluginDirs = await this.discoverPluginDirectories(options.pluginsDir);
            console.log(`[PluginLoader] Found ${pluginDirs.length} potential plugin(s)`);
            // Load each plugin
            for (const pluginDir of pluginDirs) {
                const pluginPath = join(options.pluginsDir, pluginDir);
                const result = await this.loadPlugin(pluginPath, pluginDir, options);
                results.push(result);
                if (result.success && result.plugin) {
                    this.loadedPlugins.set(result.plugin.id, result.plugin);
                    console.log(`[PluginLoader] ✓ Plugin '${result.plugin.name}' loaded successfully (${result.loadTime}ms)`);
                }
                else {
                    console.error(`[PluginLoader] ✗ Failed to load plugin '${pluginDir}': ${result.error}`);
                }
            }
            console.log(`[PluginLoader] Plugin loading complete. ${results.filter((r) => r.success).length}/${results.length} plugins loaded successfully`);
        }
        catch (error) {
            console.error('[PluginLoader] Fatal error during plugin loading:', error);
            throw error;
        }
        return results;
    }
    /**
     * Load a single plugin from a directory
     */
    async loadPlugin(pluginPath, pluginDirName, options) {
        const startTime = Date.now();
        try {
            // Check for plugin.ts file
            const pluginFilePath = join(pluginPath, 'plugin.ts');
            const fileExists = await this.fileExists(pluginFilePath);
            if (!fileExists) {
                return {
                    success: false,
                    error: `Plugin manifest file not found for '${pluginDirName}': ${pluginFilePath}`,
                    loadTime: Date.now() - startTime,
                };
            }
            // Import plugin module
            let pluginModule;
            try {
                pluginModule = await import(pluginFilePath);
            }
            catch (error) {
                return {
                    success: false,
                    error: `Failed to import plugin: ${error instanceof Error ? error.message : String(error)}`,
                    loadTime: Date.now() - startTime,
                };
            }
            // Extract plugin instance (support both default and named exports)
            const plugin = pluginModule.default || pluginModule.plugin;
            if (!plugin) {
                return {
                    success: false,
                    error: 'Plugin module must export a default or named "plugin" export',
                    loadTime: Date.now() - startTime,
                };
            }
            // Validate plugin
            const validation = this.validatePlugin(plugin);
            if (!validation.valid) {
                return {
                    success: false,
                    error: `Plugin validation failed: ${validation.errors?.join(', ')}`,
                    loadTime: Date.now() - startTime,
                };
            }
            // Check if plugin should be enabled
            const shouldEnable = this.shouldEnablePlugin(plugin.id, plugin.enabled, options);
            if (!shouldEnable) {
                console.log(`[PluginLoader] Plugin '${plugin.id}' is disabled, skipping initialization`);
                return {
                    success: true,
                    plugin: { ...plugin, enabled: false },
                    loadTime: Date.now() - startTime,
                };
            }
            // Validate environment variables
            const envValidation = this.validateEnvVars(plugin);
            if (!envValidation.valid) {
                return {
                    success: false,
                    error: `Environment validation failed: ${envValidation.errors?.join(', ')}`,
                    loadTime: Date.now() - startTime,
                };
            }
            // Create plugin context
            const context = {
                app: this.app,
                metadata: {
                    id: plugin.id,
                    name: plugin.name,
                    version: plugin.version,
                    description: plugin.description,
                    author: plugin.author,
                    homepage: plugin.homepage,
                    license: plugin.license,
                },
                env: process.env,
                logger: createLogger(plugin.id),
            };
            // Call onLoad lifecycle hook
            if (plugin.onLoad) {
                try {
                    await plugin.onLoad(context);
                }
                catch (error) {
                    return {
                        success: false,
                        error: `onLoad hook failed: ${error instanceof Error ? error.message : String(error)}`,
                        loadTime: Date.now() - startTime,
                    };
                }
            }
            // Mount plugin routes
            if (plugin.routes && this.app) {
                try {
                    this.app.route(plugin.routes.basePath, plugin.routes.router);
                    console.log(`[PluginLoader] Routes mounted at ${plugin.routes.basePath}`);
                }
                catch (error) {
                    return {
                        success: false,
                        error: `Failed to mount routes: ${error instanceof Error ? error.message : String(error)}`,
                        loadTime: Date.now() - startTime,
                    };
                }
            }
            return {
                success: true,
                plugin,
                loadTime: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
                loadTime: Date.now() - startTime,
            };
        }
    }
    /**
     * Validate plugin structure and metadata
     */
    validatePlugin(plugin) {
        const errors = [];
        // Required fields
        if (!plugin.id || typeof plugin.id !== 'string') {
            errors.push('Plugin must have a valid "id" field');
        }
        if (!plugin.name || typeof plugin.name !== 'string') {
            errors.push('Plugin must have a valid "name" field');
        }
        if (!plugin.version || typeof plugin.version !== 'string') {
            errors.push('Plugin must have a valid "version" field');
        }
        if (typeof plugin.enabled !== 'boolean') {
            errors.push('Plugin must have a boolean "enabled" field');
        }
        // Validate ID format (kebab-case)
        if (plugin.id && !/^[a-z][a-z0-9-]*$/.test(plugin.id)) {
            errors.push('Plugin ID must be kebab-case (lowercase, hyphens only)');
        }
        // Validate version format (semver)
        if (plugin.version && !/^\d+\.\d+\.\d+/.test(plugin.version)) {
            errors.push('Plugin version must follow semver format (e.g., 1.0.0)');
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Validate required environment variables
     */
    validateEnvVars(plugin) {
        const errors = [];
        if (plugin.requiredEnvVars && plugin.requiredEnvVars.length > 0) {
            for (const envVar of plugin.requiredEnvVars) {
                if (!process.env[envVar]) {
                    errors.push(`Required environment variable missing: ${envVar}`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    }
    /**
     * Determine if plugin should be enabled based on options
     */
    shouldEnablePlugin(pluginId, pluginEnabled, options) {
        // Explicit disable list takes precedence
        if (options.disabledPlugins?.includes(pluginId)) {
            return false;
        }
        // Explicit enable list
        if (options.enabledPlugins && options.enabledPlugins.length > 0) {
            return options.enabledPlugins.includes(pluginId);
        }
        // Auto-enable if configured
        if (options.autoEnable) {
            return true;
        }
        // Default to plugin's enabled field
        return pluginEnabled;
    }
    /**
     * Discover plugin directories in the plugins folder
     */
    async discoverPluginDirectories(pluginsDir) {
        const entries = await readdir(pluginsDir, { withFileTypes: true });
        return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    }
    /**
     * Check if directory exists
     */
    async directoryExists(path) {
        try {
            const stats = await stat(path);
            return stats.isDirectory();
        }
        catch {
            return false;
        }
    }
    /**
     * Check if file exists
     */
    async fileExists(path) {
        try {
            const stats = await stat(path);
            return stats.isFile();
        }
        catch {
            return false;
        }
    }
    /**
     * Get all loaded plugins
     */
    getLoadedPlugins() {
        return this.loadedPlugins;
    }
    /**
     * Get plugin by ID
     */
    getPlugin(pluginId) {
        return this.loadedPlugins.get(pluginId);
    }
    /**
     * Get all enabled plugins
     */
    getEnabledPlugins() {
        return Array.from(this.loadedPlugins.values()).filter((plugin) => plugin.enabled);
    }
    /**
     * Unload all plugins (for graceful shutdown)
     */
    async unloadAll() {
        console.log('[PluginLoader] Unloading all plugins...');
        for (const [pluginId, plugin] of this.loadedPlugins.entries()) {
            if (plugin.onUnload) {
                try {
                    await plugin.onUnload();
                    console.log(`[PluginLoader] Plugin '${pluginId}' unloaded successfully`);
                }
                catch (error) {
                    console.error(`[PluginLoader] Error unloading plugin '${pluginId}':`, error);
                }
            }
        }
        this.loadedPlugins.clear();
        console.log('[PluginLoader] All plugins unloaded');
    }
}
// Export singleton instance
export const pluginLoader = PluginLoader.getInstance();
