import { describe, expect, it } from 'vitest';
import { hashUpload } from './file-hashes.svelte';
import type { HashFiles } from './file-hashes.svelte';

function upload(name: string, text: string, webkitRelativePath = '') {
  return Object.assign(new Blob([text]), { name, webkitRelativePath });
}

function hashers(partial: HashFiles['partial'] = async (blob) => `partial:${await blob.text()}`) {
  let clock = 0;
  return {
    partial,
    whole: async (blob: Blob) => `whole:${await blob.text()}`,
    now: () => (clock += 5),
  };
}

async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('hashUpload', () => {
  it('hashes a lone file by its own bytes and times it', async () => {
    const [hashed] = hashUpload([upload('a.pdf', 'pdf bytes')], hashers());
    await settled();

    expect(hashed?.partial).toEqual({ kind: 'done', hash: 'partial:pdf bytes', ms: 5 });
  });

  it('hashes a folder by its manifest text', async () => {
    const [hashed] = hashUpload(
      [upload('2.png', 'bb', 'Vol/2.png'), upload('1.png', 'a', 'Vol/1.png')],
      hashers(),
    );
    await settled();

    expect(hashed?.partial).toMatchObject({ hash: 'partial:["1.png",1]\n["2.png",2]' });
  });

  it('reports a hash that rejects as failed', async () => {
    const [hashed] = hashUpload(
      [upload('a.pdf', 'x')],
      hashers(() => Promise.reject(new Error('The file could not be read'))),
    );
    await settled();

    expect(hashed?.partial).toEqual({ kind: 'failed', message: 'The file could not be read' });
  });

  it('hashes every byte only when asked', async () => {
    const [hashed] = hashUpload([upload('a.pdf', 'all of it')], hashers());
    await settled();

    expect(hashed?.whole).toEqual({ kind: 'idle' });
    await hashed?.hashEveryByte();
    expect(hashed?.whole).toMatchObject({ kind: 'done', hash: 'whole:all of it' });
  });

  it('offers no whole-file hash for a folder', async () => {
    const [hashed] = hashUpload(
      [upload('1.png', 'a', 'Vol/1.png'), upload('2.png', 'b', 'Vol/2.png')],
      hashers(),
    );
    await hashed?.hashEveryByte();

    expect(hashed?.whole).toEqual({ kind: 'idle' });
  });
});
