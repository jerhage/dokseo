import type { Component } from 'svelte';
import { createRawSnippet } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import TableCell from './TableCell.svelte';
import TableHeaderCell from './TableHeaderCell.svelte';

function markup(component: unknown, props: Record<string, unknown>): string {
  return render(component as Component<Record<string, unknown>>, { props }).body.replaceAll(
    /<!--[^>]*-->/gu,
    '',
  );
}

const TEXT = createRawSnippet(() => ({ render: () => '<span>Amount</span>' }));

describe('the table cells', () => {
  it('draws a header cell with the eyebrow utility, so its caller writes no class', () => {
    expect(markup(TableHeaderCell, { scope: 'col', children: TEXT })).toBe(
      '<th scope="col" class="eyebrow"><span>Amount</span></th>',
    );
  });

  it('aligns a numeric header cell and a numeric data cell with the table-numeric modifier', () => {
    expect(markup(TableHeaderCell, { numeric: true, children: TEXT })).toContain(
      'class="eyebrow table-numeric"',
    );
    expect(markup(TableCell, { numeric: true, children: TEXT })).toContain('class="table-numeric"');
  });

  it('shrinks and end-aligns an actions header cell and an actions data cell with the table-actions modifier', () => {
    expect(markup(TableHeaderCell, { actions: true, children: TEXT })).toContain(
      'class="eyebrow table-actions"',
    );
    expect(markup(TableCell, { actions: true, children: TEXT })).toContain('class="table-actions"');
  });

  it('keeps the caller class beside its own and adds none to a plain data cell', () => {
    expect(markup(TableHeaderCell, { class: 'text-muted', children: TEXT })).toContain(
      'class="eyebrow text-muted"',
    );
    expect(markup(TableCell, { children: TEXT })).not.toMatch(/class="[^"]/u);
  });
});
