import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      { find: "@client", replacement: path.resolve(__dirname, "./src") },
      { find: "@server", replacement: path.resolve(__dirname, "../server/src") },
      { find: "@shared", replacement: path.resolve(__dirname, "../shared/src") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      // Map 'shared/nodes' to dist output (must come before 'shared' alias)
      { find: /^shared\/nodes$/, replacement: path.resolve(__dirname, "../shared/dist/nodes/index.js") },
      // Map 'shared' package to its dist output for proper module resolution
      { find: /^shared$/, replacement: path.resolve(__dirname, "../shared/dist/src/index.js") }
    ]
  },
  define: {
    // Replace Node.js globals for browser compatibility
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: [] // Re-enable pre-bundling for shared package
  },
  build: {
    rollupOptions: {
      external: (id) => {
        // Only externalize Node.js built-ins, not npm packages
        if (id.startsWith('node:') ||
            ['crypto', 'fs', 'path', 'glob'].includes(id)) {
          return true;
        }
        return false;
      }
    }
  }
})
