import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/users': 'http://localhost:9090',
      '/fido': 'http://localhost:9090',
      '/transfer': 'http://localhost:9090',
      '/risk': 'http://localhost:9090',
      '/health': 'http://localhost:9090',
      '/config': 'http://localhost:9090',
    },
  },
  build: {
    outDir: '../static',
    emptyOutDir: true,
  },
});
