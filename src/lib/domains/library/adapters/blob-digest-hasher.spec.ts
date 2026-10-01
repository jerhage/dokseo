import { describe, expect, it } from 'vitest';
import { blobDigestHasher } from './blob-digest-hasher';

describe('blobDigestHasher', () => {
  it('answers the digest of the blob it is handed', async () => {
    const hashed: Blob[] = [];
    const blob = new Blob(['page']);
    const hasher = blobDigestHasher((handed) => {
      hashed.push(handed);
      return Promise.resolve('beef01');
    });

    expect(await hasher(blob)).toEqual({ kind: 'success', digest: 'beef01' });
    expect(hashed).toEqual([blob]);
  });

  it('answers unreadable with the message of a digest that rejects', async () => {
    const hasher = blobDigestHasher(() => Promise.reject(new Error('no hashing here.')));

    expect(await hasher(new Blob(['page']))).toEqual({
      kind: 'unreadable',
      cause: 'no hashing here.',
    });
  });
});
