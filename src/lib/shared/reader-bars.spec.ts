import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import ReaderBars from './ReaderBars.svelte';

const BARS = ReaderBars as unknown as Component<Record<string, unknown>>;

const EMPTY = createRawSnippet(() => ({ render: () => '<span></span>' }));

function barClasses(props: Record<string, unknown>): readonly string[] {
  const html = render(BARS, {
    props: { placement: 'stacked', startShown: true, header: EMPTY, footer: EMPTY, ...props },
  }).body;

  return [...html.matchAll(/<(?:header|footer)\s[^>]*class="([^"]*)"/gu)].map(
    (found) => found[1] ?? '',
  );
}

describe('ReaderBars', () => {
  it('pins both bars to the dark scheme by default', () => {
    const classes = barClasses({});

    expect(classes).toHaveLength(2);
    expect(classes.every((names) => names.split(' ').includes('scheme-dark'))).toBe(true);
  });

  it('leaves both bars in the page scheme when asked to', () => {
    const classes = barClasses({ scheme: 'page' });

    expect(classes).toHaveLength(2);
    expect(classes.some((names) => names.split(' ').includes('scheme-dark'))).toBe(false);
  });
});
