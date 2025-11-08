# Workscript API Server

Plugin-based API server for multi-SaaS platform architecture.

## Features

- **Plugin System** - Automatic discovery and loading of SaaS plugins
- **Workscript Plugin** - Workflow execution, automation, WebSocket events
- **Shared Services** - WebSocket broadcasting, CronScheduler
- **Health Monitoring** - Per-plugin health checks
- **AI Manifest** - Discoverable plugin capabilities

## Development

```bash
bun run dev    # Start dev server with hot reload
bun run build  # Build for production
```

## Plugin Structure

```
/apps/api/src/plugins/your-plugin/
├── plugin.ts          # Plugin manifest
├── schema/            # Database schema
├── routes/            # API routes
├── services/          # Business logic
└── nodes/             # Workflow nodes
```

## Environment Variables

Create `/apps/api/.env`:

```env
DATABASE_HOST=localhost
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=workscript
PORT=3013
```

## Available Endpoints

- `GET /health` - Server health check
- `GET /api/plugins` - List all loaded plugins
- `POST /workscript/workflows/execute` - Execute workflow
- `GET /workscript/workflows` - List workflows
- `GET /workscript/automations` - List scheduled automations
