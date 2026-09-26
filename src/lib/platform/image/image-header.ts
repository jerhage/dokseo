import type { Size } from '$lib/shared/geometry';

type HeaderReading =
  | { readonly kind: 'size'; readonly size: Size }
  | { readonly kind: 'short' }
  | { readonly kind: 'unknown' };

type Box = { readonly type: string; readonly body: number; readonly end: number };

const SHORT: HeaderReading = { kind: 'short' };

const UNKNOWN: HeaderReading = { kind: 'unknown' };

const SIGNATURE_BYTES = 12;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const EXIF_ORIENTATION_TAG = 0x0112;

const TURNING_ORIENTATIONS: ReadonlySet<number> = new Set([5, 6, 7, 8]);

function sized(width: number, height: number, turned = false): HeaderReading {
  if (width <= 0 || height <= 0) return UNKNOWN;
  return {
    kind: 'size',
    size: turned ? { width: height, height: width } : { width, height },
  };
}

function textAt(view: DataView, at: number, length: number): string {
  let text = '';
  for (let offset = 0; offset < length; offset += 1) {
    text += String.fromCharCode(view.getUint8(at + offset));
  }
  return text;
}

function uint24At(view: DataView, at: number): number {
  return view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getUint8(at + 2) << 16);
}

function pngSize(view: DataView): HeaderReading {
  if (view.byteLength < 24) return SHORT;
  if (textAt(view, 12, 4) !== 'IHDR') return UNKNOWN;
  return sized(view.getUint32(16), view.getUint32(20));
}

function gifSize(view: DataView): HeaderReading {
  return sized(view.getUint16(6, true), view.getUint16(8, true));
}

function bmpSize(view: DataView): HeaderReading {
  if (view.byteLength < 26) return SHORT;
  if (view.getUint32(14, true) === 12) {
    return sized(view.getUint16(18, true), view.getUint16(20, true));
  }
  return sized(Math.abs(view.getInt32(18, true)), Math.abs(view.getInt32(22, true)));
}

function webpSize(view: DataView): HeaderReading {
  if (view.byteLength < 30) return SHORT;
  const chunk = textAt(view, 12, 4);
  if (chunk === 'VP8 ') {
    return sized(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  if (chunk === 'VP8L') {
    const bits = view.getUint32(21, true);
    return sized((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === 'VP8X') return sized(uint24At(view, 24) + 1, uint24At(view, 27) + 1);
  return UNKNOWN;
}

function exifTurns(view: DataView, start: number, end: number): boolean {
  if (end - start < 14 || textAt(view, start, 4) !== 'Exif') return false;
  const tiff = start + 6;
  const little = textAt(view, tiff, 2) === 'II';
  const directory = tiff + view.getUint32(tiff + 4, little);
  if (directory + 2 > end) return false;
  const entries = view.getUint16(directory, little);
  for (let entry = 0; entry < entries; entry += 1) {
    const at = directory + 2 + entry * 12;
    if (at + 12 > end) return false;
    if (view.getUint16(at, little) === EXIF_ORIENTATION_TAG) {
      return TURNING_ORIENTATIONS.has(view.getUint16(at + 8, little));
    }
  }
  return false;
}

function isFrameMarker(marker: number): boolean {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

function standsAlone(marker: number): boolean {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7);
}

function jpegSize(view: DataView): HeaderReading {
  let at = 2;
  let turned = false;
  let oriented = false;
  while (at + 4 <= view.byteLength) {
    if (view.getUint8(at) !== 0xff) return UNKNOWN;
    const marker = view.getUint8(at + 1);
    if (marker === 0xff || standsAlone(marker)) {
      at += marker === 0xff ? 1 : 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return UNKNOWN;
    if (isFrameMarker(marker)) {
      if (at + 9 > view.byteLength) return SHORT;
      return sized(view.getUint16(at + 7), view.getUint16(at + 5), turned);
    }
    const end = at + 2 + view.getUint16(at + 2);
    if (marker === 0xe1 && !oriented) {
      if (end > view.byteLength) return SHORT;
      oriented = textAt(view, at + 4, 4) === 'Exif';
      turned = exifTurns(view, at + 4, end);
    }
    at = end;
  }
  return SHORT;
}

function boxAt(view: DataView, at: number): Box | null {
  if (at + 8 > view.byteLength) return null;
  const declared = view.getUint32(at);
  const type = textAt(view, at + 4, 4);
  if (declared === 0) return { type, body: at + 8, end: Number.POSITIVE_INFINITY };
  if (declared !== 1) return { type, body: at + 8, end: at + declared };
  if (at + 16 > view.byteLength) return null;
  return { type, body: at + 16, end: at + Number(view.getBigUint64(at + 8)) };
}

function childrenOf(view: DataView, from: number, to: number): readonly Box[] {
  const children: Box[] = [];
  let at = from;
  while (at < to) {
    const box = boxAt(view, at);
    if (box === null || box.end > to || box.end <= at) break;
    children.push(box);
    at = box.end;
  }
  return children;
}

function childNamed(
  view: DataView,
  parent: Box | undefined,
  type: string,
  skip = 0,
): Box | undefined {
  if (parent === undefined) return undefined;
  return childrenOf(view, parent.body + skip, parent.end).find((child) => child.type === type);
}

function associations(view: DataView, map: Box, item: number): readonly number[] {
  const version = view.getUint8(map.body);
  const wide = (view.getUint8(map.body + 3) & 1) === 1;
  const count = view.getUint32(map.body + 4);
  let at = map.body + 8;
  for (let entry = 0; entry < count; entry += 1) {
    const id = version < 1 ? view.getUint16(at) : view.getUint32(at);
    at += version < 1 ? 2 : 4;
    const indices: number[] = [];
    const many = view.getUint8(at);
    at += 1;
    for (let slot = 0; slot < many; slot += 1) {
      indices.push(wide ? view.getUint16(at) & 0x7fff : view.getUint8(at) & 0x7f);
      at += wide ? 2 : 1;
    }
    if (id === item) return indices;
  }
  return [];
}

function primaryItemSize(view: DataView, meta: Box): HeaderReading {
  const primary = childNamed(view, meta, 'pitm', 4);
  const properties = childNamed(view, meta, 'iprp', 4);
  const container = childNamed(view, properties, 'ipco');
  const map = childNamed(view, properties, 'ipma');
  if (primary === undefined || container === undefined || map === undefined) return UNKNOWN;

  const item =
    view.getUint8(primary.body) === 0
      ? view.getUint16(primary.body + 4)
      : view.getUint32(primary.body + 4);
  const listed = childrenOf(view, container.body, container.end);
  let extent: Box | undefined;
  let turned = false;
  for (const index of associations(view, map, item)) {
    const property = listed[index - 1];
    if (property?.type === 'ispe') extent = property;
    if (property?.type === 'irot') turned = (view.getUint8(property.body) & 1) === 1;
  }
  if (extent === undefined) return UNKNOWN;
  return sized(view.getUint32(extent.body + 4), view.getUint32(extent.body + 8), turned);
}

function heifSize(view: DataView): HeaderReading {
  let at = 0;
  for (;;) {
    const box = boxAt(view, at);
    if (box === null) return SHORT;
    if (box.type === 'meta') {
      return box.end > view.byteLength ? SHORT : primaryItemSize(view, box);
    }
    if (box.end <= at || !Number.isFinite(box.end)) return UNKNOWN;
    at = box.end;
  }
}

function headerOf(view: DataView): HeaderReading {
  if (PNG_SIGNATURE.every((byte, at) => view.getUint8(at) === byte)) return pngSize(view);
  if (view.getUint8(0) === 0xff && view.getUint8(1) === 0xd8) return jpegSize(view);
  if (textAt(view, 0, 4) === 'RIFF' && textAt(view, 8, 4) === 'WEBP') return webpSize(view);
  if (textAt(view, 0, 3) === 'GIF') return gifSize(view);
  if (textAt(view, 0, 2) === 'BM') return bmpSize(view);
  if (textAt(view, 4, 4) === 'ftyp') return heifSize(view);
  return UNKNOWN;
}

function readImageHeader(bytes: Uint8Array): HeaderReading {
  if (bytes.byteLength < SIGNATURE_BYTES) return SHORT;
  try {
    return headerOf(new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  } catch {
    return UNKNOWN;
  }
}

export { readImageHeader };
export type { HeaderReading };
