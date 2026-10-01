import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import type { Tag } from '../../domain/tag/tag';
import { CaptureSearchView, foundCaptures } from './capture-search.svelte';

const CAPTURE: Capture = {
  id: captureId('a'),
  bookId: bookId('one'),
  anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 10, 10) }]),
  text: '海',
  origin: 'written',
  createdAt: 1,
  editedAt: null,
  tagIds: [],
};

const TAG: Tag = { id: tagId('sea'), name: 'sea', colour: 'sky', createdAt: 0 };

type Answer<T> = Result<T, { readonly kind: 'storage-unavailable' }> | Error;

type World = {
  readonly find: CaptureSearchView;
  readonly answer: (captures: Answer<readonly Capture[]>, tags?: Answer<readonly Tag[]>) => void;
};

function settle<T>(answer: Answer<T>): Promise<unknown> {
  return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
}

function fakes(): World {
  const captureReads: ((answer: Promise<unknown>) => void)[] = [];
  const tagReads: ((answer: Promise<unknown>) => void)[] = [];
  const container = {
    recognition: {
      listEveryCapture: () => new Promise((resolve) => captureReads.push(resolve)),
      listTags: () => new Promise((resolve) => tagReads.push(resolve)),
    },
  } as unknown as Container;

  return {
    find: new CaptureSearchView(container, (a, b) => a.localeCompare(b)),
    answer: (captures, tags = ok([TAG])) => {
      at(captureReads.splice(0, 1), 0)(settle(captures));
      at(tagReads.splice(0, 1), 0)(settle(tags));
    },
  };
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 10; turn += 1) await Promise.resolve();
}

describe('CaptureSearchView', () => {
  it('holds nothing before it reads', () => {
    const { find } = fakes();

    expect(find.state).toEqual({ kind: 'idle' });
    expect(find.captures).toEqual([]);
  });

  it('reads every capture and the tags', async () => {
    const world = fakes();
    const reading = world.find.load();

    expect(world.find.state).toEqual({ kind: 'loading' });

    world.answer(ok([CAPTURE]));
    await reading;

    expect(world.find.captures).toEqual([CAPTURE]);
    expect(world.find.tags).toEqual([TAG]);
    expect(world.find.state.kind).toBe('ready');
  });

  it('keeps the captures on show while it reads them again', async () => {
    const world = fakes();
    const first = world.find.load();
    world.answer(ok([CAPTURE]));
    await first;

    const second = world.find.load();

    expect(world.find.captures).toEqual([CAPTURE]);
    expect(world.find.state).toMatchObject({ kind: 'ready', refresh: { kind: 'refreshing' } });
    world.answer(ok([]));
    await second;
    expect(world.find.captures).toEqual([]);
  });

  it('fails with the storage cause and drops the captures it held', async () => {
    const world = fakes();
    const first = world.find.load();
    world.answer(ok([CAPTURE]));
    await first;

    const second = world.find.load();
    world.answer(err({ kind: 'storage-unavailable' }));
    await second;

    expect(world.find.state).toEqual({
      kind: 'failed',
      message: 'This browser blocks local storage.',
    });
    expect(world.find.captures).toEqual([]);
    expect(world.find.tags).toEqual([TAG]);
  });

  it('fails when the read throws', async () => {
    const world = fakes();
    const reading = world.find.load();

    world.answer(new Error('gone'));
    await reading;

    expect(world.find.state).toEqual({ kind: 'failed', message: 'Local storage failed: gone' });
  });

  it('reads again from loading after a failure', async () => {
    const world = fakes();
    const first = world.find.load();
    world.answer(new Error('gone'));
    await first;

    void world.find.load();

    expect(world.find.state).toEqual({ kind: 'loading' });
  });

  it('drops the tags it held when the tag read fails, and still holds the captures', async () => {
    const world = fakes();
    const first = world.find.load();
    world.answer(ok([CAPTURE]));
    await first;

    const second = world.find.load();
    world.answer(ok([CAPTURE]), new Error('gone'));
    await second;

    expect(world.find.tags).toEqual([]);
    expect(world.find.captures).toEqual([CAPTURE]);
  });

  it('drops an answer that lands after a newer read began', async () => {
    const world = fakes();
    const first = world.find.load();
    const second = world.find.load();

    world.answer(ok([CAPTURE]));
    await settled();

    expect(world.find.state).toEqual({ kind: 'loading' });
    world.answer(ok([]));
    await Promise.all([first, second]);
    expect(world.find.captures).toEqual([]);
  });

  it('forgets everything and drops a read in flight on dispose', async () => {
    const world = fakes();
    const first = world.find.load();
    world.answer(ok([CAPTURE]));
    await first;
    const reading = world.find.load();

    world.find.dispose();
    world.answer(ok([CAPTURE]));
    await reading;

    expect(world.find.state).toEqual({ kind: 'idle' });
    expect(world.find.tags).toEqual([]);
  });
});

describe('foundCaptures', () => {
  it('answers the captures of a ready read only', () => {
    expect(foundCaptures({ kind: 'loading' })).toEqual([]);
    expect(foundCaptures({ kind: 'failed', message: 'x' })).toEqual([]);
    expect(
      foundCaptures({ kind: 'ready', value: [CAPTURE], refresh: { kind: 'settled' } }),
    ).toEqual([CAPTURE]);
  });
});
