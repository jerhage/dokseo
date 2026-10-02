import { describe, expect, it, vi } from 'vitest';
import { cacheFirstResponse, navigationResponse } from './shell-responses';

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function never<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

function page(text: string, status = 200): Response {
  return new Response(text, { status });
}

describe('navigationResponse', () => {
  it('answers with the network page when it arrives in time', async () => {
    const fresh = page('fresh');
    const shell = vi.fn(async () => page('cached'));

    const answer = await navigationResponse({
      network: async () => fresh,
      shell,
      patience: never,
    });

    expect(answer).toBe(fresh);
    expect(shell).not.toHaveBeenCalled();
  });

  it('passes a network answer through whatever its status', async () => {
    const missing = page('not found', 404);

    const answer = await navigationResponse({
      network: async () => missing,
      shell: async () => page('cached'),
      patience: never,
    });

    expect(answer).toBe(missing);
  });

  it('falls back to the cached shell when the network fails', async () => {
    const cached = page('cached');

    const answer = await navigationResponse({
      network: async () => {
        throw new TypeError('Failed to fetch');
      },
      shell: async () => cached,
      patience: never,
    });

    expect(answer).toBe(cached);
  });

  it('falls back to the cached shell when the network outlasts its patience', async () => {
    const cached = page('cached');

    const answer = await navigationResponse({
      network: never,
      shell: async () => cached,
      patience: async () => undefined,
    });

    expect(answer).toBe(cached);
  });

  it('waits for a slow network when nothing is cached', async () => {
    const network = deferred<Response>();
    const fresh = page('fresh');

    const answer = navigationResponse({
      network: () => network.promise,
      shell: async () => undefined,
      patience: async () => undefined,
    });
    network.resolve(fresh);

    await expect(answer).resolves.toBe(fresh);
  });

  it('answers with a network error when the network fails and nothing is cached', async () => {
    const answer = await navigationResponse({
      network: async () => {
        throw new TypeError('Failed to fetch');
      },
      shell: async () => undefined,
      patience: never,
    });

    expect(answer.type).toBe('error');
  });

  it('answers with a network error when a slow network then fails and nothing is cached', async () => {
    const network = deferred<Response>();

    const answer = navigationResponse({
      network: () => network.promise,
      shell: async () => undefined,
      patience: async () => undefined,
    });
    network.reject(new TypeError('Failed to fetch'));

    await expect(answer).resolves.toHaveProperty('type', 'error');
  });
});

describe('cacheFirstResponse', () => {
  it('answers from the cache without asking the network', async () => {
    const cached = page('cached');
    const network = vi.fn(async () => page('fresh'));

    const answer = await cacheFirstResponse({
      cached: async () => cached,
      network,
      keep: async () => undefined,
    });

    expect(answer).toBe(cached);
    expect(network).not.toHaveBeenCalled();
  });

  it('keeps a copy of a whole network answer the cache missed', async () => {
    const fresh = page('fresh');
    const kept: Response[] = [];

    const answer = await cacheFirstResponse({
      cached: async () => undefined,
      network: async () => fresh,
      keep: async (response) => {
        kept.push(response);
      },
    });

    expect(answer).toBe(fresh);
    expect(kept).toHaveLength(1);
    expect(kept[0]).not.toBe(fresh);
    await expect(kept[0]?.text()).resolves.toBe('fresh');
    await expect(answer.text()).resolves.toBe('fresh');
  });

  it('keeps nothing but a 200', async () => {
    for (const status of [206, 404, 500]) {
      const keep = vi.fn(async () => undefined);

      const answer = await cacheFirstResponse({
        cached: async () => undefined,
        network: async () => page('x', status),
        keep,
      });

      expect(answer.status).toBe(status);
      expect(keep).not.toHaveBeenCalled();
    }
  });

  it('answers even when keeping the copy fails', async () => {
    const fresh = page('fresh');

    const answer = await cacheFirstResponse({
      cached: async () => undefined,
      network: async () => fresh,
      keep: async () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
    });

    expect(answer).toBe(fresh);
  });

  it('rejects when the cache misses and the network fails', async () => {
    const failure = new TypeError('Failed to fetch');

    const answer = cacheFirstResponse({
      cached: async () => undefined,
      network: async () => {
        throw failure;
      },
      keep: async () => undefined,
    });

    await expect(answer).rejects.toBe(failure);
  });
});
