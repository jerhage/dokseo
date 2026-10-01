import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import { editedCapture, notedCapture } from '../../domain/capture/capture';
import type { Capture } from '../../domain/capture/capture';
import { CaptureEdits } from './capture-edits.svelte';
import { CaptureList } from './capture-list.svelte';

const ONE = bookId('book-one');

const TWO = bookId('book-two');

const ANCHOR = regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]);

const READ: Capture = {
  id: captureId('read'),
  bookId: ONE,
  anchor: ANCHOR,
  text: '先',
  note: null,
  confidence: null,
  origin: 'recognized',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

const WRITTEN: Capture = {
  id: captureId('written'),
  bookId: ONE,
  anchor: ANCHOR,
  text: 'mine',
  origin: 'written',
  createdAt: 2,
  editedAt: null,
  tagIds: [],
};

type World = {
  refuses: boolean;
  readonly edited: Capture[];
  readonly noted: Capture[];
  readonly answers: (() => void)[];
  readonly notices: Notice[];
};

function answered<T>(world: World, value: T): Promise<unknown> {
  const answer = () => (world.refuses ? err({ kind: 'storage-unavailable' }) : ok(value));
  return new Promise((resolve) => world.answers.push(() => resolve(answer())));
}

async function opened(): Promise<{ world: World; list: CaptureList; edits: CaptureEdits }> {
  const world: World = { refuses: false, edited: [], noted: [], answers: [], notices: [] };
  const container = {
    recognition: {
      listCaptures: () => Promise.resolve(ok([READ, WRITTEN])),
      listTags: () => Promise.resolve(ok([])),
      editCaptureText: (capture: Capture, text: string) => {
        world.edited.push(capture);
        return answered(world, editedCapture(capture, text, 9));
      },
      writeCaptureNote: (capture: Capture & { origin: 'recognized' }, note: string) => {
        world.noted.push(capture);
        return answered(world, notedCapture(capture, note));
      },
    },
  } as unknown as Container;
  const list = new CaptureList(container, () => undefined);
  await list.open(ONE);
  const edits = new CaptureEdits(container, (notice) => world.notices.push(notice), list);
  return { world, list, edits };
}

async function settled<T>(world: World, running: Promise<T>): Promise<T> {
  for (const answer of world.answers.splice(0)) answer();
  return running;
}

describe('CaptureEdits', () => {
  it('raises no toast for a refused edit the store answers after another book opened', async () => {
    const { world, list, edits } = await opened();
    world.refuses = true;

    const running = edits.edit(READ.id, '後');
    await list.open(TWO);

    expect(await settled(world, running)).toBe('saved');
    expect(world.notices).toEqual([]);
  });

  it('raises no toast for a refused note the store answers after another book opened', async () => {
    const { world, list, edits } = await opened();
    world.refuses = true;

    const running = edits.annotate(READ.id, 'a note');
    await list.open(TWO);

    expect(await settled(world, running)).toBe('saved');
    expect(world.notices).toEqual([]);
  });

  it('writes no note onto a written note', async () => {
    const { world, edits } = await opened();

    expect(await settled(world, edits.annotate(WRITTEN.id, 'a note'))).toBe('saved');
    expect(world.noted).toEqual([]);
  });

  it('edits the record the store answered with, not the one it first listed', async () => {
    const { world, edits } = await opened();
    await settled(world, edits.edit(READ.id, '後'));

    await settled(world, edits.edit(READ.id, '再'));

    expect(world.edited.map((capture) => capture.text)).toEqual(['先', '後']);
  });
});
