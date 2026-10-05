import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { CHROME_BAR_EDGES } from './chrome-bar';
import ChromeBar from './ChromeBar.svelte';

const CHROME_BAR = ChromeBar as unknown as Component<Record<string, unknown>>;

const TITLE = createRawSnippet(() => ({ render: () => '<h1>Title</h1>' }));

function markup(props: Record<string, unknown>): string {
  return render(CHROME_BAR, { props: { children: TITLE, ...props } }).body.replaceAll(
    /<!--[^>]*-->/gu,
    '',
  );
}

describe('CHROME_BAR_EDGES', () => {
  it('draws a top bar as a header and a bottom bar as a footer', () => {
    expect(CHROME_BAR_EDGES).toEqual({
      top: { element: 'header', classes: ['chrome-bar-top'] },
      bottom: { element: 'footer', classes: ['chrome-bar-bottom'] },
    });
  });
});

describe('ChromeBar', () => {
  it('renders a shown top bar as a hushable header that takes focus and holds its content', () => {
    const html = markup({ edge: 'top', shown: true });

    expect(html).toMatch(/^<header class="chrome-bar chrome-bar-top hushable"/u);
    expect(html).not.toContain('is-hushed');
    expect(html).not.toContain('inert');
    expect(html).toContain('<h1>Title</h1>');
  });

  it('hushes a hidden bar and makes it inert in the same render', () => {
    const html = markup({ edge: 'bottom', shown: false, class: 'extra' });

    expect(html).toMatch(
      /^<footer class="chrome-bar chrome-bar-bottom hushable is-hushed extra"[^>]* inert/u,
    );
  });
});
