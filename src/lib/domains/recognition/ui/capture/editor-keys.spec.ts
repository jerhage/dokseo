import { describe, expect, it } from 'vitest';
import { pickerKey, writerKey } from './editor-keys';

function press(key: string, modifier: 'meta' | 'ctrl' | 'none' = 'none') {
  return { key, metaKey: modifier === 'meta', ctrlKey: modifier === 'ctrl' };
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
});
