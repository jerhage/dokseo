import { describe, expect, it } from 'vitest';
import { STORED_ROW } from '../storage/row-check';
import {
  LEGACY_HASH,
  PRESET_OPTIONS,
  parsedRowText,
  presetText,
  readSummary,
  strictRead,
} from './strict-read';

describe('strictRead', () => {
  it('reads a full row as a book holding exactly the stored values', () => {
    expect(strictRead(presetText('full'))).toEqual({ kind: 'read', book: STORED_ROW, left: [] });
  });

  it.each([
    { preset: 'field-missing', reason: 'A stored book lacks its direction' },
    { preset: 'language-unknown', reason: 'A stored book holds an unknown language: fr' },
    { preset: 'count-nan', reason: 'A stored book holds an unknown image count: NaN' },
    {
      preset: 'hash-legacy',
      reason: `A stored book holds an unknown content hash: ${LEGACY_HASH}`,
    },
  ] as const)('reports the $preset row as unreadable, naming the field', ({ preset, reason }) => {
    expect(strictRead(presetText(preset))).toEqual({ kind: 'unreadable', reason });
  });

  it('reads a field Book does not name and leaves it out of the book', () => {
    const text = JSON.stringify({ ...STORED_ROW, shelfColor: 'teal' });

    expect(strictRead(text)).toEqual({ kind: 'read', book: STORED_ROW, left: ['shelfColor'] });
  });

  it('rejects text that is not JSON and JSON that is not an object', () => {
    expect(strictRead('{').kind).toBe('not-json');
    expect(strictRead('[1]')).toEqual({ kind: 'not-a-row' });
    expect(strictRead('7')).toEqual({ kind: 'not-a-row' });
  });
});

describe('parsedRowText', () => {
  it('reads bare NaN and Infinity as numbers and leaves them inside strings as text', () => {
    expect(parsedRowText('{"a": NaN, "b": -Infinity, "c": "NaN Infinity"}')).toEqual({
      a: Number.NaN,
      b: Number.NEGATIVE_INFINITY,
      c: 'NaN Infinity',
    });
  });
});

describe('presetText', () => {
  it('writes NaN as a bare token that reads back as NaN', () => {
    const text = presetText('count-nan');

    expect(text).toContain('"imageCount": NaN');
    expect(parsedRowText(text)).toMatchObject({ imageCount: Number.NaN });
  });

  it('offers a text for every preset', () => {
    expect(PRESET_OPTIONS.map((option) => typeof presetText(option.preset))).not.toContain(
      'undefined',
    );
  });
});

describe('readSummary', () => {
  it('names each outcome', () => {
    expect(readSummary(strictRead('{')).title).toBe('Not JSON');
    expect(readSummary({ kind: 'not-a-row' }).variant).toBe('danger');
    expect(readSummary({ kind: 'unreadable', reason: 'r' }).title).toBe('Unreadable');
    expect(readSummary(strictRead(presetText('full'))).text).toContain('exactly the stored values');
  });
});
