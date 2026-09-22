import { describe, expect, it } from 'vitest';
import { chromeHolds, chromeShown } from './reader-chrome';
import type { ChromeBar } from './reader-chrome';

describe('chromeShown', () => {
  it('shows the bars the reader asked for', () => {
    expect(chromeShown(true, false)).toBe(true);
  });

  it('hides the bars once the reader asks for nothing', () => {
    expect(chromeShown(false, false)).toBe(false);
  });

  it('keeps unasked bars up while something in them holds them', () => {
    expect(chromeShown(false, true)).toBe(true);
  });
});

function bar(held: readonly Element[], inert = false): ChromeBar {
  return { inert, contains: (node: Element) => held.includes(node) };
}

const PILL = {} as Element;

const PICKER = {} as Element;

describe('chromeHolds', () => {
  it('holds the bars up for a popover opened inside one of them', () => {
    expect(chromeHolds([bar([PILL]), null], [PILL])).toBe(true);
  });

  it('lets the bars fall for a popover opened outside every one of them', () => {
    expect(chromeHolds([bar([PILL]), null], [PICKER])).toBe(false);
  });

  it('holds the bars up for whatever holds focus inside one of them', () => {
    expect(chromeHolds([null, bar([PILL])], [PILL])).toBe(true);
  });

  it('ignores a bar that is already inert, because nothing in it can be reached', () => {
    expect(chromeHolds([bar([PILL], true)], [PILL])).toBe(false);
  });

  it('ignores a node that is nothing at all', () => {
    expect(chromeHolds([bar([PILL])], [null])).toBe(false);
  });

  it('holds the bars up when one of several nodes is inside', () => {
    expect(chromeHolds([bar([PILL])], [PICKER, null, PILL])).toBe(true);
  });

  it('lets the bars fall when there are no bars at all', () => {
    expect(chromeHolds([], [PILL])).toBe(false);
  });
});
