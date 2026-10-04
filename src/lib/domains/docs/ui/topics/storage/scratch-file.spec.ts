import { describe, expect, it } from 'vitest';
import type { RootEntry, ScratchFileStore } from './scratch-file';
import { ScratchFile, noteText } from './scratch-file.svelte';

const NOW = Date.UTC(2026, 9, 3, 12, 0, 0);

function fakeStore(options: { readonly available?: boolean; readonly failing?: string } = {}) {
  const appEntries: RootEntry[] = [
    { name: 'blobs', kind: 'directory' },
    { name: 'partials', kind: 'directory' },
  ];
  let note: string | null = null;

  const store: ScratchFileStore = {
    available: () => options.available ?? true,
    write: (text) => {
      if (options.failing !== undefined) return Promise.reject(new Error(options.failing));
      note = text;
      return Promise.resolve(new TextEncoder().encode(text).byteLength);
    },
    read: () =>
      Promise.resolve(
        note === null ? null : { text: note, bytes: new TextEncoder().encode(note).byteLength },
      ),
    remove: () => {
      note = null;
      return Promise.resolve();
    },
    root: () =>
      Promise.resolve([
        ...appEntries,
        ...(note === null ? [] : [{ name: 'dokseo-docs-scratch', kind: 'directory' as const }]),
      ]),
  };
  return store;
}

function scratchOn(store: ScratchFileStore): ScratchFile {
  return new ScratchFile({ store, now: () => NOW });
}

describe('ScratchFile', () => {
  it('reports the demo file absent and lists the folders already at the root', async () => {
    const scratch = scratchOn(fakeStore());

    await scratch.refresh();

    expect(scratch.state).toEqual({ kind: 'absent' });
    expect(scratch.root.map((entry) => entry.name)).toEqual(['blobs', 'partials']);
  });

  it('reads back the note the worker wrote, with its byte count', async () => {
    const scratch = scratchOn(fakeStore());

    await scratch.write();

    expect(scratch.state).toEqual({
      kind: 'present',
      content: { text: noteText(NOW), bytes: noteText(NOW).length },
    });
    expect(scratch.written).toBe(noteText(NOW).length);
    expect(scratch.root.map((entry) => entry.name)).toContain('dokseo-docs-scratch');
  });

  it('removes the demo folder and reports the file absent again', async () => {
    const scratch = scratchOn(fakeStore());

    await scratch.write();
    await scratch.remove();

    expect(scratch.state).toEqual({ kind: 'absent' });
    expect(scratch.written).toBeNull();
  });

  it('reports a browser with no origin private file system without touching it', async () => {
    const scratch = scratchOn(fakeStore({ available: false }));

    await scratch.write();

    expect(scratch.state).toEqual({ kind: 'unsupported' });
  });

  it('reports a failed write with the cause the worker sent', async () => {
    const scratch = scratchOn(
      fakeStore({ failing: 'This browser has no createSyncAccessHandle()' }),
    );

    await scratch.write();

    expect(scratch.state).toEqual({
      kind: 'failed',
      message: 'This browser has no createSyncAccessHandle()',
    });
  });
});

describe('noteText', () => {
  it('stamps the note with the time it was written', () => {
    expect(noteText(NOW)).toBe('Written by the Dokseo storage page at 2026-10-03T12:00:00.000Z');
  });
});
