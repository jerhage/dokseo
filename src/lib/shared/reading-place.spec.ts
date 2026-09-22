import { describe, expect, it } from 'vitest';
import { imageIndex } from './ids';
import { imagePlace, textPlace } from './reading-place';

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
