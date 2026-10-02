import { describe, expect, it, vi } from 'vitest';
import { readDropped } from './drop-reading';

type Page = { readonly name: string };

type FakeTransfer = { readonly files: Page[] };

const cover: Page = { name: 'cover.png' };
const spread: Page = { name: 'spread.png' };
const folderPage: Page = { name: 'volume-1/001.png' };

function transfer(files: readonly Page[]): FakeTransfer {
  return { files: [...files] };
}

describe('readDropped', () => {
  it('copies the files before returning, so a transfer emptied afterwards still yields them', async () => {
    const dropped = transfer([cover, spread]);

    const pending = readDropped(dropped, undefined);
    dropped.files.splice(0);

    await expect(pending).resolves.toEqual([cover, spread]);
  });

  it('hands the transfer to the reader before returning', () => {
    const dropped = transfer([cover]);
    const reader = vi.fn(() => Promise.resolve([folderPage]));

    void readDropped(dropped, reader);

    expect(reader).toHaveBeenCalledTimes(1);
    expect(reader).toHaveBeenCalledWith(dropped);
  });

  it('resolves to what an asynchronous or a synchronous reader finds rather than the transfer files', async () => {
    const found = await Promise.all([
      readDropped(transfer([cover]), () => Promise.resolve([folderPage])),
      readDropped(transfer([cover]), () => [spread]),
    ]);

    expect(found).toEqual([[folderPage], [spread]]);
  });
});
