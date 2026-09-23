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

  it('stores no cover when the named image is larger than the ceiling', async () => {
    const huge = entry({ bytes: COVER_MAX_BYTES + 1 });
    const read = vi.spyOn(huge, 'read');

    await expect(epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(huge))).resolves.toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it('renders an image exactly at the ceiling', async () => {
    const limit = entry({ bytes: COVER_MAX_BYTES });

    await expect(epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(limit))).resolves.not.toBeNull();
  });

  it('stores no cover when the named image will not decode', async () => {
    decode.mockRejectedValue(new Error('not an image'));

    await expect(epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(entry()))).resolves.toBeNull();
  });

  it('stores no cover when the archive cannot read the entry', async () => {
    const broken = entry({ read: () => Promise.reject(new Error('the entry is damaged')) });

    await expect(epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(broken))).resolves.toBeNull();
  });

  it('closes the bitmap it drew from', async () => {
    const close = vi.fn();
    decode.mockResolvedValue({ width: 800, height: 1200, close });

    await epubCoverImage(PACKAGE_XML, PACKAGE_PATH, lookup(entry()));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
