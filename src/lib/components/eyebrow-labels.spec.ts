import type { Component } from 'svelte';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Divider from './Divider.svelte';
import DropdownLabel from './DropdownLabel.svelte';
import Stat from './Stat.svelte';

function markup(component: unknown, props: Record<string, unknown>): string {
  return render(component as Component<Record<string, unknown>>, { props }).body.replaceAll(
    /<!--[^>]*-->/gu,
    '',
  );
}

const TEXT = createRawSnippet(() => ({ render: () => '<span>Inbox</span>' }));

describe('the component captions', () => {
  it('draws the stat label with the eyebrow utility', () => {
    expect(markup(Stat, { label: 'Used', value: '8 kB' })).toContain(
      '<span class="stat-label eyebrow">Used</span>',
    );
  });

  it('draws the dropdown label with the eyebrow utility', () => {
    expect(markup(DropdownLabel, { children: TEXT })).toBe(
      '<span role="presentation" class="dropdown-label eyebrow"><span>Inbox</span></span>',
    );
  });

  it('draws a labelled divider with the eyebrow utility and a plain rule without it', () => {
    expect(markup(Divider, { children: TEXT })).toContain(
      'class="divider divider-labeled eyebrow"',
    );
    expect(markup(Divider, {})).not.toContain('eyebrow');
  });
});
