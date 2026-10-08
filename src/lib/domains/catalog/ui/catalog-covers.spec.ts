import { describe, expect, it } from 'vitest';
import type { ReadCatalogCoverResult } from '../use-cases/read-catalog-cover';
import { CatalogCovers } from './catalog-covers.svelte';
import { publication } from './catalog-ui-fixtures';

function setup(
  answer: (url: string) => ReadCatalogCoverResult = () => ({
    kind: 'success',
    image: new Blob(['x']),
  }),
) {
  const created: string[] = [];
  const revoked: string[] = [];
  const signals: AbortSignal[] = [];
  const covers = new CatalogCovers(
    (url, signal) => {
      signals.push(signal);
      return Promise.resolve(answer(url));
    },
    {
      create: () => {
        const url = `blob:${created.length}`;
        created.push(url);
        return url;
      },
      revoke: (url) => revoked.push(url),
    },
  );
  return { covers, created, revoked, signals };
}

describe('CatalogCovers', () => {
  it('turns each cover into an object url keyed by its entry', async () => {
    const { covers } = setup();
    await covers.show([publication('a'), publication('b')]);
    expect(covers.urlOf('a')).toBe('blob:0');
    expect(covers.urlOf('b')).toBe('blob:1');
  });

  it('reads no image for an entry without a cover', async () => {
    const { covers, signals } = setup();
    await covers.show([publication('a', { cover: null })]);
    expect(signals).toHaveLength(0);
    expect(covers.urlOf('a')).toBeNull();
  });

  it('keeps a placeholder when a cover cannot be read', async () => {
    const { covers, created } = setup(() => ({ kind: 'not-found' }));
    await covers.show([publication('a')]);
    expect(covers.urlOf('a')).toBeNull();
    expect(created).toHaveLength(0);
  });

  it('revokes every url when the next feed is shown', async () => {
    const { covers, revoked } = setup();
    await covers.show([publication('a'), publication('b')]);
    await covers.show([publication('c')]);
    expect(revoked).toEqual(['blob:0', 'blob:1']);
    expect(covers.urlOf('a')).toBeNull();
    expect(covers.urlOf('c')).toBe('blob:2');
  });

  it('revokes every url on clear', async () => {
    const { covers, revoked } = setup();
    await covers.show([publication('a')]);
    covers.clear();
    expect(revoked).toEqual(['blob:0']);
    expect(covers.urlOf('a')).toBeNull();
  });

  it('aborts the reads of the feed it replaces and creates no url for them', async () => {
    const { covers, created, signals } = setup();
    const first = covers.show([publication('a')]);
    covers.clear();
    await first;
    expect(signals[0]?.aborted).toBe(true);
    expect(created).toHaveLength(0);
  });
});
