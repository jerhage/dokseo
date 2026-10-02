import { describe, expect, it } from 'vitest';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import {
  removalProblem,
  removeUnreadableLabel,
  unreadableCapturesTitle,
} from './unreadable-captures';

describe('unreadableCapturesTitle', () => {
  it.each([
    [1, '1 capture could not be read'],
    [3, '3 captures could not be read'],
  ])('names %i unreadable captures', (count, title) => {
    expect(unreadableCapturesTitle(count)).toBe(title);
  });
});

describe('removeUnreadableLabel', () => {
  it.each([
    [1, 'Remove 1 unreadable capture'],
    [3, 'Remove 3 unreadable captures'],
  ])('offers to remove %i unreadable captures', (count, label) => {
    expect(removeUnreadableLabel(count)).toBe(label);
  });
});

describe('removalProblem', () => {
  it.each([
    [{ kind: 'idle' } as const, null],
    [{ kind: 'saving' } as const, null],
    [{ kind: 'done', result: { kind: 'success' } } as const, null],
    [{ kind: 'failed', message: 'Something went wrong: x' } as const, 'Something went wrong: x'],
    [{ kind: 'done', result: STORAGE_UNAVAILABLE } as const, 'This browser blocks local storage.'],
  ])('reports what stopped the removal for %j', (state, problem) => {
    expect(removalProblem(state)).toBe(problem);
  });
});
