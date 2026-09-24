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
  it("resolves to the transfer's own files when no reader is given", async () => {
    await expect(readDropped(transfer([cover, spread]), undefined)).resolves.toEqual([
      cover,
      spread,
    ]);
  });

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

  it('resolves to what an asynchronous reader finds rather than the transfer files', async () => {
    const reader = vi.fn(() => Promise.resolve([folderPage]));

    await expect(readDropped(transfer([cover]), reader)).resolves.toEqual([folderPage]);
  });

  it('resolves to what a synchronous reader returns', async () => {
    await expect(readDropped(transfer([cover]), () => [spread])).resolves.toEqual([spread]);
  });
});
