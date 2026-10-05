import { createRawSnippet } from 'svelte';
import type { Component } from 'svelte';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import {
  LIST_GROUP_VARIANTS,
  LIST_ROW_LAYOUTS,
  LIST_ROW_SIZES,
  LIST_ROW_VALUE_TONES,
} from './list-group';
import ListGroup from './ListGroup.svelte';
import ListRow from './ListRow.svelte';

const LIST_GROUP = ListGroup as unknown as Component<Record<string, unknown>>;
const LIST_ROW = ListRow as unknown as Component<Record<string, unknown>>;

const ITEM = createRawSnippet(() => ({ render: () => '<li>One</li>' }));
const PAIR = createRawSnippet(() => ({ render: () => '<div><dt>Total</dt><dd>8 kB</dd></div>' }));
const OPEN = createRawSnippet(() => ({ render: () => '<a href="/">Open</a>' }));
const BAR = createRawSnippet(() => ({ render: () => '<progress></progress>' }));

function markup(
  component: Component<Record<string, unknown>>,
  props: Record<string, unknown>,
): string {
  return render(component, { props })
    .body.replaceAll(/<!--[^>]*-->/gu, '')
    .replaceAll(/>\s+</gu, '><');
}

describe('the list group class maps', () => {
  it('names one class for each group variant', () => {
    expect(LIST_GROUP_VARIANTS).toEqual({
      separated: ['list-group-separated'],
      inset: ['list-group-inset'],
    });
  });

  it('names the row layouts, sizes and value tones', () => {
    expect(LIST_ROW_LAYOUTS).toEqual({
      value: ['list-row-main-value'],
      actions: ['list-row-main-actions'],
    });
    expect(LIST_ROW_SIZES).toEqual({ sm: ['list-row-sm'], md: [] });
    expect(LIST_ROW_VALUE_TONES).toEqual({ default: [], faint: ['list-row-value-faint'] });
  });
});

describe('ListGroup', () => {
  it('renders an unlabelled separated list in a plain box', () => {
    expect(markup(LIST_GROUP, { children: ITEM })).toBe(
      '<div class="list-group list-group-separated"><div class="list-group-box"><ul class="list-group-list"><li>One</li></ul></div></div>',
    );
  });

  it('names a labelled group by its heading and puts the summary in a description list', () => {
    const html = markup(LIST_GROUP, {
      title: 'What takes up space',
      heading: 'h3',
      variant: 'inset',
      children: ITEM,
      summary: PAIR,
    });

    expect(html).toMatch(
      /^<section class="list-group list-group-inset" aria-labelledby="([^"]+)-title"><h3 class="list-group-title eyebrow" id="\1-title">What takes up space<\/h3>/u,
    );
    expect(html).toContain(
      '<div class="list-group-box"><ul class="list-group-list"><li>One</li></ul><dl class="list-group-summary"><div><dt>Total</dt><dd>8 kB</dd></div></dl></div></section>',
    );
  });
});

describe('ListRow', () => {
  it('renders the title, the description and a faint value in a list item', () => {
    const html = markup(LIST_ROW, {
      title: 'Book records',
      description: 'text only',
      value: 'not measurable',
      valueTone: 'faint',
    });

    expect(html).toBe(
      '<li class="list-row list-row-stack"><div class="list-row-main list-row-main-value"><div class="list-row-text"><span class="list-row-title">Book records</span><span class="list-row-description">text only</span></div><span class="list-row-value list-row-value-faint">not measurable</span></div></li>',
    );
  });

  it('wraps the actions beside the text and puts the children under the line', () => {
    const html = markup(LIST_ROW, { title: 'Books', actions: OPEN, children: BAR });

    expect(html).toBe(
      '<li class="list-row list-row-stack"><div class="list-row-main list-row-main-actions"><div class="list-row-text"><span class="list-row-title">Books</span></div><a href="/">Open</a></div><progress></progress></li>',
    );
  });

  it('renders a term and its description when listed', () => {
    const html = markup(LIST_ROW, {
      title: 'Measured above',
      value: '8 kB',
      listed: true,
      size: 'sm',
      strong: true,
    });

    expect(html).toBe(
      '<div class="list-row list-row-sm list-row-strong list-row-main list-row-main-value"><dt class="list-row-text"><span class="list-row-title">Measured above</span></dt><dd class="list-row-value">8 kB</dd></div>',
    );
  });
});
