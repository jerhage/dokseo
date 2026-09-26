import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Badge from './Badge.svelte';

const LABEL = createRawSnippet(() => ({ render: () => '<span>verb</span>' }));

type Attributes = Record<string, unknown>;

const BADGE = Badge as unknown as Component<Attributes>;

function classes(props: Attributes): readonly string[] {
  const html = render(BADGE, { props: { ...props, children: LABEL } }).body;
  return (/class="([^"]*)"/u.exec(html)?.[1] ?? '').split(/\s+/u);
}

describe('Badge', () => {
  it('draws the quiet variant only when asked, beside the colour and the dot', () => {
    expect(classes({ colour: 'rose', dot: true, quiet: true })).toEqual(
      expect.arrayContaining(['badge', 'badge-color-rose', 'badge-dot', 'badge-quiet']),
    );
    expect(classes({ colour: 'rose' })).not.toContain('badge-quiet');
  });
});
