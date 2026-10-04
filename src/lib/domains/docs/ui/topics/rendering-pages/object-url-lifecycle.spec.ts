import { describe, expect, it } from 'vitest';
import { ObjectUrlLifecycle } from './object-url-lifecycle.svelte';
import type { ObjectUrlDeps } from './object-url-lifecycle.svelte';

function lifecycle() {
  const live = new Set<string>();
  const revoked: string[] = [];
  let minted = 0;
  const deps: ObjectUrlDeps = {
    makeBlob: () => Promise.resolve(new Blob([new Uint8Array(64)])),
    createUrl: () => {
      minted += 1;
      const url = `blob:test/${minted}`;
      live.add(url);
      return url;
    },
    revokeUrl: (url) => {
      live.delete(url);
      revoked.push(url);
    },
    loadImage: (url) =>
      live.has(url)
        ? Promise.resolve({ width: 720, height: 960 })
        : Promise.reject(new Error('The image did not load')),
  };
  return { view: new ObjectUrlLifecycle(deps), revoked };
}

describe('ObjectUrlLifecycle', () => {
  it('mints one url for the blob and reports its size', async () => {
    const { view } = lifecycle();

    await view.create();
    await view.create();

    expect(view.stage).toEqual({ kind: 'created', url: 'blob:test/1', bytes: 64 });
  });

  it('loads a new image through a url that is still live', async () => {
    const { view } = lifecycle();
    await view.create();

    await view.loadAgain();

    expect(view.attempts.map((tried) => [tried.stage, tried.outcome])).toEqual([
      ['created', { kind: 'image-loaded', size: { width: 720, height: 960 } }],
    ]);
  });

  it('fails a new image once the url is revoked, and names the cause', async () => {
    const { view, revoked } = lifecycle();
    await view.create();
    await view.loadAgain();

    view.revoke();
    await view.loadAgain();

    expect(revoked).toEqual(['blob:test/1']);
    expect(view.stage.kind).toBe('revoked');
    expect(view.attempts.map((tried) => [tried.stage, tried.outcome.kind])).toEqual([
      ['created', 'image-loaded'],
      ['revoked', 'failed'],
    ]);
    expect(view.attempts[1]?.outcome).toEqual({
      kind: 'failed',
      message: 'The image did not load',
    });
  });

  it('mints a fresh url after a revoke and clears the earlier tries', async () => {
    const { view } = lifecycle();
    await view.create();
    view.revoke();
    await view.loadAgain();

    await view.create();

    expect(view.stage).toEqual({ kind: 'created', url: 'blob:test/2', bytes: 64 });
    expect(view.attempts).toEqual([]);
  });

  it('reports a blob that could not be made, and mints no url', async () => {
    const view = new ObjectUrlLifecycle({
      makeBlob: () => Promise.reject(new Error('The sample did not load')),
      createUrl: () => 'blob:never',
      revokeUrl: () => undefined,
      loadImage: () => Promise.resolve({ width: 1, height: 1 }),
    });

    await view.create();

    expect(view.stage).toEqual({ kind: 'failed', message: 'The sample did not load' });
  });

  it('revokes a live url on dispose and does nothing to a revoked one', async () => {
    const { view, revoked } = lifecycle();
    await view.create();

    view.dispose();
    view.dispose();

    expect(revoked).toEqual(['blob:test/1']);
  });
});
