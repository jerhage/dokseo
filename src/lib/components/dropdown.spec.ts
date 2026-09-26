import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Dropdown from './Dropdown.svelte';
import DropdownItem from './DropdownItem.svelte';
import { MENU } from './menu';

type Attributes = Record<string, unknown>;

const ITEM = DropdownItem as unknown as Component<Attributes>;
const DROPDOWN = Dropdown as unknown as Component<Attributes>;

const LABEL = createRawSnippet(() => ({ render: () => '<span>Tags</span>' }));
const NOTHING = createRawSnippet(() => ({ render: () => '<span></span>' }));

function item(props: Attributes): string {
  return render(ITEM, {
    props: { ...props, children: LABEL },
    context: new Map([[MENU, { close: () => {} }]]),
  }).body;
}

function dropdown(props: Attributes): string {
  return render(DROPDOWN, { props: { ...props, trigger: NOTHING, children: NOTHING } }).body;
}

function tag(html: string): string {
  return /<(a|button)\s[^>]*>/u.exec(html)?.[0] ?? '';
}

function attribute(html: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(tag(html))?.[1] ?? null;
}

describe('DropdownItem', () => {
  it('renders a menu item button when given no href', () => {
    const html = item({});

    expect(tag(html)).toMatch(/^<button\s/u);
    expect(attribute(html, 'role')).toBe('menuitem');
    expect(attribute(html, 'href')).toBeNull();
  });

  it('renders a menu item link to the href, with no button type or checked state', () => {
    const html = item({ href: '/tags' });

    expect(tag(html)).toMatch(/^<a\s/u);
    expect(attribute(html, 'role')).toBe('menuitem');
    expect(attribute(html, 'href')).toBe('/tags');
    expect(attribute(html, 'type')).toBeNull();
    expect(attribute(html, 'aria-checked')).toBeNull();
    expect(attribute(html, 'tabindex')).toBe('-1');
    expect(html).toContain('<span>Tags</span>');
  });

  it('marks only a current link as the current page and shows it selected', () => {
    const current = item({ href: '/', current: true });
    const other = item({ href: '/tags' });

    expect(attribute(current, 'aria-current')).toBe('page');
    expect(attribute(current, 'class')?.split(' ')).toContain('is-selected');
    expect(attribute(other, 'aria-current')).toBeNull();
    expect(attribute(other, 'class')?.split(' ')).not.toContain('is-selected');
  });
});

describe('Dropdown', () => {
  it('draws the chevron on its trigger by default and leaves it out when asked', () => {
    expect(dropdown({})).toContain('dropdown-icon');
    expect(dropdown({ chevron: false })).not.toContain('dropdown-icon');
  });

  it('makes a square trigger only when asked', () => {
    expect(dropdown({ square: true })).toMatch(/class="[^"]*dropdown-trigger[^"]*btn-square/u);
    expect(dropdown({})).not.toContain('btn-square');
  });
});
