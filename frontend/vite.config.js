import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_DEV_API_URL || 'http://localhost:9090';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
    },
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
});
