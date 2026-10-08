import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Card from './Card.svelte';

const CARD = Card as unknown as Component<Record<string, unknown>>;

const text = (content: string) =>
  createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));

const SLOTS = {
  media: text('cover'),
  eyebrow: text('eyebrow'),
  title: text('title'),
  description: text('description'),
  footer: text('footer'),
};

function markup(props: Record<string, unknown>): string {
  return render(CARD, { props })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

const choose = () => undefined;

describe('Card', () => {
  it('renders an article with no href and no onclick', () => {
    const html = markup({ title: SLOTS.title });

    expect(html).toMatch(/^<article class="card">/u);
    expect(html).not.toContain('card-interactive');
  });

  it('renders a link with href', () => {
    const html = markup({ href: '/guide', title: SLOTS.title });

    expect(html).toMatch(/^<a href="\/guide" class="card card-interactive">/u);
  });

  it('renders a button of type button with onclick', () => {
    const html = markup({ onclick: choose, title: SLOTS.title });

    expect(html).toMatch(/^<button type="button" class="card card-interactive">/u);
    expect(html).not.toContain('href');
  });

  it('prefers href over onclick', () => {
    const html = markup({ href: '/guide', onclick: choose, title: SLOTS.title });

    expect(html).toMatch(/^<a href="\/guide" class="card card-interactive">/u);
    expect(html).not.toContain('<button');
  });

  it('passes attributes through to the button', () => {
    const html = markup({ onclick: choose, 'aria-pressed': 'true', 'aria-label': 'Pick' });

    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-label="Pick"');
  });

  it('renders the button form with phrasing content only', () => {
    const html = markup({ onclick: choose, heading: 'h2', ...SLOTS });

    expect(html).toContain('<span class="card-media');
    expect(html).toContain('<span class="card-body">');
    expect(html).toContain('<span class="card-title">');
    expect(html).toContain('<span class="card-description">');
    expect(html).toContain('<span class="card-footer">');
    expect(html).not.toMatch(/<(div|p|h[1-6])[\s>]/u);
  });

  it('keeps the block elements in the article and link forms', () => {
    const html = markup({ heading: 'h2', ...SLOTS });

    expect(html).toContain('<div class="card-body">');
    expect(html).toContain('<h2 class="card-title">');
    expect(html).toContain('<p class="card-description">');
    expect(html).toContain('<div class="card-footer">');
  });
});
