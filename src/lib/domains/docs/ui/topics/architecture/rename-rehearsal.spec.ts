import { describe, expect, it } from 'vitest';
import { RenameRehearsalView } from './rename-demo.svelte';
import {
  GRAMMAR_TAG,
  HELD_TAGS,
  STORE_FAILURE,
  rehearseRename,
  renameArm,
} from './rename-rehearsal';

describe('rehearseRename', () => {
  it('runs the real use case to success and saves the renamed tag', async () => {
    const outcome = await rehearseRename(HELD_TAGS, GRAMMAR_TAG, '  Kanji ', 'working');

    expect(outcome.kind).toBe('resolved');
    if (outcome.kind !== 'resolved') return;
    expect(outcome.result).toEqual({ kind: 'success', tag: { ...GRAMMAR_TAG, name: 'Kanji' } });
    expect(outcome.calls.map((call) => call.call)).toEqual(['list()', 'save(Kanji)']);
    expect(outcome.held.map((tag) => tag.name)).toEqual(['Kanji', 'Names', 'Vocabulary']);
    expect(renameArm(outcome)).toBe('success');
  });

  it('answers name-taken with the tag that holds the name, ignoring case', async () => {
    const outcome = await rehearseRename(HELD_TAGS, GRAMMAR_TAG, 'names', 'working');

    expect(outcome.kind === 'resolved' ? outcome.result : null).toEqual({
      kind: 'name-taken',
      tag: HELD_TAGS[1],
    });
    expect(renameArm(outcome)).toBe('name-taken');
  });

  it('passes a blocked store on as storage-unavailable without saving', async () => {
    const outcome = await rehearseRename(HELD_TAGS, GRAMMAR_TAG, 'Kanji', 'blocked');

    expect(outcome.kind === 'resolved' ? outcome.result : null).toEqual({
      kind: 'storage-unavailable',
    });
    expect(outcome.kind === 'resolved' ? outcome.calls.length : null).toBe(1);
    expect(renameArm(outcome)).toBe('storage-unavailable');
  });

  it('reports a throwing store as a rejection with the unexpected-failure text', async () => {
    const outcome = await rehearseRename(HELD_TAGS, GRAMMAR_TAG, 'Kanji', 'throws');

    expect(outcome).toEqual({
      kind: 'rejected',
      message: `Something went wrong: ${STORE_FAILURE}`,
      calls: [{ call: 'list()', result: 'a rejected promise' }],
    });
    expect(renameArm(outcome)).toBe('thrown');
  });

  it('stops before the use case when the name is blank', async () => {
    const outcome = await rehearseRename(HELD_TAGS, GRAMMAR_TAG, '   ', 'throws');

    expect(outcome).toEqual({ kind: 'stopped' });
    expect(renameArm(outcome)).toBe('nameless');
  });

  it('leaves the held tags untouched between runs', async () => {
    await rehearseRename(HELD_TAGS, GRAMMAR_TAG, 'Kanji', 'working');

    expect(HELD_TAGS.map((tag) => tag.name)).toEqual(['Grammar', 'Names', 'Vocabulary']);
  });
});

describe('RenameRehearsalView', () => {
  it('stores the outcome of the latest run only', async () => {
    const view = new RenameRehearsalView();
    view.chooseMode('blocked');
    const first = view.run();
    view.chooseMode('working');
    const second = view.run();
    await Promise.all([first, second]);

    expect(view.outcome?.kind === 'resolved' ? view.outcome.result.kind : null).toBe('success');
  });

  it('ignores an unknown tag id and an unknown store mode', () => {
    const view = new RenameRehearsalView();
    view.choose('tag-missing');
    view.chooseMode('broken');

    expect(view.chosen).toBe(GRAMMAR_TAG);
    expect(view.mode).toBe('working');
  });

  it('chooses a held tag by id', () => {
    const view = new RenameRehearsalView();
    view.choose('tag-names');

    expect(view.chosen.name).toBe('Names');
  });
});
