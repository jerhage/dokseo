import { describe, expect, it } from 'vitest';
import { comparePassages } from './flow-passage-order';

const CHAPTER_TWO = 'epubcfi(/6/4!/4/2,/1:0,/1:2)';

const LATER_IN_CHAPTER_TWO = 'epubcfi(/6/4!/4/10,/1:0,/1:2)';

const FURTHER_ALONG_THE_LINE = 'epubcfi(/6/4!/4/2,/1:5,/1:9)';

const CHAPTER_SEVEN = 'epubcfi(/6/14!/4/2,/1:0,/1:2)';

describe('comparePassages', () => {
  it('puts an earlier chapter first, whatever the text of the cfi sorts to', () => {
    expect(comparePassages(CHAPTER_TWO, CHAPTER_SEVEN)).toBeLessThan(0);
    expect(comparePassages(CHAPTER_SEVEN, CHAPTER_TWO)).toBeGreaterThan(0);
  });

  it('puts an earlier paragraph of the same chapter first', () => {
    expect(comparePassages(LATER_IN_CHAPTER_TWO, CHAPTER_TWO)).toBeGreaterThan(0);
  });

  it('puts an earlier character offset in the same text first', () => {
    expect(comparePassages(CHAPTER_TWO, FURTHER_ALONG_THE_LINE)).toBeLessThan(0);
  });

  it('reports two equal cfis as the same place', () => {
    expect(comparePassages(CHAPTER_TWO, CHAPTER_TWO)).toBe(0);
  });
});
