import { describe, expect, it } from 'vitest';
import { NAMELESS, rejectionOf } from './manage-tags-rules';

describe('rejectionOf', () => {
  it('names a missing name, names the holder of a taken one and says nothing else', () => {
    expect(rejectionOf({ kind: 'nameless' })).toBe(NAMELESS);
    expect(rejectionOf({ kind: 'name-taken', holder: 'sfx' })).toBe('sfx already holds that name.');
    expect(rejectionOf({ kind: 'renamed' })).toBeNull();
    expect(rejectionOf({ kind: 'unchanged' })).toBeNull();
  });
});
