import { readFileSync } from 'node:fs';
import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import AccordionItem from '$lib/ui/components/AccordionItem.svelte';
import Badge from '$lib/ui/components/Badge.svelte';
import Button from '$lib/ui/components/Button.svelte';
import Popover from '$lib/ui/components/Popover.svelte';
import CaseHost from '$lib/ui/contract/CaseHost.svelte';
import { CASES } from '$lib/ui/contract/cases';
import { compareMarkup } from '$lib/ui/core/contract/compare.js';
import { normalizedMarkup } from '../../../domain/markup-contract';
import {
  ACCORDION_RENDER,
  BADGE_RENDER,
  BUTTON_RENDER,
  CONTRACT_FAILURE,
  CORE_MISMATCH,
  POPOVER_RENDER,
} from './core-runs';

type Attributes = Record<string, unknown>;

function text(content: string) {
  return createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));
}

function body(component: unknown, props: Attributes): string {
  return render(component as Component<Attributes>, { props }).body;
}

const TRIGGER = createRawSnippet((props: () => { popovertarget: string }) => ({
  render: () => `<button popovertarget="${props().popovertarget}">i</button>`,
}));

describe('the recorded server renders of the Kandan core plan', () => {
  it('reproduces the Button render exactly', () => {
    expect(body(Button, { variant: 'primary', size: 'sm', children: text('Save') })).toBe(
      BUTTON_RENDER.code,
    );
  });

  it('reproduces the Badge render exactly', () => {
    expect(body(Badge, { variant: 'success', children: text('Read') })).toBe(BADGE_RENDER.code);
  });

  it('reproduces the AccordionItem render exactly', () => {
    expect(body(AccordionItem, { title: 'Details', children: text('Body') })).toBe(
      ACCORDION_RENDER.code,
    );
  });

  it('reproduces the same Popover ids on two separate renders', () => {
    const props = { label: 'About', trigger: TRIGGER, children: text('Details') };

    expect(body(Popover, props)).toBe(POPOVER_RENDER.code);
    expect(body(Popover, props)).toBe(POPOVER_RENDER.code);
  });

  it('records the two normalized sides the failing contract spec compared', () => {
    const received = normalizedMarkup(body(Badge, { variant: 'warning', children: text('Read') }));
    const expected = normalizedMarkup(body(Badge, { variant: 'success', children: text('Read') }));

    expect(CONTRACT_FAILURE.code).toContain(`Expected: "${expected}"`);
    expect(CONTRACT_FAILURE.code).toContain(`Received: "${received}"`);
  });

  it("reproduces the core comparison's message for the warning badge against the success fixture", () => {
    const shown = CASES.find((candidate) => candidate.path === 'badge/warning');
    if (shown === undefined) throw new Error('The library has no badge/warning case');
    const fixture = readFileSync('src/lib/ui/core/fixtures/badge/success.html', 'utf8');
    const result = compareMarkup(render(CaseHost, { props: { shown } }).body, fixture);

    expect(result.kind === 'mismatch' ? result.message : result.kind).toBe(CORE_MISMATCH.code);
  });
});
