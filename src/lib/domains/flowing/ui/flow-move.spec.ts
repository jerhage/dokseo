import type { Relocation } from 'foliate-js/view.js';
import { describe, expect, it } from 'vitest';
import { flowRelocation, moveCause, REFLOWED, TRAVELLED } from './flow-move';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

describe('moveCause', () => {
  it('reads a page turn as travel', () => {
    expect(moveCause('page')).toEqual(TRAVELLED);
  });

  it('reads a swipe that snapped to a page as travel', () => {
    expect(moveCause('snap')).toEqual(TRAVELLED);
  });

  it('reads a scroll as travel', () => {
    expect(moveCause('scroll')).toEqual(TRAVELLED);
  });

  it('reads a navigation to a target as travel', () => {
    expect(moveCause('navigation')).toEqual(TRAVELLED);
  });

  it('reads a navigation that selects its target as travel', () => {
    expect(moveCause('selection')).toEqual(TRAVELLED);
  });

  it('reads a re-anchor after a re-layout as a reflow', () => {
    expect(moveCause('anchor')).toEqual(REFLOWED);
  });

  it('reads a move that states no reason as travel', () => {
    expect(moveCause(undefined)).toEqual(TRAVELLED);
  });

  it('reads a move whose reason is null as travel', () => {
    expect(moveCause(null)).toEqual(TRAVELLED);
  });
});

describe('flowRelocation', () => {
  it('carries the place foliate reported beside the cause it classified', () => {
    const at: Relocation = { cfi: SOMEWHERE, fraction: 0.4, tocItem: { label: 'Two' } };

    expect(flowRelocation(at, 'anchor')).toEqual({
      cfi: SOMEWHERE,
      fraction: 0.4,
      tocItem: { label: 'Two' },
      cause: REFLOWED,
    });
  });
});
