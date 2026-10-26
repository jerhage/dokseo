import { describe, expect, it } from 'vitest';
import { changeMarker } from './change-marker';

describe('changeMarker', () => {
  it('mints a new change id for each marker of the same record', () => {
    const first = changeMarker('tag', 't', false, 1);
    const second = changeMarker('tag', 't', false, 1);

    expect(first.changeId).not.toBe(second.changeId);
    expect(first.changeId.length).toBeGreaterThan(0);
  });
});
