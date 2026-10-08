import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // The NestJS API; keeps the SPA same-origin in development.
    proxy: { '/api': 'http://localhost:3001' },
  },
});
