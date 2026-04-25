import { defineConfig } from 'vite';

const apiTarget = process.env.VITE_DEV_API_URL || 'http://localhost:9090';
const apiPaths = ['/users', '/fido', '/transfer', '/risk', '/health', '/config/stepup'];

export default defineConfig({
  server: {
    port: 5173,
    proxy: Object.fromEntries(apiPaths.map((path) => [path, apiTarget])),
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
});
