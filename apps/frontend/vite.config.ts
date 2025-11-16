import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@engine": path.resolve(__dirname, "../../packages/engine/src"),
      // Map '@workscript/engine/nodes' to dist output
      "@workscript/engine/nodes": path.resolve(__dirname, "../../packages/engine/dist/nodes/index.js"),
      // Map '@workscript/engine' package to its dist output for proper module resolution
      "@workscript/engine": path.resolve(__dirname, "../../packages/engine/dist/src/index.js"),
      // Force single React instance to fix "Invalid hook call" error in monorepo
      "react": path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
  },
  define: {
    // Replace Node.js globals for browser compatibility
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: []
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