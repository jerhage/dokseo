import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Breadcrumb from './Breadcrumb.svelte';

type Crumbs = Parameters<typeof Breadcrumb>[1]['items'];

function markup(items: Crumbs): string {
  const component: Component<{ items: Crumbs }> = Breadcrumb;
  return render(component, { props: { items } }).body;
}

const select = () => undefined;

describe('Breadcrumb', () => {
  it('renders an earlier crumb with onselect as a button', () => {
    const html = markup([{ label: 'Feeds', onselect: select }, { label: 'Tech' }]);

    expect(html).toContain('<button type="button">Feeds</button>');
    expect(html).toContain('<span aria-current="page">Tech</span>');
  });

  it('prefers href over onselect', () => {
    const html = markup([{ label: 'Feeds', href: '/feeds', onselect: select }, { label: 'Tech' }]);

    expect(html).toContain('<a href="/feeds">Feeds</a>');
    expect(html).not.toContain('<button');
  });

  it('keeps the last crumb the current page even with onselect', () => {
    const html = markup([{ label: 'Feeds' }, { label: 'Tech', onselect: select }]);

    expect(html).toContain('<span aria-current="page">Tech</span>');
    expect(html).not.toContain('<button');
  });

  it('renders an earlier crumb with neither as plain text', () => {
    const html = markup([{ label: 'Feeds' }, { label: 'Tech' }]);

    expect(html).toContain('<span>Feeds</span>');
  });
});
