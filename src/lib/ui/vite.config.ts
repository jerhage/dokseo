import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

const LIBRARY = fileURLToPath(new URL('./', import.meta.url));

export default defineConfig({
  root: 'playground',
  plugins: [
    svelte({
      configFile: false,
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
    }),
  ],
  server: { fs: { allow: [LIBRARY] } },
});
