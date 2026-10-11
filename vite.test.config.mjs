import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'node:path';
import { testServer } from './tests/browser/test-server.mjs';

export default defineConfig({
  plugins: [testServer(), react()],
  resolve: { alias: [
    { find: '@/api/base44Client', replacement: path.resolve('tests/browser/mock-client.js') },
    { find: '@', replacement: path.resolve('src') },
  ] },
});
