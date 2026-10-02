import { describe, expect, it } from 'vitest';
import {
  captureNote,
  captureState,
  EMPTY_NOTE,
  LIFTED_STATE,
  NOTE_STATE,
  READ_STATE,
} from './capture-card';

describe('captureState', () => {
  it.each([
    ['written', NOTE_STATE],
    ['recognized', READ_STATE],
    ['lifted', LIFTED_STATE],
  ] as const)('calls a %s capture by its own state word', (origin, state) => {
    expect(captureState(origin)).toBe(state);
  });
});

describe('captureNote', () => {
  it('invites text into a note holding none', () => {
    expect(captureNote('written', '')).toBe(EMPTY_NOTE);
  });

  it('says nothing beside a note that holds text', () => {
    expect(captureNote('written', 'ひとこと')).toBeNull();
  });

  it.each(['recognized', 'lifted'] as const)(
    'says nothing beside a %s capture, however empty',
    (origin) => {
      expect(captureNote(origin, '')).toBeNull();
    },
  );
});
