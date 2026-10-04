import { BlobReader, TextWriter, ZipReader, configure } from '@zip.js/zip.js';
import { describe, expect, it } from 'vitest';
import { crc32, LOCAL_HEADER_BYTES, storedZip, textEntry } from './stored-zip';

configure({ useWebWorkers: false });

async function readBack(archive: Uint8Array<ArrayBuffer>): Promise<Record<string, string>> {
  const reader = new ZipReader(new BlobReader(new Blob([archive])));
  const entries = await reader.getEntries();
  const read: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.directory) continue;
    read[entry.filename] = await entry.getData(new TextWriter());
  }
  await reader.close();
  return read;
}

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926);
  });
});

describe('storedZip', () => {
  it('writes entries a zip reader reads back unchanged', async () => {
    const archive = storedZip([
      textEntry('mimetype', 'application/epub+zip'),
      textEntry('OEBPS/ch1.xhtml', '<p>雨の朝</p>'),
    ]);

    expect(await readBack(archive)).toEqual({
      mimetype: 'application/epub+zip',
      'OEBPS/ch1.xhtml': '<p>雨の朝</p>',
    });
  });

  it('places the first entry name and its stored bytes right after the local header', () => {
    const archive = storedZip([textEntry('mimetype', 'application/epub+zip')]);
    const text = new TextDecoder().decode(
      archive.slice(LOCAL_HEADER_BYTES, LOCAL_HEADER_BYTES + 28),
    );

    expect(Array.from(archive.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(text).toBe('mimetypeapplication/epub+zip');
  });

  it('stores without compression and without an extra field', () => {
    const view = new DataView(storedZip([textEntry('mimetype', 'application/epub+zip')]).buffer);

    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint16(28, true)).toBe(0);
  });
});
