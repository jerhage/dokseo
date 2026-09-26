import { describe, expect, it } from 'vitest';
import { captureId } from '$lib/shared/ids';
import type { FocusTarget } from './card-editing.svelte';
import { CardDrafts } from './card-drafts.svelte';

const CARD = captureId('c1');
const OTHER = captureId('c2');

function button(): FocusTarget {
  return { focus: (): void => undefined };
}

describe('CardDrafts', () => {
  it('opens a draft holding the current words of the field', () => {
    const drafts = new CardDrafts();
    drafts.open('note', CARD, 'old note', null);

    expect([drafts.holds('note', CARD), drafts.holds('text', CARD)]).toEqual([true, false]);
    expect(drafts.draft('note', CARD)).toBe('old note');
  });

  it('keeps editors on two cards open at once, each with its own words', () => {
    const drafts = new CardDrafts();
    drafts.open('note', CARD, '', null);
    drafts.open('text', OTHER, 'ねこ', null);
    drafts.write('note', CARD, 'unsaved');

    expect([drafts.draft('note', CARD), drafts.draft('text', OTHER)]).toEqual(['unsaved', 'ねこ']);
  });

  it('keeps what was typed when the same editor is asked to open again', () => {
    const drafts = new CardDrafts();
    drafts.open('note', CARD, 'saved', null);
    drafts.write('note', CARD, 'typing');
    drafts.open('note', CARD, 'saved', null);

    expect(drafts.draft('note', CARD)).toBe('typing');
  });

  it('saves what was typed with its trigger and closes only that editor', () => {
    const drafts = new CardDrafts();
    const trigger = button();
    drafts.open('text', CARD, 'ねこ', trigger);
    drafts.open('note', CARD, '', null);
    drafts.write('text', CARD, 'ねこだ');

    expect(drafts.save('text', CARD)).toEqual({
      field: 'text',
      capture: CARD,
      written: 'ねこだ',
      from: trigger,
    });
    expect([drafts.holds('text', CARD), drafts.holds('note', CARD)]).toEqual([false, true]);
  });

  it('hands back the trigger on abandon and saves nothing afterwards', () => {
    const drafts = new CardDrafts();
    const trigger = button();
    drafts.open('note', CARD, '', trigger);

    expect(drafts.abandon('note', CARD)).toBe(trigger);
    expect(drafts.save('note', CARD)).toBeNull();
  });

  it('ignores writing into an editor that is not open', () => {
    const drafts = new CardDrafts();
    drafts.write('note', CARD, 'lost');

    expect(drafts.holds('note', CARD)).toBe(false);
  });

  it('closes every editor of a removed capture and leaves the others', () => {
    const drafts = new CardDrafts();
    drafts.open('note', CARD, '', null);
    drafts.open('text', CARD, '', null);
    drafts.open('note', OTHER, '', null);
    drafts.forget(CARD);

    expect([
      drafts.holds('note', CARD),
      drafts.holds('text', CARD),
      drafts.holds('note', OTHER),
    ]).toEqual([false, false, true]);
  });
});
