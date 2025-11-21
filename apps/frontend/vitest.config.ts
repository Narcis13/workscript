import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, '../../packages/engine/src'),
      '@workscript/engine/nodes': path.resolve(__dirname, '../../packages/engine/dist/nodes/index.js'),
      '@workscript/engine': path.resolve(__dirname, '../../packages/engine/dist/src/index.js'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
