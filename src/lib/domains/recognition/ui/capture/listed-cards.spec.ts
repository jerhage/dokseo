import { describe, expect, it } from 'vitest';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { Capture } from '../../domain/capture/capture';
import { captureHolds } from '../../domain/capture/capture-results';
import { recognizedText } from '../../domain/engine/recognized-text';
import { listedCards, markedCapture, readCaptures } from './listed-cards';
import type { PanelCapture } from './panel-capture';

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

const PASSAGE = textAnchor('epubcfi(/6/4)', { exact: '灯台', prefix: '', suffix: '' }, null);

function storedRow(id: string, text: string, createdAt: number): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: ANCHOR,
    text,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function liftedRow(id: string, note: string | null): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: PASSAGE,
    text: '灯台',
    note,
    origin: 'lifted',
    createdAt: 1,
    editedAt: null,
    tagIds: [],
  };
}

function settledCard(id: string, text: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: ANCHOR,
    origin: 'recognized',
    note: null,
    tagIds: [],
    status: 'done',
    text: recognizedText(text, null),
    edited: false,
  };
}

function failedCard(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: ANCHOR,
    origin: 'recognized',
    note: null,
    tagIds: [],
    status: 'failed',
    message: 'Not saved. This browser blocks local storage.',
  };
}

function texts(cards: readonly PanelCapture[]): readonly string[] {
  return cards.map((card) => (card.status === 'done' ? card.text.text : card.status));
}

describe('listedCards', () => {
  it('lists the stored rows oldest first, then the unsaved cards in the order they came', () => {
    const cards = listedCards(
      [storedRow('b', '後', 2), storedRow('a', '先', 1)],
      [settledCard('x', '新'), failedCard('y')],
    );

    expect(texts(cards)).toEqual(['先', '後', '新', 'failed']);
  });

  it('keeps an unsaved card from this session beside the rows a later read lists', () => {
    const cards = listedCards([storedRow('a', 'older', 1)], [failedCard('new')]);

    expect(texts(cards)).toEqual(['older', 'failed']);
  });

  it('shows a capture once when it is both stored and still held as unsaved', () => {
    const cards = listedCards([storedRow('a', 'older', 1)], [settledCard('a', 'older')]);

    expect(cards.map((card) => card.id)).toEqual([captureId('a')]);
  });

  it('shows a row edited in an earlier session as edited', () => {
    const cards = listedCards([{ ...storedRow('a', '直した', 1), editedAt: 5 }], []);

    expect(cards.map((card) => card.status === 'done' && card.edited)).toEqual([true]);
  });
});

describe('markedCapture', () => {
  it('carries the note the stored row keeps', () => {
    const card = listedCards([liftedRow('a', '海の音')], []);
    const first = card[0];
    if (first === undefined || first.status !== 'done') throw new Error('no settled card');

    expect(markedCapture(first, liftedRow('a', '海の音'))).toMatchObject({
      origin: 'lifted',
      note: '海の音',
    });
  });

  it('carries no note for a card whose row is not stored yet', () => {
    const card = settledCard('x', '新');
    if (card.status !== 'done') throw new Error('no settled card');

    expect(markedCapture(card, undefined)).toMatchObject({ origin: 'recognized', note: null });
  });

  it('carries no note from a row of another origin', () => {
    const card = settledCard('a', '灯台');
    if (card.status !== 'done') throw new Error('no settled card');

    expect(markedCapture(card, liftedRow('a', '海の音'))).toMatchObject({ note: null });
  });
});

describe('readCaptures', () => {
  it('reads only the settled cards', () => {
    const rows = [storedRow('a', '先', 1)];

    expect(readCaptures(listedCards(rows, [failedCard('y')]), rows).map((held) => held.id)).toEqual(
      [captureId('a')],
    );
  });

  it('finds a lifted passage by the note written on it', () => {
    const rows = [liftedRow('a', '海の音')];

    expect(
      readCaptures(listedCards(rows, []), rows).map((held) => captureHolds(held, '海')),
    ).toEqual([true]);
  });
});
