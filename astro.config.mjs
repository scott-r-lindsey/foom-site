import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { metadata, siteSettings } from './metadata.mjs';

const { origin, indexable } = siteSettings();

export default defineConfig({
  site: origin,
  integrations: [react(), metadata(origin)],
  vite: {
    define: {
      'import.meta.env.SITE_INDEXABLE': JSON.stringify(String(indexable)),
    },
  },
  output: 'static',
  outDir: './dist',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
