import { describe, expect, it } from 'vitest';
import { markupVerdict, normalizedMarkup } from './markup-contract';

describe('normalizedMarkup', () => {
  it('drops the comments Svelte writes around blocks and snippets', () => {
    expect(normalizedMarkup('<!--[--><span class="badge"><b>Read</b><!----></span><!--]-->')).toBe(
      '<span class="badge"><b>Read</b></span>',
    );
  });

  it('removes white space next to a tag and collapses it inside text', () => {
    expect(normalizedMarkup('<p>\n  Title\n  <b>one</b>\n  <i>two   three</i>\n</p>')).toBe(
      '<p>Title<b>one</b><i>two three</i></p>',
    );
  });

  it('writes attributes in name order, whatever order they came in', () => {
    expect(normalizedMarkup('<a href="/" class="btn" aria-busy="true">x</a>')).toBe(
      '<a aria-busy="true" class="btn" href="/">x</a>',
    );
  });

  it('orders the class names inside a class attribute', () => {
    expect(normalizedMarkup('<span class="badge-success  badge">x</span>')).toBe(
      '<span class="badge badge-success">x</span>',
    );
  });

  it('gives an attribute written without a value an empty value', () => {
    expect(normalizedMarkup('<details open>x</details>')).toBe(
      normalizedMarkup('<details open="">x</details>'),
    );
  });

  it('reads a self-closing element as an element with an end tag', () => {
    expect(normalizedMarkup('<svg><path d="M1 2" /></svg>')).toBe(
      '<svg><path d="M1 2"></path></svg>',
    );
  });
});

describe('markupVerdict', () => {
  it('reports a match when only formatting differs', () => {
    expect(
      markupVerdict(
        '<!--[--><span class="badge badge-success"><span>Read</span><!----></span><!--]-->',
        '<span class="badge badge-success">\n  <span>Read</span>\n</span>',
      ),
    ).toEqual({
      kind: 'match',
      markup: '<span class="badge badge-success"><span>Read</span></span>',
    });
  });

  it('reports a mismatch with both sides and the first character that differs', () => {
    const verdict = markupVerdict(
      '<span class="badge badge-warning">Read</span>',
      '<span class="badge badge-success">Read</span>',
    );

    expect(verdict).toEqual({
      kind: 'mismatch',
      rendered: '<span class="badge badge-warning">Read</span>',
      fixture: '<span class="badge badge-success">Read</span>',
      firstDifference: 25,
    });
  });

  it('reports a mismatch at the end of the shorter side when one side stops early', () => {
    const verdict = markupVerdict('<b>x</b>', '<b>x</b><i>y</i>');

    expect(verdict.kind === 'mismatch' ? verdict.firstDifference : null).toBe(8);
  });
});
