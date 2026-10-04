import type { SourceSnippet } from '../ocr/ocr-snippets';

const DEV_ONLY_PLUGIN: SourceSnippet = {
  label: 'vite.config.ts',
  file: 'vite.config.ts',
  code: `const DEV_ONLY_ROUTE_COMPONENT =
  /\\/src\\/routes\\/(?:docs|playground|preview)\\/(?:.+\\/)?\\+(?:page|layout)\\.svelte$/u;

function devOnlyRoutesLeftOut(): Plugin {
  return {
    name: 'dev-only-routes-left-out',
    apply: 'build',
    enforce: 'pre',
    load(id) {
      return DEV_ONLY_ROUTE_COMPONENT.test(id) ? '' : null;
    },
  };
}`,
};

const PLUGIN_ORDER: SourceSnippet = {
  label: 'First in the plugin list, in the same file',
  file: 'vite.config.ts',
  code: `plugins: [
  devOnlyRoutesLeftOut(),
  sveltekit({`,
};

const DOCS_GUARD: SourceSnippet = {
  label: 'src/routes/docs/+layout.ts',
  file: 'src/routes/docs/+layout.ts',
  code: `import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';

function load(): void {
  if (!dev) error(404, 'Not found');
}`,
};

const TRACE_GUARD: SourceSnippet = {
  label: 'The first lines of beginTrace, in src/lib/platform/trace/pipeline-trace.ts',
  file: 'src/lib/platform/trace/pipeline-trace.ts',
  code: `function beginTrace(label: string): Trace {
  if (!import.meta.env.DEV) return NO_TRACE;

  opened += 1;`,
};

const RUNTIME_FROM_CDN: SourceSnippet = {
  label: 'vite.config.ts',
  file: 'vite.config.ts',
  code: `const BUNDLED_RUNTIME = /ort-wasm[^/]*\\.wasm$/u;

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
}`,
};

const WASM_PATHS: SourceSnippet = {
  label: 'transformers.js 4.3.0, in node_modules/@huggingface/transformers/src/backends/onnx.js',
  file: 'node_modules/@huggingface/transformers/src/backends/onnx.js',
  code: `const wasmPathPrefix = \`https://cdn.jsdelivr.net/npm/onnxruntime-web@\${ONNX_ENV.versions.web}/dist/\`;`,
};

const HEADERS: SourceSnippet = {
  label: 'static/_headers',
  file: 'static/_headers',
  code: `/*
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp
  X-Content-Type-Options: nosniff
  Content-Security-Policy: frame-ancestors 'self'
  Cache-Control: no-cache

/_app/immutable/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable`,
};

const STORED_PAGE_SOURCE: SourceSnippet = {
  label: 'src/lib/domains/library/adapters/stored-page-source.ts',
  file: 'src/lib/domains/library/adapters/stored-page-source.ts',
  code: `return match(sourceKind)
  .with('pdf', async () => {
    const { openPdfPageSource } = await import('./pdf-page-source');
    return openPdfPageSource(blob);
  })
  .with('epub', async () => {
    const { openEpubPageSource } = await import('./epub-page-source');
    return openEpubPageSource(blob);
  })
  .exhaustive();`,
};

const PDF_BUILD_FILES: SourceSnippet = {
  label: 'src/lib/domains/library/adapters/pdf-page-source.ts',
  file: 'src/lib/domains/library/adapters/pdf-page-source.ts',
  code: `function pdfJsBuildFiles(build: PdfBuild): PdfJsBuildFiles {
  if (build === 'modern') {
    return {
      library: import('pdfjs-dist'),
      workerSrc: new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href,
    };
  }
  return {
    library: import('pdfjs-dist/legacy/build/pdf.mjs'),
    workerSrc: new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).href,
  };
}`,
};

const PDF_RULE: SourceSnippet = {
  label: 'The rule in .dependency-cruiser.cjs, without its comment',
  file: '.dependency-cruiser.cjs',
  code: `severity: 'error',
from: {
  pathNot: ['^src/lib/domains/library/adapters/pdf-page-source\\\\.ts$', DOCS_DOMAIN_PATH],
},
to: { path: '(^|/)node_modules/(pdfjs-dist|.*/pdfjs-dist)/' },`,
};

const RECOGNIZER_IMPORTS: SourceSnippet = {
  label: 'src/lib/composition/recognizers.ts',
  file: 'src/lib/composition/recognizers.ts',
  code: `async function loadMangaOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createMangaOcrRecognizer } =
    await import('../domains/recognition/adapters/engine/manga-ocr.adapter');
  return createMangaOcrRecognizer(noticesFor(language));
}

async function loadPaddleOcrRecognizer(language: Language): Promise<TextRecognizer> {
  const { createPaddleOcrRecognizer } =
    await import('../domains/recognition/adapters/engine/paddle-ocr.adapter');
  return createPaddleOcrRecognizer(noticesFor(language));
}`,
};

const OCR_WORKER_START: SourceSnippet = {
  label: 'src/lib/domains/recognition/adapters/engine/manga-ocr.adapter.ts',
  file: 'src/lib/domains/recognition/adapters/engine/manga-ocr.adapter.ts',
  code: `function startOcrWorker(): Worker {
  return new Worker(new URL('$workers/ocr.worker.ts', import.meta.url), {
    type: 'module',
  });
}`,
};

const SHELL_ASSETS: SourceSnippet = {
  label: 'src/lib/platform/service-worker/shell-cache.ts',
  file: 'src/lib/platform/service-worker/shell-cache.ts',
  code: `const SHELL_STATIC_FILE = /\\.(woff2|woff|svg|png|ico|webp|wasm|webmanifest)$/u;`,
};

const SHELL_ASSET_LIST: SourceSnippet = {
  label: 'The list the service worker caches on install, in the same file',
  file: 'src/lib/platform/service-worker/shell-cache.ts',
  code: `function shellAssets(
  base: string,
  build: readonly string[],
  files: readonly string[],
): readonly string[] {
  return [shellDocument(base), ...build, ...files.filter((file) => SHELL_STATIC_FILE.test(file))];
}`,
};

const PRECACHE: SourceSnippet = {
  label: 'src/service-worker.ts',
  file: 'src/service-worker.ts',
  code: `async function precache(): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_ASSETS);
}`,
};

const BUILD_SNIPPETS: readonly SourceSnippet[] = [
  DEV_ONLY_PLUGIN,
  PLUGIN_ORDER,
  DOCS_GUARD,
  TRACE_GUARD,
  RUNTIME_FROM_CDN,
  WASM_PATHS,
  HEADERS,
  STORED_PAGE_SOURCE,
  PDF_BUILD_FILES,
  PDF_RULE,
  RECOGNIZER_IMPORTS,
  OCR_WORKER_START,
  SHELL_ASSETS,
  SHELL_ASSET_LIST,
  PRECACHE,
];

export {
  BUILD_SNIPPETS,
  DEV_ONLY_PLUGIN,
  DOCS_GUARD,
  HEADERS,
  OCR_WORKER_START,
  PDF_BUILD_FILES,
  PDF_RULE,
  PLUGIN_ORDER,
  PRECACHE,
  RECOGNIZER_IMPORTS,
  RUNTIME_FROM_CDN,
  SHELL_ASSET_LIST,
  SHELL_ASSETS,
  STORED_PAGE_SOURCE,
  TRACE_GUARD,
  WASM_PATHS,
};
