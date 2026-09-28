import { describe, expect, it } from 'vitest';
import { captureId } from '$lib/shared/ids';
import type { FocusTarget } from './card-editing.svelte';
import { CardDrafts } from './card-drafts.svelte';
import type { WriteOutcome } from './capture-collection.svelte';

const CARD = captureId('c1');
const OTHER = captureId('c2');

function button(): FocusTarget {
  return { focus: (): void => undefined };
}

function keeping(
  outcome: WriteOutcome,
  kept: string[] = [],
): (written: string) => Promise<WriteOutcome> {
  return (written) => {
    kept.push(written);
    return Promise.resolve(outcome);
  };
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

  it('saves what was typed, hands back its trigger and closes only that editor', async () => {
    const drafts = new CardDrafts();
    const trigger = button();
    const kept: string[] = [];
    drafts.open('text', CARD, 'ねこ', trigger);
    drafts.open('note', CARD, '', null);
    drafts.write('text', CARD, 'ねこだ');

    expect(await drafts.save('text', CARD, keeping('saved', kept))).toEqual({
      kind: 'closed',
      from: trigger,
    });
    expect(kept).toEqual(['ねこだ']);
    expect([drafts.holds('text', CARD), drafts.holds('note', CARD)]).toEqual([false, true]);
  });

  it('keeps the editor open with what was typed when the save fails', async () => {
    const drafts = new CardDrafts();
    drafts.open('note', CARD, 'old note', null);
    drafts.write('note', CARD, 'new note');

    expect(await drafts.save('note', CARD, keeping('failed'))).toEqual({ kind: 'kept-open' });
    expect(drafts.holds('note', CARD)).toBe(true);
    expect(drafts.draft('note', CARD)).toBe('new note');
  });

  it('keeps the editor open while the save is running', async () => {
    const drafts = new CardDrafts();
    let finish: (outcome: WriteOutcome) => void = () => undefined;
    drafts.open('text', CARD, 'ねこ', null);

    const saving = drafts.save(
      'text',
      CARD,
      () => new Promise<WriteOutcome>((resolve) => (finish = resolve)),
    );

    expect(drafts.holds('text', CARD)).toBe(true);
    finish('saved');
    await saving;
    expect(drafts.holds('text', CARD)).toBe(false);
  });

  it('keeps the editor open when more was typed while the save ran', async () => {
    const drafts = new CardDrafts();
    let finish: (outcome: WriteOutcome) => void = () => undefined;
    drafts.open('text', CARD, 'ねこ', null);

    const saving = drafts.save(
      'text',
      CARD,
      () => new Promise<WriteOutcome>((resolve) => (finish = resolve)),
    );
    drafts.write('text', CARD, 'ねこだよ');
    finish('saved');

    expect(await saving).toEqual({ kind: 'kept-open' });
    expect(drafts.draft('text', CARD)).toBe('ねこだよ');
  });

  it('starts no second save of an editor whose save is running', async () => {
    const drafts = new CardDrafts();
    const kept: string[] = [];
    let finish: (outcome: WriteOutcome) => void = () => undefined;
    drafts.open('text', CARD, 'ねこ', null);

    const first = drafts.save('text', CARD, (written) => {
      kept.push(written);
      return new Promise<WriteOutcome>((resolve) => (finish = resolve));
    });
    const second = await drafts.save('text', CARD, keeping('saved', kept));
    finish('saved');
    await first;

    expect(second).toEqual({ kind: 'nothing' });
    expect(kept).toEqual(['ねこ']);
  });

  it('hands back the trigger on abandon and saves nothing afterwards', async () => {
    const drafts = new CardDrafts();
    const trigger = button();
    const kept: string[] = [];
    drafts.open('note', CARD, '', trigger);

    expect(drafts.abandon('note', CARD)).toBe(trigger);
    expect(await drafts.save('note', CARD, keeping('saved', kept))).toEqual({ kind: 'nothing' });
    expect(kept).toEqual([]);
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

  it('closes every open draft when cleared', () => {
    const drafts = new CardDrafts();
    drafts.open('note', CARD, '', null);
    drafts.open('text', OTHER, 'ねこ', null);
    drafts.clear();

    expect([drafts.holds('note', CARD), drafts.holds('text', OTHER)]).toEqual([false, false]);
  });
});
