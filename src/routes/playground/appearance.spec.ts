import { describe, expect, it } from 'vitest';
import { applyAppearance, readAppearance } from './appearance';
import type { RootAttributes } from './appearance';

class FakeRoot implements RootAttributes {
  readonly attributes = new Map<string, string>();

  constructor(initial: Readonly<Record<string, string>> = {}) {
    for (const [name, value] of Object.entries(initial)) this.attributes.set(name, value);
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
}

describe('applyAppearance', () => {
  it('writes the chosen theme to data-theme', () => {
    const root = new FakeRoot({ 'data-theme': 'base' });

    applyAppearance(root, { theme: 'ember', colorScheme: 'automatic' });

    expect(root.attributes.get('data-theme')).toBe('ember');
  });

  it('pins a light or a dark scheme on data-color-scheme', () => {
    const light = new FakeRoot();
    const dark = new FakeRoot();

    applyAppearance(light, { theme: 'base', colorScheme: 'light' });
    applyAppearance(dark, { theme: 'base', colorScheme: 'dark' });

    expect([
      light.attributes.get('data-color-scheme'),
      dark.attributes.get('data-color-scheme'),
    ]).toEqual(['light', 'dark']);
  });

  it('removes a pinned scheme for automatic and writes no value in its place', () => {
    const root = new FakeRoot({ 'data-theme': 'base', 'data-color-scheme': 'dark' });

    applyAppearance(root, { theme: 'base', colorScheme: 'automatic' });

    expect(root.attributes.has('data-color-scheme')).toBe(false);
    expect([...root.attributes.keys()]).toEqual(['data-theme']);
  });
});

describe('readAppearance', () => {
  it('reads the theme and the pinned scheme the root carries', () => {
    const root = new FakeRoot({ 'data-theme': 'ember', 'data-color-scheme': 'light' });

    expect(readAppearance(root)).toEqual({ theme: 'ember', colorScheme: 'light' });
  });

  it('reports automatic when no scheme is pinned', () => {
    const root = new FakeRoot({ 'data-theme': 'base' });

    expect(readAppearance(root).colorScheme).toBe('automatic');
  });

  it('falls back to base and automatic for values it does not know', () => {
    const root = new FakeRoot({ 'data-theme': 'neon', 'data-color-scheme': 'auto' });

    expect(readAppearance(root)).toEqual({ theme: 'base', colorScheme: 'automatic' });
  });

  it('reads back what it applied', () => {
    const root = new FakeRoot();

    applyAppearance(root, { theme: 'ember', colorScheme: 'dark' });

    expect(readAppearance(root)).toEqual({ theme: 'ember', colorScheme: 'dark' });
  });
});
