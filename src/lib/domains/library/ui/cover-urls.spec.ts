import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { bookId } from '$lib/shared/ids';
import { CoverUrls } from './cover-urls';

let created: string[] = [];
let revoked: string[] = [];
let originalCreate: typeof URL.createObjectURL;
let originalRevoke: typeof URL.revokeObjectURL;

beforeEach(() => {
  created = [];
  revoked = [];
  originalCreate = URL.createObjectURL;
  originalRevoke = URL.revokeObjectURL;
  URL.createObjectURL = () => {
    const url = `blob:cover-${created.length + 1}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    revoked.push(url);
  };
});

afterEach(() => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

const ONE = bookId('one');
const TWO = bookId('two');

describe('CoverUrls', () => {
  it('makes one object URL for each cover', () => {
    const urls = new CoverUrls();

    const shown = urls.urlsFor(
      new Map([
        [ONE, new Blob(['1'])],
        [TWO, new Blob(['2'])],
      ]),
    );

    expect(shown).toEqual(
      new Map([
        [ONE, 'blob:cover-1'],
        [TWO, 'blob:cover-2'],
      ]),
    );
    expect(revoked).toEqual([]);
  });

  it('keeps the URL of a cover it already shows and revokes the one replaced or gone', () => {
    const urls = new CoverUrls();
    const kept = new Blob(['1']);
    urls.urlsFor(
      new Map([
        [ONE, kept],
        [TWO, new Blob(['2'])],
      ]),
    );

    const shown = urls.urlsFor(
      new Map([
        [ONE, kept],
        [TWO, new Blob(['3'])],
      ]),
    );

    expect(shown).toEqual(
      new Map([
        [ONE, 'blob:cover-1'],
        [TWO, 'blob:cover-3'],
      ]),
    );
    expect(revoked).toEqual(['blob:cover-2']);

    urls.urlsFor(new Map([[ONE, kept]]));

    expect(revoked).toEqual(['blob:cover-2', 'blob:cover-3']);
  });

  it('answers the same map for the same covers', () => {
    const urls = new CoverUrls();
    const covers = new Map([[ONE, new Blob(['1'])]]);

    expect(urls.urlsFor(covers)).toBe(urls.urlsFor(covers));
    expect(created).toHaveLength(1);
  });

  it('revokes every URL it holds when disposed', () => {
    const urls = new CoverUrls();
    urls.urlsFor(
      new Map([
        [ONE, new Blob(['1'])],
        [TWO, new Blob(['2'])],
      ]),
    );

    urls.dispose();

    expect(revoked).toEqual(['blob:cover-1', 'blob:cover-2']);
  });
});
