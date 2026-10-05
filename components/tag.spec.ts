import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Tag from './Tag.svelte';

const TAG = Tag as unknown as Component<Record<string, unknown>>;

const NAME = createRawSnippet(() => ({ render: () => '<span>beta</span>' }));

function markup(props: Record<string, unknown>): string {
  return render(TAG, { props: { children: NAME, ...props } })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

describe('Tag', () => {
  it('renders a span with no href', () => {
    expect(markup({ color: 'sky' })).toBe(
      '<span class="tag tag-color-sky"><span>beta</span></span>',
    );
  });

  it('renders a link to the href, keeping its colour and the caller class', () => {
    expect(markup({ href: '/tags?tag=beta', color: 'sky', class: 'min-w-0' })).toBe(
      '<a href="/tags?tag=beta" class="tag tag-color-sky min-w-0"><span>beta</span></a>',
    );
  });

  it('follows the name with a labelled remove button when removable', () => {
    expect(markup({ onremove: () => {}, removeLabel: 'Remove beta' })).toMatch(
      /^<span class="tag"><span>beta<\/span><button type="button" class="tag-remove" aria-label="Remove beta">/u,
    );
  });
});
