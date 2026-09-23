import { describe, expect, it } from 'vitest';
import { captureId, tagId } from '$lib/shared/ids';
import type { CaptureId, TagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { TagSelection } from './tag-selection.svelte';
import type { TagWriting } from './tag-selection.svelte';

const CARD = captureId('c1');

const SPEECH: Tag = namedTag(tagId('tag-1'), 'speech', 'ember', 1);

const SIGN: Tag = namedTag(tagId('tag-2'), 'sign', 'sage', 2);

type Written = {
  readonly calls: string[];
  readonly carried: Map<CaptureId, readonly TagId[]>;
  readonly writing: TagWriting;
};

function written(): Written {
  const calls: string[] = [];
  const carried = new Map<CaptureId, readonly TagId[]>();

  const writing: TagWriting = {
    tagsOn: (capture) => carried.get(capture) ?? [],
    loadCounts: () => {
      calls.push('counts');
      return Promise.resolve();
    },
    add: (capture, tag) => {
      calls.push(`add ${capture} ${tag}`);
      carried.set(capture, [...(carried.get(capture) ?? []), tag]);
      return Promise.resolve();
    },
    remove: (capture, tag) => {
      calls.push(`remove ${capture} ${tag}`);
      return Promise.resolve();
    },
    create: (capture, name) => {
      calls.push(`create ${capture} ${name}`);
      return Promise.resolve();
    },
  };

  return { calls, carried, writing };
}

function selectionOver(held: Written, tags: readonly Tag[]): TagSelection {
  return new TagSelection(held.writing, () => ({ tags, counts: new Map() }));
}

describe('tag selection', () => {
  it('opens the picker on one capture at a time', () => {
    const held = written();
    const selection = selectionOver(held, [SPEECH]);
    selection.open(CARD);

    expect([selection.opened(CARD), selection.opened(captureId('c2'))]).toEqual([true, false]);
  });

  it('offers the tags the capture does not carry', () => {
    const held = written();
    held.carried.set(CARD, [SPEECH.id]);
    const selection = selectionOver(held, [SPEECH, SIGN]);
    selection.open(CARD);

    expect(selection.picker.rows).toEqual([{ kind: 'tag', tag: SIGN, count: 0 }]);
  });

  it('asks for the tag counts once however often the picker opens', () => {
    const held = written();
    const selection = selectionOver(held, [SPEECH]);
    selection.open(CARD);
    selection.close();
    selection.open(CARD);

    expect(held.calls).toEqual(['counts']);
  });

  it('closes the picker', () => {
    const held = written();
    const selection = selectionOver(held, [SPEECH]);
    selection.open(CARD);
    selection.close();

    expect(selection.opened(CARD)).toBe(false);
  });

  it('adds a chosen tag and reopens on the tags now carried', async () => {
    const held = written();
    const selection = selectionOver(held, [SPEECH, SIGN]);
    selection.open(CARD);
    await selection.choose({ kind: 'tag', tag: SPEECH, count: 0 });

    expect([held.calls, selection.picker.carried]).toEqual([
      ['counts', `add ${CARD} ${SPEECH.id}`],
      [SPEECH.id],
    ]);
  });

  it('creates a tag from a create row', async () => {
    const held = written();
    const selection = selectionOver(held, []);
    selection.open(CARD);
    await selection.choose({ kind: 'create', name: 'mood' });

    expect(held.calls).toEqual(['counts', `create ${CARD} mood`]);
  });

  it('chooses nothing while the picker is closed', async () => {
    const held = written();
    const selection = selectionOver(held, [SPEECH]);
    await selection.choose({ kind: 'tag', tag: SPEECH, count: 0 });

    expect(held.calls).toEqual([]);
  });

  it('drops a tag from the capture', async () => {
    const held = written();
    const selection = selectionOver(held, [SPEECH]);
    await selection.drop(CARD, SPEECH.id);

    expect(held.calls).toEqual([`remove ${CARD} ${SPEECH.id}`]);
  });
});
