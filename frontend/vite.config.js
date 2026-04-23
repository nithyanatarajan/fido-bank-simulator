import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/users': 'http://localhost:8000',
      '/fido': 'http://localhost:8000',
      '/transfer': 'http://localhost:8000',
      '/risk': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/config': 'http://localhost:8000',
    },
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
});
