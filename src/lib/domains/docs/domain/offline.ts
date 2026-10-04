import { match } from 'ts-pattern';
import {
  SHELL_CACHE_PREFIX,
  isStaleShellCache,
  shellAssets,
  shellCacheName,
} from '$lib/platform/service-worker/shell-cache';
import {
  cacheFirstResponse,
  navigationResponse,
} from '$lib/platform/service-worker/shell-responses';
import { shellRoute } from '$lib/platform/service-worker/shell-route';
import type {
  ShellRequest,
  ShellRoute,
  ShellScope,
} from '$lib/platform/service-worker/shell-route';

type RequestPick = 'navigation' | 'build-file' | 'static-file' | 'version-file' | 'model-file';

type NetworkPick = 'online' | 'slow' | 'offline';

type CachePick = 'held' | 'empty';

type Scenario = {
  readonly request: RequestPick;
  readonly network: NetworkPick;
  readonly cache: CachePick;
};

type Answer =
  | { readonly kind: 'browser'; readonly reached: boolean }
  | { readonly kind: 'network'; readonly kept: boolean }
  | { readonly kind: 'cache' }
  | { readonly kind: 'shell' }
  | { readonly kind: 'network-error' };

type Simulation = {
  readonly request: ShellRequest;
  readonly route: ShellRoute;
  readonly answer: Answer;
  readonly waitedMs: number;
};

type SimulationClock = {
  readonly now: () => number;
  readonly wait: (ms: number) => Promise<void>;
};

type CacheRole = 'this-build-shell' | 'older-shell' | 'model' | 'other';

const NAVIGATION_PATIENCE_MS = 3000;

const SLOW_NETWORK_MS = 6000;

const MODEL_CACHE = 'transformers-cache';

const SAMPLE_BUILD = ['/_app/immutable/entry/start.js', '/_app/immutable/chunks/reader.js'];

const SAMPLE_STATIC = [
  '/_headers',
  '/fonts/archivo.woff2',
  '/fonts/archivo.OFL.txt',
  '/licenses.txt',
  '/manifest.webmanifest',
];

const REQUEST_PATHS: Readonly<
  Record<RequestPick, { readonly path: string; readonly mode: string }>
> = {
  navigation: { path: '/read/42', mode: 'navigate' },
  'build-file': { path: '/_app/immutable/chunks/reader.js', mode: 'cors' },
  'static-file': { path: '/fonts/archivo.woff2', mode: 'cors' },
  'version-file': { path: '/_app/version.json', mode: 'cors' },
  'model-file': {
    path: 'https://huggingface.co/PaddlePaddle/korean_PP-OCRv5_mobile_rec_onnx/resolve/main/inference.yml',
    mode: 'cors',
  },
};

function sampleScope(origin: string): ShellScope {
  return {
    origin,
    base: '',
    precached: new Set(shellAssets('', SAMPLE_BUILD, SAMPLE_STATIC)),
  };
}

function sampleRequest(pick: RequestPick, origin: string): ShellRequest {
  const { path, mode } = REQUEST_PATHS[pick];
  return { method: 'GET', mode, url: new URL(path, origin).href };
}

function networkSource(
  pick: NetworkPick,
  clock: SimulationClock,
  answer: Response,
): () => Promise<Response> {
  return () =>
    match(pick)
      .with('online', () => Promise.resolve(answer))
      .with('slow', () => clock.wait(SLOW_NETWORK_MS).then(() => answer))
      .with('offline', () => Promise.reject(new TypeError('Failed to fetch')))
      .exhaustive();
}

async function respond(
  route: ShellRoute,
  scenario: Scenario,
  clock: SimulationClock,
): Promise<Answer> {
  const fromNetwork = new Response('network');
  const fromCache = new Response('cache');
  const network = networkSource(scenario.network, clock, fromNetwork);
  const cached = (): Promise<Response | undefined> =>
    Promise.resolve(scenario.cache === 'held' ? fromCache : undefined);

  return match(route)
    .returnType<Promise<Answer>>()
    .with({ kind: 'pass-through' }, () =>
      network().then(
        () => ({ kind: 'browser', reached: true }),
        () => ({ kind: 'browser', reached: false }),
      ),
    )
    .with({ kind: 'cache-first' }, async () => {
      let kept = false;
      try {
        const response = await cacheFirstResponse({
          cached,
          network,
          keep: async () => {
            kept = true;
          },
        });
        return response === fromCache ? { kind: 'cache' } : { kind: 'network', kept };
      } catch {
        return { kind: 'network-error' };
      }
    })
    .with({ kind: 'network-first' }, async () => {
      const response = await navigationResponse({
        network,
        shell: cached,
        patience: () => clock.wait(NAVIGATION_PATIENCE_MS),
      });
      if (response === fromNetwork) return { kind: 'network', kept: false };
      if (response === fromCache) return { kind: 'shell' };
      return { kind: 'network-error' };
    })
    .exhaustive();
}

async function simulateRequest(
  scenario: Scenario,
  origin: string,
  clock: SimulationClock,
): Promise<Simulation> {
  const request = sampleRequest(scenario.request, origin);
  const route = shellRoute(request, sampleScope(origin));
  const started = clock.now();
  const answer = await respond(route, scenario, clock);
  return { request, route, answer, waitedMs: clock.now() - started };
}

function cacheRole(name: string, version: string): CacheRole {
  const current = shellCacheName(version);
  if (name === current) return 'this-build-shell';
  if (isStaleShellCache(name, current)) return 'older-shell';
  if (name === MODEL_CACHE) return 'model';
  return 'other';
}

export {
  MODEL_CACHE,
  NAVIGATION_PATIENCE_MS,
  SAMPLE_BUILD,
  SAMPLE_STATIC,
  SHELL_CACHE_PREFIX,
  SLOW_NETWORK_MS,
  cacheRole,
  sampleRequest,
  sampleScope,
  simulateRequest,
};
export type {
  Answer,
  CachePick,
  CacheRole,
  NetworkPick,
  RequestPick,
  Scenario,
  Simulation,
  SimulationClock,
};
