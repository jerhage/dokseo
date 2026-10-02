import { describe, expect, it } from 'vitest';
import { pickerKey, writerKey } from './editor-keys';
import type { KeyPress } from './editor-keys';

function press(key: string, modifier: 'meta' | 'ctrl' | 'none' = 'none'): KeyPress {
  return {
    key,
    metaKey: modifier === 'meta',
    ctrlKey: modifier === 'ctrl',
    isComposing: false,
    keyCode: 0,
  };
}

function composing(key: string, modifier: 'meta' | 'ctrl' | 'none' = 'none'): KeyPress {
  return { ...press(key, modifier), isComposing: true };
}

function processKey(key: string, modifier: 'meta' | 'ctrl' | 'none' = 'none'): KeyPress {
  return { ...press(key, modifier), keyCode: 229 };
}

describe('writerKey', () => {
  it('abandons on Escape', () => {
    expect(writerKey(press('Escape'))).toBe('abandon');
  });

  it('saves on Enter with Command or Control', () => {
    expect(writerKey(press('Enter', 'meta'))).toBe('save');
    expect(writerKey(press('Enter', 'ctrl'))).toBe('save');
  });

  it('leaves a plain Enter to the text, so a note can hold a new line', () => {
    expect(writerKey(press('Enter'))).toBe('type');
  });

  it.each([
    ['the composing flag', composing],
    ['the process key code 229 Safari sends', processKey],
  ])('leaves Escape and a saving Enter to the IME while it composes, by %s', (_signal, held) => {
    expect(writerKey(held('Escape'))).toBe('type');
    expect(writerKey(held('Enter', 'meta'))).toBe('type');
    expect(writerKey(held('Enter', 'ctrl'))).toBe('type');
  });
});

describe('pickerKey', () => {
  it('moves with the arrows, chooses on Enter and closes on Escape', () => {
    expect(['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].map((key) => pickerKey(press(key)))).toEqual(
      ['down', 'up', 'choose', 'close'],
    );
  });

  it('leaves every other key to the filter', () => {
    expect(pickerKey(press('a'))).toBe('type');
    expect(pickerKey(press('ArrowLeft'))).toBe('type');
  });

  it.each([
    ['the composing flag', composing],
    ['the process key code 229 Safari sends', processKey],
  ])('leaves the arrows, Enter and Escape to the IME while it composes, by %s', (_signal, held) => {
    expect(['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].map((key) => pickerKey(held(key)))).toEqual([
      'type',
      'type',
      'type',
      'type',
    ]);
  });
});
