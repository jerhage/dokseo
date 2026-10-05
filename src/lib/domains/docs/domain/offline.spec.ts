import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  NAVIGATION_PATIENCE_MS,
  SLOW_NETWORK_MS,
  cacheRole,
  sampleRequest,
  sampleScope,
  simulateRequest,
} from './offline';
import type { Scenario, Simulation, SimulationClock } from './offline';

const ORIGIN = 'https://dokseo.test';

const SERVICE_WORKER = new URL('../../../../service-worker.ts', import.meta.url);

const clock: SimulationClock = {
  now: () => Date.now(),
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

async function run(scenario: Scenario): Promise<Simulation> {
  const pending = simulateRequest(scenario, ORIGIN, clock);
  await vi.runAllTimersAsync();
  return pending;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the sample scope', () => {
  it('precaches the root document, the build files and the allowed static files only', () => {
    expect([...sampleScope(ORIGIN).precached]).toEqual([
      '/',
      '/_app/immutable/entry/start.js',
      '/_app/immutable/chunks/reader.js',
      '/manifest.webmanifest',
    ]);
  });

  it('builds a navigation request in navigate mode', () => {
    expect(sampleRequest('navigation', ORIGIN)).toEqual({
      method: 'GET',
      mode: 'navigate',
      url: `${ORIGIN}/read/42`,
    });
  });
});

describe('simulateRequest', () => {
  it('answers a navigation from the network when it is online', async () => {
    const simulation = await run({ request: 'navigation', network: 'online', cache: 'held' });

    expect(simulation.route).toEqual({ kind: 'network-first' });
    expect(simulation.answer).toEqual({ kind: 'network', kept: false });
    expect(simulation.waitedMs).toBe(0);
  });

  it('answers a navigation from the cached shell at once when the network fails', async () => {
    const simulation = await run({ request: 'navigation', network: 'offline', cache: 'held' });

    expect(simulation.answer).toEqual({ kind: 'shell' });
    expect(simulation.waitedMs).toBe(0);
  });

  it('answers a slow navigation from the cached shell after the patience runs out', async () => {
    const simulation = await run({ request: 'navigation', network: 'slow', cache: 'held' });

    expect(simulation.answer).toEqual({ kind: 'shell' });
    expect(simulation.waitedMs).toBe(NAVIGATION_PATIENCE_MS);
  });

  it('waits for a slow network when no shell is cached', async () => {
    const simulation = await run({ request: 'navigation', network: 'slow', cache: 'empty' });

    expect(simulation.answer).toEqual({ kind: 'network', kept: false });
    expect(simulation.waitedMs).toBe(SLOW_NETWORK_MS);
  });

  it('reports a network error for an offline navigation with no shell', async () => {
    const simulation = await run({ request: 'navigation', network: 'offline', cache: 'empty' });

    expect(simulation.answer).toEqual({ kind: 'network-error' });
  });

  it('answers a held build file from the cache even offline', async () => {
    const simulation = await run({ request: 'build-file', network: 'offline', cache: 'held' });

    expect(simulation.route).toEqual({ kind: 'cache-first' });
    expect(simulation.answer).toEqual({ kind: 'cache' });
  });

  it('fetches and keeps a missing build file', async () => {
    const simulation = await run({ request: 'static-file', network: 'online', cache: 'empty' });

    expect(simulation.answer).toEqual({ kind: 'network', kept: true });
  });

  it('reports a network error for a missing build file offline', async () => {
    const simulation = await run({ request: 'build-file', network: 'offline', cache: 'empty' });

    expect(simulation.answer).toEqual({ kind: 'network-error' });
  });

  it('passes the version file and a model file through to the browser', async () => {
    for (const request of ['version-file', 'model-file'] as const) {
      const online = await run({ request, network: 'online', cache: 'held' });
      const offline = await run({ request, network: 'offline', cache: 'held' });

      expect(online.route).toEqual({ kind: 'pass-through' });
      expect(online.answer).toEqual({ kind: 'browser', reached: true });
      expect(offline.answer).toEqual({ kind: 'browser', reached: false });
    }
  });
});

describe('cacheRole', () => {
  it('names the shell cache of this build, an older shell, the model cache and the rest', () => {
    expect(cacheRole('reader-shell-200', '200')).toBe('this-build-shell');
    expect(cacheRole('reader-shell-100', '200')).toBe('older-shell');
    expect(cacheRole('transformers-cache', '200')).toBe('model');
    expect(cacheRole('experimental_transformers-hash-cache', '200')).toBe('other');
  });
});

describe('the navigation patience', () => {
  it('matches the constant in the service worker', () => {
    const source = readFileSync(SERVICE_WORKER, 'utf8');

    expect(source).toContain(`const NAVIGATION_PATIENCE_MS = ${NAVIGATION_PATIENCE_MS};`);
  });
});
