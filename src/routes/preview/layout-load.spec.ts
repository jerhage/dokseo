import { afterEach, describe, expect, it, vi } from 'vitest';

async function loadWith(dev: boolean): Promise<() => unknown> {
  vi.resetModules();
  vi.doMock('$app/environment', () => ({ dev }));
  const layout = await import('./+layout');
  return () => layout.load();
}

afterEach(() => {
  vi.doUnmock('$app/environment');
});

describe('the preview layout load', () => {
  it('serves the comparison routes in development', async () => {
    const load = await loadWith(true);

    expect(load).not.toThrow();
  });

  it('answers 404 outside development', async () => {
    const load = await loadWith(false);

    expect(load).toThrow(expect.objectContaining({ status: 404 }));
  });
});
