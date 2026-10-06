import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { iconButtonTip } from './icon-button';
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

  it('renders the library tooltip as the next sibling in place of a title when asked for a hint', () => {
    const html = markup({ icon: Pencil, hint: true });

    expect(opening(html)).toBe('<button type="button" class="btn btn-square">');
    expect(html).toMatch(
      /<\/button><span id="[^"]+" popover="hint" role="tooltip" class="tooltip">Write a note<\/span>$/u,
    );
    expect(html).not.toContain('aria-describedby');
  });

  it('describes the button by its hint only when the hint text differs from the label', () => {
    const html = markup({ icon: Pencil, hint: true, tooltip: 'Notes' });
    const hintId = /<span id="([^"]+)" popover="hint"/u.exec(html)?.[1];

    expect(hintId).toBeDefined();
    expect(opening(html)).toContain(`aria-describedby="${hintId}"`);
    expect(opening(html)).not.toContain('title=');
  });

  it('renders neither a title nor a hint when the tooltip is turned off', () => {
    const html = markup({ icon: Pencil, hint: true, tooltip: false });

    expect(html).not.toContain('tooltip');
    expect(opening(html)).not.toContain('title=');
  });
});

describe('iconButtonTip', () => {
  it('shows the label, or the tooltip text, as a native title by default', () => {
    expect(iconButtonTip('Search', undefined, false)).toEqual({ kind: 'title', text: 'Search' });
    expect(iconButtonTip('Search', 'Find', false)).toEqual({ kind: 'title', text: 'Find' });
  });

  it('shows no tooltip when it is turned off, whatever its form', () => {
    expect(iconButtonTip('Search', false, false)).toEqual({ kind: 'none' });
    expect(iconButtonTip('Search', false, true)).toEqual({ kind: 'none' });
  });

  it('describes the button by a hint only when its text differs from the label', () => {
    expect(iconButtonTip('Search', undefined, true)).toEqual({
      kind: 'hint',
      text: 'Search',
      describes: false,
    });
    expect(iconButtonTip('Search', 'Search', true)).toEqual({
      kind: 'hint',
      text: 'Search',
      describes: false,
    });
    expect(iconButtonTip('Search', 'Search the library', true)).toEqual({
      kind: 'hint',
      text: 'Search the library',
      describes: true,
    });
  });
});
