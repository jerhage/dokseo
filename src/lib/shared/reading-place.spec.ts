import { describe, expect, it } from 'vitest';
import { imageIndex } from './ids';
import { imagePlace, resumedCfi, START_OF_THE_TEXT, textPlace } from './reading-place';

describe('imagePlace', () => {
  it('holds the image index it was given', () => {
    expect(imagePlace(imageIndex(7))).toEqual({ kind: 'image', index: 7 });
  });

  it('holds the first image without treating it as absent', () => {
    expect(imagePlace(imageIndex(0))).toEqual({ kind: 'image', index: 0 });
  });
});

describe('textPlace', () => {
  it('holds the cfi it was given', () => {
    expect(textPlace('epubcfi(/6/14!/4/2/14/1:0)')).toEqual({
      kind: 'text',
      cfi: 'epubcfi(/6/14!/4/2/14/1:0)',
    });
  });

  it('carries no quote, because a place is not an anchor', () => {
    expect(Object.keys(textPlace('epubcfi(/6/4!/2)'))).toEqual(['kind', 'cfi']);
  });
});

describe('START_OF_THE_TEXT', () => {
  it('names the empty cfi a flow book is stored with', () => {
    expect(START_OF_THE_TEXT).toEqual({ kind: 'text', cfi: '' });
  });
});

describe('resumedCfi', () => {
  it('answers the cfi a text place holds', () => {
    expect(resumedCfi(textPlace('epubcfi(/6/14!/4/2/14/1:0)'))).toBe('epubcfi(/6/14!/4/2/14/1:0)');
  });

  it('answers nothing for a book still at the start of its text', () => {
    expect(resumedCfi(START_OF_THE_TEXT)).toBeNull();
  });

  it('answers nothing for an image place, which names no cfi', () => {
    expect(resumedCfi(imagePlace(imageIndex(3)))).toBeNull();
  });
});
