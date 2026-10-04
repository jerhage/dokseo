import { describe, expect, it } from 'vitest';
import { tagId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { tagRemovalProblem, unreadableTagName, unreadableTagsTitle } from './unreadable-tags';

describe('unreadableTagsTitle', () => {
  it.each([
    [1, '1 tag could not be read'],
    [2, '2 tags could not be read'],
  ])('names %i unreadable tags', (count, title) => {
    expect(unreadableTagsTitle(count)).toBe(title);
  });
});

describe('unreadableTagName', () => {
  it('names the tag by its stored name', () => {
    expect(unreadableTagName({ id: tagId('t-1'), name: 'keigo', stored: {} })).toBe('keigo');
  });

  it.each([null, '  '])('names a tag without a name %j by a short id', (name) => {
    expect(unreadableTagName({ id: tagId('0123456789abcdef'), name, stored: {} })).toBe(
      'Unnamed tag (01234567)',
    );
  });
});

describe('tagRemovalProblem', () => {
  it.each([
    [{ kind: 'idle' } as const, null],
    [{ kind: 'saving' } as const, null],
    [{ kind: 'done', result: { kind: 'success' } } as const, null],
    [{ kind: 'failed', message: 'Something went wrong: x' } as const, 'Something went wrong: x'],
    [{ kind: 'done', result: STORAGE_UNAVAILABLE } as const, 'This browser blocks local storage.'],
  ])('reports what stopped the removal for %j', (state, problem) => {
    expect(tagRemovalProblem(state)).toBe(problem);
  });
});
