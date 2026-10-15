import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  output: 'static',
  outDir: './dist',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
