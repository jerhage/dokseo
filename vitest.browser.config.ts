import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import {
  ruleCoarsePointer,
  rulePointer,
  rulePointerAway,
  ruleSecondaryClick,
} from './contract/rule-input.ts';

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
          name: 'browser',
          include: ['**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['core/**', 'node_modules/**'],
          fileParallelism: false,
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            commands: { ruleCoarsePointer, rulePointer, rulePointerAway, ruleSecondaryClick },
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
});
