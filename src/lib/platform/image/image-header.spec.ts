import { describe, expect, it } from 'vitest';
import { readImageHeader } from './image-header';

function bytes(...parts: readonly (readonly number[] | string)[]): Uint8Array {
  const all: number[] = [];
  for (const part of parts) {
    if (typeof part === 'string') all.push(...[...part].map((char) => char.charCodeAt(0)));
    else all.push(...part);
  }
  return new Uint8Array(all);
}

function be16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function be32(value: number): number[] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function le16(value: number): number[] {
  return [value & 0xff, (value >>> 8) & 0xff];
}

function le32(value: number): number[] {
  return [...le16(value & 0xffff), ...le16(value >>> 16)];
}

function png(width: number, height: number): Uint8Array {
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    be32(13),
    'IHDR',
    be32(width),
    be32(height),
    [8, 6, 0, 0, 0],
  );
}

function segment(marker: number, body: Uint8Array): number[] {
  return [0xff, marker, ...be16(body.length + 2), ...body];
}

function exif(orientation: number): Uint8Array {
  return bytes(
    'Exif',
    [0, 0],
    'MM',
    be16(42),
    be32(8),
    be16(1),
    be16(0x0112),
    be16(3),
    be32(1),
    be16(orientation),
    [0, 0],
    be32(0),
  );
}

function jpeg(width: number, height: number, before: readonly number[][] = []): Uint8Array {
  const frame = bytes([8], be16(height), be16(width), [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return bytes([0xff, 0xd8], ...before, segment(0xc0, frame), [0xff, 0xda, 0, 2]);
}

function box(type: string, ...body: readonly (readonly number[] | string)[]): number[] {
  const inside = bytes(...body);
  return [...be32(inside.length + 8), ...bytes(type), ...inside];
}

function avif(width: number, height: number, rotation: number | null): Uint8Array {
  const properties = [
    box('ispe', [0, 0, 0, 0], be32(64), be32(64)),
    box('ispe', [0, 0, 0, 0], be32(width), be32(height)),
  ];
  if (rotation !== null) properties.push(box('irot', [rotation]));
  const indices = rotation === null ? [0x82] : [0x82, 0x83];
  return bytes(
    box('ftyp', 'avif', be32(0), 'mif1', 'avif'),
    box(
      'meta',
      [0, 0, 0, 0],
      box('hdlr', [0, 0, 0, 0], be32(0), 'pict', be32(0), be32(0), be32(0), [0]),
      box('pitm', [0, 0, 0, 0], be16(2)),
      box(
        'iprp',
        box('ipco', ...properties),
        box('ipma', [0, 0, 0, 0], be32(2), be16(1), [1, 0x81], be16(2), [
          indices.length,
          ...indices,
        ]),
      ),
    ),
    box('mdat', [0, 0, 0, 0]),
  );
}

describe('readImageHeader', () => {
  it('reads a PNG from its IHDR chunk', () => {
    expect(readImageHeader(png(800, 2400))).toEqual({
      kind: 'size',
      size: { width: 800, height: 2400 },
    });
  });

  it('reads a JPEG from its frame header, past the segments before it', () => {
    const comment = segment(0xfe, bytes('made by hand'));

    expect(readImageHeader(jpeg(800, 2400, [comment]))).toEqual({
      kind: 'size',
      size: { width: 800, height: 2400 },
    });
  });

  it('reads a progressive JPEG from its SOF2 marker', () => {
    const progressive = jpeg(640, 960).map((byte, at) => (at === 3 ? 0xc2 : byte));

    expect(readImageHeader(progressive)).toEqual({
      kind: 'size',
      size: { width: 640, height: 960 },
    });
  });

  it('swaps a JPEG whose EXIF orientation turns it a quarter', () => {
    for (const orientation of [5, 6, 7, 8]) {
      expect(readImageHeader(jpeg(800, 600, [segment(0xe1, exif(orientation))]))).toEqual({
        kind: 'size',
        size: { width: 600, height: 800 },
      });
    }
  });

  it('keeps a JPEG whose EXIF orientation only flips it', () => {
    for (const orientation of [1, 2, 3, 4]) {
      expect(readImageHeader(jpeg(800, 600, [segment(0xe1, exif(orientation))]))).toEqual({
        kind: 'size',
        size: { width: 800, height: 600 },
      });
    }
  });

  it('asks for more bytes while the JPEG frame header has not arrived', () => {
    const whole = jpeg(800, 2400, [segment(0xe1, exif(6))]);

    expect(readImageHeader(whole.slice(0, 30))).toEqual({ kind: 'short' });
    expect(readImageHeader(whole.slice(0, whole.length - 20))).toEqual({ kind: 'short' });
  });

  it('reads the three WebP encodings', () => {
    const lossy = bytes(
      'RIFF',
      le32(0),
      'WEBP',
      'VP8 ',
      le32(0),
      [0, 0, 0, 0x9d, 0x01, 0x2a],
      le16(800),
      le16(2400),
    );
    const bits = (800 - 1) | ((2400 - 1) << 14);
    const lossless = bytes(
      'RIFF',
      le32(0),
      'WEBP',
      'VP8L',
      le32(0),
      [0x2f],
      le32(bits),
      [0, 0, 0, 0, 0],
    );
    const extended = bytes(
      'RIFF',
      le32(0),
      'WEBP',
      'VP8X',
      le32(10),
      [0, 0, 0, 0],
      le32(799).slice(0, 3),
      le32(2399).slice(0, 3),
    );

    for (const image of [lossy, lossless, extended]) {
      expect(readImageHeader(image)).toEqual({ kind: 'size', size: { width: 800, height: 2400 } });
    }
  });

  it('reads a GIF from its logical screen', () => {
    expect(readImageHeader(bytes('GIF89a', le16(320), le16(480), [0, 0, 0]))).toEqual({
      kind: 'size',
      size: { width: 320, height: 480 },
    });
  });

  it('reads a BMP stored bottom up or top down', () => {
    const upward = bytes('BM', le32(0), le32(0), le32(54), le32(40), le32(300), le32(500));
    const downward = bytes('BM', le32(0), le32(0), le32(54), le32(40), le32(300), le32(-500 >>> 0));

    expect(readImageHeader(upward)).toEqual({ kind: 'size', size: { width: 300, height: 500 } });
    expect(readImageHeader(downward)).toEqual({ kind: 'size', size: { width: 300, height: 500 } });
  });

  it('reads the primary item of an AVIF, not its thumbnail', () => {
    expect(readImageHeader(avif(800, 2400, null))).toEqual({
      kind: 'size',
      size: { width: 800, height: 2400 },
    });
  });

  it('swaps an AVIF rotated a quarter turn', () => {
    expect(readImageHeader(avif(800, 2400, 1))).toEqual({
      kind: 'size',
      size: { width: 2400, height: 800 },
    });
    expect(readImageHeader(avif(800, 2400, 2))).toEqual({
      kind: 'size',
      size: { width: 800, height: 2400 },
    });
  });

  it('asks for more bytes while the AVIF meta box is cut off', () => {
    const whole = avif(800, 2400, null);

    expect(readImageHeader(whole.slice(0, 40))).toEqual({ kind: 'short' });
  });

  it('asks for more bytes before a signature can be told apart', () => {
    expect(readImageHeader(new Uint8Array([0xff, 0xd8, 0xff]))).toEqual({ kind: 'short' });
  });

  it('reports an unknown format as unknown', () => {
    expect(readImageHeader(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toEqual({
      kind: 'unknown',
    });
  });

  it('reports a zero dimension as unknown rather than a size', () => {
    expect(readImageHeader(png(0, 2400))).toEqual({ kind: 'unknown' });
  });

  it('reports an AVIF whose property map runs past its box as unknown', () => {
    const broken = avif(800, 2400, null);
    const map = Buffer.from(broken).indexOf('ipma');
    const primary = Buffer.from(broken).indexOf('pitm');
    broken.set([0xff, 0xff, 0xff, 0xff], map + 8);
    broken.set([0, 9], primary + 8);

    expect(readImageHeader(broken)).toEqual({ kind: 'unknown' });
  });
});
