/**
 * Plugin Registry
 *
 * Centralized registry for managing loaded plugins with advanced querying,
 * health checks, and capability-based discovery.
 */
/**
 * Plugin Registry - Singleton class for managing plugin metadata and state
 */
export class PluginRegistry {
    static instance;
    plugins = new Map();
    constructor() { }
    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!PluginRegistry.instance) {
            PluginRegistry.instance = new PluginRegistry();
        }
        return PluginRegistry.instance;
    }
    /**
     * Register a plugin in the registry
     */
    registerPlugin(plugin) {
        const entry = {
            plugin,
            loadedAt: new Date(),
            status: plugin.enabled ? 'active' : 'inactive',
        };
        this.plugins.set(plugin.id, entry);
        console.log(`[PluginRegistry] Registered plugin: ${plugin.id} (${entry.status})`);
    }
    /**
     * Unregister a plugin from the registry
     */
    unregisterPlugin(pluginId) {
        const removed = this.plugins.delete(pluginId);
        if (removed) {
            console.log(`[PluginRegistry] Unregistered plugin: ${pluginId}`);
        }
        return removed;
    }
    /**
     * Get plugin by ID
     */
    getPlugin(pluginId) {
        const entry = this.plugins.get(pluginId);
        return entry?.plugin;
    }
    /**
     * Get plugin registry entry (includes status and metadata)
     */
    getPluginEntry(pluginId) {
        return this.plugins.get(pluginId);
    }
    /**
     * Get all registered plugins
     */
    getAllPlugins() {
        return Array.from(this.plugins.values()).map((entry) => entry.plugin);
    }
    /**
     * Get all plugin registry entries
     */
    getAllEntries() {
        return Array.from(this.plugins.values());
    }
    /**
     * Get enabled plugins only
     */
    getEnabledPlugins() {
        return Array.from(this.plugins.values())
            .filter((entry) => entry.plugin.enabled && entry.status === 'active')
            .map((entry) => entry.plugin);
    }
    /**
     * Get disabled plugins
     */
    getDisabledPlugins() {
        return Array.from(this.plugins.values())
            .filter((entry) => !entry.plugin.enabled || entry.status === 'inactive')
            .map((entry) => entry.plugin);
    }
    /**
     * Get plugins by status
     */
    getPluginsByStatus(status) {
        return Array.from(this.plugins.values())
            .filter((entry) => entry.status === status)
            .map((entry) => entry.plugin);
    }
    /**
     * Get plugins by capability
     * Searches AI manifest capabilities
     */
    getPluginsByCapability(capability) {
        return Array.from(this.plugins.values())
            .filter((entry) => {
            if (!entry.plugin.aiManifest?.capabilities)
                return false;
            return entry.plugin.aiManifest.capabilities.some((cap) => cap.toLowerCase().includes(capability.toLowerCase()));
        })
            .map((entry) => entry.plugin);
    }
    /**
     * Check if plugin exists
     */
    hasPlugin(pluginId) {
        return this.plugins.has(pluginId);
    }
    /**
     * Get plugin count
     */
    getPluginCount() {
        return this.plugins.size;
    }
    /**
     * Get plugin metadata only (lightweight response)
     */
    getPluginMetadata(pluginId) {
        const entry = this.plugins.get(pluginId);
        if (!entry)
            return undefined;
        const plugin = entry.plugin;
        return {
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            description: plugin.description,
            author: plugin.author,
            homepage: plugin.homepage,
            license: plugin.license,
        };
    }
    /**
     * Get all plugins metadata (lightweight list)
     */
    getAllPluginsMetadata() {
        return Array.from(this.plugins.values()).map((entry) => ({
            id: entry.plugin.id,
            name: entry.plugin.name,
            version: entry.plugin.version,
            description: entry.plugin.description,
            author: entry.plugin.author,
            homepage: entry.plugin.homepage,
            license: entry.plugin.license,
        }));
    }
    /**
     * Run health check for a specific plugin
     */
    async checkPluginHealth(pluginId) {
        const entry = this.plugins.get(pluginId);
        if (!entry) {
            return {
                pluginId,
                pluginName: 'Unknown',
                healthy: false,
                message: 'Plugin not found',
                lastCheck: new Date(),
            };
        }
        const plugin = entry.plugin;
        // If plugin has no health check, assume healthy if active
        if (!plugin.healthCheck) {
            return {
                pluginId: plugin.id,
                pluginName: plugin.name,
                healthy: entry.status === 'active',
                message: entry.status === 'active' ? 'Plugin active (no health check defined)' : 'Plugin inactive',
                lastCheck: new Date(),
            };
        }
        // Run plugin health check
        try {
            const healthy = await plugin.healthCheck();
            return {
                pluginId: plugin.id,
                pluginName: plugin.name,
                healthy,
                message: healthy ? 'Health check passed' : 'Health check failed',
                lastCheck: new Date(),
            };
        }
        catch (error) {
            // Update plugin status to error
            entry.status = 'error';
            entry.errorMessage = error instanceof Error ? error.message : String(error);
            return {
                pluginId: plugin.id,
                pluginName: plugin.name,
                healthy: false,
                message: `Health check error: ${entry.errorMessage}`,
                lastCheck: new Date(),
            };
        }
    }
    /**
     * Run health checks for all plugins
     */
    async checkAllPluginsHealth() {
        const plugins = Array.from(this.plugins.keys());
        const healthChecks = await Promise.all(plugins.map((id) => this.checkPluginHealth(id)));
        return healthChecks;
    }
    /**
     * Get plugin statistics
     */
    getStatistics() {
        const entries = Array.from(this.plugins.values());
        return {
            total: entries.length,
            active: entries.filter((e) => e.status === 'active').length,
            inactive: entries.filter((e) => e.status === 'inactive').length,
            error: entries.filter((e) => e.status === 'error').length,
            withRoutes: entries.filter((e) => e.plugin.routes).length,
            withNodes: entries.filter((e) => e.plugin.nodes && e.plugin.nodes.length > 0).length,
            withSchema: entries.filter((e) => e.plugin.schema).length,
        };
    }
    /**
     * Get plugins that depend on a specific plugin
     */
    getDependentPlugins(pluginId) {
        return Array.from(this.plugins.values())
            .filter((entry) => entry.plugin.dependencies?.includes(pluginId))
            .map((entry) => entry.plugin);
    }
    /**
     * Validate plugin dependencies
     * Returns missing dependencies for each plugin
     */
    validateDependencies() {
        const missingDeps = new Map();
        for (const [pluginId, entry] of this.plugins.entries()) {
            if (!entry.plugin.dependencies || entry.plugin.dependencies.length === 0) {
                continue;
            }
            const missing = [];
            for (const depId of entry.plugin.dependencies) {
                if (!this.plugins.has(depId)) {
                    missing.push(depId);
                }
            }
            if (missing.length > 0) {
                missingDeps.set(pluginId, missing);
            }
        }
        return missingDeps;
    }
    /**
     * Get AI manifest for all plugins (for LLM discoverability)
     */
    getAIManifests() {
        return Array.from(this.plugins.values())
            .filter((entry) => entry.plugin.aiManifest)
            .map((entry) => ({
            pluginId: entry.plugin.id,
            pluginName: entry.plugin.name,
            manifest: entry.plugin.aiManifest,
        }));
    }
    /**
     * Clear all plugins (for testing or reset)
     */
    clear() {
        this.plugins.clear();
        console.log('[PluginRegistry] Registry cleared');
    }
    /**
     * Export plugin registry as JSON (for debugging/monitoring)
     */
    toJSON() {
        return {
            pluginCount: this.plugins.size,
            plugins: Array.from(this.plugins.entries()).map(([id, entry]) => ({
                id,
                name: entry.plugin.name,
                version: entry.plugin.version,
                enabled: entry.plugin.enabled,
                status: entry.status,
                loadedAt: entry.loadedAt,
                errorMessage: entry.errorMessage,
                hasRoutes: !!entry.plugin.routes,
                hasNodes: !!(entry.plugin.nodes && entry.plugin.nodes.length > 0),
                hasSchema: !!entry.plugin.schema,
                hasAIManifest: !!entry.plugin.aiManifest,
                dependencies: entry.plugin.dependencies || [],
            })),
            statistics: this.getStatistics(),
        };
    }
}
// Export singleton instance
export const pluginRegistry = PluginRegistry.getInstance();
