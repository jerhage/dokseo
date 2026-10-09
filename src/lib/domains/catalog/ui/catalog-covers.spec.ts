import { describe, expect, it } from 'vitest';
import { CatalogCovers } from './catalog-covers';

function setup(blobs: Map<string, Blob>) {
  const created: string[] = [];
  const revoked: string[] = [];
  const covers = new CatalogCovers(() => blobs, {
    create: () => {
      const url = `blob:${created.length}`;
      created.push(url);
      return url;
    },
    revoke: (url) => revoked.push(url),
  });
  return { covers, created, revoked, blobs };
}

describe('CatalogCovers', () => {
  it('turns the cached image of an entry into an object url', () => {
    const { covers } = setup(new Map([['a', new Blob(['x'])]]));

    expect(covers.urlOf('a')).toBe('blob:0');
  });

  it('answers the same url for the same image however often it is asked', () => {
    const { covers, created } = setup(new Map([['a', new Blob(['x'])]]));

    expect(covers.urlOf('a')).toBe(covers.urlOf('a'));
    expect(created).toHaveLength(1);
  });

  it('answers nothing for an entry whose image is not cached', () => {
    const { covers, created } = setup(new Map());

    expect(covers.urlOf('a')).toBeNull();
    expect(created).toHaveLength(0);
  });

  it('makes a url for an image that reaches the cache later', () => {
    const { covers, blobs } = setup(new Map());
    expect(covers.urlOf('a')).toBeNull();

    blobs.set('a', new Blob(['x']));

    expect(covers.urlOf('a')).toBe('blob:0');
  });

  it('revokes every url on clear', () => {
    const { covers, revoked } = setup(
      new Map([
        ['a', new Blob(['x'])],
        ['b', new Blob(['y'])],
      ]),
    );
    covers.urlOf('a');
    covers.urlOf('b');

    covers.clear();

    expect(revoked).toEqual(['blob:0', 'blob:1']);
  });

  it('makes a new url for an image asked for after a clear', () => {
    const { covers, revoked } = setup(new Map([['a', new Blob(['x'])]]));
    covers.urlOf('a');
    covers.clear();

    expect(covers.urlOf('a')).toBe('blob:1');
    expect(revoked).toEqual(['blob:0']);
  });

  it('revokes every url on dispose and makes none afterwards', () => {
    const { covers, revoked, created } = setup(new Map([['a', new Blob(['x'])]]));
    covers.urlOf('a');

    covers.dispose();

    expect(revoked).toEqual(['blob:0']);
    expect(covers.urlOf('a')).toBeNull();
    expect(created).toHaveLength(1);
  });

  it('revokes nothing on clear when no url was made', () => {
    const { covers, revoked } = setup(new Map([['a', new Blob(['x'])]]));

    covers.clear();

    expect(revoked).toEqual([]);
  });
});
