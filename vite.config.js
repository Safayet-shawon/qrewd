import { defineConfig } from 'vite';

// Static site: `npm run build` → dist/. Relative base keeps asset URLs valid at
// the root of a domain or in a sub-folder.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
