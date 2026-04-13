import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// User's custom Vite configuration for SvelteKit
export default defineConfig({
  plugins: [sveltekit()],
  build: {
    sourcemap: true,
    minify: 'esbuild',
  },
  server: {
    port: 3000,
  },
});
