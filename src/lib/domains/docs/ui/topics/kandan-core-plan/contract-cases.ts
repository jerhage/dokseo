import { createRawSnippet } from 'svelte';
import type { Component, Snippet } from 'svelte';
import AccordionItem from '$lib/ui/components/AccordionItem.svelte';
import Badge from '$lib/ui/components/Badge.svelte';
import Button from '$lib/ui/components/Button.svelte';
import Check from '$lib/ui/components/icons/Check.svelte';

type ComponentRenderer = <Props extends Record<string, unknown>>(
  component: Component<Props>,
  props: NoInfer<Props>,
) => string;

type ContractCaseId = 'badge-success' | 'button-primary' | 'button-link' | 'accordion' | 'check';

type ContractCase = {
  readonly id: ContractCaseId;
  readonly label: string;
  readonly call: string;
  readonly fixture: string;
  readonly markup: (render: ComponentRenderer) => string;
};

function text(content: string): Snippet {
  return createRawSnippet(() => ({ render: () => `<span>${content}</span>` }));
}

const CONTRACT_CASES: readonly ContractCase[] = [
  {
    id: 'badge-success',
    label: 'Badge, success',
    call: `<Badge variant="success">Read</Badge>`,
    fixture: `<span class="badge badge-success">
  <span>Read</span>
</span>`,
    markup: (render) => render(Badge, { variant: 'success', children: text('Read') }),
  },
  {
    id: 'button-primary',
    label: 'Button, primary, small',
    call: `<Button variant="primary" size="sm">Save</Button>`,
    fixture: `<button type="button" class="btn btn-primary btn-sm">
  <span>Save</span>
</button>`,
    markup: (render) => render(Button, { variant: 'primary', size: 'sm', children: text('Save') }),
  },
  {
    id: 'button-link',
    label: 'Button with an href',
    call: `<Button href="/docs" variant="ghost">Open</Button>`,
    fixture: `<a href="/docs" class="btn btn-ghost">
  <span>Open</span>
</a>`,
    markup: (render) => render(Button, { href: '/docs', variant: 'ghost', children: text('Open') }),
  },
  {
    id: 'accordion',
    label: 'Accordion item',
    call: `<AccordionItem title="Details">Body</AccordionItem>`,
    fixture: `<details class="accordion-item">
  <summary class="accordion-trigger">
    Details
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" aria-hidden="true" class="lucide lucide-chevron-down accordion-icon">
      <path d="m6 9 6 6 6-6" />
    </svg>
  </summary>
  <div class="accordion-body">
    <span>Body</span>
  </div>
</details>`,
    markup: (render) => render(AccordionItem, { title: 'Details', children: text('Body') }),
  },
  {
    id: 'check',
    label: 'Check icon',
    call: `<Check />`,
    fixture: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
  stroke-linejoin="round" aria-hidden="true" class="lucide lucide-check">
  <path d="M20 6 9 17l-5-5" />
</svg>`,
    markup: (render) => render(Check, {}),
  },
];

function contractCase(id: ContractCaseId): ContractCase {
  const found = CONTRACT_CASES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`No contract case is named ${id}`);
  return found;
}

export { CONTRACT_CASES, contractCase };
export type { ComponentRenderer, ContractCase, ContractCaseId };
