import type { Relocation } from 'foliate-js/view.js';
import { describe, expect, it } from 'vitest';
import { flowRelocation, moveCause, REFLOWED, TRAVELLED } from './flow-move';

const SOMEWHERE = 'epubcfi(/6/14!/4/2/14/1:0)';

describe('moveCause', () => {
  it.each([
    ['page', TRAVELLED],
    ['snap', TRAVELLED],
    ['scroll', TRAVELLED],
    ['navigation', TRAVELLED],
    ['selection', TRAVELLED],
    ['anchor', REFLOWED],
    [undefined, TRAVELLED],
    [null, TRAVELLED],
  ] as const)('reads a move for the reason %j as %j', (reason, cause) => {
    expect(moveCause(reason)).toEqual(cause);
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
