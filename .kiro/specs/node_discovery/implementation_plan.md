# Implementation Plan: Manifest-Based Node Discovery System

This document provides a concrete, actionable implementation plan for the Manifest-Based Node Discovery System. Tasks are organized by phases and include checkboxes for tracking progress.

---

## PHASE 1: ARCHITECTURE MIGRATION & SETUP

### 1.1 Create New Node Directory Structure

- [ ] **Task 1.1.1: Create /apps/api/src/nodes/ directory**
  - Run: `mkdir -p /apps/api/src/nodes/{core,custom/google/gmail,custom/zoca}`
  - Verify directories exist with `ls -R /apps/api/src/nodes/`
  - Expected: Directory tree with core and custom subdirectories
  - _Requirements: 4_

- [ ] **Task 1.1.2: Document directory structure**
  - Create `/apps/api/src/nodes/README.md` explaining node organization
  - Include sections: Purpose, Structure, Adding Nodes, Best Practices
  - Document the difference between core and custom nodes
  - _Requirements: 4, 17_

### 1.2 Migrate Core Server Nodes

- [ ] **Task 1.2.1: Move FileSystemNode.ts**
  - Copy `/server/nodes/FileSystemNode.ts` to `/apps/api/src/nodes/core/FileSystemNode.ts`
  - Update imports to use `@workscript/engine` package
  - Verify no relative imports to shared code
  - _Requirements: 4_

- [ ] **Task 1.2.2: Move DatabaseNode.ts**
  - Copy `/server/nodes/DatabaseNode.ts` to `/apps/api/src/nodes/core/DatabaseNode.ts`
  - Update imports to use `@workscript/engine` package
  - Check for any database connection dependencies
  - _Requirements: 4_

- [ ] **Task 1.2.3: Move AuthNode.ts**
  - Copy `/server/nodes/AuthNode.ts` to `/apps/api/src/nodes/core/AuthNode.ts`
  - Update imports to use `@workscript/engine` package
  - Verify authentication service imports
  - _Requirements: 4_

- [ ] **Task 1.2.4: Create core nodes barrel export**
  - Create `/apps/api/src/nodes/core/index.ts`
  - Export all three core nodes: `export { FileSystemNode } from './FileSystemNode';` etc.
  - Add JSDoc comment explaining the core nodes category
  - _Requirements: 4, 18_

### 1.3 Migrate Gmail Integration Nodes

- [ ] **Task 1.3.1: Move googleConnect.ts**
  - Copy `/server/nodes/custom/google/gmail/googleConnect.ts` to `/apps/api/src/nodes/custom/google/gmail/googleConnect.ts`
  - Update all imports to use `@workscript/engine`
  - Check for Gmail API dependencies
  - _Requirements: 4_

- [ ] **Task 1.3.2: Move sendEmail.ts**
  - Copy `/server/nodes/custom/google/gmail/sendEmail.ts` to `/apps/api/src/nodes/custom/google/gmail/sendEmail.ts`
  - Update imports to use `@workscript/engine`
  - Verify email sending logic intact
  - _Requirements: 4_

- [ ] **Task 1.3.3: Move listEmails.ts**
  - Copy `/server/nodes/custom/google/gmail/listEmails.ts` to `/apps/api/src/nodes/custom/google/gmail/listEmails.ts`
  - Update imports to use `@workscript/engine`
  - Verify email fetching logic intact
  - _Requirements: 4_

- [ ] **Task 1.3.4: Create Gmail barrel export**
  - Create `/apps/api/src/nodes/custom/google/gmail/index.ts`
  - Export all Gmail nodes
  - Add JSDoc comment explaining Gmail integration
  - _Requirements: 4, 18_

### 1.4 Migrate Zoca Integration Nodes

- [ ] **Task 1.4.1: Move toateContactele.ts**
  - Copy `/server/nodes/custom/zoca/toateContactele.ts` to `/apps/api/src/nodes/custom/zoca/toateContactele.ts`
  - Update imports to use `@workscript/engine`
  - Verify Zoca API integration
  - _Requirements: 4_

- [ ] **Task 1.4.2: Move aplicaFiltre.ts**
  - Copy `/server/nodes/custom/zoca/aplicaFiltre.ts` to `/apps/api/src/nodes/custom/zoca/aplicaFiltre.ts`
  - Update imports to use `@workscript/engine`
  - Check filtering logic
  - _Requirements: 4_

- [ ] **Task 1.4.3: Move fiecareElement.ts**
  - Copy `/server/nodes/custom/zoca/fiecareElement.ts` to `/apps/api/src/nodes/custom/zoca/fiecareElement.ts`
  - Update imports to use `@workscript/engine`
  - Verify iteration logic
  - _Requirements: 4_

- [ ] **Task 1.4.4: Create Zoca barrel export**
  - Create `/apps/api/src/nodes/custom/zoca/index.ts`
  - Export all Zoca nodes
  - Add JSDoc comment explaining Zoca integration
  - _Requirements: 4, 18_

### 1.5 Create Top-Level Barrel Exports

- [ ] **Task 1.5.1: Create custom integrations barrel**
  - Create `/apps/api/src/nodes/custom/index.ts`
  - Re-export from `./google/gmail` and `./zoca`
  - Add JSDoc explaining custom integrations structure
  - _Requirements: 4, 18_

- [ ] **Task 1.5.2: Create main nodes barrel**
  - Create `/apps/api/src/nodes/index.ts`
  - Re-export from `./core` and `./custom`
  - Export as named exports and as array: `export const API_NODES = [...]`
  - _Requirements: 4, 18_

### 1.6 Update Import References

- [ ] **Task 1.6.1: Update WorkflowService.ts**
  - Open `/apps/api/src/plugins/workscript/services/WorkflowService.ts`
  - Replace any direct node imports with imports from `/apps/api/src/nodes/`
  - Verify no references to `/server/nodes/` remain
  - _Requirements: 4_

- [ ] **Task 1.6.2: Update any route handlers**
  - Search for imports from `/server/nodes/` in `/apps/api/src/plugins/workscript/routes/`
  - Update to import from `/apps/api/src/nodes/`
  - Verify TypeScript compilation succeeds
  - _Requirements: 4_

- [ ] **Task 1.6.3: Update test files**
  - Search for test files importing server nodes
  - Update imports to new locations
  - Run tests to verify no broken imports
  - _Requirements: 4_

### 1.7 Verification

- [ ] **Task 1.7.1: Run TypeScript compilation**
  - Execute: `cd apps/api && bun run build`
  - Fix any import errors
  - Verify clean build output
  - _Requirements: 4_

- [ ] **Task 1.7.2: Test API server startup**
  - Execute: `cd apps/api && bun run dev`
  - Check logs for successful node discovery
  - Verify 9 server nodes discovered (plus universal nodes)
  - Stop server after verification
  - _Requirements: 4_

- [ ] **Task 1.7.3: Run existing tests**
  - Execute: `bun test` (if tests exist for server nodes)
  - Verify all tests pass with migrated nodes
  - Document any test failures and fix
  - _Requirements: 4_

- [ ] **Task 1.7.4: Create migration checklist document**
  - Document which nodes were migrated
  - Note any breaking changes or API updates
  - Create rollback instructions if needed
  - _Requirements: 4, 10_

---

## PHASE 2: MANIFEST SCHEMA & TYPES

### 2.1 Define Manifest TypeScript Interfaces

- [ ] **Task 2.1.1: Create manifest.ts types file**
  - Create `/packages/engine/src/types/manifest.ts`
  - Add copyright header and file description
  - Prepare for interface definitions
  - _Requirements: 1_

- [ ] **Task 2.1.2: Define NodeEntry interface**
  - Add `NodeEntry` interface with fields: id, name, version, description, path, source, inputs, outputs
  - Add JSDoc comments explaining each field
  - Include example in JSDoc
  - _Requirements: 1_

```typescript
/**
 * Represents a single node entry in the manifest
 */
export interface NodeEntry {
  /** Unique node identifier (e.g., 'math', 'filesystem') */
  id: string;
  /** Human-readable node name */
  name: string;
  /** Node version (semver format) */
  version: string;
  /** Optional description of node functionality */
  description?: string;
  /** Relative path to compiled .js file */
  path: string;
  /** Node source category */
  source: 'universal' | 'server' | 'client';
  /** Input field names */
  inputs?: string[];
  /** Output field names */
  outputs?: string[];
}
```

- [ ] **Task 2.1.3: Define EnvironmentMetadata interface**
  - Add interface for build environment details
  - Include: nodeVersion, bunVersion, platform, arch
  - Add JSDoc comments
  - _Requirements: 1_

```typescript
/**
 * Build environment metadata
 */
export interface EnvironmentMetadata {
  nodeVersion?: string;
  bunVersion?: string;
  platform: string;
  arch: string;
}
```

- [ ] **Task 2.1.4: Define NodeManifest interface**
  - Add main manifest interface
  - Include: version, buildTime, environment, nodes (universal, server, client)
  - Add comprehensive JSDoc
  - _Requirements: 1_

```typescript
/**
 * Complete node manifest structure
 */
export interface NodeManifest {
  /** Manifest schema version */
  version: string;
  /** ISO 8601 timestamp of manifest generation */
  buildTime: string;
  /** Build environment details */
  environment: EnvironmentMetadata;
  /** Categorized node entries */
  nodes: {
    universal: NodeEntry[];
    server: NodeEntry[];
    client: NodeEntry[];
  };
}
```

- [ ] **Task 2.1.5: Export manifest types from engine**
  - Update `/packages/engine/src/types/index.ts`
  - Add: `export * from './manifest';`
  - Verify types are accessible from `@workscript/engine/types`
  - _Requirements: 1_

### 2.2 Create JSON Schema for Validation

- [ ] **Task 2.2.1: Create manifest schema file**
  - Create `/packages/engine/src/schemas/node-manifest.schema.json`
  - Add JSON Schema draft-07 boilerplate
  - _Requirements: 1_

- [ ] **Task 2.2.2: Define NodeEntry schema**
  - Add `nodeEntry` definition with all required and optional fields
  - Set type constraints (string, array, enum)
  - Add pattern validations where appropriate
  - _Requirements: 1_

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "definitions": {
    "nodeEntry": {
      "type": "object",
      "required": ["id", "name", "version", "path", "source"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "name": { "type": "string", "minLength": 1 },
        "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
        "description": { "type": "string" },
        "path": { "type": "string", "minLength": 1 },
        "source": { "type": "string", "enum": ["universal", "server", "client"] },
        "inputs": { "type": "array", "items": { "type": "string" } },
        "outputs": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}
```

- [ ] **Task 2.2.3: Define EnvironmentMetadata schema**
  - Add environment metadata definition
  - Mark platform and arch as required
  - _Requirements: 1_

- [ ] **Task 2.2.4: Define NodeManifest schema**
  - Add main manifest schema with all required fields
  - Reference nodeEntry definition
  - Set buildTime format as date-time
  - _Requirements: 1_

```json
{
  "type": "object",
  "required": ["version", "buildTime", "environment", "nodes"],
  "properties": {
    "version": { "type": "string" },
    "buildTime": { "type": "string", "format": "date-time" },
    "environment": { "$ref": "#/definitions/environmentMetadata" },
    "nodes": {
      "type": "object",
      "required": ["universal", "server", "client"],
      "properties": {
        "universal": { "type": "array", "items": { "$ref": "#/definitions/nodeEntry" } },
        "server": { "type": "array", "items": { "$ref": "#/definitions/nodeEntry" } },
        "client": { "type": "array", "items": { "$ref": "#/definitions/nodeEntry" } }
      }
    }
  }
}
```

- [ ] **Task 2.2.5: Export schema from engine**
  - Update `/packages/engine/src/schemas/index.ts` to export manifest schema
  - Verify schema can be imported by other packages
  - _Requirements: 1_

### 2.3 Add Manifest Validation Utilities

- [ ] **Task 2.3.1: Install Ajv if not present**
  - Check if Ajv is in package.json
  - If missing: `cd packages/engine && bun add ajv`
  - Verify installation
  - _Requirements: 1, 9_

- [ ] **Task 2.3.2: Create validation utility**
  - Create `/packages/engine/src/utils/validateManifest.ts`
  - Import Ajv and manifest schema
  - Create validation function
  - _Requirements: 1, 9_

```typescript
import Ajv from 'ajv';
import manifestSchema from '../schemas/node-manifest.schema.json';
import type { NodeManifest } from '../types/manifest';

const ajv = new Ajv({ allErrors: true });
const validate = ajv.compile(manifestSchema);

export function validateManifest(manifest: unknown): manifest is NodeManifest {
  const valid = validate(manifest);
  if (!valid) {
    console.error('Manifest validation errors:', validate.errors);
    return false;
  }
  return true;
}
```

- [ ] **Task 2.3.3: Export validation utility**
  - Update `/packages/engine/src/utils/index.ts` to export `validateManifest`
  - Verify it's accessible from `@workscript/engine/utils`
  - _Requirements: 1_

- [ ] **Task 2.3.4: Test validation utility**
  - Create test file: `/packages/engine/src/utils/validateManifest.test.ts`
  - Test valid manifest passes validation
  - Test invalid manifests fail validation
  - Test error messages are descriptive
  - _Requirements: 1, 11_

---

## PHASE 3: MANIFEST GENERATOR SCRIPT

### 3.1 Create Generator Script Foundation

- [ ] **Task 3.1.1: Create scripts directory**
  - Run: `mkdir -p scripts`
  - Verify directory exists at project root
  - _Requirements: 2_

- [ ] **Task 3.1.2: Create generate-node-manifest.ts**
  - Create `/scripts/generate-node-manifest.ts`
  - Add shebang: `#!/usr/bin/env bun`
  - Add file header with description
  - _Requirements: 2_

- [ ] **Task 3.1.3: Import required dependencies**
  - Import: glob, fs/promises, path
  - Import manifest types from `@workscript/engine/types`
  - Import validation from `@workscript/engine/utils`
  - _Requirements: 2_

```typescript
#!/usr/bin/env bun
import { glob } from 'glob';
import fs from 'fs/promises';
import path from 'path';
import type { NodeManifest, NodeEntry } from '../packages/engine/src/types/manifest';
import { validateManifest } from '../packages/engine/src/utils/validateManifest';
```

- [ ] **Task 3.1.4: Define configuration constants**
  - Define paths for universal, server, client node directories
  - Define output manifest path
  - Add comments explaining each path
  - _Requirements: 2_

```typescript
const NODE_DIRECTORIES = {
  universal: 'packages/engine/nodes',
  server: 'apps/api/src/nodes',
  client: 'apps/frontend/nodes'
};

const OUTPUT_PATH = 'packages/engine/dist/node-manifest.json';
```

### 3.2 Implement Node Scanning Logic

- [ ] **Task 3.2.1: Create scanDirectory function**
  - Create async function that takes directory path and source type
  - Returns array of NodeEntry
  - Add JSDoc explaining parameters and return value
  - _Requirements: 2_

```typescript
/**
 * Scans a directory for node files and extracts metadata
 */
async function scanDirectory(
  directory: string,
  source: 'universal' | 'server' | 'client'
): Promise<NodeEntry[]> {
  const entries: NodeEntry[] = [];
  // Implementation follows
  return entries;
}
```

- [ ] **Task 3.2.2: Implement glob pattern matching**
  - Use glob to find all `.ts` files in directory recursively
  - Exclude files matching: `*.test.ts`, `**/index.ts`
  - Use absolute: true for full paths
  - _Requirements: 2_

```typescript
const pattern = path.join(directory, '**/*.ts');
const files = await glob(pattern, {
  absolute: true,
  ignore: ['**/*.test.ts', '**/index.ts']
});
```

- [ ] **Task 3.2.3: Implement node file processing loop**
  - Iterate through each found file
  - Wrap in try-catch for error handling
  - Log processing status for each file
  - _Requirements: 2, 9_

- [ ] **Task 3.2.4: Implement dynamic import for metadata extraction**
  - Use dynamic import to load each node file
  - Get default export or first exported class
  - Instantiate class to access metadata property
  - _Requirements: 2_

```typescript
for (const file of files) {
  try {
    console.log(`Processing: ${file}`);
    const module = await import(/* @vite-ignore */ file);
    const NodeClass = module.default || Object.values(module)[0];

    if (!NodeClass || typeof NodeClass !== 'function') {
      console.warn(`⚠️  No node class found in ${file}`);
      continue;
    }

    const instance = new NodeClass();
    if (!instance.metadata) {
      console.warn(`⚠️  No metadata in ${file}`);
      continue;
    }

    // Extract metadata (next task)
  } catch (error) {
    console.error(`❌ Error processing ${file}:`, error);
  }
}
```

- [ ] **Task 3.2.5: Extract and validate node metadata**
  - Read metadata fields: id, name, version, description, inputs, outputs
  - Calculate relative path to compiled .js file
  - Create NodeEntry object
  - Push to entries array
  - _Requirements: 2_

```typescript
const metadata = instance.metadata;

// Calculate relative path: from manifest to compiled .js
const relativePath = calculateRelativePath(file, source);

const entry: NodeEntry = {
  id: metadata.id,
  name: metadata.name,
  version: metadata.version || '1.0.0',
  description: metadata.description,
  path: relativePath,
  source,
  inputs: metadata.inputs,
  outputs: metadata.outputs
};

entries.push(entry);
console.log(`✓ Added: ${metadata.name} (${metadata.id})`);
```

- [ ] **Task 3.2.6: Implement calculateRelativePath helper**
  - Create helper function to convert source .ts path to dist .js path
  - Handle different directory structures for each source type
  - Return relative path from manifest location
  - _Requirements: 2_

```typescript
function calculateRelativePath(
  sourceFile: string,
  source: 'universal' | 'server' | 'client'
): string {
  // Convert .ts to .js
  const jsFile = sourceFile.replace(/\.ts$/, '.js');

  // Extract path relative to source directory
  let relativePath = '';

  if (source === 'universal') {
    // packages/engine/nodes/MathNode.ts → ./nodes/MathNode.js
    relativePath = jsFile.replace(/.*packages\/engine\//, './');
  } else if (source === 'server') {
    // apps/api/src/nodes/core/FileSystemNode.ts → ../../../apps/api/dist/nodes/core/FileSystemNode.js
    relativePath = jsFile.replace(/.*apps\/api\/src\//, '../../../apps/api/dist/');
  } else if (source === 'client') {
    // apps/frontend/nodes/DOMNode.ts → ../../../apps/frontend/dist/nodes/DOMNode.js
    relativePath = jsFile.replace(/.*apps\/frontend\//, '../../../apps/frontend/dist/');
  }

  return relativePath;
}
```

### 3.3 Implement Manifest Generation

- [ ] **Task 3.3.1: Create generateManifest function**
  - Create async main function
  - Orchestrates scanning all directories
  - Builds complete manifest object
  - _Requirements: 2_

```typescript
async function generateManifest(): Promise<NodeManifest> {
  console.log('🔍 Scanning for workflow nodes...\n');

  const universalNodes = await scanDirectory(NODE_DIRECTORIES.universal, 'universal');
  const serverNodes = await scanDirectory(NODE_DIRECTORIES.server, 'server');
  const clientNodes = await scanDirectory(NODE_DIRECTORIES.client, 'client');

  // Continue building manifest...
}
```

- [ ] **Task 3.3.2: Build environment metadata**
  - Capture Node.js version (if available)
  - Capture Bun version
  - Capture platform and architecture
  - _Requirements: 2_

```typescript
const environment = {
  nodeVersion: process.versions.node,
  bunVersion: process.versions.bun,
  platform: process.platform,
  arch: process.arch
};
```

- [ ] **Task 3.3.3: Assemble complete manifest**
  - Create manifest object with version '1.0.0'
  - Set buildTime to current ISO timestamp
  - Include environment metadata
  - Include all scanned nodes categorized
  - _Requirements: 2_

```typescript
const manifest: NodeManifest = {
  version: '1.0.0',
  buildTime: new Date().toISOString(),
  environment,
  nodes: {
    universal: universalNodes,
    server: serverNodes,
    client: clientNodes
  }
};
```

- [ ] **Task 3.3.4: Validate manifest before writing**
  - Call validateManifest(manifest)
  - If validation fails, throw error with details
  - Log validation success
  - _Requirements: 2, 9_

```typescript
console.log('\n✓ Validating manifest...');
if (!validateManifest(manifest)) {
  throw new Error('Manifest validation failed');
}
console.log('✓ Manifest is valid\n');
```

### 3.4 Implement Manifest Writing

- [ ] **Task 3.4.1: Create ensureDirectoryExists helper**
  - Create helper to ensure output directory exists
  - Use fs.mkdir with recursive: true
  - _Requirements: 2_

```typescript
async function ensureDirectoryExists(filePath: string): Promise<void> {
  const directory = path.dirname(filePath);
  await fs.mkdir(directory, { recursive: true });
}
```

- [ ] **Task 3.4.2: Write manifest to file**
  - Ensure output directory exists
  - Stringify manifest with formatting (2 spaces)
  - Write to OUTPUT_PATH
  - Log success with file size
  - _Requirements: 2_

```typescript
console.log(`📝 Writing manifest to ${OUTPUT_PATH}...`);
await ensureDirectoryExists(OUTPUT_PATH);

const manifestJson = JSON.stringify(manifest, null, 2);
await fs.writeFile(OUTPUT_PATH, manifestJson, 'utf-8');

const stats = await fs.stat(OUTPUT_PATH);
console.log(`✓ Manifest written (${stats.size} bytes)\n`);
```

- [ ] **Task 3.4.3: Log summary statistics**
  - Count total nodes
  - Log counts by category (universal, server, client)
  - Log total execution time
  - _Requirements: 2_

```typescript
const totalNodes =
  manifest.nodes.universal.length +
  manifest.nodes.server.length +
  manifest.nodes.client.length;

console.log('📊 Summary:');
console.log(`   Universal: ${manifest.nodes.universal.length} nodes`);
console.log(`   Server:    ${manifest.nodes.server.length} nodes`);
console.log(`   Client:    ${manifest.nodes.client.length} nodes`);
console.log(`   Total:     ${totalNodes} nodes\n`);
```

### 3.5 Add Error Handling and Script Entry

- [ ] **Task 3.5.1: Create main execution wrapper**
  - Wrap generateManifest in try-catch
  - Handle errors with descriptive messages
  - Exit with appropriate codes (0 success, 1 failure)
  - _Requirements: 2, 9_

```typescript
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    const manifest = await generateManifest();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Manifest generation complete in ${duration}s\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Manifest generation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Execute
main();
```

- [ ] **Task 3.5.2: Make script executable**
  - Run: `chmod +x scripts/generate-node-manifest.ts`
  - Verify script can be executed directly
  - Test: `./scripts/generate-node-manifest.ts`
  - _Requirements: 2_

- [ ] **Task 3.5.3: Test script execution**
  - Run script manually: `bun scripts/generate-node-manifest.ts`
  - Verify manifest is generated at expected path
  - Check manifest content is valid JSON
  - Verify all nodes are included
  - _Requirements: 2, 15_

---

## PHASE 4: NODEREGISTRY UPDATES

### 4.1 Implement discoverFromManifest Method

- [ ] **Task 4.1.1: Add private discoverFromManifest method**
  - Open `/packages/engine/src/registry/NodeRegistry.ts`
  - Add private async method signature
  - Add JSDoc explaining manifest-based discovery
  - _Requirements: 6, 18_

```typescript
/**
 * Discovers and registers nodes from a pre-generated manifest file.
 * Used in production builds for reliable, environment-agnostic discovery.
 */
private async discoverFromManifest(environment: Environment): Promise<void> {
  // Implementation follows
}
```

- [ ] **Task 4.1.2: Implement manifest path resolution**
  - Resolve path to manifest file in engine dist directory
  - Use path.join with __dirname or import.meta.url
  - Handle different module systems (CJS vs ESM)
  - _Requirements: 6_

```typescript
// Resolve manifest path relative to this file
const manifestPath = path.join(__dirname, '../node-manifest.json');
```

- [ ] **Task 4.1.3: Load and parse manifest**
  - Read manifest file with fs.readFile
  - Parse JSON
  - Wrap in try-catch for file errors
  - _Requirements: 6, 9_

```typescript
let manifestData: string;
let manifest: NodeManifest;

try {
  manifestData = await fs.readFile(manifestPath, 'utf-8');
  manifest = JSON.parse(manifestData);
} catch (error) {
  console.error(`Failed to load manifest from ${manifestPath}:`, error);
  console.warn('Falling back to file-based discovery...');
  return this.discoverFromPath(/* fallback logic */);
}
```

- [ ] **Task 4.1.4: Validate loaded manifest**
  - Import validateManifest utility
  - Validate manifest structure
  - Log warning and fallback if invalid
  - _Requirements: 6, 9_

```typescript
if (!validateManifest(manifest)) {
  console.error('Invalid manifest structure');
  console.warn('Falling back to file-based discovery...');
  return this.discoverFromPath(/* fallback logic */);
}
```

- [ ] **Task 4.1.5: Implement environment filtering**
  - Collect applicable nodes based on environment
  - Universal nodes always included
  - Server nodes only for server/universal environment
  - Client nodes only for client/universal environment
  - _Requirements: 6, 7_

```typescript
const nodesToLoad: NodeEntry[] = [];

// Always include universal nodes
nodesToLoad.push(...manifest.nodes.universal);

if (environment === 'server' || environment === 'universal') {
  nodesToLoad.push(...manifest.nodes.server);
}

if (environment === 'client' || environment === 'universal') {
  nodesToLoad.push(...manifest.nodes.client);
}

console.log(`Loading ${nodesToLoad.length} nodes from manifest for ${environment} environment`);
```

- [ ] **Task 4.1.6: Implement node loading loop**
  - Iterate through filtered nodes
  - Dynamically import each node using manifest path
  - Register imported node
  - Handle import errors gracefully
  - _Requirements: 6, 9_

```typescript
for (const entry of nodesToLoad) {
  try {
    // Resolve absolute path from relative manifest path
    const absolutePath = path.resolve(path.dirname(manifestPath), entry.path);

    const module = await import(/* @vite-ignore */ absolutePath);
    const NodeClass = module.default || Object.values(module)[0];

    if (!NodeClass) {
      console.warn(`⚠️  No node class found in manifest entry: ${entry.id}`);
      continue;
    }

    await this.register(NodeClass, { source: entry.source });

  } catch (error) {
    console.warn(`⚠️  Failed to load node ${entry.id}:`, error);
  }
}
```

- [ ] **Task 4.1.7: Log discovery summary**
  - Log total nodes loaded
  - Log breakdown by category
  - _Requirements: 6, 9_

```typescript
console.log(`✓ Loaded ${this.size} nodes from manifest`);
console.log(`  Universal: ${manifest.nodes.universal.length}`);
console.log(`  Server: ${manifest.nodes.server.length}`);
console.log(`  Client: ${manifest.nodes.client.length}`);
```

### 4.2 Implement Dual-Mode Logic

- [ ] **Task 4.2.1: Update discoverFromPackages method**
  - Open existing `discoverFromPackages()` method
  - Add mode selection logic at the beginning
  - Preserve existing file-based discovery code
  - _Requirements: 5_

- [ ] **Task 4.2.2: Add environment variable checks**
  - Check `process.env.NODE_ENV`
  - Check `process.env.USE_NODE_MANIFEST`
  - Determine which mode to use
  - Log selected mode
  - _Requirements: 5_

```typescript
async discoverFromPackages(environment: Environment = 'universal'): Promise<void> {
  const useManifest =
    process.env.USE_NODE_MANIFEST === 'true' ||
    process.env.NODE_ENV === 'production';

  const mode = useManifest ? 'manifest' : 'file-based';
  console.log(`Node discovery mode: ${mode} (environment: ${environment})`);

  if (useManifest) {
    await this.discoverFromManifest(environment);
    return;
  }

  // Existing file-based discovery continues below
  const discoveryPaths = this.getDiscoveryPaths(environment);
  // ... rest of existing code
}
```

- [ ] **Task 4.2.3: Test mode switching**
  - Test with NODE_ENV=development (should use file-based)
  - Test with NODE_ENV=production (should use manifest)
  - Test with USE_NODE_MANIFEST=true (should use manifest)
  - Test with USE_NODE_MANIFEST=false (should use file-based)
  - _Requirements: 5, 15_

### 4.3 Update Discovery Path Configuration

- [ ] **Task 4.3.1: Update getDiscoveryPaths for new architecture**
  - Open `getDiscoveryPaths()` method
  - Update server path from `/server/nodes/` to `/apps/api/src/nodes/`
  - Keep legacy path as fallback (commented)
  - _Requirements: 4, 8_

```typescript
if (environment === 'server' || environment === 'universal') {
  // New architecture
  paths.push({
    path: path.join(basePath, 'apps/api/src/nodes'),
    source: 'server'
  });

  // Legacy fallback (for backward compatibility during migration)
  // paths.push({ path: path.join(basePath, 'server/nodes'), source: 'server' });
}
```

- [ ] **Task 4.3.2: Update client discovery paths**
  - Verify client path points to `/apps/frontend/nodes/`
  - Keep legacy `/client/nodes/` as fallback if needed
  - _Requirements: 8_

- [ ] **Task 4.3.3: Test path resolution**
  - Run discovery in file-based mode
  - Verify nodes are found in new locations
  - Check logs for correct paths
  - _Requirements: 8, 15_

### 4.4 Add Fallback Mechanism

- [ ] **Task 4.4.1: Implement fallback in discoverFromManifest**
  - When manifest fails to load, call file-based discovery
  - Pass same environment parameter
  - Log fallback reason
  - _Requirements: 6, 9, 10_

- [ ] **Task 4.4.2: Test fallback scenarios**
  - Delete manifest file and verify fallback works
  - Corrupt manifest JSON and verify fallback works
  - Test with invalid manifest schema
  - _Requirements: 9, 10, 15_

---

## PHASE 5: BUILD INTEGRATION

### 5.1 Update Engine Package Build Scripts

- [ ] **Task 5.1.1: Add prebuild script to engine**
  - Open `/packages/engine/package.json`
  - Add `"prebuild": "bun run ../../scripts/generate-node-manifest.ts"`
  - Ensure it runs before TypeScript compilation
  - _Requirements: 3_

```json
{
  "scripts": {
    "prebuild": "bun run ../../scripts/generate-node-manifest.ts",
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

- [ ] **Task 5.1.2: Test engine build**
  - Run: `cd packages/engine && bun run build`
  - Verify manifest generation runs first
  - Verify TypeScript compilation succeeds
  - Check that manifest exists in dist/
  - _Requirements: 3, 15_

- [ ] **Task 5.1.3: Update postinstall hook**
  - Verify root package.json has `"postinstall": "bun run build:engine"`
  - Test: `bun install` triggers manifest generation
  - _Requirements: 3_

### 5.2 Configure Environment Variables

- [ ] **Task 5.2.1: Create .env.example**
  - Create `.env.example` at project root
  - Document NODE_ENV and USE_NODE_MANIFEST variables
  - Include usage examples
  - _Requirements: 3, 16_

```bash
# Node Discovery Configuration

# Environment mode (development or production)
# - development: Uses file-based node discovery (fast iteration)
# - production: Uses manifest-based node discovery (reliable deployment)
NODE_ENV=development

# Force manifest-based discovery regardless of NODE_ENV
# USE_NODE_MANIFEST=true

# Usage:
# - Development: NODE_ENV=development (default)
# - Production: NODE_ENV=production
# - Test manifest locally: USE_NODE_MANIFEST=true bun run dev
```

- [ ] **Task 5.2.2: Update .gitignore**
  - Ensure `.env` is in .gitignore
  - Ensure `dist/` directories are in .gitignore
  - Verify manifest is NOT in .gitignore (it's in dist/)
  - _Requirements: 3_

- [ ] **Task 5.2.3: Document environment variables**
  - Add section to CLAUDE.md (will do in Phase 7)
  - Note for now in implementation
  - _Requirements: 16_

### 5.3 Update CI/CD Configuration

- [ ] **Task 5.3.1: Review CI/CD build scripts**
  - Check if project has GitHub Actions, GitLab CI, etc.
  - Ensure NODE_ENV=production is set for production builds
  - Verify build order (engine → api → frontend)
  - _Requirements: 3_

- [ ] **Task 5.3.2: Add manifest verification step**
  - Add CI step to verify manifest exists after build
  - Add CI step to validate manifest JSON
  - Fail build if manifest is missing or invalid
  - _Requirements: 3, 9_

```yaml
# Example GitHub Actions step
- name: Verify node manifest
  run: |
    if [ ! -f packages/engine/dist/node-manifest.json ]; then
      echo "Error: Node manifest not found"
      exit 1
    fi
    echo "✓ Node manifest verified"
```

- [ ] **Task 5.3.3: Test CI build**
  - Push changes to CI environment
  - Verify manifest generation in CI logs
  - Verify build succeeds
  - _Requirements: 3, 15_

### 5.4 Update API and Frontend Builds

- [ ] **Task 5.4.1: Verify API build depends on engine**
  - Check `/apps/api/package.json` dependencies
  - Ensure `@workscript/engine` is listed
  - Test that engine builds before API
  - _Requirements: 3_

- [ ] **Task 5.4.2: Verify frontend build depends on engine**
  - Check `/apps/frontend/package.json` dependencies
  - Ensure `@workscript/engine` is listed
  - Test that engine builds before frontend
  - _Requirements: 3_

- [ ] **Task 5.4.3: Test full build process**
  - Run: `bun run build` from root
  - Verify order: engine → api → frontend
  - Verify manifest generated before other builds
  - Verify no errors
  - _Requirements: 3, 15_

---

## PHASE 6: COMPREHENSIVE TESTING

### 6.1 Unit Tests - Manifest Generation

- [ ] **Task 6.1.1: Create test file for manifest generator**
  - Create `/scripts/generate-node-manifest.test.ts`
  - Setup test framework imports (Vitest)
  - _Requirements: 11_

- [ ] **Task 6.1.2: Test manifest structure generation**
  - Write test: "should generate valid manifest structure"
  - Mock file system and node imports
  - Verify manifest has all required fields
  - _Requirements: 11_

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Manifest Generator', () => {
  it('should generate valid manifest structure', async () => {
    const manifest = await generateManifest();

    expect(manifest).toHaveProperty('version');
    expect(manifest).toHaveProperty('buildTime');
    expect(manifest).toHaveProperty('environment');
    expect(manifest).toHaveProperty('nodes');
    expect(manifest.nodes).toHaveProperty('universal');
    expect(manifest.nodes).toHaveProperty('server');
    expect(manifest.nodes).toHaveProperty('client');
  });
});
```

- [ ] **Task 6.1.3: Test metadata extraction**
  - Write test: "should correctly extract node metadata"
  - Create mock node with metadata
  - Verify all metadata fields are captured
  - _Requirements: 11_

- [ ] **Task 6.1.4: Test handling nodes with missing metadata**
  - Write test: "should warn for nodes with missing metadata"
  - Create mock node without metadata property
  - Verify warning is logged
  - Verify generation continues
  - _Requirements: 11_

- [ ] **Task 6.1.5: Test handling invalid node files**
  - Write test: "should handle import errors gracefully"
  - Mock file that throws on import
  - Verify error is logged
  - Verify generation continues
  - _Requirements: 11_

- [ ] **Task 6.1.6: Test relative path calculation**
  - Write test: "should generate correct relative paths"
  - Test for universal nodes: `./nodes/MathNode.js`
  - Test for server nodes: `../../../apps/api/dist/nodes/core/FileSystemNode.js`
  - Test for client nodes: `../../../apps/frontend/dist/nodes/DOMNode.js`
  - _Requirements: 11_

- [ ] **Task 6.1.7: Test manifest validation**
  - Write test: "should validate manifest before writing"
  - Create invalid manifest
  - Verify validation catches errors
  - _Requirements: 11_

- [ ] **Task 6.1.8: Test empty directories**
  - Write test: "should handle empty node directories"
  - Mock empty directory
  - Verify manifest generated with empty arrays
  - _Requirements: 11_

- [ ] **Task 6.1.9: Test duplicate node IDs**
  - Write test: "should handle duplicate node IDs"
  - Create nodes with same ID in different directories
  - Verify warning is logged
  - Decide on strategy (last wins, error, etc.)
  - _Requirements: 11_

- [ ] **Task 6.1.10: Test build timestamp format**
  - Write test: "should use ISO 8601 timestamp format"
  - Verify buildTime matches ISO format
  - _Requirements: 11_

- [ ] **Task 6.1.11: Run manifest generation tests**
  - Execute: `bun test scripts/generate-node-manifest.test.ts`
  - Verify all tests pass
  - Check code coverage (should be >90%)
  - _Requirements: 11_

### 6.2 Unit Tests - Manifest Loading

- [ ] **Task 6.2.1: Create test file for NodeRegistry manifest loading**
  - Create or update `/packages/engine/src/registry/NodeRegistry.test.ts`
  - Add section for manifest loading tests
  - _Requirements: 12_

- [ ] **Task 6.2.2: Test loading valid manifest**
  - Write test: "should load nodes from valid manifest"
  - Create mock manifest file
  - Call discoverFromManifest
  - Verify nodes are registered
  - _Requirements: 12_

- [ ] **Task 6.2.3: Test handling missing manifest**
  - Write test: "should handle missing manifest file"
  - Mock file not found error
  - Verify fallback to file-based discovery
  - Verify warning is logged
  - _Requirements: 12_

- [ ] **Task 6.2.4: Test handling malformed JSON**
  - Write test: "should handle malformed manifest JSON"
  - Mock invalid JSON file
  - Verify error is caught
  - Verify fallback occurs
  - _Requirements: 12_

- [ ] **Task 6.2.5: Test server environment filtering**
  - Write test: "should load only universal and server nodes for server environment"
  - Create manifest with all node types
  - Call with environment='server'
  - Verify only universal and server nodes loaded
  - _Requirements: 12_

- [ ] **Task 6.2.6: Test client environment filtering**
  - Write test: "should load only universal and client nodes for client environment"
  - Call with environment='client'
  - Verify only universal and client nodes loaded
  - _Requirements: 12_

- [ ] **Task 6.2.7: Test universal environment filtering**
  - Write test: "should load only universal nodes for universal environment"
  - Call with environment='universal'
  - Verify only universal nodes loaded
  - _Requirements: 12_

- [ ] **Task 6.2.8: Test manifest path resolution**
  - Write test: "should correctly resolve manifest path"
  - Verify path calculation from NodeRegistry location
  - Test in different working directories
  - _Requirements: 12_

- [ ] **Task 6.2.9: Test node registration from manifest**
  - Write test: "should successfully register nodes from manifest entries"
  - Create manifest with multiple nodes
  - Verify all nodes registered in NodeRegistry
  - Verify node count matches expected
  - _Requirements: 12_

- [ ] **Task 6.2.10: Test invalid manifest entry paths**
  - Write test: "should skip nodes with invalid paths"
  - Create manifest with non-existent file path
  - Verify warning logged
  - Verify other nodes still loaded
  - _Requirements: 12_

- [ ] **Task 6.2.11: Test node import failures**
  - Write test: "should handle node import errors"
  - Mock import failure for specific node
  - Verify error logged
  - Verify other nodes still loaded
  - _Requirements: 12_

- [ ] **Task 6.2.12: Test NODE_ENV-based mode selection**
  - Write test: "should use manifest mode when NODE_ENV=production"
  - Set process.env.NODE_ENV = 'production'
  - Verify discoverFromManifest is called
  - _Requirements: 12_

- [ ] **Task 6.2.13: Test USE_NODE_MANIFEST flag override**
  - Write test: "should use manifest mode when USE_NODE_MANIFEST=true"
  - Set process.env.USE_NODE_MANIFEST = 'true'
  - Verify manifest mode even with NODE_ENV=development
  - _Requirements: 12_

- [ ] **Task 6.2.14: Run manifest loading tests**
  - Execute: `bun test packages/engine/src/registry/NodeRegistry.test.ts`
  - Verify all tests pass
  - Check code coverage (should be >90%)
  - _Requirements: 12_

### 6.3 Integration Tests

- [ ] **Task 6.3.1: Create integration test file**
  - Create `/tests/integration/node-discovery.test.ts`
  - Setup test environment
  - _Requirements: 13_

- [ ] **Task 6.3.2: Test full generation → loading flow**
  - Write test: "should generate manifest and load nodes successfully"
  - Run manifest generator
  - Create NodeRegistry and discover from manifest
  - Verify node count matches
  - _Requirements: 13_

- [ ] **Task 6.3.3: Test node count verification**
  - Write test: "should discover all expected nodes"
  - Expected: 26 universal + 9 server + 12 client = 47 total
  - Run discovery for each environment
  - Verify counts match
  - _Requirements: 13_

- [ ] **Task 6.3.4: Test file-based vs manifest discovery parity**
  - Write test: "should produce identical results in both modes"
  - Discover nodes with file-based mode
  - Discover nodes with manifest mode
  - Compare registered nodes (IDs, metadata)
  - Verify no differences
  - _Requirements: 13_

- [ ] **Task 6.3.5: Test workflow execution with manifest-loaded nodes**
  - Write test: "should execute workflow with manifest-loaded nodes"
  - Load nodes from manifest
  - Create simple workflow using discovered nodes
  - Execute workflow
  - Verify successful completion
  - _Requirements: 13_

- [ ] **Task 6.3.6: Test API server initialization**
  - Write test: "should initialize API server with server environment"
  - Create NodeRegistry with environment='server'
  - Discover from manifest
  - Verify universal + server nodes loaded
  - Verify client nodes NOT loaded
  - _Requirements: 13_

- [ ] **Task 6.3.7: Test frontend initialization**
  - Write test: "should initialize frontend with client environment"
  - Create NodeRegistry with environment='client'
  - Discover from manifest
  - Verify universal + client nodes loaded
  - Verify server nodes NOT loaded
  - _Requirements: 13_

- [ ] **Task 6.3.8: Test build process integration**
  - Write test: "should successfully build all packages"
  - Run full build command
  - Verify manifest generated
  - Verify TypeScript compilation succeeds
  - Verify no build errors
  - _Requirements: 13_

- [ ] **Task 6.3.9: Test production mode simulation**
  - Write test: "should work correctly with NODE_ENV=production"
  - Set NODE_ENV=production
  - Initialize NodeRegistry
  - Verify manifest mode is used
  - Verify all nodes discovered
  - _Requirements: 13_

- [ ] **Task 6.3.10: Test error scenarios**
  - Write test: "should handle discovery failures with clear errors"
  - Simulate various failure scenarios
  - Verify error messages are actionable
  - _Requirements: 13_

- [ ] **Task 6.3.11: Test mode switching**
  - Write test: "should switch between dev and prod modes"
  - Test with different environment variables
  - Verify correct mode used in each case
  - _Requirements: 13_

- [ ] **Task 6.3.12: Run integration tests**
  - Execute: `bun test tests/integration/node-discovery.test.ts`
  - Verify all tests pass
  - Ensure completion under 60 seconds
  - _Requirements: 13_

### 6.4 End-to-End Production Simulation

- [ ] **Task 6.4.1: Create E2E test script**
  - Create `/tests/e2e/production-deployment.test.ts`
  - Setup production-like environment
  - _Requirements: 14_

- [ ] **Task 6.4.2: Test production build**
  - Write test: "should build all packages with NODE_ENV=production"
  - Set NODE_ENV=production
  - Run full build
  - Verify success
  - _Requirements: 14_

- [ ] **Task 6.4.3: Test manifest verification**
  - Write test: "should verify manifest exists and is valid"
  - Check manifest file exists
  - Load and parse manifest
  - Validate structure
  - _Requirements: 14_

- [ ] **Task 6.4.4: Test manifest completeness**
  - Write test: "should contain all expected nodes"
  - Load manifest
  - Count nodes by category
  - Verify totals match expected (26 + 9 + 12)
  - _Requirements: 14_

- [ ] **Task 6.4.5: Test API server startup in production**
  - Write test: "should start API server with manifest discovery"
  - Start API server with NODE_ENV=production
  - Check logs for manifest mode
  - Verify node count in logs
  - Stop server
  - _Requirements: 14_

- [ ] **Task 6.4.6: Test frontend startup in production**
  - Write test: "should start frontend with manifest discovery"
  - Start frontend build server
  - Check console for manifest mode
  - Verify node count
  - _Requirements: 14_

- [ ] **Task 6.4.7: Test workflow execution in production**
  - Write test: "should execute workflows using manifest-loaded nodes"
  - Create test workflow
  - Execute via API
  - Verify successful completion
  - _Requirements: 14_

- [ ] **Task 6.4.8: Test environment-specific node counts**
  - Write test: "should load correct node count per environment"
  - Server: 26 universal + 9 server = 35
  - Client: 26 universal + 12 client = 38
  - Verify counts in logs
  - _Requirements: 14_

- [ ] **Task 6.4.9: Test bundle size optimization**
  - Write test: "should exclude server nodes from client bundle"
  - Build frontend bundle
  - Analyze bundle contents
  - Verify server-only nodes not included
  - _Requirements: 14_

- [ ] **Task 6.4.10: Generate E2E test report**
  - Write test: "should generate summary report"
  - Collect all E2E test results
  - Generate markdown report
  - Include: build status, node counts, bundle sizes, test results
  - _Requirements: 14_

- [ ] **Task 6.4.11: Run E2E tests**
  - Execute: `bun test tests/e2e/production-deployment.test.ts`
  - Verify all tests pass
  - Review summary report
  - _Requirements: 14_

### 6.5 Manual Testing Checklist

- [ ] **Task 6.5.1: Clean build verification**
  - Delete all dist/ and node_modules/
  - Run: `bun install`
  - Run: `bun run build`
  - Verify clean build completion
  - _Requirements: 15_

- [ ] **Task 6.5.2: Manifest JSON validation**
  - Open `/packages/engine/dist/node-manifest.json`
  - Verify valid JSON structure
  - Check all required fields present
  - Verify node counts are correct
  - _Requirements: 15_

- [ ] **Task 6.5.3: Development mode test**
  - Set NODE_ENV=development (or unset)
  - Start API: `cd apps/api && bun run dev`
  - Check logs: should show "file-based" discovery mode
  - Verify node count in logs
  - Stop server
  - _Requirements: 15_

- [ ] **Task 6.5.4: Production mode test**
  - Set NODE_ENV=production
  - Start API: `cd apps/api && bun run dev`
  - Check logs: should show "manifest" discovery mode
  - Verify node count matches dev mode
  - Stop server
  - _Requirements: 15_

- [ ] **Task 6.5.5: API server node count verification**
  - Start API server
  - Check logs for: "Loaded X nodes from manifest"
  - Expected: 35 nodes (26 universal + 9 server)
  - Verify no missing node errors
  - _Requirements: 15_

- [ ] **Task 6.5.6: Frontend node count verification**
  - Start frontend: `cd apps/frontend && bun run dev`
  - Open browser console
  - Check for node discovery logs
  - Expected: 38 nodes (26 universal + 12 client)
  - Verify no missing node errors
  - _Requirements: 15_

- [ ] **Task 6.5.7: Workflow execution test (dev mode)**
  - Use file-based discovery (NODE_ENV=development)
  - Create test workflow via API
  - Execute workflow
  - Verify successful completion
  - Check no errors in logs
  - _Requirements: 15_

- [ ] **Task 6.5.8: Workflow execution test (prod mode)**
  - Use manifest discovery (NODE_ENV=production)
  - Create same test workflow
  - Execute workflow
  - Verify successful completion
  - Compare results with dev mode (should be identical)
  - _Requirements: 15_

- [ ] **Task 6.5.9: Hot reload test in development**
  - Start dev server with file-based mode
  - Create a new dummy node file
  - Verify it's discovered without rebuild
  - Remove dummy node
  - _Requirements: 15_

- [ ] **Task 6.5.10: Fallback test**
  - Rename manifest file temporarily
  - Start in production mode
  - Verify fallback to file-based discovery
  - Check warning in logs
  - Restore manifest file
  - _Requirements: 15_

- [ ] **Task 6.5.11: Document manual test results**
  - Create test results document
  - Note any issues or observations
  - Include screenshots of logs if helpful
  - Mark checklist as complete
  - _Requirements: 15_

---

## PHASE 7: DOCUMENTATION & DEPLOYMENT

### 7.1 Update CLAUDE.md

- [ ] **Task 7.1.1: Add "Manifest-Based Node Discovery" section**
  - Open `/CLAUDE.md`
  - Find appropriate location (after "Architecture Overview")
  - Add new section header
  - _Requirements: 16_

- [ ] **Task 7.1.2: Document dual-mode operation**
  - Explain file-based discovery (development)
  - Explain manifest-based discovery (production)
  - Show when each mode is used
  - Include environment variable table
  - _Requirements: 16_

```markdown
## Manifest-Based Node Discovery

The system uses **dual-mode discovery** for workflow nodes:

- **Development Mode:** File-based discovery using glob patterns
  - Fast iteration - new nodes available immediately
  - No rebuild required when adding nodes
  - Used when `NODE_ENV=development` or unset

- **Production Mode:** Manifest-based discovery using pre-generated JSON
  - Reliable across all deployment targets
  - Works in Docker, serverless, and traditional deployments
  - Used when `NODE_ENV=production`

**Environment Variables:**

| Variable | Values | Effect |
|----------|--------|--------|
| `NODE_ENV` | `development` | File-based discovery (default) |
| `NODE_ENV` | `production` | Manifest-based discovery |
| `USE_NODE_MANIFEST` | `true` | Force manifest mode (overrides NODE_ENV) |
| `USE_NODE_MANIFEST` | `false` | Force file-based mode (overrides NODE_ENV) |
```

- [ ] **Task 7.1.3: Document manifest generation**
  - Explain when manifest is generated (prebuild)
  - Show build script integration
  - Explain manifest location and structure
  - _Requirements: 16_

- [ ] **Task 7.1.4: Document node placement**
  - Update existing node placement section
  - Note that manifest automatically picks up new nodes
  - Explain that build regenerates manifest
  - _Requirements: 16_

- [ ] **Task 7.1.5: Add troubleshooting section**
  - Common issue: Nodes not found in production
  - Solution: Check NODE_ENV, verify manifest exists
  - Common issue: Manifest generation fails
  - Solution: Check node metadata, verify TypeScript compilation
  - Common issue: Node count mismatch
  - Solution: Rebuild to regenerate manifest
  - _Requirements: 16_

- [ ] **Task 7.1.6: Document production build requirements**
  - Explain NODE_ENV=production must be set
  - Explain build order (engine first)
  - Explain manifest validation
  - _Requirements: 16_

- [ ] **Task 7.1.7: Add testing section**
  - Explain how to test manifest mode locally
  - Show USE_NODE_MANIFEST=true usage
  - Explain verification steps
  - _Requirements: 16_

- [ ] **Task 7.1.8: Update migration notes**
  - Document that server nodes are now in `/apps/api/src/nodes/`
  - Note legacy `/server/nodes/` is deprecated
  - Explain migration process
  - _Requirements: 16_

- [ ] **Task 7.1.9: Add code examples**
  - Show NodeRegistry initialization in both modes
  - Show environment variable configuration
  - Show manifest structure example
  - _Requirements: 16_

- [ ] **Task 7.1.10: Review and format CLAUDE.md updates**
  - Ensure consistent formatting
  - Check all links work
  - Verify code examples are correct
  - Proofread for clarity
  - _Requirements: 16_

### 7.2 Create "Adding a New Node" Developer Guide

- [ ] **Task 7.2.1: Create guide file**
  - Create `/docs/guides/adding-new-nodes.md`
  - Add header and introduction
  - _Requirements: 17_

- [ ] **Task 7.2.2: Document node types and placement**
  - Explain three node types (universal, server, client)
  - Show directory structure for each
  - Provide decision matrix for placement
  - _Requirements: 17_

```markdown
## Node Placement

Choose the correct directory based on dependencies:

| Node Type | Directory | When to Use |
|-----------|-----------|-------------|
| Universal | `/packages/engine/nodes/` | No external dependencies, pure computation |
| Server | `/apps/api/src/nodes/` | Uses Node.js APIs (fs, database, etc.) |
| Client | `/apps/frontend/nodes/` | Uses browser APIs (DOM, localStorage, etc.) |
```

- [ ] **Task 7.2.3: Show node file structure**
  - Provide complete node template
  - Explain each part (class, metadata, execute method)
  - Include TypeScript types
  - _Requirements: 17_

- [ ] **Task 7.2.4: Document metadata requirements**
  - Show complete metadata example
  - Explain each metadata field
  - Note that metadata is used by manifest generator
  - _Requirements: 17_

- [ ] **Task 7.2.5: Document development workflow**
  - Step 1: Create node file in appropriate directory
  - Step 2: Implement node class with metadata
  - Step 3: Test node in development (auto-discovered)
  - Step 4: Run build to add to manifest
  - _Requirements: 17_

- [ ] **Task 7.2.6: Document production workflow**
  - Explain that running build regenerates manifest
  - Show how to verify node is in manifest
  - Explain deployment process
  - _Requirements: 17_

- [ ] **Task 7.2.7: Document testing requirements**
  - Show how to write unit tests for nodes
  - Explain test file naming (*.test.ts)
  - Provide test template
  - _Requirements: 17_

- [ ] **Task 7.2.8: Document barrel exports (if needed)**
  - Explain when to update index.ts
  - Show export syntax
  - Note: Usually not needed for manifest discovery
  - _Requirements: 17_

- [ ] **Task 7.2.9: Add practical examples**
  - Show creating a universal node (example: StringNode)
  - Show creating a server node (example: EmailNode)
  - Show creating a client node (example: NotificationNode)
  - _Requirements: 17_

- [ ] **Task 7.2.10: Review and publish guide**
  - Proofread guide
  - Verify all examples work
  - Link from CLAUDE.md
  - _Requirements: 17_

### 7.3 Create "Node Discovery Troubleshooting" Guide

- [ ] **Task 7.3.1: Create troubleshooting guide file**
  - Create `/docs/guides/node-discovery-troubleshooting.md`
  - Add header and introduction
  - _Requirements: 17_

- [ ] **Task 7.3.2: Document "Nodes not found in production"**
  - Symptoms: Missing node errors, workflow fails
  - Causes: Manifest not generated, wrong mode
  - Solutions: Check NODE_ENV, verify manifest exists, rebuild
  - _Requirements: 17_

- [ ] **Task 7.3.3: Document "Manifest generation fails"**
  - Symptoms: Build fails, no manifest file
  - Causes: Node has invalid metadata, import errors
  - Solutions: Check node metadata, fix TypeScript errors
  - _Requirements: 17_

- [ ] **Task 7.3.4: Document "Node count mismatch"**
  - Symptoms: Fewer nodes than expected
  - Causes: Stale manifest, nodes not exported
  - Solutions: Rebuild, check file locations
  - _Requirements: 17_

- [ ] **Task 7.3.5: Document "Import errors in production"**
  - Symptoms: Node registration fails, import errors
  - Causes: Incorrect paths in manifest, missing dependencies
  - Solutions: Verify manifest paths, check dependencies
  - _Requirements: 17_

- [ ] **Task 7.3.6: Document "Wrong discovery mode"**
  - Symptoms: File-based used in production, manifest in dev
  - Causes: Incorrect environment variables
  - Solutions: Set NODE_ENV correctly
  - _Requirements: 17_

- [ ] **Task 7.3.7: Add debugging tips**
  - How to check which mode is active (logs)
  - How to inspect manifest contents
  - How to force specific mode for testing
  - _Requirements: 17_

- [ ] **Task 7.3.8: Add verification checklist**
  - Steps to verify discovery is working correctly
  - How to check node counts
  - How to test both modes
  - _Requirements: 17_

- [ ] **Task 7.3.9: Review and publish troubleshooting guide**
  - Ensure all scenarios covered
  - Link from CLAUDE.md
  - _Requirements: 17_

### 7.4 Add Inline Code Documentation

- [ ] **Task 7.4.1: Document manifest generator script**
  - Add comprehensive JSDoc to main functions
  - Explain algorithm and flow
  - Document parameters and return values
  - _Requirements: 18_

- [ ] **Task 7.4.2: Document discoverFromManifest method**
  - Add JSDoc explaining manifest-based discovery
  - Document edge cases and error handling
  - Explain fallback mechanism
  - _Requirements: 18_

- [ ] **Task 7.4.3: Document dual-mode logic**
  - Add comments explaining mode selection
  - Note when each mode is used
  - Explain override mechanism
  - _Requirements: 18_

- [ ] **Task 7.4.4: Document path resolution logic**
  - Add comments for complex path calculations
  - Explain relative path strategy
  - Note different paths for each node type
  - _Requirements: 18_

- [ ] **Task 7.4.5: Document environment filtering**
  - Add comments explaining which nodes are loaded per environment
  - Explain filtering logic
  - _Requirements: 18_

- [ ] **Task 7.4.6: Document error handling**
  - Add comments explaining fallback behavior
  - Document what errors are caught vs thrown
  - Explain graceful degradation
  - _Requirements: 18_

- [ ] **Task 7.4.7: Document manifest schema**
  - Add JSDoc to all interface fields
  - Explain purpose of each field
  - Include usage examples
  - _Requirements: 18_

- [ ] **Task 7.4.8: Document validation logic**
  - Add comments explaining schema constraints
  - Document validation rules
  - _Requirements: 18_

- [ ] **Task 7.4.9: Document barrel exports**
  - Add comments to index.ts files
  - List what is exported
  - Explain organization
  - _Requirements: 18_

- [ ] **Task 7.4.10: Review all inline documentation**
  - Verify comments are accurate
  - Ensure helpful for maintainers
  - Check for clarity
  - _Requirements: 18_

### 7.5 Staging Environment Validation

- [ ] **Task 7.5.1: Deploy to staging**
  - Build with NODE_ENV=production
  - Deploy all packages to staging environment
  - Verify deployment succeeds
  - _Requirements: 19_

- [ ] **Task 7.5.2: Verify manifest in staging**
  - Check that manifest file exists in deployed build
  - Verify manifest is valid JSON
  - Check node counts in manifest
  - _Requirements: 19_

- [ ] **Task 7.5.3: Check staging logs**
  - Start staging services
  - Check logs for discovery mode (should be "manifest")
  - Verify node counts logged
  - Look for any warnings or errors
  - _Requirements: 19_

- [ ] **Task 7.5.4: Verify node counts in staging**
  - API: 35 nodes (26 universal + 9 server)
  - Frontend: 38 nodes (26 universal + 12 client)
  - Check logs and health endpoints
  - _Requirements: 19_

- [ ] **Task 7.5.5: Execute test workflows in staging**
  - Create test workflows via API
  - Execute workflows
  - Verify successful completion
  - Check for missing node errors
  - _Requirements: 19_

- [ ] **Task 7.5.6: Monitor staging for errors**
  - Watch logs for 15-30 minutes
  - Look for discovery-related errors
  - Check workflow execution errors
  - Document any issues
  - _Requirements: 19_

- [ ] **Task 7.5.7: Performance testing in staging**
  - Measure server startup time
  - Compare to baseline (before manifest)
  - Note any improvements (manifest should be faster)
  - _Requirements: 19_

- [ ] **Task 7.5.8: Load testing in staging**
  - Run load tests with expected traffic
  - Execute multiple workflows concurrently
  - Monitor for discovery errors
  - Verify stability
  - _Requirements: 19_

- [ ] **Task 7.5.9: Verify bundle sizes**
  - Check frontend bundle size
  - Verify server nodes excluded
  - Compare to baseline
  - Document results
  - _Requirements: 19_

- [ ] **Task 7.5.10: Run full test suite against staging**
  - Execute E2E tests against staging deployment
  - Verify all tests pass
  - Document any failures
  - _Requirements: 19_

- [ ] **Task 7.5.11: Create staging validation report**
  - Document all validation steps
  - Include: deployment status, node counts, test results, performance metrics
  - Note any issues or concerns
  - Get approval for production deployment
  - _Requirements: 19_

### 7.6 Production Deployment

- [ ] **Task 7.6.1: Create production deployment checklist**
  - List all pre-deployment steps
  - Include verification steps
  - Add rollback procedure
  - Review with team
  - _Requirements: 20_

- [ ] **Task 7.6.2: Create backup and rollback plan**
  - Document how to disable manifest mode (USE_NODE_MANIFEST=false)
  - Test rollback in staging
  - Prepare rollback instructions
  - _Requirements: 20_

- [ ] **Task 7.6.3: Verify production environment configuration**
  - Ensure NODE_ENV=production is set
  - Verify all environment variables correct
  - Check deployment configuration
  - _Requirements: 20_

- [ ] **Task 7.6.4: Build production artifacts**
  - Run: `bun run build` with NODE_ENV=production
  - Verify manifest generation succeeds
  - Verify all packages build successfully
  - Verify no errors or warnings
  - _Requirements: 20_

- [ ] **Task 7.6.5: Deploy to production**
  - Execute deployment process
  - Monitor deployment logs
  - Verify services start successfully
  - _Requirements: 20_

- [ ] **Task 7.6.6: Monitor production startup logs**
  - Check logs for "manifest" discovery mode
  - Verify node counts logged
  - Look for any errors or warnings
  - _Requirements: 20_

- [ ] **Task 7.6.7: Verify production health checks**
  - Check health check endpoints
  - Verify node discovery status
  - Confirm all services healthy
  - _Requirements: 20_

- [ ] **Task 7.6.8: Monitor production error rates**
  - Watch error logs for 30 minutes
  - Look for discovery-related errors
  - Compare error rates to baseline
  - _Requirements: 20_

- [ ] **Task 7.6.9: Verify production node counts**
  - Check logs and health endpoints
  - API: 35 nodes expected
  - Frontend: 38 nodes expected
  - Document actual counts
  - _Requirements: 20_

- [ ] **Task 7.6.10: Execute smoke tests in production**
  - Run basic workflow tests
  - Verify critical workflows execute
  - Check for any failures
  - _Requirements: 20_

- [ ] **Task 7.6.11: Test rollback procedure (if needed)**
  - If issues occur: Set USE_NODE_MANIFEST=false
  - Verify fallback to file-based discovery
  - Confirm services recover
  - Document rollback
  - _Requirements: 20_

- [ ] **Task 7.6.12: Monitor production performance**
  - Compare startup time to baseline
  - Check workflow execution time
  - Verify no performance regression
  - Document metrics
  - _Requirements: 20_

- [ ] **Task 7.6.13: Create post-deployment report**
  - Document deployment process
  - Include: deployment time, issues encountered, resolutions
  - Note node counts, performance metrics
  - Include any lessons learned
  - _Requirements: 20_

- [ ] **Task 7.6.14: Mark legacy /server/nodes/ for deprecation**
  - Add deprecation notice to directory README
  - Update CLAUDE.md with deprecation timeline
  - Plan future removal
  - _Requirements: 20_

- [ ] **Task 7.6.15: Conduct retrospective**
  - Meet with team to discuss implementation
  - Identify what went well
  - Identify areas for improvement
  - Document lessons learned
  - _Requirements: 20_

---

## PHASE 8: FINAL VERIFICATION

### 8.1 Build & Deploy Readiness

- [ ] **Task 8.1.1: Test production build**
  - Run: `bun run build` with NODE_ENV=production
  - Verify manifest generation
  - Verify TypeScript compilation
  - Verify no errors
  - Expected outcome: Clean build with manifest
  - _Requirements: Code Quality_

- [ ] **Task 8.1.2: Test built application**
  - Start API from built dist/
  - Start frontend from built dist/
  - Execute test workflows
  - Verify functionality
  - _Requirements: Code Quality_

- [ ] **Task 8.1.3: Verify all tests pass**
  - Run: `bun test`
  - Verify unit tests pass (generation, loading)
  - Verify integration tests pass
  - Verify E2E tests pass
  - Expected: 100% test success rate
  - _Requirements: Code Quality_

- [ ] **Task 8.1.4: Check test coverage**
  - Run: `bun test --coverage`
  - Verify coverage >90% for discovery code
  - Document coverage report
  - _Requirements: Code Quality_

### 8.2 Final Acceptance

- [ ] **Task 8.2.1: Review all requirements**
  - Go through each requirement in requirements.md
  - Verify all acceptance criteria met
  - Document any deviations
  - _Requirements: All_

- [ ] **Task 8.2.2: Verify success metrics**
  - ✅ All 47 nodes discoverable (26 + 9 + 12)
  - ✅ Zero discovery errors
  - ✅ Build time increase < 5 seconds
  - ✅ Test coverage > 90%
  - ✅ Production deployment successful
  - ✅ Documentation complete
  - _Requirements: All_

- [ ] **Task 8.2.3: Final code review**
  - Review all code changes
  - Check for code quality
  - Verify inline documentation
  - Ensure best practices followed
  - _Requirements: Code Quality_

- [ ] **Task 8.2.4: Update project status**
  - Mark feature as complete
  - Update project roadmap
  - Close related issues/tickets
  - _Requirements: All_

- [ ] **Task 8.2.5: Celebrate completion! 🎉**
  - Acknowledge team effort
  - Share success with stakeholders
  - Document wins for future reference
  - _Requirements: All_

---

## Summary

**Total Tasks:** 127
**Estimated Time:** 8-10 days

### Critical Path:

1. **Phase 1:** Architecture Migration (Days 1-2)
   - Create node directories
   - Migrate 9 server nodes
   - Update references
   - Verification

2. **Phase 2:** Manifest Schema & Types (Day 3)
   - Define TypeScript interfaces
   - Create JSON Schema
   - Add validation utilities

3. **Phase 3:** Manifest Generator (Days 3-4)
   - Build scanning script
   - Implement metadata extraction
   - Add error handling

4. **Phase 4:** NodeRegistry Updates (Days 4-5)
   - Implement discoverFromManifest()
   - Add dual-mode logic
   - Update discovery paths

5. **Phase 5:** Build Integration (Day 5)
   - Update package.json scripts
   - Configure environment variables
   - Test build process

6. **Phase 6:** Comprehensive Testing (Days 6-7)
   - Unit tests (generation + loading)
   - Integration tests
   - E2E production simulation
   - Manual testing

7. **Phase 7:** Documentation & Deployment (Days 8-10)
   - Update CLAUDE.md
   - Create developer guides
   - Staging validation
   - Production deployment

8. **Phase 8:** Final Verification (Day 10)
   - Build readiness
   - Final acceptance
   - Celebration

### Key Milestones:

- ✅ Server nodes migrated to new architecture
- ✅ Manifest generator script complete
- ✅ NodeRegistry supports dual-mode discovery
- ✅ Build integration complete
- ✅ Test coverage >90%
- ✅ Documentation updated
- ✅ Staging validation passed
- ✅ Production deployment successful

### Dependencies:

- Manifest schema must be defined before generator script
- Generator script must work before NodeRegistry updates
- Build integration required before testing
- Testing must pass before documentation finalization
- Documentation and staging validation required before production

### Risk Mitigation:

- Dual-mode allows gradual rollout and easy rollback
- Comprehensive testing reduces production issues
- Staging validation catches deployment problems
- Fallback mechanism provides safety net

---

**Document Version:** 1.0.0
**Last Updated:** 2025-11-22
**Status:** Ready for Implementation
