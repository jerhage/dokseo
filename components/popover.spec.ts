import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Popover from './Popover.svelte';

type Attributes = Record<string, unknown>;

type TriggerProps = { popovertarget: string; 'aria-haspopup': string };

const POPOVER = Popover as unknown as Component<Attributes>;

const TRIGGER = createRawSnippet((props: () => TriggerProps) => ({
  render: () =>
    `<button popovertarget="${props().popovertarget}" aria-haspopup="${props()['aria-haspopup']}">i</button>`,
}));

const BODY = createRawSnippet(() => ({ render: () => '<p>Details</p>' }));

function markup(props: Attributes): string {
  return render(POPOVER, { props: { label: 'About', trigger: TRIGGER, children: BODY, ...props } })
    .body;
}

function sheet(html: string): string {
  return /<div\s[^>]*>/u.exec(html)?.[0] ?? '';
}

function attribute(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}="([^"]*)"`, 'u').exec(tag)?.[1] ?? null;
}

describe('Popover', () => {
  it('points the trigger at the popover it renders', () => {
    const html = markup({});
    const button = /<button\s[^>]*>/u.exec(html)?.[0] ?? '';

    expect(attribute(button, 'popovertarget')).toBe(attribute(sheet(html), 'id'));
    expect(attribute(button, 'aria-haspopup')).toBe('dialog');
  });

  it('renders an auto popover dialog named by its label', () => {
    const tag = sheet(markup({ label: 'Engine for new captures' }));

    expect(attribute(tag, 'popover')).toBe('auto');
    expect(attribute(tag, 'role')).toBe('dialog');
    expect(attribute(tag, 'aria-label')).toBe('Engine for new captures');
  });

  it('adds the caller class after its own', () => {
    expect(attribute(sheet(markup({ class: 'p-2' })), 'class')).toBe('popover p-2');
  });
});
