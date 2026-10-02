import { base, build, files, version } from '$service-worker';
import { match } from 'ts-pattern';
import {
  isStaleShellCache,
  shellAssets,
  shellCacheName,
  shellDocument,
} from '$lib/platform/service-worker/shell-cache';
import { isSkipWaiting } from '$lib/platform/service-worker/shell-message';
import {
  cacheFirstResponse,
  navigationResponse,
} from '$lib/platform/service-worker/shell-responses';
import { shellRoute } from '$lib/platform/service-worker/shell-route';

type ShellLifecycleEvent = Event & {
  waitUntil(work: Promise<unknown>): void;
};

type ShellFetchEvent = ShellLifecycleEvent & {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
};

type ShellMessageEvent = ShellLifecycleEvent & {
  readonly data: unknown;
};

type ShellWorkerScope = {
  readonly location: { readonly origin: string };
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(
    kind: 'install' | 'activate',
    listen: (event: ShellLifecycleEvent) => void,
  ): void;
  addEventListener(kind: 'fetch', listen: (event: ShellFetchEvent) => void): void;
  addEventListener(kind: 'message', listen: (event: ShellMessageEvent) => void): void;
};

const worker = self as unknown as ShellWorkerScope;

const NAVIGATION_PATIENCE_MS = 3000;

const SHELL_CACHE = shellCacheName(version);

const SHELL_ASSETS = shellAssets(base, build, files);

const SHELL_SCOPE = {
  origin: worker.location.origin,
  base,
  precached: new Set(SHELL_ASSETS),
};

async function precache(): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);
  await cache.addAll(SHELL_ASSETS);
}

async function retireStaleShells(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names.filter((name) => isStaleShellCache(name, SHELL_CACHE)).map((name) => caches.delete(name)),
  );
  await worker.clients.claim();
}

async function cachedIn(request: RequestInfo): Promise<Response | undefined> {
  const cache = await caches.open(SHELL_CACHE);
  return cache.match(request);
}

async function keep(request: Request, response: Response): Promise<void> {
  const cache = await caches.open(SHELL_CACHE);
  await cache.put(request, response);
}

function patience(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, NAVIGATION_PATIENCE_MS));
}

worker.addEventListener('install', (event) => event.waitUntil(precache()));

worker.addEventListener('activate', (event) => event.waitUntil(retireStaleShells()));

worker.addEventListener('message', (event) => {
  if (isSkipWaiting(event.data)) event.waitUntil(worker.skipWaiting());
});

worker.addEventListener('fetch', (event) => {
  const request = event.request;
  match(shellRoute(request, SHELL_SCOPE))
    .with({ kind: 'pass-through' }, () => undefined)
    .with({ kind: 'cache-first' }, () =>
      event.respondWith(
        cacheFirstResponse({
          cached: () => cachedIn(request),
          network: () => fetch(request),
          keep: (response) => keep(request, response),
        }),
      ),
    )
    .with({ kind: 'network-first' }, () =>
      event.respondWith(
        navigationResponse({
          network: () => fetch(request),
          shell: () => cachedIn(shellDocument(base)),
          patience,
        }),
      ),
    )
    .exhaustive();
});
