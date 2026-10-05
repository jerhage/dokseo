import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Highlight from './Highlight.svelte';

const HIGHLIGHT = Highlight as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(HIGHLIGHT, { props }).body.replaceAll(/<!--[^>]*-->/gu, '');
}

describe('Highlight', () => {
  it('marks the matched segments and leaves the rest as plain text, with no space added', () => {
    const html = markup({
      segments: [
        { text: 'the ', matched: false },
        { text: 'kraken', matched: true },
        { text: ' wakes', matched: false },
      ],
    });

    expect(html).toBe('the <mark>kraken</mark> wakes');
  });

  it('renders nothing for no segments', () => {
    expect(markup({ segments: [] })).toBe('');
  });
});
