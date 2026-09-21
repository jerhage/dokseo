import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';

const CROSS_ORIGIN_ISOLATION: Readonly<Record<string, string>> = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
};

function isolate(server: ViteDevServer | PreviewServer): void {
  server.middlewares.use((_request, response, next) => {
    for (const [header, value] of Object.entries(CROSS_ORIGIN_ISOLATION)) {
      response.setHeader(header, value);
    }
    next();
  });
}

function crossOriginIsolation(): Plugin {
  return {
    name: 'cross-origin-isolation',
    configureServer: isolate,
    configurePreviewServer: isolate,
  };
}

const BUNDLED_RUNTIME = /ort-wasm[^/]*\.wasm$/u;

function runtimeServedFromCdn(): Plugin {
  return {
    name: 'onnx-runtime-served-from-cdn',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const name of Object.keys(bundle)) {
        if (BUNDLED_RUNTIME.test(name)) delete bundle[name];
      }
    },
  };
}

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },

      adapter: adapter({ fallback: 'index.html' }),
      alias: { $workers: 'src/workers' },
    }),
    crossOriginIsolation(),
    runtimeServedFromCdn(),
  ],
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'unit',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },

      {
        extends: './vite.config.ts',
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', headless: true }],
          },
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});
