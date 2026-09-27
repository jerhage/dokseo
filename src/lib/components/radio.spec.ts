import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { RADIO_VARIANTS } from './classes';
import Radio from './Radio.svelte';

const RADIO = Radio as unknown as Component<Record<string, unknown>>;

const LABEL = createRawSnippet(() => ({ render: () => '<span>Small</span>' }));

function markup(props: Record<string, unknown>): string {
  return render(RADIO, { props: { name: 'size', value: 'small', ...props } })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

describe('RADIO_VARIANTS', () => {
  it('adds the tile class only to the tile', () => {
    expect(RADIO_VARIANTS).toEqual({ default: [], tile: ['radio-tile'] });
  });
});

describe('Radio', () => {
  it('wraps the input and its label in a plain wrapper by default', () => {
    expect(markup({ children: LABEL })).toMatch(
      /^<label class="radio-wrapper"><input [^>]*class="radio-input"[^>]*\/?><span class="radio-label"><span>Small<\/span><\/span><\/label>$/u,
    );
  });

  it('draws the whole wrapper as a tile, the caller class after it', () => {
    expect(markup({ children: LABEL, variant: 'tile', class: 'bordered' })).toMatch(
      /^<label class="radio-wrapper radio-tile bordered">/u,
    );
  });

  it('renders the input alone, with the caller class, when something else names it', () => {
    const html = markup({ 'aria-labelledby': 'engine', class: 'shrink-0' });

    expect(html).toMatch(/^<input [^>]*\/?>$/u);
    expect(html).toContain('aria-labelledby="engine"');
    expect(html).toContain('class="radio-input shrink-0"');
    expect(html).toContain('type="radio"');
  });
});
