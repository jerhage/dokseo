import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Drawer from './Drawer.svelte';

const DRAWER = Drawer as unknown as Component<Record<string, unknown>>;

function markup(props: Record<string, unknown>): string {
  return render(DRAWER, { props: { title: 'Filters', ...props } })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

function panelClass(html: string): string {
  return /<div class="(drawer[^"]*)"/u.exec(html)?.[1] ?? '';
}

describe('Drawer', () => {
  it('names the dialog by its title', () => {
    const html = markup({});
    const labelledBy = /aria-labelledby="([^"]+)"/u.exec(html)?.[1];

    expect(html).toContain(`<h2 class="drawer-title" id="${labelledBy}">Filters</h2>`);
  });

  it('opens from the end edge by default, and from the side it is given', () => {
    expect([
      panelClass(markup({})),
      panelClass(markup({ side: 'start' })),
      panelClass(markup({ side: 'bottom' })),
    ]).toEqual(['drawer', 'drawer drawer-start', 'drawer drawer-bottom']);
  });

  it('names the close button by its label, and leaves it out when told to', () => {
    expect(markup({ closeLabel: 'Done' })).toContain('class="drawer-close" aria-label="Done"');
    expect(markup({ closeButton: false })).not.toContain('drawer-close');
  });

  it('renders no footer unless one is given', () => {
    expect(markup({})).not.toContain('drawer-footer');
  });
});
