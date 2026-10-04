import { match } from 'ts-pattern';

type PagingHandler = 'every-key' | 'skips-buttons' | 'per-key';

type PagingFocus = 'reading-area' | 'next-button' | 'contents-button' | 'text-field';

type PagingKey = ' ' | 'ArrowRight' | 'ArrowLeft';

type HandlerAnswer =
  | { readonly kind: 'turn'; readonly by: 1 | -1; readonly cancels: boolean }
  | { readonly kind: 'leave' };

type BrowserDefault = 'presses-the-button' | 'types' | 'scrolls' | 'nothing';

type PagingOutcome = {
  readonly answer: HandlerAnswer;
  readonly browser: BrowserDefault;
  readonly pages: number;
};

const PAGING_HANDLERS: readonly PagingHandler[] = ['every-key', 'skips-buttons', 'per-key'];

const PAGING_KEYS: readonly PagingKey[] = [' ', 'ArrowRight', 'ArrowLeft'];

const PAGING_FOCUSES: readonly PagingFocus[] = [
  'reading-area',
  'next-button',
  'contents-button',
  'text-field',
];

const LEAVE: HandlerAnswer = { kind: 'leave' };

function isPagingFocus(value: unknown): value is PagingFocus {
  return PAGING_FOCUSES.some((focus) => focus === value);
}

function isPagingKey(key: string): key is PagingKey {
  return PAGING_KEYS.some((paging) => paging === key);
}

function keyStep(key: PagingKey): 1 | -1 {
  return key === 'ArrowLeft' ? -1 : 1;
}

function isButton(focus: PagingFocus): boolean {
  return focus === 'next-button' || focus === 'contents-button';
}

function handlerAnswer(handler: PagingHandler, key: PagingKey, focus: PagingFocus): HandlerAnswer {
  const turn: HandlerAnswer = { kind: 'turn', by: keyStep(key), cancels: true };
  return match(handler)
    .with('every-key', (): HandlerAnswer => ({
      kind: 'turn',
      by: keyStep(key),
      cancels: false,
    }))
    .with('skips-buttons', () => (isButton(focus) || focus === 'text-field' ? LEAVE : turn))
    .with('per-key', () => {
      if (focus === 'text-field') return LEAVE;
      if (key === ' ' && isButton(focus)) return LEAVE;
      return turn;
    })
    .exhaustive();
}

function browserDefault(key: PagingKey, focus: PagingFocus): BrowserDefault {
  if (focus === 'text-field') return 'types';
  if (key !== ' ') return 'nothing';
  return isButton(focus) ? 'presses-the-button' : 'scrolls';
}

function pagingOutcome(handler: PagingHandler, key: PagingKey, focus: PagingFocus): PagingOutcome {
  const answer = handlerAnswer(handler, key, focus);
  const cancelled = answer.kind === 'turn' && answer.cancels;
  const browser = cancelled ? 'nothing' : browserDefault(key, focus);
  const fromHandler = answer.kind === 'turn' ? answer.by : 0;
  const fromButton = browser === 'presses-the-button' && focus === 'next-button' ? 1 : 0;
  return { answer, browser, pages: fromHandler + fromButton };
}

export {
  PAGING_HANDLERS,
  PAGING_KEYS,
  browserDefault,
  handlerAnswer,
  isPagingFocus,
  isPagingKey,
  pagingOutcome,
};
export type { BrowserDefault, HandlerAnswer, PagingFocus, PagingHandler, PagingKey, PagingOutcome };
