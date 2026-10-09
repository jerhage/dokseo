import { describe, expect, it } from 'vitest';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { FIRST, SECOND, capture } from './captures-import-fixtures';
import { resolutionOf } from './captures-import-rules';
import { createConflictReview } from './conflict-review.svelte';

function reviewing() {
  const review = createConflictReview();
  review.pickStrategy('review');
  return review;
}

describe('createConflictReview', () => {
  it('starts on the newer edit with nothing chosen', () => {
    const review = createConflictReview();

    expect(review.strategy).toBe('newer');
    expect(review.choices).toEqual(new Map());
    expect(review.draft).toBeNull();
  });

  it('moves to Review all and back to another rule', () => {
    const review = reviewing();

    expect(review.strategy).toBe('review');
    review.pickStrategy('this-device');
    expect(review.strategy).toBe('this-device');
  });

  it('keeps the reviewed choices across a switch away from Review all and back', () => {
    const review = reviewing();
    review.pick(FIRST.id, 'file');

    review.pickStrategy('newer');
    review.pickStrategy('review');

    expect(review.choices).toEqual(new Map([[FIRST.id, { kind: 'file' }]]));
  });

  it('records each picked side, and leaves an unchosen conflict out of the choices', () => {
    const review = reviewing();

    review.pick(FIRST.id, 'file');

    expect(resolutionOf(review.strategy, review.choices)).toEqual({
      kind: 'review',
      choices: new Map([[FIRST.id, { kind: 'file' }]]),
    });
    expect(review.choices.has(SECOND.id)).toBe(false);
  });

  it("opens an edit from this device's text and note", () => {
    const review = reviewing();

    review.edit(FIRST);

    expect(review.draft).toEqual({
      id: FIRST.id,
      text: FIRST.device.text,
      note: 'device note of first',
    });
  });

  it('opens an edit with an empty note for a capture that has none', () => {
    const { id, bookId, anchor, text, createdAt, editedAt, tagIds } = capture('written');
    const written: Capture = {
      id,
      bookId,
      anchor,
      text,
      origin: 'written',
      createdAt,
      editedAt,
      tagIds,
    };
    const review = reviewing();

    review.edit({ ...FIRST, id: written.id, device: written });

    expect(review.draft).toMatchObject({ note: '' });
  });

  it('records a saved hand edit as the choice for its conflict', () => {
    const review = reviewing();

    review.edit(FIRST);
    review.draftText('hand text');
    review.draftNote('hand note');
    review.saveDraft();

    expect(review.choices).toEqual(
      new Map([[FIRST.id, { kind: 'edit', text: 'hand text', note: 'hand note' }]]),
    );
    expect(review.draft).toBeNull();
  });

  it('reopens a saved edit from the edit, not from this device', () => {
    const review = reviewing();
    review.edit(FIRST);
    review.draftText('hand text');
    review.saveDraft();

    review.edit(FIRST);

    expect(review.draft).toMatchObject({ text: 'hand text' });
  });

  it('drops a cancelled edit and keeps the earlier choice', () => {
    const review = reviewing();
    review.pick(FIRST.id, 'device');
    review.edit(FIRST);
    review.draftText('abandoned');

    review.cancelDraft();

    expect(review.draft).toBeNull();
    expect(review.choices).toEqual(new Map([[FIRST.id, { kind: 'device' }]]));
  });

  it('records nothing for an unsaved draft', () => {
    const review = reviewing();
    review.edit(SECOND);
    review.draftText('never saved');

    expect(review.choices.size).toBe(0);
  });

  it('replaces a saved edit with a picked side', () => {
    const review = reviewing();
    review.edit(FIRST);
    review.saveDraft();

    review.pick(FIRST.id, 'device');

    expect(review.choices.get(FIRST.id)).toEqual({ kind: 'device' });
  });

  it('forgets the rule, the choices and the draft on reset', () => {
    const review = reviewing();
    review.pick(FIRST.id, 'file');
    review.edit(SECOND);

    review.reset();

    expect(review.strategy).toBe('newer');
    expect(review.choices.size).toBe(0);
    expect(review.draft).toBeNull();
  });
});
