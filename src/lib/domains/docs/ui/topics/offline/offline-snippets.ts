type SourceSnippet = {
  readonly label: string;
  readonly file: string;
  readonly code: string;
};

const SHELL_ASSETS: SourceSnippet = {
  label: 'What the install step precaches',
  file: 'src/lib/platform/service-worker/shell-cache.ts',
  code: `const SHELL_CACHE_PREFIX = 'reader-shell-';

const SHELL_STATIC_FILE = /\\.(woff2|woff|svg|png|ico|webp|wasm|webmanifest)$/u;

function shellCacheName(version: string): string {
  return \`\${SHELL_CACHE_PREFIX}\${version}\`;
}

function isStaleShellCache(name: string, current: string): boolean {
  return name.startsWith(SHELL_CACHE_PREFIX) && name !== current;
}

function shellDocument(base: string): string {
  return \`\${base}/\`;
}

function shellAssets(
  base: string,
  build: readonly string[],
  files: readonly string[],
): readonly string[] {
  return [shellDocument(base), ...build, ...files.filter((file) => SHELL_STATIC_FILE.test(file))];
}`,
};

const LIFECYCLE_LISTENERS: SourceSnippet = {
  label: 'The lifecycle listeners',
  file: 'src/service-worker.ts',
  code: `async function precache(): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_ASSETS);
}

async function retireStaleShells(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => isStaleShellCache(name, SHELL_CACHE)).map((name) => caches.delete(name)),
  );
  await worker.clients.claim();
}`,
};

const INSTALL_ACTIVATE: SourceSnippet = {
  label: 'Install, activate and the skip-waiting message',
  file: 'src/service-worker.ts',
  code: `worker.addEventListener('install', (event) => event.waitUntil(precache()));

worker.addEventListener('activate', (event) => event.waitUntil(retireStaleShells()));

worker.addEventListener('message', (event) => {
  if (isSkipWaiting(event.data)) event.waitUntil(worker.skipWaiting());
});`,
};

const SHELL_ROUTE: SourceSnippet = {
  label: 'Choosing a strategy for a request',
  file: 'src/lib/platform/service-worker/shell-route.ts',
  code: `function shellRoute(request: ShellRequest, scope: ShellScope): ShellRoute {
  if (request.method !== 'GET') return PASS_THROUGH;

  const url = new URL(request.url);
  if (url.origin !== scope.origin) return PASS_THROUGH;
  if (request.mode === 'navigate') return { kind: 'network-first' };
  if (isImmutableBuildFile(url.pathname, scope.base) || scope.precached.has(url.pathname))
    return { kind: 'cache-first' };

  return PASS_THROUGH;
}`,
};

const NAVIGATION_RESPONSE: SourceSnippet = {
  label: 'Network first, with patience',
  file: 'src/lib/platform/service-worker/shell-responses.ts',
  code: `async function navigationResponse(sources: NavigationSources): Promise<Response> {
  const network = sources.network();
  const outcome = await Promise.race<NavigationOutcome>([
    network.then(
      (response) => ({ kind: 'answered', response }),
      () => ({ kind: 'failed' }),
    ),
    sources.patience().then(() => ({ kind: 'slow' })),
  ]);

  return match(outcome)
    .with({ kind: 'answered' }, ({ response }) => response)
    .with({ kind: 'failed' }, () => shellOr(sources.shell, () => Response.error()))
    .with({ kind: 'slow' }, () =>
      shellOr(sources.shell, () => network.catch(() => Response.error())),
    )
    .exhaustive();
}`,
};

const CACHE_FIRST_RESPONSE: SourceSnippet = {
  label: 'Cache first',
  file: 'src/lib/platform/service-worker/shell-responses.ts',
  code: `async function cacheFirstResponse(sources: CacheFirstSources): Promise<Response> {
  const cached = await sources.cached();
  if (cached !== undefined) return cached;

  const response = await sources.network();
  if (response.status === KEPT_STATUS) await sources.keep(response.clone()).catch(() => undefined);
  return response;
}`,
};

const APPLY_UPDATE: SourceSnippet = {
  label: 'What Reload does',
  file: 'src/lib/platform/service-worker/shell-registration.ts',
  code: `function applyShellUpdate(
  container: ShellWorkerContainer,
  waiting: ShellWorker,
  reload: () => void,
): void {
  if (waiting.state !== 'installed') {
    reload();
    return;
  }

  container.addEventListener('controllerchange', () => reload(), { once: true });
  waiting.postMessage(SKIP_WAITING, []);
}`,
};

const WATCH_UPDATES: SourceSnippet = {
  label: 'Checking again while the app stays open',
  file: 'src/lib/shared/shell-updates.ts',
  code: `function watchShellUpdates(updates: ShellUpdates): void {
  if (!('serviceWorker' in navigator)) return;

  void updates.watch(SHELL_WORKER_URL);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') updates.recheck();
  });
  setInterval(() => updates.recheck(), SHELL_RECHECK_MS);
}`,
};

const RECHECK: SourceSnippet = {
  label: 'A silent recheck',
  file: 'src/lib/shared/shell-updates.ts',
  code: `recheck(): void {
  if (!this.#online()) return;

  this.#registration?.update().catch((error: unknown) => {
    if (isNetworkFailure(error)) return;
    logUnexpected('service-worker', error);
  });
}`,
};

const HEADERS: SourceSnippet = {
  label: 'HTTP cache rules',
  file: 'static/_headers',
  code: `  Cache-Control: no-cache

/_app/immutable/*
  ! Cache-Control
  Cache-Control: public, max-age=31536000, immutable`,
};

const MANIFEST: SourceSnippet = {
  label: 'The web app manifest',
  file: 'static/manifest.webmanifest',
  code: `  "id": "/",
  "name": "Dokseo",
  "short_name": "Dokseo",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",`,
};

const CONNECTION_MESSAGE: SourceSnippet = {
  label: 'The message for a load that found no network',
  file: 'src/workers/network-reach.ts',
  code: `const NEEDS_A_CONNECTION =
  'Downloading the model needs a network connection, and none could be reached';`,
};

const OFFLINE_SNIPPETS: readonly SourceSnippet[] = [
  SHELL_ASSETS,
  LIFECYCLE_LISTENERS,
  INSTALL_ACTIVATE,
  SHELL_ROUTE,
  NAVIGATION_RESPONSE,
  CACHE_FIRST_RESPONSE,
  APPLY_UPDATE,
  WATCH_UPDATES,
  RECHECK,
  HEADERS,
  MANIFEST,
  CONNECTION_MESSAGE,
];

export {
  APPLY_UPDATE,
  CACHE_FIRST_RESPONSE,
  CONNECTION_MESSAGE,
  HEADERS,
  INSTALL_ACTIVATE,
  LIFECYCLE_LISTENERS,
  MANIFEST,
  NAVIGATION_RESPONSE,
  OFFLINE_SNIPPETS,
  RECHECK,
  SHELL_ASSETS,
  SHELL_ROUTE,
  WATCH_UPDATES,
};
export type { SourceSnippet };
