import { describe, expect, it } from 'vitest';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { ANOTHER_TAP_PROMPT } from '$lib/shared/book-captures-export.svelte';
import {
  UnreadableRowsExport,
  savedRowsText,
  unreadableRowsOffer,
} from './unreadable-rows-export.svelte';
import type { UnreadableRowsFile, UnreadableRowsFileBuilt } from './unreadable-rows-export.svelte';

const FILE: FileToSave = {
  text: '{"format":"dokseo-captures"}',
  name: 'dokseo-unreadable-2026-10-04.json',
  type: 'application/json',
};

const EXPORTED: UnreadableRowsFile = { file: FILE, captures: 3, tags: 0 };

const BUILT: UnreadableRowsFileBuilt = { kind: 'success', exported: EXPORTED };

const NOTHING: UnreadableRowsFileBuilt = { kind: 'nothing-to-export' };

function exporter(outcomes: readonly (SaveFileOutcome | Error)[]): {
  readonly view: UnreadableRowsExport;
  readonly saved: FileToSave[];
} {
  const saved: FileToSave[] = [];
  const queue = [...outcomes];
  const view = new UnreadableRowsExport((file) => {
    saved.push(file);
    const outcome = queue.shift();
    if (outcome === undefined) return Promise.reject(new Error('no outcome left'));
    return outcome instanceof Error ? Promise.reject(outcome) : Promise.resolve(outcome);
  });
  return { view, saved };
}

describe('UnreadableRowsExport', () => {
  it('offers the export as soon as the file is built, before any click', () => {
    const { view } = exporter([]);

    expect(unreadableRowsOffer(view.state, BUILT)).toEqual({
      kind: 'export',
      busy: false,
      confirmation: null,
    });
  });

  it('offers nothing when there is no row to export', () => {
    const { view } = exporter([]);

    expect(unreadableRowsOffer(view.state, NOTHING)).toEqual({ kind: 'none' });
  });

  it('hands the built file to the save before its first await, so the tap still counts', async () => {
    const { view, saved } = exporter([{ kind: 'shared' }]);

    const saving = view.save(BUILT);

    expect(saved).toEqual([FILE]);
    expect(unreadableRowsOffer(view.state, BUILT)).toMatchObject({ busy: true });
    await saving;
  });

  it.each(['shared', 'downloaded'] as const)(
    'confirms how many rows it saved once the file is %s',
    async (kind) => {
      const { view } = exporter([{ kind }]);

      await view.save(BUILT);

      expect(unreadableRowsOffer(view.state, BUILT)).toEqual({
        kind: 'export',
        busy: false,
        confirmation: 'Saved 3 unreadable captures.',
      });
    },
  );

  it('offers the export again when the share sheet is dismissed', async () => {
    const { view } = exporter([{ kind: 'cancelled' }]);

    await view.save(BUILT);

    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('asks for a second tap that saves the same file again', async () => {
    const { view, saved } = exporter([{ kind: 'needs-another-tap' }, { kind: 'shared' }]);
    await view.save(BUILT);

    expect(unreadableRowsOffer(view.state, BUILT)).toEqual({
      kind: 'another-tap',
      prompt: ANOTHER_TAP_PROMPT,
    });
    await view.save(BUILT);
    expect(saved).toEqual([FILE, FILE]);
    expect(view.state).toEqual({ kind: 'saved', exported: EXPORTED });
  });

  it('saves nothing when there is no row, or while a save is under way', async () => {
    const { view, saved } = exporter([{ kind: 'shared' }]);

    await view.save(NOTHING);
    const first = view.save(BUILT);
    await view.save(BUILT);
    await first;

    expect(saved).toEqual([FILE]);
  });

  it('returns to idle and rethrows an unexpected failure', async () => {
    const failure = new Error('disk full');
    const { view } = exporter([failure]);

    await expect(view.save(BUILT)).rejects.toBe(failure);
    expect(view.state).toEqual({ kind: 'idle' });
  });
});

describe('savedRowsText', () => {
  it.each([
    [{ captures: 1, tags: 0 }, 'Saved 1 unreadable capture.'],
    [{ captures: 0, tags: 2 }, 'Saved 2 unreadable tags.'],
    [{ captures: 0, tags: 1 }, 'Saved 1 unreadable tag.'],
    [{ captures: 2, tags: 1 }, 'Saved 3 unreadable rows.'],
  ])('counts %j as %s', (counts, text) => {
    expect(savedRowsText({ file: FILE, ...counts })).toBe(text);
  });
});
