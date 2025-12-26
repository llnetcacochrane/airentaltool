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
    // Performance: Set chunk size warning limit
    chunkSizeWarningLimit: 600,
    // Additional security: minimize attack surface
    rollupOptions: {
      output: {
        // Sanitize chunk names
        sanitizeFileName: (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_'),
        // Performance: Manual chunk splitting for better caching
        manualChunks: {
          // React core - changes rarely, cache aggressively
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Supabase - separate for better caching
          'supabase-vendor': ['@supabase/supabase-js'],
          // UI icons - large but stable
          'icons-vendor': ['lucide-react'],
          // PDF generation - large and rarely used
          'pdf-vendor': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
  // SECURITY: Don't expose internal paths in error messages in production
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
