import { svelte } from '@sveltejs/vite-plugin-svelte';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte({
      configFile: false,
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
    }),
  ],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'node',
          include: ['**/*.{test,spec}.{js,ts}'],
          exclude: [...configDefaults.exclude, '**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});
