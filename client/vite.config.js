import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: [
            { find: "@client", replacement: path.resolve(__dirname, "./src") },
            { find: "@server", replacement: path.resolve(__dirname, "../server/src") },
            { find: "@engine", replacement: path.resolve(__dirname, "../packages/engine/src") },
            { find: "@", replacement: path.resolve(__dirname, "./src") },
            // Map '@workscript/engine/nodes' to dist output
            { find: /^@workscript\/engine\/nodes$/, replacement: path.resolve(__dirname, "../packages/engine/dist/nodes/index.js") },
            // Map '@workscript/engine' package to its dist output for proper module resolution
            { find: /^@workscript\/engine$/, replacement: path.resolve(__dirname, "../packages/engine/dist/src/index.js") }
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
});
