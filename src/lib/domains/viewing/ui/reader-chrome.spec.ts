import { describe, expect, it } from 'vitest';
import { chromeShown } from './reader-chrome';

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
