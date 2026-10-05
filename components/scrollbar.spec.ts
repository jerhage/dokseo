import { describe, expect, it } from 'vitest';
import { showsScrollbar } from './scrollbar';

describe('showsScrollbar', () => {
  it('reports a scrollbar when the root is narrower than the viewport', () => {
    expect(showsScrollbar({ innerWidth: 1280 }, { clientWidth: 1265 })).toBe(true);
  });

  it('reports none when the root spans the whole viewport', () => {
    expect(showsScrollbar({ innerWidth: 1280 }, { clientWidth: 1280 })).toBe(false);
  });
});
