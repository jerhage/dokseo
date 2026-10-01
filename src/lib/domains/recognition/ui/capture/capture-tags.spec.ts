import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import { regionAnchor } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { TagId } from '$lib/shared/ids';
import type { Notice } from '$lib/shared/notice';
import { err, ok } from '$lib/shared/result';
import type { Capture } from '../../domain/capture/capture';
import { taggedCapture, untaggedCapture } from '../../domain/tag/capture-tags';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { CaptureList } from './capture-list.svelte';
import { CaptureTags } from './capture-tags.svelte';

const ONE = bookId('book-one');

const TWO = bookId('book-two');

const CROWN = tagId('tag-crown');

const CROWN_TAG = namedTag(CROWN, 'crown', 'slate', 1);

const SWORD_TAG = namedTag(tagId('tag-sword'), 'sword', 'slate', 2);

function row(tags: readonly TagId[]): Capture {
  return {
    id: captureId('kept'),
    bookId: ONE,
    anchor: regionAnchor([{ index: imageIndex(1), rect: imageRect(0, 0, 40, 20) }]),
    text: '先',
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt: 1,
    editedAt: null,
    tagIds: tags,
  };
}

type World = {
  rows: readonly Capture[];
  tags: readonly Tag[];
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

async function opened(
  rows: readonly Capture[],
): Promise<{ world: World; list: CaptureList; tagging: CaptureTags }> {
  const world: World = {
    rows,
    tags: [CROWN_TAG],
    refuses: false,
    holds: false,
    answers: [],
    notices: [],
  };
  const container = {
    recognition: {
      listCaptures: () => Promise.resolve(ok(world.rows)),
      listTags: () => answer(world, () => world.tags),
      listEveryCapture: () => answer(world, () => world.rows),
      addTagToCapture: (capture: Capture, tag: TagId) =>
        answer(world, () => taggedCapture(capture, tag)),
      removeTagFromCapture: (capture: Capture, tag: TagId) =>
        answer(world, () => untaggedCapture(capture, tag)),
      createTag: (id: TagId, name: string) =>
        name === CROWN_TAG.name
          ? Promise.resolve(err({ kind: 'name-taken', tag: CROWN_TAG }))
          : answer(world, () => namedTag(id, name, 'slate', 3)),
    },
  } as unknown as Container;
  const holder: { tagging: CaptureTags | null } = { tagging: null };
  const list = new CaptureList(container, (tags) => holder.tagging?.adopt(tags));
  const tagging = new CaptureTags(container, (notice) => world.notices.push(notice), list);
  holder.tagging = tagging;
  await list.open(ONE);
  return { world, list, tagging };
}

async function released<T>(world: World, running: Promise<T>): Promise<T> {
  world.holds = false;
  for (const settle of world.answers.splice(0)) settle();
  return running;
}

describe('CaptureTags', () => {
  it('keeps the tags of the book it opened when an earlier listing answers late', async () => {
    const { world, list, tagging } = await opened([]);
    world.holds = true;
    const late = tagging.loadTags();
    world.holds = false;
    world.tags = [CROWN_TAG, SWORD_TAG];
    await list.open(TWO);
    world.tags = [];

    world.holds = true;
    await released(world, late);

    expect(tagging.tags).toEqual([CROWN_TAG, SWORD_TAG]);
  });

  it('counts nothing from a library count that answers after another book opened', async () => {
    const { world, list, tagging } = await opened([row([CROWN])]);
    world.holds = true;
    const late = tagging.loadTagCounts();
    world.holds = false;
    await list.open(TWO);

    world.holds = true;
    await released(world, late);

    expect(tagging.libraryCounts.size).toBe(0);
  });

  it('raises no toast for a refused add or removal answered after another book opened', async () => {
    const { world, list, tagging } = await opened([row([CROWN])]);
    world.refuses = true;
    world.holds = true;
    const adding = tagging.addTag(captureId('kept'), SWORD_TAG.id);
    const removing = tagging.removeTag(captureId('kept'), CROWN);
    world.holds = false;
    await list.open(TWO);

    world.holds = true;
    await released(world, Promise.all([adding, removing]));

    expect(world.notices).toEqual([]);
  });

  it('holds no tag minted for a capture after another book opened', async () => {
    const { world, list, tagging } = await opened([row([])]);
    world.holds = true;
    const minting = tagging.createTag(captureId('kept'), 'sword');
    world.holds = false;
    await list.open(TWO);

    world.holds = true;
    await released(world, minting);

    expect(tagging.tags).toEqual([CROWN_TAG]);
    expect(world.notices).toEqual([]);
  });

  it('holds a tag a taken name already belongs to once', async () => {
    const { tagging } = await opened([row([])]);

    await tagging.createTag(captureId('kept'), 'crown');

    expect(tagging.tags).toEqual([CROWN_TAG]);
  });

  it('counts no tag below nothing when it is taken off before the counts were read', async () => {
    const { tagging } = await opened([row([CROWN])]);

    await tagging.removeTag(captureId('kept'), CROWN);

    expect(tagging.libraryCounts.get(CROWN)).toBe(0);
  });
});
