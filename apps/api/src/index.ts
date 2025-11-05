/**
 * Workscript API Server
 *
 * Main entry point for the Hono-based API server with plugin system.
 * This server provides a modular, extensible architecture for SaaS plugins.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { join } from 'path';
import { pluginLoader, pluginRegistry } from './core/plugins';

// Initialize Hono app
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', honoLogger());

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Workscript API',
    version: '2.0.0',
    description: 'Modular workflow orchestration API with plugin system',
    endpoints: {
      health: '/health',
      plugins: '/api/plugins',
      pluginsHealth: '/api/health/plugins',
    },
  });
});

/**
 * Initialize and start the server
 */
async function startServer() {
  try {
    console.log('[Server] Starting Workscript API Server...');

    // Set Hono app for plugin system
    pluginLoader.setApp(app);

    // Load plugins
    const pluginsDir = join(import.meta.dir, 'plugins');
    console.log(`[Server] Loading plugins from: ${pluginsDir}`);

    const results = await pluginLoader.loadPlugins({
      pluginsDir,
      autoEnable: true, // Auto-enable all discovered plugins
    });

    // Register loaded plugins in registry
    for (const result of results) {
      if (result.success && result.plugin) {
        pluginRegistry.registerPlugin(result.plugin);
      }
    }

    // Plugin management endpoints
    app.get('/api/plugins', (c) => {
      const plugins = pluginRegistry.getAllPluginsMetadata();
      const stats = pluginRegistry.getStatistics();

      return c.json({
        plugins,
        statistics: stats,
      });
    });

    app.get('/api/plugins/:pluginId', (c) => {
      const pluginId = c.req.param('pluginId');
      const entry = pluginRegistry.getPluginEntry(pluginId);

      if (!entry) {
        return c.json({ error: 'Plugin not found' }, 404);
      }

      return c.json({
        id: entry.plugin.id,
        name: entry.plugin.name,
        version: entry.plugin.version,
        description: entry.plugin.description,
        author: entry.plugin.author,
        homepage: entry.plugin.homepage,
        license: entry.plugin.license,
        enabled: entry.plugin.enabled,
        status: entry.status,
        loadedAt: entry.loadedAt,
        hasRoutes: !!entry.plugin.routes,
        routePath: entry.plugin.routes?.basePath,
        hasNodes: !!(entry.plugin.nodes && entry.plugin.nodes.length > 0),
        nodeCount: entry.plugin.nodes?.length || 0,
        hasSchema: !!entry.plugin.schema,
        hasAIManifest: !!entry.plugin.aiManifest,
        dependencies: entry.plugin.dependencies || [],
      });
    });

    // Health check endpoints for plugins
    app.get('/api/health/plugins', async (c) => {
      const healthChecks = await pluginRegistry.checkAllPluginsHealth();
      const allHealthy = healthChecks.every((check) => check.healthy);

      return c.json(
        {
          status: allHealthy ? 'healthy' : 'degraded',
          plugins: healthChecks,
        },
        allHealthy ? 200 : 503
      );
    });

    app.get('/api/health/plugins/:pluginId', async (c) => {
      const pluginId = c.req.param('pluginId');
      const health = await pluginRegistry.checkPluginHealth(pluginId);

      return c.json(health, health.healthy ? 200 : 503);
    });

    // AI manifest endpoint (for LLM discoverability)
    app.get('/api/ai-manifest', (c) => {
      const manifests = pluginRegistry.getAIManifests();

      return c.json({
        system: {
          name: 'Workscript',
          version: '2.0.0',
          description: 'Modular workflow orchestration system with plugin architecture',
        },
        plugins: manifests,
      });
    });

    // Plugin registry debug endpoint (development only)
    app.get('/api/debug/registry', (c) => {
      return c.json(pluginRegistry.toJSON());
    });

    // 404 handler
    app.notFound((c) => {
      return c.json(
        {
          error: 'Not Found',
          path: c.req.path,
          message: 'The requested resource does not exist',
        },
        404
      );
    });

    // Error handler
    app.onError((err, c) => {
      console.error('[Server] Error:', err);
      return c.json(
        {
          error: 'Internal Server Error',
          message: err.message || 'An unexpected error occurred',
        },
        500
      );
    });

    // Start server
    const port = parseInt(process.env.PORT || '3013', 10);
    console.log(`[Server] Starting server on port ${port}...`);

    const server = Bun.serve({
      port,
      fetch: app.fetch,
    });

    console.log(`✓ Server running at http://localhost:${port}`);
    console.log(`✓ Plugin system initialized with ${pluginRegistry.getPluginCount()} plugin(s)`);
    console.log(`✓ Health check available at http://localhost:${port}/health`);
    console.log(`✓ Plugin list available at http://localhost:${port}/api/plugins`);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[Server] SIGTERM received, shutting down gracefully...');
      await pluginLoader.unloadAll();
      server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('\n[Server] SIGINT received, shutting down gracefully...');
      await pluginLoader.unloadAll();
      server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

export default app;
