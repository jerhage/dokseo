import { describe, expect, it } from 'vitest';
import { captureId, tagId } from '$lib/shared/ids';
import type { CaptureId, TagId } from '$lib/shared/ids';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { FocusTarget } from './focus-target';
import { createTagSelection } from './tag-selection.svelte';
import type { TagWriting } from './tag-selection.svelte';

const CARD = captureId('c1');

const SPEECH: Tag = namedTag(tagId('tag-1'), 'speech', 'copper', 1);

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

function button(): FocusTarget {
  return { focus: (): void => undefined };
}

describe('createTagSelection', () => {
  it('opens the picker on one capture at a time', () => {
    const held = written();
    const selection = createTagSelection();
    selection.open(CARD, held.writing, null);

    expect([selection.opened(CARD), selection.opened(captureId('c2'))]).toEqual([true, false]);
  });

  it('opens the picker on the tags the capture carries', () => {
    const held = written();
    held.carried.set(CARD, [SPEECH.id]);
    const selection = createTagSelection();
    selection.open(CARD, held.writing, null);

    expect(selection.picker.carried).toEqual([SPEECH.id]);
  });

  it('asks for the tag counts once however often the picker opens', () => {
    const held = written();
    const selection = createTagSelection();
    selection.open(CARD, held.writing, null);
    selection.close();

    expect(selection.opened(CARD)).toBe(false);

    selection.open(CARD, held.writing, null);

    expect(held.calls).toEqual(['counts']);
  });

  it('adds a chosen tag and reopens on the tags now carried', async () => {
    const held = written();
    const selection = createTagSelection();
    selection.open(CARD, held.writing, null);
    await selection.choose({ kind: 'tag', tag: SPEECH, count: 0 }, held.writing);

    expect([held.calls, selection.picker.carried]).toEqual([
      ['counts', `add ${CARD} ${SPEECH.id}`],
      [SPEECH.id],
    ]);
  });

  it('creates a tag from a create row', async () => {
    const held = written();
    const selection = createTagSelection();
    selection.open(CARD, held.writing, null);
    await selection.choose({ kind: 'create', name: 'mood' }, held.writing);

    expect(held.calls).toEqual(['counts', `create ${CARD} mood`]);
  });

  it('chooses nothing while the picker is closed', async () => {
    const held = written();
    const selection = createTagSelection();
    await selection.choose({ kind: 'tag', tag: SPEECH, count: 0 }, held.writing);

    expect(held.calls).toEqual([]);
  });

  it('answers the opener once when the picker closes', () => {
    const held = written();
    const selection = createTagSelection();
    const from = button();
    selection.open(CARD, held.writing, from);

    expect(selection.close()).toBe(from);
    expect(selection.picker.capture).toBeNull();
    expect(selection.close()).toBeNull();
  });
});
