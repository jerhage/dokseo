import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Button from './Button.svelte';

const LABEL = createRawSnippet(() => ({ render: () => '<span>Library</span>' }));

type Attributes = Record<string, unknown>;

const BUTTON = Button as unknown as Component<Attributes>;

function markup(props: Attributes): string {
  return render(BUTTON, { props: { ...props, children: LABEL } }).body;
}

function element(html: string): string {
  return /<(a|button)[\s>]/u.exec(html)?.[1] ?? '';
}

function attribute(html: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(html)?.[1] ?? null;
}

describe('Button', () => {
  it('renders a button of type button when given no href', () => {
    const html = markup({});

    expect(element(html)).toBe('button');
    expect(attribute(html, 'type')).toBe('button');
    expect(attribute(html, 'href')).toBeNull();
  });

  it('renders a link to the href, with no button type, when given an href', () => {
    const html = markup({ href: '/' });

    expect(element(html)).toBe('a');
    expect(attribute(html, 'href')).toBe('/');
    expect(attribute(html, 'type')).toBeNull();
    expect(html).toContain('<span>Library</span>');
  });

  it('gives a link the same classes as a button with the same variant, size and shape', () => {
    const looks = { variant: 'ghost', size: 'sm', pill: true, active: true, class: 'shrink-0' };

    const link = attribute(markup({ ...looks, href: '/' }), 'class');
    const button = attribute(markup(looks), 'class');

    expect(link).toBe('btn btn-ghost btn-sm btn-pill is-active shrink-0');
    expect(link).toBe(button);
  });

  it('marks a loading link busy, as it does a loading button', () => {
    const html = markup({ href: '/', loading: true });

    expect(attribute(html, 'aria-busy')).toBe('true');
    expect(attribute(html, 'class')?.split(' ')).toContain('btn-loading');
  });

  it('keeps the type a caller asks of a button', () => {
    expect(attribute(markup({ type: 'submit' }), 'type')).toBe('submit');
  });
});
