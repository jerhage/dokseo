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
  it('forwards a press carrying the command key', () => {
    expect(relaysToHost(pressing('k', { metaKey: true }))).toBe(true);
  });

  it('forwards a press carrying the control key', () => {
    expect(relaysToHost(pressing('k', { ctrlKey: true }))).toBe(true);
  });

  it('forwards Escape, which closes things and wears no modifier', () => {
    expect(relaysToHost(pressing('Escape'))).toBe(true);
  });

  it('keeps an ordinary letter where it was typed', () => {
    expect(relaysToHost(pressing('k'))).toBe(false);
    expect(relaysToHost(pressing('a'))).toBe(false);
    expect(relaysToHost(pressing('?'))).toBe(false);
  });

  it('keeps a shifted letter where it was typed, because shift selects text', () => {
    expect(relaysToHost(pressing('K'))).toBe(false);
    expect(relaysToHost(pressing('ArrowLeft'))).toBe(false);
  });

  it('keeps every key the reader turns pages with', () => {
    for (const key of TURNS_THE_PAGE) expect(relaysToHost(pressing(key))).toBe(false);
  });

  it('forwards those same keys once a modifier makes them a shortcut', () => {
    for (const key of TURNS_THE_PAGE) {
      expect(relaysToHost(pressing(key, { metaKey: true }))).toBe(true);
    }
  });

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
