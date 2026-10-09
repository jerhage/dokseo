import { match } from 'ts-pattern';
import { isComposingKey } from './composing-key';
import type { ComposingSignals } from './composing-key';

type HeaderSearch = {
  readonly placeholder: string;
  readonly disabled: boolean;
  readonly value: string;
  readonly oninput: (value: string) => void;
  readonly onsubmit: (value: string) => void;
};

type HeaderFieldKey = 'submit' | 'clear' | 'ignore';

type HeaderFieldPress = ComposingSignals & { readonly key: string };

type HeaderFieldEvent = HeaderFieldPress & { readonly preventDefault: () => void };

function headerFieldKey(press: HeaderFieldPress, value: string): HeaderFieldKey {
  if (isComposingKey(press)) return 'ignore';
  if (press.key === 'Enter') return 'submit';
  return press.key === 'Escape' && value.length > 0 ? 'clear' : 'ignore';
}

function pressHeaderField(event: HeaderFieldEvent, header: HeaderSearch): void {
  match(headerFieldKey(event, header.value))
    .with('submit', () => {
      event.preventDefault();
      header.onsubmit(header.value);
    })
    .with('clear', () => {
      event.preventDefault();
      header.oninput('');
    })
    .with('ignore', () => {})
    .exhaustive();
}

export { headerFieldKey, pressHeaderField };
export type { HeaderFieldEvent, HeaderFieldKey, HeaderFieldPress, HeaderSearch };
