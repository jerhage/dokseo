import { imageRect, screenRect } from '$lib/shared/geometry';
import { bookId, parsedBookId, tagId } from '$lib/shared/ids';

type MintedValue = { readonly expression: string; readonly value: string };

type MintedRects = { readonly screen: string; readonly image: string; readonly same: boolean };

const RAW_ID_PRESETS: readonly string[] = [
  'b7f3c2a0-5d1e-4c8a-9f2b-1e6d3a4c5b70',
  '../books',
  'shelf/1',
  '',
];

function shown(value: unknown): string {
  return value === null ? 'null' : JSON.stringify(value);
}

function sameText(one: string, other: string): boolean {
  return one === other;
}

function mintedIds(raw: string): readonly MintedValue[] {
  const book = bookId(raw);
  const tag = tagId(raw);
  return [
    { expression: 'parsedBookId(raw)', value: shown(parsedBookId(raw)) },
    { expression: 'bookId(raw)', value: shown(book) },
    { expression: 'tagId(raw)', value: shown(tag) },
    { expression: 'typeof bookId(raw)', value: shown(typeof book) },
    { expression: 'same text at run time', value: shown(sameText(book, tag)) },
  ];
}

function mintedRects(x: number, y: number, width: number, height: number): MintedRects {
  const screen = JSON.stringify(screenRect(x, y, width, height));
  const image = JSON.stringify(imageRect(x, y, width, height));
  return { screen, image, same: screen === image };
}

export { RAW_ID_PRESETS, mintedIds, mintedRects };
export type { MintedRects, MintedValue };
