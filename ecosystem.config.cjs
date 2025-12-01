/**
 * PM2 Ecosystem Configuration
 *
 * Production configuration for running Workscript API with PM2
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart ecosystem.config.cjs
 *   pm2 reload ecosystem.config.cjs
 *   pm2 stop ecosystem.config.cjs
 *   pm2 delete ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'workscript-api',
      cwd: './apps/api',
      script: 'src/index.ts',
      interpreter: 'bun',
      instances: 1,
      exec_mode: 'fork',

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 3013,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3013,
      },

      // Logging configuration
      error_file: '/var/log/workscript/error.log',
      out_file: '/var/log/workscript/output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Restart policy
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      autorestart: true,
      watch: false,

      // Memory management
      max_memory_restart: '500M',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Source map support for better error traces
      source_map_support: true,
    },
  ],
};
