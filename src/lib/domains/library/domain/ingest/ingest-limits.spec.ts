import { describe, expect, it } from 'vitest';
import {
  archiveBreach,
  describeIngestLimit,
  isMarkupEntry,
  markupBreach,
  MAX_ARCHIVE_ENTRIES,
  MAX_ENTRY_BYTES,
  MAX_INFLATED_BYTES,
  MAX_MARKUP_BYTES,
  MAX_UPLOAD_BYTES,
  uploadBreach,
} from './ingest-limits';
import type { SizedEntry } from './ingest-limits';

function entry(filename: string, uncompressedSize: number): SizedEntry {
  return { filename, directory: false, uncompressedSize };
}

function folder(filename: string): SizedEntry {
  return { filename, directory: true, uncompressedSize: 0 };
}

function pages(count: number, uncompressedSize: number): SizedEntry[] {
  return Array.from({ length: count }, (_, at) => entry(`pages/${at}.jpg`, uncompressedSize));
}

const A_MANGA_VOLUME = pages(200, 1_000_000);

describe('uploadBreach', () => {
  it('passes a 200 image manga volume', () => {
    expect(
      uploadBreach(A_MANGA_VOLUME.map((page) => ({ size: page.uncompressedSize }))),
    ).toBeNull();
  });

  it('passes a 1.5 GB scanned textbook', () => {
    expect(uploadBreach([{ size: 1_500_000_000 }])).toBeNull();
  });

  it('passes an upload sitting exactly on the limit', () => {
    expect(uploadBreach([{ size: MAX_UPLOAD_BYTES }])).toBeNull();
  });

  it('refuses one file a byte over the limit', () => {
    expect(uploadBreach([{ size: MAX_UPLOAD_BYTES + 1 }])).toEqual({
      kind: 'upload-too-large',
      bytes: MAX_UPLOAD_BYTES + 1,
    });
  });

  it('sums every file rather than measuring the largest', () => {
    const half = MAX_UPLOAD_BYTES / 2;
    expect(uploadBreach([{ size: half }, { size: half }, { size: 1 }])).toEqual({
      kind: 'upload-too-large',
      bytes: MAX_UPLOAD_BYTES + 1,
    });
  });

  it('passes no files at all', () => {
    expect(uploadBreach([])).toBeNull();
  });
});

describe('archiveBreach', () => {
  it('passes a 200 image manga volume', () => {
    expect(archiveBreach(A_MANGA_VOLUME)).toBeNull();
  });

  it('passes a 1000 page scanned textbook', () => {
    expect(archiveBreach(pages(1000, 1_500_000))).toBeNull();
  });

  it('passes an archive holding exactly the entry limit', () => {
    expect(archiveBreach(pages(MAX_ARCHIVE_ENTRIES, 1))).toBeNull();
  });

  it('refuses an archive one entry over the limit', () => {
    expect(archiveBreach(pages(MAX_ARCHIVE_ENTRIES + 1, 1))).toEqual({
      kind: 'too-many-entries',
      entries: MAX_ARCHIVE_ENTRIES + 1,
    });
  });

  it('counts directories towards the entry limit', () => {
    const many = Array.from({ length: MAX_ARCHIVE_ENTRIES + 1 }, (_, at) => folder(`d${at}/`));
    expect(archiveBreach(many)).toEqual({
      kind: 'too-many-entries',
      entries: MAX_ARCHIVE_ENTRIES + 1,
    });
  });

  it('passes an entry sitting exactly on the per entry limit', () => {
    expect(archiveBreach([entry('spread.png', MAX_ENTRY_BYTES)])).toBeNull();
  });

  it('refuses an entry a byte over the per entry limit', () => {
    expect(archiveBreach([entry('spread.png', MAX_ENTRY_BYTES + 1)])).toEqual({
      kind: 'entry-too-large',
      name: 'spread.png',
      bytes: MAX_ENTRY_BYTES + 1,
    });
  });

  it('names the first oversized entry rather than the last', () => {
    expect(
      archiveBreach([
        entry('ok.jpg', 10),
        entry('first.png', MAX_ENTRY_BYTES + 1),
        entry('second.png', MAX_ENTRY_BYTES + 2),
      ]),
    ).toEqual({ kind: 'entry-too-large', name: 'first.png', bytes: MAX_ENTRY_BYTES + 1 });
  });

  it('refuses markup at the picture limit rather than the markup limit', () => {
    expect(archiveBreach([entry('OEBPS/content.opf', MAX_MARKUP_BYTES + 1)])).toEqual({
      kind: 'markup-too-long',
      name: 'OEBPS/content.opf',
      bytes: MAX_MARKUP_BYTES + 1,
    });
  });

  it('passes a package document sitting exactly on the markup limit', () => {
    expect(archiveBreach([entry('OEBPS/content.opf', MAX_MARKUP_BYTES)])).toBeNull();
  });

  it('refuses an archive whose entries together unpack past the aggregate limit', () => {
    const count = MAX_INFLATED_BYTES / MAX_ENTRY_BYTES + 1;
    expect(archiveBreach(pages(count, MAX_ENTRY_BYTES))).toEqual({
      kind: 'inflates-too-far',
      bytes: MAX_INFLATED_BYTES + MAX_ENTRY_BYTES,
    });
  });

  it('reports the whole declared total, not the running sum at the breach', () => {
    const breach = archiveBreach(pages(9, MAX_ENTRY_BYTES));
    expect(breach).toEqual({ kind: 'inflates-too-far', bytes: 9 * MAX_ENTRY_BYTES });
  });

  it('passes an archive sitting exactly on the aggregate limit', () => {
    expect(archiveBreach(pages(MAX_INFLATED_BYTES / MAX_ENTRY_BYTES, MAX_ENTRY_BYTES))).toBeNull();
  });

  it('reports an oversized entry before the aggregate it also breaches', () => {
    const breach = archiveBreach([
      ...pages(8, MAX_ENTRY_BYTES),
      entry('bomb.bin', MAX_ENTRY_BYTES + 1),
    ]);
    expect(breach).toEqual({
      kind: 'entry-too-large',
      name: 'bomb.bin',
      bytes: MAX_ENTRY_BYTES + 1,
    });
  });

  it('passes an empty archive', () => {
    expect(archiveBreach([])).toBeNull();
  });
});

describe('markupBreach', () => {
  it('passes a document sitting exactly on the limit', () => {
    expect(markupBreach('content.opf', MAX_MARKUP_BYTES)).toBeNull();
  });

  it('refuses a document one unit over the limit', () => {
    expect(markupBreach('content.opf', MAX_MARKUP_BYTES + 1)).toEqual({
      kind: 'markup-too-long',
      name: 'content.opf',
      bytes: MAX_MARKUP_BYTES + 1,
    });
  });
});

describe('isMarkupEntry', () => {
  it('recognises every markup extension an EPUB parses', () => {
    const named = ['a.xml', 'b.opf', 'c.xhtml', 'd.html', 'e.htm', 'f.ncx', 'g.svg', 'h.smil'];
    expect(named.every(isMarkupEntry)).toBe(true);
  });

  it('recognises an extension in upper case', () => {
    expect(isMarkupEntry('META-INF/CONTAINER.XML')).toBe(true);
  });

  it('rejects a picture', () => {
    expect(isMarkupEntry('pages/001.jpg')).toBe(false);
  });

  it('rejects a name with no extension', () => {
    expect(isMarkupEntry('mimetype')).toBe(false);
  });
});

describe('describeIngestLimit', () => {
  it('names the upload size and the upload limit in gigabytes', () => {
    expect(describeIngestLimit({ kind: 'upload-too-large', bytes: 3_000_000_000 })).toBe(
      'That upload is 3 GB, over the 2 GB one upload may be.',
    );
  });

  it('names the entry count and the entry limit', () => {
    expect(describeIngestLimit({ kind: 'too-many-entries', entries: 40_000 })).toBe(
      `That archive holds 40000 entries, over the ${MAX_ARCHIVE_ENTRIES} an archive may hold.`,
    );
  });

  it('names the offending entry and what it unpacks to', () => {
    expect(
      describeIngestLimit({ kind: 'entry-too-large', name: 'bomb.bin', bytes: 4_000_000_000 }),
    ).toBe('bomb.bin unpacks to 4 GB, over the 500 MB one entry may unpack to.');
  });

  it('names the unpacked total and the aggregate limit', () => {
    expect(describeIngestLimit({ kind: 'inflates-too-far', bytes: 9_000_000_000 })).toBe(
      'That archive unpacks to 9 GB, over the 4 GB an archive may unpack to.',
    );
  });

  it('names the document and its markup length', () => {
    expect(
      describeIngestLimit({ kind: 'markup-too-long', name: 'content.opf', bytes: 90_000_000 }),
    ).toBe('content.opf holds 90 MB of markup, over the 4 MB one document may hold.');
  });
});
