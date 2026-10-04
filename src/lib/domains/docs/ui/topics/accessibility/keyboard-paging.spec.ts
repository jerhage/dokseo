import { describe, expect, it } from 'vitest';
import { FIRST_PAGE, KeyboardPaging, LAST_PAGE, pagingVerdict } from './keyboard-paging.svelte';

describe('KeyboardPaging', () => {
  it('records the double turn of Space over the next button under the every-key handler', () => {
    const paging = new KeyboardPaging();

    paging.pressed(' ', 'next-button');
    paging.clicked('next', true);

    expect(paging.page).toBe(FIRST_PAGE + 2);
    expect(paging.entries[0]).toMatchObject({ handlerTurn: 1, buttonTurn: 1 });
    expect(paging.entries.map(pagingVerdict)).toEqual(['double-turn']);
  });

  it('records dead arrows over a focused button under the skips-buttons handler', () => {
    const paging = new KeyboardPaging();
    paging.handler = 'skips-buttons';

    paging.clicked('next', false);
    const answer = paging.pressed('ArrowRight', 'next-button');

    expect(answer).toEqual({ kind: 'leave' });
    expect(paging.page).toBe(FIRST_PAGE + 1);
    expect(paging.entries[0]).toMatchObject({ handlerTurn: 0, buttonTurn: 0 });
    expect(paging.entries.map(pagingVerdict)).toEqual(['dead-key']);
  });

  it('turns once on Space and once on an arrow over a button under the per-key handler', () => {
    const paging = new KeyboardPaging();
    paging.handler = 'per-key';

    paging.pressed(' ', 'next-button');
    paging.clicked('next', true);
    paging.pressed('ArrowRight', 'next-button');

    expect(paging.page).toBe(FIRST_PAGE + 2);
    expect(paging.entries.map((entry) => entry.handlerTurn + entry.buttonTurn)).toEqual([1, 1]);
    expect(paging.entries.map(pagingVerdict)).toEqual(['as-expected', 'as-expected']);
  });

  it('reports an arrow left to a text field and an arrow at the first page as expected', () => {
    const paging = new KeyboardPaging();
    paging.handler = 'per-key';

    paging.pressed('ArrowRight', 'text-field');
    paging.pressed('ArrowLeft', 'reading-area');

    expect(paging.entries.map(pagingVerdict)).toEqual(['as-expected', 'as-expected']);
  });

  it('reports a turn that also pressed the contents button', () => {
    const paging = new KeyboardPaging();

    paging.pressed(' ', 'contents-button');
    paging.clicked('contents', true);

    expect(paging.entries.map(pagingVerdict)).toEqual(['turned-and-pressed']);
  });

  it('attaches a keyboard click to no entry after a key that is not a paging key', () => {
    const paging = new KeyboardPaging();

    paging.pressed('ArrowRight', 'reading-area');
    paging.released();
    paging.clicked('contents', true);

    expect(paging.contentsOpen).toBe(true);
    expect(paging.entries[0]).toMatchObject({ contentsOpened: false });
  });

  it('keeps the page inside the book and counts only the pages it moved', () => {
    const paging = new KeyboardPaging();

    paging.pressed('ArrowLeft', 'reading-area');
    expect(paging.page).toBe(FIRST_PAGE);
    expect(paging.entries[0]?.handlerTurn).toBe(0);

    paging.page = LAST_PAGE;
    paging.pressed('ArrowRight', 'reading-area');
    expect(paging.page).toBe(LAST_PAGE);
  });

  it('keeps the eight newest entries and forgets them on reset', () => {
    const paging = new KeyboardPaging();
    for (let press = 0; press < 10; press += 1) paging.pressed('ArrowRight', 'reading-area');

    expect(paging.entries).toHaveLength(8);
    expect(paging.entries[0]?.id).toBe(10);

    paging.reset();
    expect(paging.entries).toEqual([]);
    expect(paging.page).toBe(FIRST_PAGE);
  });
});
