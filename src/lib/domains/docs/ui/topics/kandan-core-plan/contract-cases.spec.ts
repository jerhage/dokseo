import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import { markupVerdict, normalizedMarkup } from '../../../domain/markup-contract';
import { CONTRACT_CASES } from './contract-cases';
import type { ComponentRenderer } from './contract-cases';

const serverRender: ComponentRenderer = (component, props) =>
  render(component as Component<Record<string, unknown>>, { props }).body;

describe('the contract cases of the Kandan core plan', () => {
  it.each(CONTRACT_CASES.map((contract) => [contract.label, contract] as const))(
    'renders %s on the server exactly as its fixture describes',
    (_label, contract) => {
      const rendered = normalizedMarkup(contract.markup(serverRender));

      expect(rendered).toBe(normalizedMarkup(contract.fixture));
    },
  );

  it('reports a mismatch when a case renders another variant than its fixture', () => {
    const [badge, button] = CONTRACT_CASES;
    if (badge === undefined || button === undefined) throw new Error('Two cases are missing');

    expect(markupVerdict(button.markup(serverRender), badge.fixture).kind).toBe('mismatch');
  });
});
