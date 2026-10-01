import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { BookId } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import { CaptureList } from './capture-list.svelte';
import { ClearAll } from './clear-all.svelte';
import type { PanelCapture } from './panel-capture';

const ONE = bookId('book-one');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

type World = {
  rows: Capture[];
  clearFails: boolean;
  readonly cleared: BookId[];
  readonly notices: Notice[];
};

function written(id: string): PanelCapture {
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

function containerOver(world: World): Container {
  return {
    recognition: {
      listCaptures: () => Promise.resolve(ok(world.rows)),
      listTags: () => Promise.resolve(ok([])),
      clearCaptures: (book: BookId) => {
        world.cleared.push(book);
        return Promise.resolve(
          world.clearFails ? err({ kind: 'storage-unavailable' }) : ok(undefined),
        );
      },
    },
  } as unknown as Container;
}

async function opened(): Promise<{ world: World; list: CaptureList; clearing: ClearAll }> {
  const world: World = { rows: [], clearFails: false, cleared: [], notices: [] };
  const container = containerOver(world);
  const list = new CaptureList(container, () => undefined);
  await list.open(ONE);
  const clearing = new ClearAll(container, (notice) => world.notices.push(notice), list);
  return { world, list, clearing };
}

describe('ClearAll', () => {
  it('asks for no confirmation while the list holds no capture', async () => {
    const { clearing } = await opened();

    clearing.ask();

    expect(clearing.confirming).toBe(false);
  });

  it('asks for a confirmation of the notes it would delete, and drops it on dismiss', async () => {
    const { list, clearing } = await opened();
    list.put(written('one'));

    clearing.ask();

    expect(clearing.confirming).toBe(true);
    expect(clearing.scope).toEqual({ kind: 'notes', notes: 1 });

    clearing.dismiss();

    expect(clearing.confirming).toBe(false);
  });

  it('closes the confirmation and empties the list before the store answers', async () => {
    const { world, list, clearing } = await opened();
    list.put(written('one'));
    clearing.ask();

    const running = clearing.clear();

    expect(clearing.confirming).toBe(false);
    expect(list.count).toBe(0);
    await running;
    expect(world.cleared).toEqual([ONE]);
    expect(world.notices).toEqual([]);
  });

  it('puts the cards back and reports it when the store refuses to clear', async () => {
    const { world, list, clearing } = await opened();
    world.clearFails = true;
    list.put(written('one'));

    await clearing.clear();

    expect(list.captures.map((held) => held.id)).toEqual([captureId('one')]);
    expect(world.notices.map((notice) => notice.title)).toEqual([
      'Your captures could not be deleted',
    ]);
  });
});
