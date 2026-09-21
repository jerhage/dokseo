import { BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { imageIndex } from '$lib/shared/ids';
import type { PageSource } from '$lib/shared/page-source';
import { openArchivePageSource } from './archive-page-source';

const decode = vi.fn();

async function archive(): Promise<Blob> {
  const writer = new ZipWriter(new BlobWriter('application/zip'));
  await writer.add('002.jpg', new TextReader('second page bytes'), { level: 0 });
  await writer.add('001.jpg', new TextReader('first page bytes'), { level: 0 });
  return writer.close();
}

async function opened(): Promise<PageSource> {
  const source = await openArchivePageSource(await archive());
  if (!source.ok) throw new Error('the archive could not be opened');
  return source.value;
}

beforeEach(() => {
  decode.mockReset();
  vi.stubGlobal('createImageBitmap', decode);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('openArchivePageSource', () => {
  it('hands back an encoded picture without decoding the entry', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({ ok: true, value: { kind: 'encoded', url: expect.any(String) } });
    expect(decode).not.toHaveBeenCalled();
  });

  it('mints a fresh url for every call', async () => {
    using source = await opened();

    const first = await source.picture(imageIndex(0));
    const second = await source.picture(imageIndex(0));

    expect(first.ok && second.ok).toBe(true);
    expect(first.ok ? first.value : null).not.toEqual(second.ok ? second.value : null);
  });

  it('rejects a picture outside the archive', async () => {
    using source = await opened();

    const picture = await source.picture(imageIndex(7));

    expect(picture).toEqual({ ok: false, error: { kind: 'out-of-range', index: 7, count: 2 } });
  });

  it('rejects a picture once the archive is closed', async () => {
    const source = await opened();
    source.close();

    const picture = await source.picture(imageIndex(0));

    expect(picture).toEqual({
      ok: false,
      error: { kind: 'source-unreadable', cause: 'The archive is closed' },
    });
  });
});
