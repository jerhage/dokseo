import { describe, expect, it } from 'vitest';
import { removalWarning, tagRemoval } from './tag-removal';
import type { TagRemoval } from './tag-removal';

describe('tagRemoval', () => {
  it.each([
    ['nothing carries', 0, { kind: 'unused', name: 'sfx' }],
    ['one capture carries', 1, { kind: 'single', name: 'sfx' }],
    ['several captures carry', 12, { kind: 'several', name: 'sfx', captures: 12 }],
    ['with a negative count as one nothing carries', -1, { kind: 'unused', name: 'sfx' }],
  ] as const)('names a tag %s', (_name, captures, removal) => {
    expect(tagRemoval('sfx', captures)).toEqual(removal);
  });
});

describe('removalWarning', () => {
  const warnings: readonly (readonly [TagRemoval, string])[] = [
    [{ kind: 'unused', name: 'sfx' }, 'Delete sfx? Nothing carries it, so no capture changes.'],
    [
      { kind: 'single', name: 'sfx' },
      'Delete sfx? One capture loses the tag. The capture itself is kept.',
    ],
    [
      { kind: 'several', name: 'keigo', captures: 12 },
      'Delete keigo? 12 captures lose the tag. The captures themselves are kept.',
    ],
    [
      { kind: 'several', name: 'sfx', captures: 4 },
      'Delete sfx? 4 captures lose the tag. The captures themselves are kept.',
    ],
  ];

  it.each(warnings)('warns that deleting %o takes only the tag', (removal, warning) => {
    expect(removalWarning(removal)).toBe(warning);
  });
});
