import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { KEY_HINTS_SIZES, KEY_HINTS_VARIANTS, hintText } from './key-hints';
import KeyHints from './KeyHints.svelte';

const HINTS_COMPONENT = KeyHints as unknown as Component<Record<string, unknown>>;

const HINTS = [
  { keys: ['Esc'], does: 'cancels' },
  { keys: ['⌘/Ctrl', 'Enter'], does: 'saves' },
];

function markup(props: Record<string, unknown>): string {
  return render(HINTS_COMPONENT, { props: { hints: HINTS, ...props } }).body.replaceAll(
    /<!--[^>]*-->/gu,
    '',
  );
}

describe('hintText', () => {
  it('writes nothing for no hints', () => {
    expect(hintText([])).toBe('');
  });
});

describe('KEY_HINTS_VARIANTS and KEY_HINTS_SIZES', () => {
  it('lays out the chips variant only, and shrinks the keys in the small size only', () => {
    expect(KEY_HINTS_VARIANTS).toEqual({ chips: ['key-hints-chips'], inline: [], text: [] });
    expect(KEY_HINTS_SIZES).toEqual({ sm: ['key-hints-sm'], md: [] });
  });
});

describe('KeyHints', () => {
  it('draws each key as a kbd, joins a chord with a plus, and follows it with what it does', () => {
    const html = markup({}).replaceAll(/>\s+</gu, '><');

    expect(html).toContain(
      '<span class="key-hints-item"><kbd>Esc</kbd><span class="key-hints-description">cancels</span></span>',
    );
    expect(html).toContain(
      '<span class="key-hints-item"><kbd>⌘/Ctrl</kbd><span class="key-hints-joiner">+</span><kbd>Enter</kbd><span class="key-hints-description">saves</span></span>',
    );
  });

  it('renders a paragraph with the chips class by default', () => {
    expect(markup({})).toMatch(/^<p class="key-hints key-hints-chips">/u);
  });

  it('writes the text variant as one line of text with no kbd', () => {
    const html = markup({ variant: 'text', element: 'span', class: 'flex-fill' });

    expect(html).toBe(
      '<span class="key-hints flex-fill">Esc cancels · ⌘/Ctrl + Enter saves</span>',
    );
  });

  it('writes the inline variant as running text with each key in a kbd and no wrapper', () => {
    const html = markup({ variant: 'inline', element: 'span', class: 'text-faint' });

    expect(html).toBe(
      '<span class="key-hints text-faint"><kbd>Esc</kbd> cancels · <kbd>⌘/Ctrl</kbd> + <kbd>Enter</kbd> saves</span>',
    );
  });

  it('renders the element it is given, in the small size', () => {
    expect(markup({ element: 'footer', size: 'sm' })).toMatch(
      /^<footer class="key-hints key-hints-chips key-hints-sm">/u,
    );
  });

  it('hides a decorative line from assistive technology and leaves a readable one exposed', () => {
    expect(markup({ decorative: true })).toMatch(/^<p aria-hidden="true"/u);
    expect(markup({})).not.toContain('aria-hidden');
  });
});
