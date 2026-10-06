import { describe, expect, it } from 'vitest';
import {
  chosenOption,
  chosenText,
  comboboxKey,
  movedActive,
  openingActive,
  shownOptions,
} from './combobox';
import type { ComboboxOption } from './combobox';

const LANGUAGES: readonly ComboboxOption[] = [
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'en', label: 'English' },
];

function labels(options: readonly ComboboxOption[]): readonly string[] {
  return options.map((option) => option.label);
}

describe('shownOptions', () => {
  it('shows every option while the field is empty and nothing is chosen', () => {
    expect(labels(shownOptions(LANGUAGES, '', undefined))).toEqual([
      'Japanese',
      'Korean',
      'English',
    ]);
  });

  it('keeps the options whose label holds the typed text, ignoring case', () => {
    expect(labels(shownOptions(LANGUAGES, 'ko', undefined))).toEqual(['Korean']);
    expect(labels(shownOptions(LANGUAGES, 'NG', undefined))).toEqual(['English']);
  });

  it('shows every option while the field holds the label of the chosen option', () => {
    expect(labels(shownOptions(LANGUAGES, 'Korean', 'ko'))).toHaveLength(3);
  });

  it('filters again once the chosen label is edited', () => {
    expect(labels(shownOptions(LANGUAGES, 'Kor', 'ko'))).toEqual(['Korean']);
  });

  it('shows nothing when no label holds the text', () => {
    expect(shownOptions(LANGUAGES, 'Latin', undefined)).toEqual([]);
  });
});

describe('chosenOption', () => {
  it('finds the option of the value, and none for no value or an unknown one', () => {
    expect(chosenOption(LANGUAGES, 'en')?.label).toBe('English');
    expect(chosenOption(LANGUAGES, undefined)).toBeUndefined();
    expect(chosenOption(LANGUAGES, 'fr')).toBeUndefined();
  });
});

describe('chosenText', () => {
  it('gives the label of the chosen option, or nothing', () => {
    expect([chosenText(LANGUAGES, 'ja'), chosenText(LANGUAGES, undefined)]).toEqual([
      'Japanese',
      '',
    ]);
  });
});

describe('comboboxKey', () => {
  it('opens a closed listbox on the first option on ArrowDown, on none with Alt, and on the last on ArrowUp', () => {
    expect([
      comboboxKey('ArrowDown', false, false),
      comboboxKey('ArrowDown', true, false),
      comboboxKey('ArrowUp', false, false),
    ]).toEqual([
      { kind: 'open', active: 'first' },
      { kind: 'open', active: 'none' },
      { kind: 'open', active: 'last' },
    ]);
  });

  it('moves the active option in an open listbox', () => {
    expect([comboboxKey('ArrowDown', false, true), comboboxKey('ArrowUp', false, true)]).toEqual([
      { kind: 'move', move: 'next' },
      { kind: 'move', move: 'previous' },
    ]);
  });

  it('chooses on Enter and closes on Escape only while the listbox is open', () => {
    expect([comboboxKey('Enter', false, true), comboboxKey('Escape', false, true)]).toEqual([
      { kind: 'choose' },
      { kind: 'close' },
    ]);
    expect([comboboxKey('Enter', false, false), comboboxKey('Escape', false, false)]).toEqual([
      { kind: 'ignore' },
      { kind: 'ignore' },
    ]);
  });

  it('leaves Home, End and text keys to the field', () => {
    expect(['Home', 'End', 'a'].map((key) => comboboxKey(key, false, true).kind)).toEqual([
      'ignore',
      'ignore',
      'ignore',
    ]);
  });
});

describe('openingActive', () => {
  it('makes the first or the last option active, or none', () => {
    expect([
      openingActive('first', 3),
      openingActive('last', 3),
      openingActive('none', 3),
      openingActive('first', 0),
    ]).toEqual([0, 2, undefined, undefined]);
  });
});

describe('movedActive', () => {
  it('moves down from no active option to the first, and wraps from the last to the first', () => {
    expect([movedActive('next', undefined, 3), movedActive('next', 2, 3)]).toEqual([0, 0]);
  });

  it('moves up from no active option to the last, and wraps from the first to the last', () => {
    expect([movedActive('previous', undefined, 3), movedActive('previous', 0, 3)]).toEqual([2, 2]);
  });

  it('makes no option active in an empty list', () => {
    expect(movedActive('next', undefined, 0)).toBeUndefined();
  });
});
