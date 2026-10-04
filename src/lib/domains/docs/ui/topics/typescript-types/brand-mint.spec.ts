import { describe, expect, it } from 'vitest';
import { mintedIds, mintedRects } from './brand-mint';

function valueOf(raw: string, expression: string): string | undefined {
  return mintedIds(raw).find((minted) => minted.expression === expression)?.value;
}

describe('mintedIds', () => {
  it('mints a book id and a tag id that are the same string at run time', () => {
    expect(valueOf('b-1', 'bookId(raw)')).toBe('"b-1"');
    expect(valueOf('b-1', 'tagId(raw)')).toBe('"b-1"');
    expect(valueOf('b-1', 'typeof bookId(raw)')).toBe('"string"');
    expect(valueOf('b-1', 'same text at run time')).toBe('true');
  });

  it('parses a flat id and refuses an empty one or one with a path in it', () => {
    expect(valueOf('b-1', 'parsedBookId(raw)')).toBe('"b-1"');
    expect(valueOf('', 'parsedBookId(raw)')).toBe('null');
    expect(valueOf('../books', 'parsedBookId(raw)')).toBe('null');
    expect(valueOf('shelf/1', 'parsedBookId(raw)')).toBe('null');
  });
});

describe('mintedRects', () => {
  it('serializes a screen rect and an image rect with the same numbers identically', () => {
    expect(mintedRects(10, 20, 30, 40)).toEqual({
      screen: '{"x":10,"y":20,"width":30,"height":40}',
      image: '{"x":10,"y":20,"width":30,"height":40}',
      same: true,
    });
  });
});
