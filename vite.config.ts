import { existsSync, readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { CONTENT_SECURITY_POLICY } from './src/lib/platform/security/content-security-policy.ts';

// The oxc target below lowers `using` in dev, as the production build
// already does for every browser. Without it the dev server ships the raw
// syntax, which Safari cannot PARSE, so it never reaches the code that
// would run. The option is oxc and not esbuild: Vite 8 transforms with oxc
// and ignores `esbuild.target` silently.
//
// This whole branch is deletable when Safari ships explicit resource
// management: this comment, this target, and src/lib/platform/polyfill/.

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

const LOWERS_EXPLICIT_RESOURCE_MANAGEMENT = 'es2022';

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

const SUPPORTS_LIGHT_DARK = ['chrome123', 'firefox120', 'safari17.5'];

function packageVersion(): string {
  const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'));
  if (
    typeof manifest === 'object' &&
    manifest !== null &&
    'version' in manifest &&
    typeof manifest.version === 'string'
  )
    return manifest.version;
  throw new Error('package.json has no version');
}

const DEV_KEY = '.certs/dev-key.pem';

const DEV_CERT = '.certs/dev-cert.pem';

function localHttps() {
  if (!existsSync(DEV_KEY) || !existsSync(DEV_CERT)) return {};

  return {
    host: true,
    https: { key: readFileSync(DEV_KEY), cert: readFileSync(DEV_CERT) },
  };
}

export default defineConfig({
  oxc: { target: LOWERS_EXPLICIT_RESOURCE_MANAGEMENT },
  define: { 'import.meta.env.APP_VERSION': JSON.stringify(packageVersion()) },
  server: localHttps(),
  optimizeDeps: { include: ['@huggingface/transformers'] },
  build: { cssTarget: SUPPORTS_LIGHT_DARK },
  plugins: [
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },

      adapter: adapter({ fallback: 'index.html' }),
      alias: { $workers: 'src/workers' },
      csp: { mode: 'hash', directives: CONTENT_SECURITY_POLICY },
      serviceWorker: { register: false },
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
          setupFiles: ['src/lib/shared/testing/fresh-local-storage.ts'],
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
