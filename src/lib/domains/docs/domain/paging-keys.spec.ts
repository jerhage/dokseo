import { describe, expect, it } from 'vitest';
import { handlerAnswer, isPagingFocus, isPagingKey, pagingOutcome } from './paging-keys';

describe('isPagingKey', () => {
  it('accepts Space and the two side arrows only', () => {
    expect([' ', 'ArrowRight', 'ArrowLeft'].every(isPagingKey)).toBe(true);
    expect(['Enter', 'ArrowDown', 'Tab', 'a'].some(isPagingKey)).toBe(false);
  });
});

describe('isPagingFocus', () => {
  it('accepts the four places focus can be in the demo and nothing else', () => {
    expect(
      ['reading-area', 'next-button', 'contents-button', 'text-field'].every(isPagingFocus),
    ).toBe(true);
    expect([undefined, '', 'button', 3].some(isPagingFocus)).toBe(false);
  });
});

describe('the handler that turns on every key', () => {
  it('turns two pages on Space over a focused next button, once itself and once through the button', () => {
    expect(pagingOutcome('every-key', ' ', 'next-button')).toMatchObject({
      browser: 'presses-the-button',
      pages: 2,
    });
  });

  it('turns a page while a text field types the space', () => {
    expect(pagingOutcome('every-key', ' ', 'text-field')).toMatchObject({
      browser: 'types',
      pages: 1,
    });
  });
});

describe('the handler that skips every key over a button', () => {
  it('leaves the arrows dead while a button holds focus', () => {
    expect(pagingOutcome('skips-buttons', 'ArrowRight', 'next-button')).toMatchObject({
      browser: 'nothing',
      pages: 0,
    });
    expect(pagingOutcome('skips-buttons', 'ArrowLeft', 'contents-button').pages).toBe(0);
  });

  it('turns one page on Space over a next button, through the button alone', () => {
    expect(pagingOutcome('skips-buttons', ' ', 'next-button').pages).toBe(1);
  });
});

describe('the handler that decides per key', () => {
  it('leaves Space to a focused button, which presses it', () => {
    expect(handlerAnswer('per-key', ' ', 'next-button')).toEqual({
      kind: 'leave',
    });
    expect(pagingOutcome('per-key', ' ', 'next-button').pages).toBe(1);
    expect(pagingOutcome('per-key', ' ', 'contents-button')).toMatchObject({
      browser: 'presses-the-button',
      pages: 0,
    });
  });

  it('turns on the arrows over a focused button and cancels the key', () => {
    expect(handlerAnswer('per-key', 'ArrowRight', 'next-button')).toEqual({
      kind: 'turn',
      by: 1,
      cancels: true,
    });
    expect(pagingOutcome('per-key', 'ArrowLeft', 'contents-button').pages).toBe(-1);
  });

  it('turns on Space over the reading area and cancels the scroll', () => {
    expect(pagingOutcome('per-key', ' ', 'reading-area')).toMatchObject({
      browser: 'nothing',
      pages: 1,
    });
  });

  it('leaves every key to a text field', () => {
    for (const key of [' ', 'ArrowRight', 'ArrowLeft'] as const) {
      expect(pagingOutcome('per-key', key, 'text-field')).toMatchObject({
        answer: { kind: 'leave' },
        browser: 'types',
        pages: 0,
      });
    }
  });
});
