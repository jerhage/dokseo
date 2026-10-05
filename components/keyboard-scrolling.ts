type KeyPress = {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
  readonly defaultPrevented: boolean;
  readonly target: unknown;
};

type KeySource = {
  addEventListener(type: 'keydown', listener: (press: KeyPress) => void): void;
  removeEventListener(type: 'keydown', listener: (press: KeyPress) => void): void;
};

type ScrollArea = {
  focus(options?: FocusOptions): void;
};

const SCROLL_KEYS: ReadonlySet<string> = new Set([
  ' ',
  'PageDown',
  'PageUp',
  'ArrowDown',
  'ArrowUp',
  'Home',
  'End',
]);

const QUIET_FOCUS: FocusOptions = { preventScroll: true, focusVisible: false };

function scrollsThePage(press: KeyPress, page: unknown): boolean {
  return (
    press.target === page &&
    !press.defaultPrevented &&
    !press.ctrlKey &&
    !press.altKey &&
    !press.metaKey &&
    SCROLL_KEYS.has(press.key)
  );
}

function forwardScrollKeys(source: KeySource, page: unknown, area: ScrollArea): () => void {
  function forward(press: KeyPress): void {
    if (scrollsThePage(press, page)) area.focus(QUIET_FOCUS);
  }
  source.addEventListener('keydown', forward);
  return () => source.removeEventListener('keydown', forward);
}

function keyboardScrolling(area: HTMLElement): () => void {
  return forwardScrollKeys(window, document.body, area);
}

export { QUIET_FOCUS, SCROLL_KEYS, forwardScrollKeys, keyboardScrolling, scrollsThePage };
export type { KeyPress, KeySource, ScrollArea };
