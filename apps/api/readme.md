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

## Manual Migrations

Some database features require raw SQL migrations that Drizzle doesn't support natively.

### FULLTEXT Index for Full-Text Search

After running `bun run db:push` or `bun run db:migrate`, execute the FULLTEXT index migration:

```bash
# Using mysql CLI
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME < drizzle/0008_fulltext_search_index.sql

# Or via Drizzle Studio / database GUI
# Execute: CREATE FULLTEXT INDEX flex_records_search_idx ON flex_records(search_text);
```

This enables performant full-text search on FlexDB records via the `{ field: { search: "query" } }` filter syntax.

## Available Endpoints

- `GET /health` - Server health check
- `GET /api/plugins` - List all loaded plugins
- `POST /workscript/workflows/execute` - Execute workflow
- `GET /workscript/workflows` - List workflows
- `GET /workscript/automations` - List scheduled automations
