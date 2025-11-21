import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3002,
    // Proxy configuration for development (avoids CORS issues)
    // Uncomment the proxy section below if you want to use relative URLs for Pay auth
    /*
    proxy: {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
    */
  },
  resolve: {
    alias: {
      "@": "/src", // Optional: Add '@' as an alias for 'src'
    },
  },
});
