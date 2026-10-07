import { describe, expect, it } from 'vitest';
import { collapsedCfi } from './flow-cfi';

describe('collapsedCfi', () => {
  it.each([
    'epubcfi(/6/12!/4,/522,/522)',
    'epubcfi(/6/12!/4,/538,/538)',
    'epubcfi(/6/12!/4,/16,/16)',
    'epubcfi(/6/12!/4,/16[p^,1],/16[p^,1])',
    'epubcfi(/6/12!/4/16,/1:3,/1:3)',
  ])('reports %s as collapsed', (cfi) => {
    expect(collapsedCfi(cfi)).toBe(true);
  });

  it.each([
    'epubcfi(/6/12!/4/558,/1:49,/1:55)',
    'epubcfi(/6/10!/4/12,/1:0,/1:14)',
    'epubcfi(/6/12!/4/18,/1:0,/1:44)',
    'epubcfi(/6/2!/4,/16/1:0,/18)',
    'epubcfi(/6/12!/4,/16[p^,1],/18)',
    'epubcfi(/6/14!/4/2/14/1:0)',
    '',
    'chapter.xhtml',
  ])('reports %s as not collapsed', (cfi) => {
    expect(collapsedCfi(cfi)).toBe(false);
  });
});
