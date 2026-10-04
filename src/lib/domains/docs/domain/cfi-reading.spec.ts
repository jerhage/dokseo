import { describe, expect, it } from 'vitest';
import { cfiPartMeaning, ordinal, readCfi, spinePosition } from './cfi-reading';

const SPEC_EXAMPLE = 'epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)';

describe('readCfi', () => {
  it('splits the specification example into its steps', () => {
    expect(readCfi(SPEC_EXAMPLE)?.map((part) => part.text)).toEqual([
      '/6',
      '/4[chap01ref]',
      '!',
      '/4[body01]',
      '/10[para05]',
      '/3',
      ':10',
    ]);
  });

  it('reads a range as a common path, a start and an end', () => {
    const parts = readCfi('epubcfi(/6/4[ref-ch2]!/4/12,/1:0,/1:27)') ?? [];

    expect(parts.map((part) => part.kind)).toEqual([
      'step',
      'step',
      'indirection',
      'step',
      'step',
      'range-start',
      'step',
      'offset',
      'range-end',
      'step',
      'offset',
    ]);
  });

  it('rejects text that is not a CFI', () => {
    expect(readCfi('/6/4!/4')).toBeNull();
    expect(readCfi('epubcfi()')).toBeNull();
    expect(readCfi('epubcfi(/6/x)')).toBeNull();
  });
});

describe('cfiPartMeaning', () => {
  it('names the spine, the itemref and its id assertion', () => {
    const meanings = (readCfi(SPEC_EXAMPLE) ?? []).map(cfiPartMeaning);

    expect(meanings[0]).toBe("the package's 3rd child element: the spine");
    expect(meanings[1]).toBe('the 2nd itemref in the spine, with the id assertion chap01ref');
    expect(meanings[3]).toBe("the body, the root element's 2nd child");
    expect(meanings[4]).toBe('the 5th child element, with the id assertion para05');
    expect(meanings[5]).toBe('the 2nd run of text at this level');
    expect(meanings[6]).toBe('10 UTF-16 code units into that text');
  });

  it('measures the range ends from the common path', () => {
    const parts = readCfi('epubcfi(/6/4!/4/12,/1:0,/1:27)') ?? [];
    const starts = parts.filter((part) => part.kind === 'step' && part.place === 'document');

    expect(starts.map((part) => (part.kind === 'step' ? part.depth : -1))).toEqual([0, 1, 2, 2]);
  });
});

describe('spinePosition', () => {
  it('returns the itemref position the CFI names', () => {
    expect(spinePosition(readCfi(SPEC_EXAMPLE) ?? [])).toBe(2);
    expect(spinePosition([])).toBeNull();
  });
});

describe('ordinal', () => {
  it('writes English ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
  });
});
