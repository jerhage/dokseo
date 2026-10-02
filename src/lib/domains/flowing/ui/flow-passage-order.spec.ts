import { describe, expect, it } from 'vitest';
import { comparePassages } from './flow-passage-order';

const CHAPTER_TWO = 'epubcfi(/6/4!/4/2,/1:0,/1:2)';

const LATER_IN_CHAPTER_TWO = 'epubcfi(/6/4!/4/10,/1:0,/1:2)';

const FURTHER_ALONG_THE_LINE = 'epubcfi(/6/4!/4/2,/1:5,/1:9)';

const CHAPTER_SEVEN = 'epubcfi(/6/14!/4/2,/1:0,/1:2)';

describe('comparePassages', () => {
  it.each([
    ['an earlier chapter, whatever the text of the cfi sorts to', CHAPTER_TWO, CHAPTER_SEVEN, -1],
    ['a later chapter, whatever the text of the cfi sorts to', CHAPTER_SEVEN, CHAPTER_TWO, 1],
    ['a later paragraph of the same chapter', LATER_IN_CHAPTER_TWO, CHAPTER_TWO, 1],
    ['an earlier character offset in the same text', CHAPTER_TWO, FURTHER_ALONG_THE_LINE, -1],
    ['the same place', CHAPTER_TWO, CHAPTER_TWO, 0],
  ])('orders %s by the sign of the comparison', (_case, one, other, sign) => {
    expect(Math.sign(comparePassages(one, other))).toBe(sign);
  });
});
