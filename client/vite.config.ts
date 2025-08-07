import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@client": path.resolve(__dirname, "./src"),
      "@server": path.resolve(__dirname, "../server/src"),
      "@shared": path.resolve(__dirname, "../shared/src"),
      "@": path.resolve(__dirname, "./src")
    }
  },
  define: {
    // Replace Node.js globals for browser compatibility
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['shared'] // Don't pre-bundle shared package, let it be tree-shaken
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
