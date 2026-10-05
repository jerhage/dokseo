import { match } from 'ts-pattern';

type Move = 'next' | 'previous' | 'first' | 'last';

type TextDirection = 'ltr' | 'rtl';

const TAB_KEYS: Readonly<Record<TextDirection, Readonly<Record<string, Move>>>> = {
  ltr: {
    ArrowRight: 'next',
    ArrowLeft: 'previous',
    Home: 'first',
    End: 'last',
  },
  rtl: {
    ArrowRight: 'previous',
    ArrowLeft: 'next',
    Home: 'first',
    End: 'last',
  },
};

const MENU_KEYS: Readonly<Record<string, Move>> = {
  ArrowDown: 'next',
  ArrowUp: 'previous',
  Home: 'first',
  End: 'last',
};

function textDirection(computed: string): TextDirection {
  return computed === 'rtl' ? 'rtl' : 'ltr';
}

function tabMove(key: string, direction: TextDirection): Move | undefined {
  const keys = TAB_KEYS[direction];
  return Object.hasOwn(keys, key) ? keys[key] : undefined;
}

function menuMove(key: string): Move | undefined {
  return Object.hasOwn(MENU_KEYS, key) ? MENU_KEYS[key] : undefined;
}

function landOn(move: Move, current: number, enabled: readonly boolean[]): number | undefined {
  const usable = enabled.flatMap((on, index) => (on ? [index] : []));
  const first = usable[0];
  const last = usable.at(-1);
  if (first === undefined || last === undefined) return undefined;
  return match(move)
    .with('first', () => first)
    .with('last', () => last)
    .with('next', () => usable.find((index) => index > current) ?? first)
    .with('previous', () => usable.findLast((index) => index < current) ?? last)
    .exhaustive();
}

export { landOn, menuMove, tabMove, textDirection };
export type { Move, TextDirection };
