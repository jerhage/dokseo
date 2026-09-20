import { describe, expect, it } from 'vitest';
import { chromeShown, chromeToggle } from './reader-chrome';

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

describe('chromeToggle', () => {
  it('offers to hide the bars that are up', () => {
    expect(chromeToggle(true).label).toBe('Hide the toolbars');
  });

  it('offers to show the bars that are down', () => {
    expect(chromeToggle(false).label).toBe('Show the toolbars');
  });

  it('reads as pressed only while the bars are up', () => {
    expect([chromeToggle(true).pressed, chromeToggle(false).pressed]).toEqual([true, false]);
  });

  it('wears one glyph in both states', () => {
    expect(chromeToggle(true).glyph).toBe(chromeToggle(false).glyph);
  });
});
