import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import astro from 'eslint-plugin-astro';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/inspiration/**',
    '**/node_modules/**',
    '**/{dist,build,out,coverage,test-results,playwright-report}/**',
    '**/{.astro,.cache,.vite,.pnpm-store}/**',
    '.husky/_/**',
  ]),
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,astro}'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    files: ['**/*.{ts,tsx,astro}'],
    extends: [ts.configs.recommended],
  },
  ...astro.configs.recommended,
  {
    files: ['**/*.astro'],
    languageOptions: { parserOptions: { parser: ts.parser } },
  },
]);
