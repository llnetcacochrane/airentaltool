import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // SECURITY: Disable source maps in production to prevent code exposure
    sourcemap: mode !== 'production',
    // Additional security: minimize attack surface
    rollupOptions: {
      output: {
        // Sanitize chunk names
        sanitizeFileName: (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_'),
      },
    },
  },
  // SECURITY: Don't expose internal paths in error messages in production
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
