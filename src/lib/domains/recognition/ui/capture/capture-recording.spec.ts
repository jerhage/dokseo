import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { bookId, imageIndex } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import { takenCapture } from '../../domain/capture/capture';
import type { CaptureDraft } from '../../domain/capture/capture';
import { recognizedText } from '../../domain/engine/recognized-text';
import { CaptureList } from './capture-list.svelte';
import { CaptureRecording } from './capture-recording.svelte';

const ONE = bookId('book-one');

const TWO = bookId('book-two');

const REGIONS = [{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }];

const QUOTE = { exact: '灯台', prefix: '', suffix: '' };

type World = {
  refuses: boolean;
  holds: boolean;
  readonly answers: (() => void)[];
  readonly notices: Notice[];
};

function answer<T>(world: World, value: () => T): Promise<unknown> {
  const settled = () => (world.refuses ? err({ kind: 'storage-unavailable' }) : ok(value()));
  if (!world.holds) return Promise.resolve(settled());
  return new Promise((resolve) => world.answers.push(() => resolve(settled())));
}

async function opened(): Promise<{ world: World; list: CaptureList; recording: CaptureRecording }> {
  const world: World = { refuses: false, holds: false, answers: [], notices: [] };
  const container = {
    recognition: {
      listCaptures: () => Promise.resolve(ok([])),
      listTags: () => Promise.resolve(ok([])),
      saveCapture: (draft: CaptureDraft) => answer(world, () => takenCapture(draft, 1)),
      writeNote: (
        id: CaptureDraft['id'],
        book: CaptureDraft['bookId'],
        anchor: CaptureDraft['anchor'],
      ) =>
        answer(world, () =>
          takenCapture({ id, bookId: book, anchor, text: '', origin: 'written' }, 1),
        ),
    },
  } as unknown as Container;
  const list = new CaptureList(container, () => undefined);
  await list.open(ONE);
  const recording = new CaptureRecording(container, (notice) => world.notices.push(notice), list, {
    open: () => undefined,
    close: () => undefined,
  });
  return { world, list, recording };
}

async function late(world: World, list: CaptureList, running: Promise<void>): Promise<void> {
  await list.open(TWO);
  for (const settle of world.answers.splice(0)) settle();
  await running;
}

describe('CaptureRecording', () => {
  it('keeps the record the store answered for a written note', async () => {
    const { list, recording } = await opened();

    await recording.write(ONE, REGIONS);

    expect(list.latest === null ? undefined : list.stored(list.latest)?.origin).toBe('written');
  });

  it('keeps the record the store answered for a lifted passage', async () => {
    const { list, recording } = await opened();

    await recording.keepLifted(ONE, 'epubcfi(/6/4)', QUOTE, null);

    expect(list.latest === null ? undefined : list.stored(list.latest)?.origin).toBe('lifted');
  });

  it('raises no toast for a refused note answered after another book opened', async () => {
    const { world, list, recording } = await opened();
    world.refuses = true;
    world.holds = true;

    await late(world, list, recording.write(ONE, REGIONS));

    expect(world.notices).toEqual([]);
  });

  it('raises no toast for a refused capture answered after another book opened', async () => {
    const { world, list, recording } = await opened();
    world.refuses = true;
    world.holds = true;

    const running = recording.recognizing(REGIONS, () =>
      Promise.resolve({ status: 'done', text: recognizedText('読', null), edited: false }),
    );
    await late(world, list, running);

    expect(world.notices).toEqual([]);
  });
});
