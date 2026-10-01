import { describe, expect, it } from 'vitest';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { captureId, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { PanelCapture } from './panel-capture';
import { UnsavedCards } from './unsaved-cards.svelte';

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

function pending(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: ANCHOR,
    origin: 'recognized',
    note: null,
    tagIds: [],
    status: 'pending',
  };
}

function ids(unsaved: UnsavedCards): readonly CaptureId[] {
  return unsaved.cards.map((card) => card.id);
}

describe('UnsavedCards', () => {
  it('appends each card it is given and names it the latest', () => {
    const unsaved = new UnsavedCards();

    unsaved.put(pending('a'));
    unsaved.put(pending('b'));

    expect(ids(unsaved)).toEqual([captureId('a'), captureId('b')]);
    expect(unsaved.latest).toBe(captureId('b'));
    expect(unsaved.holds(captureId('a'))).toBe(true);
  });

  it('settles a card in place', () => {
    const unsaved = new UnsavedCards();
    unsaved.put(pending('a'));
    unsaved.put(pending('b'));

    unsaved.settle(captureId('a'), {
      status: 'done',
      text: recognizedText('海', null),
      edited: false,
    });

    expect(unsaved.cards.map((card) => card.status)).toEqual(['done', 'pending']);
    expect(ids(unsaved)).toEqual([captureId('a'), captureId('b')]);
  });

  it('settles nothing for a card it no longer holds', () => {
    const unsaved = new UnsavedCards();
    unsaved.put(pending('a'));
    unsaved.empty();

    unsaved.settle(captureId('a'), { status: 'empty' });

    expect(unsaved.cards).toEqual([]);
  });

  it('drops one card and keeps the rest', () => {
    const unsaved = new UnsavedCards();
    unsaved.put(pending('a'));
    unsaved.put(pending('b'));

    unsaved.drop(captureId('a'));

    expect(ids(unsaved)).toEqual([captureId('b')]);
    expect(unsaved.holds(captureId('a'))).toBe(false);
  });

  it('puts emptied cards back ahead of the cards made since, once each', () => {
    const unsaved = new UnsavedCards();
    unsaved.put(pending('first'));

    const emptied = unsaved.empty();
    unsaved.put(pending('later'));
    unsaved.restore([...emptied, pending('later')]);

    expect(ids(unsaved)).toEqual([captureId('first'), captureId('later')]);
  });

  it('keeps the latest card through an empty and forgets it with the book', () => {
    const unsaved = new UnsavedCards();
    unsaved.put(pending('a'));

    unsaved.empty();
    expect(unsaved.latest).toBe(captureId('a'));

    unsaved.forget();
    expect(unsaved.latest).toBeNull();
    expect(unsaved.cards).toEqual([]);
  });
});
