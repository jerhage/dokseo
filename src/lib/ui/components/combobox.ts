import { landOn } from './roving';
import type { Move } from './roving';

type ComboboxOption = {
  readonly value: string;
  readonly label: string;
};

type ComboboxOpening = 'first' | 'last' | 'none';

type ComboboxKey =
  | { readonly kind: 'open'; readonly active: ComboboxOpening }
  | { readonly kind: 'move'; readonly move: Move }
  | { readonly kind: 'choose' }
  | { readonly kind: 'close' }
  | { readonly kind: 'ignore' };

const IGNORE: ComboboxKey = { kind: 'ignore' };

function chosenOption(
  options: readonly ComboboxOption[],
  value: string | undefined,
): ComboboxOption | undefined {
  return value === undefined ? undefined : options.find((option) => option.value === value);
}

function chosenText(options: readonly ComboboxOption[], value: string | undefined): string {
  return chosenOption(options, value)?.label ?? '';
}

function optionMatches(option: ComboboxOption, query: string): boolean {
  return option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase());
}

function shownOptions(
  options: readonly ComboboxOption[],
  query: string,
  value: string | undefined,
): readonly ComboboxOption[] {
  if (query === chosenText(options, value)) return options;
  return options.filter((option) => optionMatches(option, query));
}

function comboboxKey(key: string, altKey: boolean, open: boolean): ComboboxKey {
  if (key === 'ArrowDown') {
    if (open) return altKey ? IGNORE : { kind: 'move', move: 'next' };
    return { kind: 'open', active: altKey ? 'none' : 'first' };
  }
  if (key === 'ArrowUp') {
    if (open) return altKey ? IGNORE : { kind: 'move', move: 'previous' };
    return { kind: 'open', active: 'last' };
  }
  if (!open) return IGNORE;
  if (key === 'Enter') return { kind: 'choose' };
  if (key === 'Escape') return { kind: 'close' };
  return IGNORE;
}

function openingActive(opening: ComboboxOpening, count: number): number | undefined {
  if (opening === 'none' || count === 0) return undefined;
  return opening === 'first' ? 0 : count - 1;
}

function movedActive(move: Move, active: number | undefined, count: number): number | undefined {
  return landOn(
    move,
    active ?? -1,
    Array.from({ length: count }, () => true),
  );
}

export { chosenOption, chosenText, comboboxKey, movedActive, openingActive, shownOptions };
export type { ComboboxKey, ComboboxOpening, ComboboxOption };
