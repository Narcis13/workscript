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
import authRoutes from './routes/auth';
import apiKeyRoutes from './routes/apikeys';
import passwordResetRoutes from './routes/password-reset';

// Global server reference for hot reload
declare global {
  var __server: ReturnType<typeof Bun.serve> | undefined;
}

// Stop existing server on hot reload
if (global.__server) {
  console.log('[Server] Stopping existing server for hot reload...');
  global.__server.stop();
  // Give OS time to release the port
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

// Initialize Hono app
const app = new Hono();

// Middleware - CORS Configuration
// Security: Restrict CORS to allowed origins only
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!origin) return 'http://localhost:5173';

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return origin;
      }

      // In development, also allow localhost with any port
      if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
        return origin;
      }

      // Reject all other origins
      return null;
    },
    credentials: true, // Allow cookies and authorization headers
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  })
);

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
      auth: '/auth',
      apiKeys: '/api/keys',
      passwordReset: '/password-reset',
      plugins: '/api/plugins',
      pluginsHealth: '/api/health/plugins',
    },
  });
});

// Authentication routes
app.route('/auth', authRoutes);
app.route('/api/keys', apiKeyRoutes);
app.route('/password-reset', passwordResetRoutes);

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

    // Start server with retry logic for port conflicts
    const port = parseInt(process.env.PORT || '3013', 10);
    console.log(`[Server] Starting server on port ${port}...`);

    // Helper function to kill processes using the port
    const killPort = async (portNum: number): Promise<boolean> => {
      try {
        const currentPid = process.pid;
        const proc = Bun.spawn(['lsof', '-ti', `:${portNum}`], {
          stdout: 'pipe',
        });

        const output = await new Response(proc.stdout).text();
        const pids = output.trim().split('\n').filter(Boolean).map(p => parseInt(p, 10));

        // Filter out current process and invalid PIDs
        const pidsToKill = pids.filter(pid => !isNaN(pid) && pid !== currentPid);

        if (pidsToKill.length > 0) {
          console.log(`[Server] Found ${pidsToKill.length} stale process(es) using port ${portNum}, killing...`);
          for (const pid of pidsToKill) {
            try {
              process.kill(pid, 'SIGKILL');
              console.log(`[Server] Killed stale process ${pid}`);
            } catch (err) {
              console.log(`[Server] Could not kill process ${pid} (may have already exited)`);
            }
          }
          // Give OS time to release the port
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return true;
        } else if (pids.length > 0) {
          console.log(`[Server] Port ${portNum} is being used by current process, skipping cleanup`);
        }
        return false;
      } catch (err) {
        return false;
      }
    };

    let server;
    let retries = 3;
    let delay = 500;

    while (retries > 0) {
      try {
        server = Bun.serve({
          port,
          fetch: app.fetch,
          // Removed reusePort: true to avoid race conditions in watch mode
        });

        // Store server reference globally for hot reload handling
        global.__server = server;

        console.log(`✓ Server running at http://localhost:${port}`);
        console.log(`✓ Plugin system initialized with ${pluginRegistry.getPluginCount()} plugin(s)`);
        console.log(`✓ Health check available at http://localhost:${port}/health`);
        console.log(`✓ Plugin list available at http://localhost:${port}/api/plugins`);
        break; // Successfully started
      } catch (error: any) {
        if (error.code === 'EADDRINUSE') {
          retries--;
          if (retries > 0) {
            console.log(`[Server] Port ${port} is in use, attempting cleanup and retry (${retries} attempts remaining)...`);
            await killPort(port); // Kill stale processes
            await new Promise((resolve) => setTimeout(resolve, delay));
            delay *= 1.5; // Exponential backoff
          } else {
            console.error(`[Server] Failed to start server after multiple attempts.`);
            console.error(`[Server] Try manually killing the process: lsof -ti :${port} | xargs kill -9`);
            throw error;
          }
        } else {
          throw error; // Re-throw non-port-conflict errors
        }
      }
    }

    if (!server) {
      throw new Error('Failed to start server');
    }

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] ${signal} received, shutting down gracefully...`);
      try {
        await pluginLoader.unloadAll();
        server.stop();
        global.__server = undefined; // Clear global reference
        // Give the OS more time to release the port (important for watch mode)
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log('[Server] Shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('[Server] Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('[Server] Fatal error during startup:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Note: Removed `export default app` as it was causing Bun to auto-serve in dev mode
