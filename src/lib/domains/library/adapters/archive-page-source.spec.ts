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

class FlakyBlob extends Blob {
  broken = false;

  override slice(start?: number, end?: number, type?: string): Blob {
    if (this.broken) throw new Error('the archive is damaged');
    return super.slice(start, end, type);
  }
}

async function flaky(): Promise<FlakyBlob> {
  return new FlakyBlob([await (await archive()).arrayBuffer()], { type: 'application/zip' });
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

  it('reports an unreadable page, not a decode failure, when the entry will not read', async () => {
    const blob = await flaky();
    const source = await openArchivePageSource(blob);
    if (!source.ok) throw new Error('the archive could not be opened');
    using pages = source.value;
    blob.broken = true;

    const picture = await pages.picture(imageIndex(0));

    expect(picture).toEqual({
      ok: false,
      error: { kind: 'page-unreadable', index: 0, cause: expect.any(String) },
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it('separates an unreadable entry from an entry that will not decode', async () => {
    using source = await opened();
    decode.mockRejectedValue(new Error('not an image'));

    const image = await source.image(imageIndex(0));

    expect(image).toEqual({
      ok: false,
      error: { kind: 'decode-failed', index: 0, cause: expect.stringContaining('not an image') },
    });
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
