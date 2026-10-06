import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Tooltip from './Tooltip.svelte';

type Attributes = Record<string, unknown>;

const TOOLTIP = Tooltip as unknown as Component<Attributes>;

const TRIGGER = createRawSnippet((props: () => { 'aria-describedby': string }) => ({
  render: () => `<button aria-describedby="${props()['aria-describedby']}">Save</button>`,
}));

function markup(props: Attributes): string {
  return render(TOOLTIP, { props: { text: 'Save the changes', trigger: TRIGGER, ...props } }).body;
}

function attribute(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(tag)?.[1] ?? null;
}

describe('Tooltip', () => {
  it('describes its trigger by the tooltip it renders', () => {
    const html = markup({});
    const button = /<button\s[^>]*>/u.exec(html)?.[0] ?? '';
    const hint = /<span\s[^>]*>/u.exec(html)?.[0] ?? '';

    expect(attribute(button, 'aria-describedby')).toBe(attribute(hint, 'id'));
    expect(attribute(hint, 'role')).toBe('tooltip');
    expect(attribute(hint, 'popover')).toBe('hint');
  });

  it('renders no place until a script has shown the tooltip', () => {
    expect(markup({})).not.toContain('--tooltip-top');
  });

  it('adds the caller class after its own', () => {
    const hint = /<span\s[^>]*>/u.exec(markup({ class: 'text-sm' }))?.[0] ?? '';

    expect(attribute(hint, 'class')).toBe('tooltip text-sm');
  });
});
