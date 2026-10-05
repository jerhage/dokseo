import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import IconButton from './IconButton.svelte';
import Pencil from './icons/Pencil.svelte';

const ICON_BUTTON = IconButton as unknown as Component<Record<string, unknown>>;

const GLYPH = createRawSnippet(() => ({ render: () => '<span aria-hidden="true">i</span>' }));

function markup(props: Record<string, unknown>): string {
  return render(ICON_BUTTON, { props: { label: 'Write a note', ...props } })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

function opening(html: string): string {
  return /^<[^>]*>/u.exec(html)?.[0] ?? '';
}

describe('IconButton', () => {
  it('draws a square button with the icon, names it by hidden text and repeats the name as its tooltip', () => {
    const html = markup({ icon: Pencil, size: 'sm' });

    expect(opening(html)).toBe(
      '<button title="Write a note" type="button" class="btn btn-sm btn-square">',
    );
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*class="lucide lucide-pencil btn-icon"/u);
    expect(html).toMatch(/<\/svg><span class="visually-hidden">Write a note<\/span><\/button>$/u);
    expect(html).not.toContain('aria-label');
  });

  it('shows the tooltip the caller wrote, or none when it is turned off', () => {
    expect(opening(markup({ icon: Pencil, tooltip: 'Notes' }))).toContain('title="Notes"');
    expect(opening(markup({ icon: Pencil, tooltip: false }))).not.toContain('title=');
  });

  it('renders a caller glyph in place of an icon, before the hidden name', () => {
    expect(markup({ children: GLYPH, tooltip: false })).toBe(
      '<button type="button" class="btn btn-square"><span aria-hidden="true">i</span><span class="visually-hidden">Write a note</span></button>',
    );
  });

  it('renders a link with the looks and attributes it passes through', () => {
    const html = markup({
      icon: Pencil,
      href: '/',
      variant: 'ghost',
      pill: true,
      active: true,
      class: 'shrink-0',
      'aria-current': 'page',
    });

    expect(opening(html)).toBe(
      '<a href="/" aria-current="page" title="Write a note" class="btn btn-ghost btn-square btn-pill is-active shrink-0">',
    );
  });

  it('passes a pressed state and drops the square shape on request', () => {
    const html = opening(markup({ icon: Pencil, 'aria-pressed': true, square: false }));

    expect(html).toContain('aria-pressed="true"');
    expect(html).not.toContain('btn-square');
  });
});
