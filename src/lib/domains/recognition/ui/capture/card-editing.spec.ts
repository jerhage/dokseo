import { describe, expect, it } from 'vitest';
import { captureId } from '$lib/shared/ids';
import { CardEditing } from './card-editing.svelte';
import type { FocusTarget } from './card-editing.svelte';

const CARD = captureId('c1');

const OTHER = captureId('c2');

function button(): FocusTarget & { focused: number } {
  const target = {
    focused: 0,
    focus: (): void => {
      target.focused += 1;
    },
  };

  return target;
}

describe('card editing', () => {
  it('holds no capture before an edit begins', () => {
    const editing = new CardEditing();

    expect([editing.capture, editing.draft]).toEqual([null, '']);
  });

  it('holds only the capture the edit began on', () => {
    const editing = new CardEditing();
    editing.begin(CARD, 'ねこ', null);

    expect([editing.holds(CARD), editing.holds(OTHER)]).toEqual([true, false]);
  });

  it('starts the draft from the text it was given', () => {
    const editing = new CardEditing();
    editing.begin(CARD, 'ねこ', null);

    expect(editing.draft).toBe('ねこ');
  });

  it('returns the trigger the edit began from', () => {
    const editing = new CardEditing();
    const from = button();
    editing.begin(CARD, 'ねこ', from);

    expect(editing.abandon()).toBe(from);
  });

  it('returns no trigger when the edit began without one', () => {
    const editing = new CardEditing();
    editing.begin(CARD, '', null);

    expect(editing.abandon()).toBeNull();
  });

  it('forgets the capture and the draft when abandoned', () => {
    const editing = new CardEditing();
    editing.begin(CARD, 'ねこ', button());
    editing.abandon();

    expect([editing.capture, editing.draft]).toEqual([null, '']);
  });

  it('returns the trigger only once', () => {
    const editing = new CardEditing();
    editing.begin(CARD, 'ねこ', button());
    editing.abandon();

    expect(editing.abandon()).toBeNull();
  });
});
