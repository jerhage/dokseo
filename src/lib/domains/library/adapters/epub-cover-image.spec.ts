import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COVER_MAX_BYTES, epubCoverImage } from './epub-cover-image';
import type { CoverEntry } from './epub-cover-image';

const decode = vi.fn();

const convert = vi.fn();

const drawn: { width: number; height: number }[] = [];

class FakeCanvas {
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    drawn.push({ width, height });
  }

  getContext(): { drawImage: () => void } {
    return { drawImage: () => undefined };
  }

  convertToBlob(options: { type: string }): Promise<Blob> {
    return convert(options);
  }
}

const PACKAGE_XML = `<package>
  <manifest>
    <item id="art" href="images/cover.png" media-type="image/png" properties="cover-image"/>
  </manifest>
</package>`;

const PACKAGE_PATH = 'OEBPS/content.opf';

function entry(overrides: Partial<CoverEntry> = {}): CoverEntry {
  return {
    bytes: 40_000,
    read: (mediaType: string) => Promise.resolve(new Blob(['cover bytes'], { type: mediaType })),
    ...overrides,
  };
}

function lookup(found: CoverEntry | null, seen: string[] = []) {
  return (path: string): CoverEntry | null => {
    seen.push(path);
    return found;
  };
}

beforeEach(() => {
  drawn.length = 0;
  decode.mockReset();
  decode.mockResolvedValue({ width: 1600, height: 2400, close: () => undefined });
  convert.mockReset();
  convert.mockResolvedValue(new Blob(['thumbnail'], { type: 'image/webp' }));
  vi.stubGlobal('createImageBitmap', decode);
  vi.stubGlobal('OffscreenCanvas', FakeCanvas);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('epubCoverImage', () => {
  it('renders the cover the manifest names into a thumbnail', async () => {
    const seen: string[] = [];

    const cover = await epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(entry(), seen));

    expect(seen).toEqual(['OEBPS/images/cover.png']);
    expect(cover?.type).toBe('image/webp');
    expect(drawn).toEqual([{ width: 400, height: 600 }]);
  });

  it('reads the entry under the media type the manifest declares', async () => {
    const types: string[] = [];
    const svg = `<package><manifest>
        <item id="a" href="c.svg" media-type="image/SVG+XML" properties="cover-image"/>
      </manifest></package>`;

    await epubCoverImage(
      svg,
      'content.opf',
      lookup(
        entry({
          read: (mediaType: string) => {
            types.push(mediaType);
            return Promise.resolve(new Blob(['<svg/>'], { type: mediaType }));
          },
        }),
      ),
    );

    expect(types).toEqual(['image/svg+xml']);
  });

  it('stores no cover when the book names none', async () => {
    const seen: string[] = [];
    const bare =
      '<package><manifest><item id="a" href="c.png" media-type="image/png"/></manifest></package>';

    await expect(epubCoverImage(bare, 'content.opf', lookup(entry(), seen))).resolves.toBeNull();
    expect(seen).toEqual([]);
  });

  it('stores no cover when the named image is not in the archive', async () => {
    await expect(epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(null))).resolves.toBeNull();
  });

  it.each([
    ['renders an image exactly at the ceiling', COVER_MAX_BYTES, true],
    ['stores no cover for an image one byte past the ceiling', COVER_MAX_BYTES + 1, false],
  ])('%s', async (_, bytes, renders) => {
    const sized = entry({ bytes });
    const read = vi.spyOn(sized, 'read');

    const cover = await epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(sized));

    expect(cover !== null).toBe(renders);
    expect(read).toHaveBeenCalledTimes(renders ? 1 : 0);
  });

  it.each([
    [
      'the named image will not decode',
      () => {
        decode.mockRejectedValue(new Error('not an image'));
        return entry();
      },
    ],
    [
      'the archive cannot read the entry',
      () => entry({ read: () => Promise.reject(new Error('the entry is damaged')) }),
    ],
  ])('stores no cover when %s', async (_, broken) => {
    await expect(epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(broken()))).resolves.toBeNull();
  });

  it('closes the bitmap it drew from', async () => {
    const close = vi.fn();
    decode.mockResolvedValue({ width: 800, height: 1200, close });

    await epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(entry()));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
