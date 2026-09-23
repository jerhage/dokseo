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
  it('calls a written capture a note', () => {
    expect(captureState('written')).toBe(NOTE_STATE);
  });

  it('calls a recognized capture read', () => {
    expect(captureState('recognized')).toBe(READ_STATE);
  });

  it('calls a capture taken from the book lifted', () => {
    expect(captureState('lifted')).toBe(LIFTED_STATE);
  });
});

describe('captureNote', () => {
  it('invites text into a note holding none', () => {
    expect(captureNote('written', '')).toBe(EMPTY_NOTE);
  });

  it('says nothing beside a note that holds text', () => {
    expect(captureNote('written', 'ひとこと')).toBeNull();
  });

  it('says nothing beside a recognized capture, however empty', () => {
    expect(captureNote('recognized', '')).toBeNull();
  });

  it('says nothing beside a lifted capture, however empty', () => {
    expect(captureNote('lifted', '')).toBeNull();
  });
});
