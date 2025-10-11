# Next.js 15.3+ Migration Plan for Client Package

**Last Updated:** October 11, 2025
**Status:** Post-MVP Migration Path
**Prerequisites:** Production deployment analysis completed (see `deployment_suggestions.md`)

---

## 🎯 **WHEN TO MIGRATE: Decision Framework**

### ✅ **Migrate to Next.js IF:**
- You need **SEO** for public-facing pages (marketing, landing pages)
- You want **server-side rendering** for better initial load performance
- You're adding **authentication** (Clerk works seamlessly with Next.js)
- You need **API routes** without a separate backend
- You want **unified deployment** (Vercel handles everything)
- You have **40+ hours** available for migration work

### ❌ **Stay with Vite + React IF:**
- Building an **internal tool** (no SEO needed)
- Need to **launch MVP quickly** (< 2 weeks)
- Current stack is **working well** in production
- Team is **unfamiliar** with Next.js
- Don't need SSR features

### 📊 **Cost Comparison:**
| Stack | Monthly Cost (MVP) | Monthly Cost (10K users) |
|-------|-------------------|-------------------------|
| Current (Vite + Hono + Railway) | $15 | $50-80 |
| Next.js on Vercel + Railway | $25 | $70-100 |
| Next.js on Vercel (Full) | $49 | $120-200 |

**Recommendation:** Deploy MVP with current stack first (8-12 hours), then migrate to Next.js after validating product-market fit (3-6 months).

---

## ⚠️ **PREREQUISITES BEFORE MIGRATION**

### 1. **Fix Node Discovery Mechanism** (CRITICAL)
Current `NodeRegistry.ts` uses file-based glob patterns that break in production builds.

**Current Issue:**
```typescript
// NodeRegistry.ts - BREAKS in production
async discover(directory: string, source: NodeSource = 'universal'): Promise<void> {
  const pattern = path.join(directory, '**/*.{ts,js}'); // ❌ Expects .ts files
  const files = await glob(pattern, { absolute: true }); // ❌ Wrong paths in production
  for (const file of files) {
    const module = await import(/* @vite-ignore */ file); // ❌ Dynamic imports may fail
  }
}
```

**Solution: Implement Manifest-Based Registration**
```typescript
// Step 1: Generate manifest at build time
// scripts/generate-node-manifest.ts
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';

interface NodeManifest {
  universal: NodeEntry[];
  server: NodeEntry[];
  client: NodeEntry[];
  buildTime: string;
}

interface NodeEntry {
  id: string;
  name: string;
  path: string;
  source: 'universal' | 'server' | 'client';
}

async function generateManifest() {
  const manifest: NodeManifest = {
    universal: [],
    server: [],
    client: [],
    buildTime: new Date().toISOString()
  };

  // Scan shared/nodes (universal)
  const universalNodes = await glob('shared/nodes/**/*.ts', {
    ignore: ['**/*.test.ts', '**/index.ts']
  });

  for (const nodePath of universalNodes) {
    const module = await import(path.resolve(nodePath));
    const NodeClass = module.default || Object.values(module)[0];
    if (NodeClass?.prototype?.metadata) {
      const instance = new NodeClass();
      manifest.universal.push({
        id: instance.metadata.id,
        name: instance.metadata.name,
        path: nodePath.replace(/\.ts$/, '.js'),
        source: 'universal'
      });
    }
  }

  // Scan server/nodes
  const serverNodes = await glob('server/nodes/**/*.ts', {
    ignore: ['**/*.test.ts', '**/index.ts']
  });

  for (const nodePath of serverNodes) {
    const module = await import(path.resolve(nodePath));
    const NodeClass = module.default || Object.values(module)[0];
    if (NodeClass?.prototype?.metadata) {
      const instance = new NodeClass();
      manifest.server.push({
        id: instance.metadata.id,
        name: instance.metadata.name,
        path: nodePath.replace(/\.ts$/, '.js'),
        source: 'server'
      });
    }
  }

  // Scan client/nodes
  const clientNodes = await glob('client/nodes/**/*.ts', {
    ignore: ['**/*.test.ts', '**/index.ts']
  });

  for (const nodePath of clientNodes) {
    const module = await import(path.resolve(nodePath));
    const NodeClass = module.default || Object.values(module)[0];
    if (NodeClass?.prototype?.metadata) {
      const instance = new NodeClass();
      manifest.client.push({
        id: instance.metadata.id,
        name: instance.metadata.name,
        path: nodePath.replace(/\.ts$/, '.js'),
        source: 'client'
      });
    }
  }

  // Write manifests for each package
  await fs.mkdir('shared/dist/manifests', { recursive: true });
  await fs.writeFile(
    'shared/dist/manifests/node-manifest.json',
    JSON.stringify(manifest, null, 2)
  );

  console.log(`✅ Generated node manifest with ${
    manifest.universal.length + manifest.server.length + manifest.client.length
  } nodes`);
}

generateManifest().catch(console.error);
```

```typescript
// Step 2: Update NodeRegistry to use manifest
// shared/src/registry/NodeRegistry.ts

async discoverFromPackages(environment: Environment = 'universal'): Promise<void> {
  // Production: Use manifest
  if (process.env.NODE_ENV === 'production' || process.env.USE_NODE_MANIFEST === 'true') {
    await this.discoverFromManifest(environment);
    return;
  }

  // Development: Use file-based discovery
  const discoveryPaths = this.getDiscoveryPaths(environment);
  for (const { path: discoveryPath, source } of discoveryPaths) {
    await this.discoverFromPath(discoveryPath, source);
  }
}

private async discoverFromManifest(environment: Environment): Promise<void> {
  try {
    // Load manifest from known location
    const manifestPath = this.resolveManifestPath();
    const manifest = await import(manifestPath);

    const nodesToLoad: NodeEntry[] = [];

    // Determine which nodes to load based on environment
    if (environment === 'universal') {
      nodesToLoad.push(...manifest.universal, ...manifest.server, ...manifest.client);
    } else if (environment === 'server') {
      nodesToLoad.push(...manifest.universal, ...manifest.server);
    } else if (environment === 'client') {
      nodesToLoad.push(...manifest.universal, ...manifest.client);
    }

    // Load and register nodes from manifest
    for (const entry of nodesToLoad) {
      try {
        const module = await import(/* @vite-ignore */ entry.path);
        const NodeClass = module.default || Object.values(module)[0];
        if (NodeClass) {
          await this.register(NodeClass, { source: entry.source });
        }
      } catch (error) {
        console.warn(`Failed to load node ${entry.id} from ${entry.path}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to load node manifest:', error);
    throw new Error('Node manifest not found or invalid. Run build script to generate it.');
  }
}

private resolveManifestPath(): string {
  // Try different locations based on runtime environment
  if (typeof window !== 'undefined') {
    // Browser environment
    return '/manifests/node-manifest.json';
  } else {
    // Node.js/Bun environment
    const paths = [
      path.join(process.cwd(), 'dist/manifests/node-manifest.json'),
      path.join(process.cwd(), 'shared/dist/manifests/node-manifest.json'),
      path.join(__dirname, '../../manifests/node-manifest.json')
    ];

    for (const testPath of paths) {
      if (require('fs').existsSync(testPath)) {
        return testPath;
      }
    }

    throw new Error('Node manifest not found in expected locations');
  }
}
```

```json
// Step 3: Update build scripts in package.json
{
  "scripts": {
    "prebuild:shared": "bun run scripts/generate-node-manifest.ts",
    "build:shared": "tsc && bun run scripts/generate-node-manifest.ts",
    "prebuild:server": "bun run build:shared",
    "build:server": "cd server && tsc",
    "prebuild:client": "bun run build:shared",
    "build:client": "cd client && tsc -b && vite build"
  }
}
```

**⚠️ This MUST be implemented before Next.js migration, or node discovery will fail in production.**

---

### 2. **Fix TypeScript Compilation Errors**
Server build currently has 18 TypeScript errors that must be resolved:
- Import path issues (`shared/dist` vs `shared`)
- Type mismatches in database operations
- Nullable type handling
- Drizzle ORM type issues

**Action:** Fix all errors before migration to ensure clean codebase.

---

### 3. **Test Production Build**
Before migrating, ensure current stack works in production:
```bash
# Test build
bun run build

# Test that node discovery works
cd server/dist
bun run index.js

# Verify endpoints
curl http://localhost:3013/nodes
curl http://localhost:3013/service/info
```

---

## 📊 **Current State Analysis**

### **Client Package (Vite + React 19):**
- ~47 TypeScript/React files
- React Router v7 with 4 routes: `/`, `/advanced`, `/websocket`, `/aizoca`
- Tailwind CSS v4 ✅ (already configured)
- shadcn/ui components ✅ (already in use)
- ClientWorkflowService singleton for workflow engine
- Client-specific workflow nodes (DOMNode, FetchNode, LocalStorageNode, UI nodes)
- WebSocket integration for real-time workflows

### **Server Package (Hono + Bun):**
- Multiple API routes: `/workflows`, `/automations`, `/api/auth`, `/api/zoca/*`
- Drizzle ORM ✅ (MySQL database)
- WebSocket support via WebSocketManager
- CronScheduler for automated workflows
- Server-specific nodes (FileSystemNode, DatabaseNode, AuthNode, custom nodes)

### **Shared Package:**
- Core workflow engine (ExecutionEngine, WorkflowParser, StateManager, NodeRegistry)
- Universal nodes accessible to both environments (MathNode, LogicNode, DataTransformNode, etc.)
- JSON Schema validation
- Multi-environment support (browser, server, CLI)

---

## 🏗️ **Migration Architecture**

### **Hybrid Approach (Recommended)**

```
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (Next.js 15)                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Frontend (App Router)                                │   │
│  │  - SSR/SSG pages                                      │   │
│  │  - React 19 Server Components                         │   │
│  │  - Client Components ('use client')                   │   │
│  │  - Client workflow nodes                              │   │
│  │  - ClientWorkflowService                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Next.js API Routes (Optional Proxies)               │   │
│  │  - /api/auth/* (Clerk integration)                   │   │
│  │  - /api/proxy/* (CORS handling)                      │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP/WebSocket
                         ▼
              ┌──────────────────────┐
              │  Railway (Hono API)  │
              │  - Workflow engine   │
              │  - Business logic    │
              │  - CronScheduler     │
              │  - Server nodes      │
              │  - WebSocket server  │
              └──────────┬───────────┘
                         │
                         ▼
                   ┌──────────┐
                   │  MySQL   │
                   │ Database │
                   └──────────┘
```

**What stays in Hono backend:**
- ✅ Workflow execution engine
- ✅ Database operations (Drizzle ORM)
- ✅ Complex business logic
- ✅ CronScheduler
- ✅ WebSocket connections
- ✅ Server-specific nodes
- ✅ All `/api/zoca/*` endpoints

**What moves to Next.js:**
- ✅ Frontend pages (SSR/SSG)
- ✅ Client-side workflow execution (browser-only workflows)
- ✅ Client-specific nodes
- ✅ Authentication UI (future: Clerk)
- ✅ Marketing pages (if needed)
- ⚠️ Optional: Simple API proxies for CORS/auth

---

## Phase 1: Initial Setup (Next.js in /next folder)

### 1. Initialize Next.js 15.3+ in /next folder
```bash
# Create Next.js app
bunx create-next-app@latest next --typescript --tailwind --app --no-src-dir

# Answer prompts:
# ✔ Would you like to use TypeScript? Yes
# ✔ Would you like to use ESLint? Yes
# ✔ Would you like to use Tailwind CSS? Yes
# ✔ Would you like to use `src/` directory? No
# ✔ Would you like to use App Router? Yes
# ✔ Would you like to customize the default import alias? Yes (@/*)
```

**Update root `/package.json`:**
```json
{
  "workspaces": [
    "./server",
    "./client",
    "./shared",
    "./next"
  ],
  "scripts": {
    "dev:next": "cd next && bun run dev",
    "dev:legacy-client": "cd client && bun run dev",
    "dev": "concurrently --names \"SHARED,SERVER,NEXT\" \"bun run dev:shared\" \"bun run dev:server\" \"bun run dev:next\"",
    "build:next": "cd next && bun run build",
    "build": "bun run build:shared && bun run build:server && bun run build:next",
    "start:next": "cd next && bun run start"
  }
}
```

---

### 2. Configure Monorepo Integration

**`/next/package.json`:**
```json
{
  "name": "next-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "^15.3.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "shared": "workspace:*",
    "@radix-ui/react-slot": "^1.2.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.507.0",
    "tailwind-merge": "^3.3.1",
    "tailwindcss": "^4.1.10",
    "@tailwindcss/vite": "^4.1.10"
  },
  "devDependencies": {
    "@types/node": "^22.15.31",
    "@types/react": "^19.1.8",
    "@types/react-dom": "^19.1.6",
    "eslint": "^9.28.0",
    "eslint-config-next": "^15.3.0",
    "typescript": "^5.7.3"
  }
}
```

**`/next/next.config.ts`:**
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for easier deployment
  output: 'standalone',

  // External packages that should not be bundled
  experimental: {
    serverComponentsExternalPackages: ['shared'],
    // Enable React 19 features
    ppr: false, // Partial Prerendering (optional)
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3013',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3013/ws',
  },

  // API route rewrites (optional - for proxying to Hono)
  async rewrites() {
    return [
      {
        source: '/api/workflows/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/workflows/:path*`,
      },
      {
        source: '/api/automations/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/automations/:path*`,
      },
      {
        source: '/api/zoca/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/zoca/:path*`,
      },
    ];
  },

  // Webpack configuration for shared package
  webpack: (config, { isServer }) => {
    // Handle Node.js modules in client bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        glob: false,
      };
    }

    // Handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },

  // TypeScript configuration
  typescript: {
    // Allow production builds to complete even if there are type errors
    // (useful during migration, remove in production)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
```

**`/next/tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/services/*": ["./services/*"],
      "@/hooks/*": ["./hooks/*"],
      "@/nodes/*": ["./nodes/*"],
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**`/next/.env.local`:**
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3013
NEXT_PUBLIC_WS_URL=ws://localhost:3013/ws

# Production URLs (set via Vercel dashboard)
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
# NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws

# Future: Clerk Authentication
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# CLERK_SECRET_KEY=

# Future: Database (if using Next.js API routes)
# DATABASE_URL=

# Node Environment
NODE_ENV=development
```

---

## Phase 2: Core Structure & Configuration

### 3. Create Next.js folder structure
```bash
cd next

# Create directory structure
mkdir -p app/advanced app/websocket app/aizoca app/api/proxy
mkdir -p components/ui components/workflow components/contact-details components/workflow-ui
mkdir -p lib services hooks nodes/ui public/manifests
```

**Final structure:**
```
/next
├── app/                          # App Router pages
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home (/)
│   ├── globals.css               # Global styles
│   ├── advanced/
│   │   └── page.tsx              # Advanced workflow demo
│   ├── websocket/
│   │   └── page.tsx              # WebSocket demo
│   ├── aizoca/
│   │   ├── layout.tsx            # Nested layout with sidebar
│   │   └── page.tsx              # Main AI Zoca page
│   └── api/                      # Next.js API routes
│       └── proxy/                # Optional proxies to Hono
│           └── [...path]/route.ts
├── components/                   # React components
│   ├── ui/                       # shadcn components
│   ├── workflow/                 # Workflow-related
│   ├── contact-details/          # Contact details
│   ├── workflow-ui/              # Workflow UI
│   └── providers.tsx             # Client providers
├── lib/                          # Utilities
│   ├── api-client.ts             # Hono API client
│   ├── workflow-client.ts        # Browser workflow service
│   └── utils.ts                  # General utilities
├── services/                     # Service layer
│   └── ClientWorkflowService.ts  # Workflow service
├── nodes/                        # Client-specific nodes
│   ├── DOMNode.ts
│   ├── FetchNode.ts
│   ├── LocalStorageNode.ts
│   ├── ui/                       # UI workflow nodes
│   └── index.ts
├── hooks/                        # React hooks
│   ├── useWebSocket.ts           # WebSocket hook
│   └── useWorkflow.ts            # Workflow execution hook
├── public/                       # Static assets
│   └── manifests/                # Node manifests (copied from build)
└── next.config.ts                # Next.js configuration
```

---

### 4. Critical: Client-Side Node Discovery for Next.js

**Problem:** Next.js doesn't have file system access in browser, so we need to ship the node manifest as a public asset.

**Solution:**
```typescript
// next/lib/workflow-client.ts
'use client';

import { NodeRegistry, StateManager, ExecutionEngine } from 'shared';
import type { WorkflowNode } from 'shared';

// Import all client nodes explicitly (required for Next.js)
import { DOMNode } from '@/nodes/DOMNode';
import { FetchNode } from '@/nodes/FetchNode';
import { LocalStorageNode } from '@/nodes/LocalStorageNode';
// ... import all other client nodes

class ClientWorkflowService {
  private static instance: ClientWorkflowService | null = null;
  private registry: NodeRegistry;
  private stateManager: StateManager;
  private engine: ExecutionEngine;
  private initialized = false;

  private constructor() {
    this.registry = new NodeRegistry();
    this.stateManager = new StateManager();
    this.engine = new ExecutionEngine(this.registry, this.stateManager);
  }

  static async getInstance(): Promise<ClientWorkflowService> {
    if (!ClientWorkflowService.instance) {
      ClientWorkflowService.instance = new ClientWorkflowService();
      await ClientWorkflowService.instance.initialize();
    }
    return ClientWorkflowService.instance;
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return;

    // Strategy 1: Manual registration (most reliable for Next.js)
    await this.registerClientNodes();

    // Strategy 2: Load from manifest (if available)
    try {
      await this.loadFromManifest();
    } catch (error) {
      console.warn('Failed to load from manifest, using manual registration only:', error);
    }

    this.initialized = true;
    console.log(`✅ ClientWorkflowService initialized with ${this.registry.size} nodes`);
  }

  private async registerClientNodes(): Promise<void> {
    // Manually register all client nodes
    // This is the most reliable method for Next.js
    const clientNodes: Array<typeof WorkflowNode> = [
      DOMNode,
      FetchNode,
      LocalStorageNode,
      // ... add all other client nodes
    ];

    await this.registry.registerClientNodes(clientNodes);
  }

  private async loadFromManifest(): Promise<void> {
    // Load universal nodes from public manifest
    const response = await fetch('/manifests/node-manifest.json');
    if (!response.ok) {
      throw new Error('Node manifest not found');
    }

    const manifest = await response.json();

    // Note: Only universal nodes can be loaded dynamically
    // Client nodes should be imported and registered manually
    console.log(`📦 Loaded manifest with ${manifest.universal?.length || 0} universal nodes`);
  }

  getEngine(): ExecutionEngine {
    return this.engine;
  }

  getRegistry(): NodeRegistry {
    return this.registry;
  }

  async executeWorkflow(workflowDefinition: any): Promise<any> {
    return this.engine.execute(workflowDefinition);
  }
}

export default ClientWorkflowService;
```

**Copy manifest to public folder in build:**
```json
// next/package.json
{
  "scripts": {
    "prebuild": "mkdir -p public/manifests && cp ../shared/dist/manifests/node-manifest.json public/manifests/ || true",
    "build": "next build",
    "postbuild": "echo 'Next.js build complete'"
  }
}
```

---

## Phase 3: Component & Service Migration

### 5. Migrate React Components

**Root Layout (`app/layout.tsx`):**
```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Workscript - Agentic Workflow Engine',
  description: 'Multi-environment workflow automation platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Home Page (`app/page.tsx`):**
```tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ClientWorkflowService from '@/services/ClientWorkflowService';

export default function HomePage() {
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    ClientWorkflowService.getInstance().then(service => {
      setNodeCount(service.getRegistry().size);
    });
  }, []);

  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">
        Workscript Workflow Engine
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/advanced" className="p-6 border rounded-lg hover:shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">Advanced Workflows</h2>
          <p>Test complex workflow scenarios</p>
        </Link>

        <Link href="/websocket" className="p-6 border rounded-lg hover:shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">WebSocket Demo</h2>
          <p>Real-time workflow execution</p>
        </Link>

        <Link href="/aizoca" className="p-6 border rounded-lg hover:shadow-lg">
          <h2 className="text-2xl font-semibold mb-2">AI Zoca</h2>
          <p>CRM workflow automation</p>
        </Link>
      </div>

      <div className="mt-8 p-4 bg-green-50 rounded-lg">
        <p className="text-sm text-green-800">
          ✅ Workflow engine initialized with {nodeCount} nodes
        </p>
      </div>
    </main>
  );
}
```

**Component Migration Strategy:**
```tsx
// Example: Migrating a component
// From: client/src/components/WorkflowRunner.tsx
// To: next/components/workflow/WorkflowRunner.tsx

'use client'; // ⚠️ Required for interactive components

import { useState } from 'react';
import ClientWorkflowService from '@/services/ClientWorkflowService';
import { Button } from '@/components/ui/button';

export function WorkflowRunner({ workflowDefinition }: { workflowDefinition: any }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const executeWorkflow = async () => {
    setLoading(true);
    try {
      const service = await ClientWorkflowService.getInstance();
      const result = await service.executeWorkflow(workflowDefinition);
      setResult(result);
    } catch (error) {
      console.error('Workflow execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button onClick={executeWorkflow} disabled={loading}>
        {loading ? 'Running...' : 'Execute Workflow'}
      </Button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
```

---

### 6. API Client for Hono Backend

**`next/lib/api-client.ts`:**
```typescript
'use client';

interface ApiClientConfig {
  baseURL: string;
  wsURL: string;
}

class ApiClient {
  private baseURL: string;
  private wsURL: string;

  constructor(config?: Partial<ApiClientConfig>) {
    this.baseURL = config?.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3013';
    this.wsURL = config?.wsURL || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3013/ws';
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Workflow endpoints
  async getWorkflows() {
    return this.request('/workflows');
  }

  async executeWorkflow(workflowId: string, payload?: any) {
    return this.request(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Automation endpoints
  async getAutomations() {
    return this.request('/automations');
  }

  // WebSocket connection
  createWebSocket(): WebSocket {
    return new WebSocket(this.wsURL);
  }
}

export const apiClient = new ApiClient();
export default ApiClient;
```

**React Query Integration (Recommended):**
```typescript
// next/lib/hooks/useWorkflows.ts
'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: () => apiClient.getWorkflows(),
  });
}

export function useExecuteWorkflow() {
  return useMutation({
    mutationFn: ({ workflowId, payload }: { workflowId: string; payload?: any }) =>
      apiClient.executeWorkflow(workflowId, payload),
  });
}
```

---

## Phase 4: Deployment Configuration

### Vercel Deployment

**`vercel.json` (optional, most config in next.config.ts):**
```json
{
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "https://api.yourdomain.com",
    "NEXT_PUBLIC_WS_URL": "wss://api.yourdomain.com/ws"
  }
}
```

**Deployment Steps:**
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project
cd next
vercel link

# 3. Set environment variables
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://your-railway-app.railway.app

vercel env add NEXT_PUBLIC_WS_URL production
# Enter: wss://your-railway-app.railway.app/ws

# 4. Deploy to production
vercel --prod
```

**GitHub Integration (Recommended):**
1. Connect Vercel to GitHub repo
2. Set root directory to `next/`
3. Configure environment variables in Vercel dashboard
4. Auto-deploy on push to `main` branch

---

## Phase 5: Migration Timeline (Updated)

| Phase | Task | Estimated Time | Priority |
|-------|------|---------------|----------|
| **Pre-Migration** | Fix node discovery mechanism | 6-8 hours | ⚠️ CRITICAL |
| | Fix TypeScript errors | 2-3 hours | High |
| | Test production build | 1-2 hours | High |
| **Phase 1-2** | Initial Setup & Config | 3-4 hours | High |
| **Phase 3** | Component Migration | 8-10 hours | High |
| **Phase 4** | API Integration | 4-6 hours | High |
| **Phase 5** | Routing Migration | 2-3 hours | High |
| **Phase 6** | Styling & UI | 2-4 hours | Medium |
| **Phase 7** | Future Prep (Clerk/Stripe) | 2-3 hours | Low |
| **Phase 8-9** | Testing & Debugging | 6-8 hours | High |
| **Phase 10** | Documentation | 2-3 hours | Medium |

**Total Estimated Time:** 38-54 hours (including pre-migration fixes)

**Breakdown:**
- **Critical fixes before migration:** 9-13 hours
- **Actual Next.js migration:** 29-41 hours

---

## 💰 Cost Analysis (Updated)

### Development Phase
| Item | Cost |
|------|------|
| Developer time (40-50 hours @ $50/hr) | $2,000-2,500 |
| Testing infrastructure | $0 (free tiers) |
| **Total Development** | **$2,000-2,500** |

### Monthly Operating Costs

#### Current Stack (Vite + Hono)
| Service | Cost |
|---------|------|
| Railway (Hono API) | $10-20 |
| Vercel (Vite build) | $0 (hobby) |
| MySQL (Railway) | $5 |
| **Total** | **$15-25/month** |

#### After Next.js Migration
| Service | Cost |
|---------|------|
| Vercel (Next.js) | $0-20 (hobby/pro) |
| Railway (Hono API) | $10-20 |
| MySQL (Railway) | $5 |
| **Total** | **$15-45/month** |

### At Scale (10K Users)
| Stack | Monthly Cost |
|-------|-------------|
| Current (Vite + Hono) | $50-80 |
| Next.js + Hono | $70-100 |
| **Difference** | **+$20/month** |

---

## ⚠️ Critical Considerations

### 1. **Is Next.js Worth It for Your Use Case?**

**YES, migrate if:**
- ✅ You need SEO for public pages
- ✅ You want faster initial page loads (SSR)
- ✅ You're adding Clerk authentication
- ✅ You want simplified deployment
- ✅ You need Next.js API routes
- ✅ You have 40+ hours available

**NO, keep Vite if:**
- ❌ Building internal tool (no SEO needed)
- ❌ Current stack works well
- ❌ Need to launch quickly
- ❌ Team unfamiliar with Next.js
- ❌ Don't need SSR features

### 2. **Node Discovery is CRITICAL**
The manifest-based approach MUST be implemented before migration, or production will fail.

### 3. **Server vs Client Components**
```tsx
// Server Component (default in Next.js 15)
// ✅ Can fetch data directly
// ✅ No JavaScript sent to client
// ❌ Cannot use hooks or browser APIs
export default async function ServerPage() {
  const data = await fetch('...');
  return <div>{data}</div>;
}

// Client Component
// ✅ Can use hooks, state, browser APIs
// ✅ Required for workflow engine
// ❌ Sent to browser (increases bundle size)
'use client';
export default function ClientPage() {
  const [state, setState] = useState();
  return <div>{state}</div>;
}
```

**Rule:** Workflow engine components MUST be client components.

### 4. **WebSocket Handling**
```tsx
// next/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState } from 'react';

export function useWebSocket(url: string) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => setConnected(true);
    ws.current.onclose = () => setConnected(false);

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const send = (data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  };

  return { connected, send, ws: ws.current };
}
```

---

## 🎯 Recommended Migration Path

### **Option A: Phased Migration (Recommended)**
1. **Month 1-2:** Deploy MVP with current Vite stack to Railway + Vercel ($15/month)
2. **Month 3-4:** Validate product-market fit, gather user feedback
3. **Month 5-6:** If SEO/SSR needed, migrate to Next.js (40-50 hours)
4. **Month 6+:** Scale infrastructure as needed

**Benefits:**
- ✅ Fastest time to market
- ✅ Lower initial costs
- ✅ Learn from real users first
- ✅ Migrate only if benefits justify costs

### **Option B: Immediate Migration**
Only choose if you KNOW you need:
- SEO for marketing pages
- Server-side rendering
- Unified Vercel deployment
- Clerk authentication from day 1

**Timeline:**
- Week 1-2: Fix node discovery + TypeScript errors
- Week 3-4: Next.js setup and component migration
- Week 5-6: Testing and deployment

---

## 📋 Pre-Migration Checklist

### Before Starting Migration
- [ ] ✅ Node discovery mechanism refactored (manifest-based)
- [ ] ✅ All TypeScript errors fixed
- [ ] ✅ Production build tested and working
- [ ] ✅ Current stack deployed to Railway + Vercel
- [ ] ✅ Team trained on Next.js App Router
- [ ] ✅ Decision made: Do we actually need Next.js?
- [ ] ✅ 40-50 hours allocated for migration
- [ ] ✅ Staging environment set up

### Migration Phase
- [ ] Next.js 15 initialized in `/next` folder
- [ ] Monorepo integration configured
- [ ] Node manifest copied to public folder
- [ ] ClientWorkflowService migrated
- [ ] All components migrated with 'use client' where needed
- [ ] API client configured
- [ ] WebSocket hook implemented
- [ ] All routes migrated to App Router
- [ ] Tailwind + shadcn/ui working
- [ ] Environment variables configured

### Testing Phase
- [ ] Workflow engine works in browser
- [ ] All API endpoints accessible
- [ ] WebSocket connections stable
- [ ] All pages render correctly
- [ ] Navigation works
- [ ] Build completes without errors
- [ ] Production deployment successful
- [ ] Performance benchmarks met

### Post-Migration
- [ ] Update CLAUDE.md
- [ ] Document new architecture
- [ ] Train team on new structure
- [ ] Monitor performance
- [ ] Gather user feedback
- [ ] Plan for future features (Clerk, Stripe)

---

## 🔗 Resources

### Next.js Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [App Router Guide](https://nextjs.org/docs/app)
- [Server vs Client Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Deployment (Vercel)](https://nextjs.org/docs/deployment)

### Deployment Guides
- [Vercel Deployment](https://vercel.com/docs)
- [Railway + Next.js](https://docs.railway.app/guides/nextjs)
- See `deployment_suggestions.md` for full deployment strategy

### Integration Guides
- [Clerk + Next.js](https://clerk.com/docs/quickstarts/nextjs)
- [Stripe + Next.js](https://stripe.com/docs/payments/quickstart)
- [Drizzle + Next.js](https://orm.drizzle.team/docs/get-started-postgresql)

---

## 🚀 Final Recommendation

**Deploy MVP first with current stack (Vite + Hono)**, then revisit this migration plan after 3-6 months when you have:
1. Real user feedback
2. Clear business requirements
3. Proven product-market fit
4. Time and resources for migration

**Next.js migration is NOT required for success.** Many successful SaaS products use Vite + React. Migrate only when the benefits (SEO, SSR, Clerk integration) clearly justify the 40-50 hour investment.

---

**Good luck! 🎉**

*Review this plan before migration and adjust based on your specific needs and timeline.*
