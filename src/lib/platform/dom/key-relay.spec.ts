import { describe, expect, it } from 'vitest';
import { markRelayed, relaysToHost, wasRelayed } from './key-relay';
import type { RelayPress } from './key-relay';

function pressing(key: string, held: Partial<Omit<RelayPress, 'key'>> = {}): RelayPress {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    defaultPrevented: false,
    relayed: false,
    ...held,
  };
}

const TURNS_THE_PAGE: readonly string[] = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'PageUp',
  'PageDown',
  ' ',
];

describe('relaysToHost', () => {
  it.each([
    { key: 'k', held: { metaKey: true } },
    { key: 'k', held: { ctrlKey: true } },
    ...TURNS_THE_PAGE.map((key) => ({ key, held: { metaKey: true } })),
  ])('forwards $key once a modifier makes it a shortcut', ({ key, held }) => {
    expect(relaysToHost(pressing(key, held))).toBe(true);
  });

  it('forwards Escape, which closes things and wears no modifier', () => {
    expect(relaysToHost(pressing('Escape'))).toBe(true);
  });

  it.each(['k', 'a', '?', 'K', ...TURNS_THE_PAGE])(
    'keeps an unmodified %j where it was typed',
    (key) => {
      expect(relaysToHost(pressing(key))).toBe(false);
    },
  );

  it('keeps a press the frame has already consumed', () => {
    expect(relaysToHost(pressing('k', { metaKey: true, defaultPrevented: true }))).toBe(false);
  });

  it('keeps an Escape the frame has already consumed', () => {
    expect(relaysToHost(pressing('Escape', { defaultPrevented: true }))).toBe(false);
  });

  it('refuses a press it has already forwarded once', () => {
    expect(relaysToHost(pressing('k', { metaKey: true, relayed: true }))).toBe(false);
    expect(relaysToHost(pressing('Escape', { relayed: true }))).toBe(false);
  });
});

describe('the mark a relayed press carries', () => {
  it('remembers an event it sent', () => {
    const copy = {};

    markRelayed(copy);

    expect(wasRelayed(copy)).toBe(true);
  });

  it('reports an event it never sent as none of its own', () => {
    markRelayed({});

    expect(wasRelayed({})).toBe(false);
  });
});
