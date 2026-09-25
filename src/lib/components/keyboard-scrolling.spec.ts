import { describe, expect, it } from 'vitest';
import { QUIET_FOCUS, SCROLL_KEYS, forwardScrollKeys, scrollsThePage } from './keyboard-scrolling';
import type { KeyPress, KeySource } from './keyboard-scrolling';

const PAGE = { name: 'body' };

function press(overrides: Partial<KeyPress> = {}): KeyPress {
  return {
    key: 'PageDown',
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    defaultPrevented: false,
    target: PAGE,
    ...overrides,
  };
}

function fakeSource(): KeySource & { fire(press: KeyPress): void; listeners: number } {
  const listeners = new Set<(press: KeyPress) => void>();
  return {
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
    fire: (event) => {
      for (const listener of listeners) listener(event);
    },
    get listeners() {
      return listeners.size;
    },
  };
}

describe('scrollsThePage', () => {
  it('accepts every key the browser scrolls a page with', () => {
    const keys = [' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'];

    for (const key of keys) expect(scrollsThePage(press({ key }), PAGE)).toBe(true);
    expect([...SCROLL_KEYS].toSorted()).toEqual(keys.toSorted());
  });

  it('accepts shift, which turns space into a scroll upwards', () => {
    const shifted = { ...press({ key: ' ' }), shiftKey: true };
    expect(scrollsThePage(shifted, PAGE)).toBe(true);
  });

  it('ignores a key that does not scroll, so Tab still starts at the header', () => {
    expect(scrollsThePage(press({ key: 'Tab' }), PAGE)).toBe(false);
    expect(scrollsThePage(press({ key: 'k' }), PAGE)).toBe(false);
  });

  it('ignores a key pressed on a control, which owns its own keys', () => {
    expect(scrollsThePage(press({ target: { name: 'input' } }), PAGE)).toBe(false);
  });

  it('ignores a key another handler has already taken', () => {
    expect(scrollsThePage(press({ defaultPrevented: true }), PAGE)).toBe(false);
  });

  it('ignores a key held with ctrl, alt or meta', () => {
    expect(scrollsThePage(press({ ctrlKey: true }), PAGE)).toBe(false);
    expect(scrollsThePage(press({ altKey: true }), PAGE)).toBe(false);
    expect(scrollsThePage(press({ metaKey: true }), PAGE)).toBe(false);
  });
});

describe('forwardScrollKeys', () => {
  it('focuses the scroll area quietly when a scrolling key reaches the page', () => {
    const source = fakeSource();
    const focused: (FocusOptions | undefined)[] = [];
    forwardScrollKeys(source, PAGE, { focus: (options) => void focused.push(options) });

    source.fire(press({ key: 'Tab' }));
    source.fire(press({ key: ' ' }));

    expect(focused).toEqual([QUIET_FOCUS]);
    expect(QUIET_FOCUS).toEqual({ preventScroll: true, focusVisible: false });
  });

  it('stops listening once released', () => {
    const source = fakeSource();
    let focused = 0;
    const release = forwardScrollKeys(source, PAGE, { focus: () => void (focused += 1) });

    release();
    source.fire(press());

    expect(source.listeners).toBe(0);
    expect(focused).toBe(0);
  });
});
