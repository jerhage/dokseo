import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import { CaptureList } from './capture-list.svelte';
import type { PanelCapture } from './panel-capture';

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

type Store = {
  rows: Capture[];
  listFails: boolean;
  waiting: (() => void)[];
};

function storedRow(id: string, text: string): Capture {
  return {
    id: captureId(id),
    bookId: ONE,
    anchor: ANCHOR,
    text,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt: 1,
    editedAt: null,
    tagIds: [],
  };
}

function card(id: string): PanelCapture {
  return {
    id: captureId(id),
    anchor: ANCHOR,
    origin: 'written',
    tagIds: [],
    status: 'done',
    text: recognizedText(id, null),
    edited: false,
  };
}

function containerOver(store: Store): Container {
  const answer = () =>
    store.listFails ? err({ kind: 'storage-unavailable' }) : ok([...store.rows]);
  return {
    recognition: {
      listCaptures: () => new Promise((resolve) => store.waiting.push(() => resolve(answer()))),
      listTags: () => Promise.resolve(ok([])),
    },
  } as unknown as Container;
}

function ids(list: CaptureList): readonly CaptureId[] {
  return list.captures.map((held) => held.id);
}

function release(store: Store): void {
  for (const answer of store.waiting.splice(0)) answer();
}

describe('CaptureList', () => {
  it('reads as loading until the listing answers, and keeps a card made meanwhile', async () => {
    const store: Store = { rows: [storedRow('stored', 'old')], listFails: false, waiting: [] };
    const list = new CaptureList(containerOver(store), () => undefined);

    const opening = list.open(ONE);
    list.put(card('made'));

    expect(list.state).toEqual({ kind: 'loading' });
    expect(ids(list)).toEqual([captureId('made')]);

    release(store);
    await opening;

    expect(list.state).toEqual({ kind: 'ready' });
    expect(ids(list)).toEqual([captureId('stored'), captureId('made')]);
  });

  it('keeps its cards on show while a second try reads the list again', async () => {
    const store: Store = { rows: [], listFails: true, waiting: [] };
    const list = new CaptureList(containerOver(store), () => undefined);
    const opening = list.open(ONE);
    release(store);
    await opening;
    list.put(card('made'));

    const again = list.reload();

    expect(list.state).toEqual({ kind: 'loading' });
    expect(ids(list)).toEqual([captureId('made')]);

    store.listFails = false;
    release(store);
    await again;

    expect(list.state).toEqual({ kind: 'ready' });
  });

  it('puts emptied cards back ahead of the cards made since', () => {
    const list = new CaptureList(
      containerOver({ rows: [], listFails: false, waiting: [] }),
      () => undefined,
    );
    list.put(card('first'));
    const before = list.generation;

    const emptied = list.empty();
    list.put(card('later'));
    list.restore(emptied);

    expect(list.generation).toBe(before + 1);
    expect(ids(list)).toEqual([captureId('first'), captureId('later')]);
  });
});
