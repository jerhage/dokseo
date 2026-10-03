import { describe, expect, it } from 'vitest';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type { CapturesExport, ExportCapturesResult } from '../use-cases/export-captures';
import {
  CapturesExportView,
  exportStatus,
  leftOutNotes,
  savedText,
} from './captures-export.svelte';
import type { ExportSummary } from './captures-export.svelte';

const NONE_UNREADABLE = { books: 0, tags: 0, captures: 0 };

const EXPORTED: CapturesExport = {
  json: '{"format":"dokseo-captures"}',
  fileName: 'dokseo-captures-2026-10-03.json',
  captures: 12,
  books: 3,
  bookless: 1,
  unreadable: NONE_UNREADABLE,
};

const SUMMARY: ExportSummary = {
  captures: 12,
  books: 3,
  bookless: 1,
  unreadable: NONE_UNREADABLE,
};

const FILE: FileToSave = {
  text: EXPORTED.json,
  name: EXPORTED.fileName,
  type: 'application/json',
};

type Deferred<T> = {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (cause: unknown) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  let reject: (cause: unknown) => void = () => undefined;
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

function view(
  result: () => Promise<ExportCapturesResult>,
  outcomes: readonly SaveFileOutcome[] = [{ kind: 'shared' }],
): { view: CapturesExportView; saved: FileToSave[]; exports: () => number } {
  const saved: FileToSave[] = [];
  const queue = [...outcomes];
  let exports = 0;
  return {
    saved,
    exports: () => exports,
    view: new CapturesExportView(
      {
        exportCaptures: () => {
          exports += 1;
          return result();
        },
      },
      (file) => {
        saved.push(file);
        const outcome = queue.shift();
        return outcome === undefined
          ? Promise.reject(new Error('no outcome left'))
          : Promise.resolve(outcome);
      },
    ),
  };
}

const SUCCESS = (): Promise<ExportCapturesResult> =>
  Promise.resolve({ kind: 'success', exported: EXPORTED });

describe('CapturesExportView', () => {
  it('starts idle', () => {
    expect(view(SUCCESS).view.state).toEqual({ kind: 'idle' });
  });

  it('reports exporting while the captures are gathered, and gathers once for a second press', async () => {
    const gathered = deferred<ExportCapturesResult>();
    const { view: exporting, exports } = view(() => gathered.promise);

    const first = exporting.export();
    const second = exporting.export();

    expect(exporting.state).toEqual({ kind: 'exporting' });
    gathered.resolve({ kind: 'success', exported: EXPORTED });
    await Promise.all([first, second]);
    expect(exports()).toBe(1);
  });

  it('saves the export as a JSON file under its suggested name', async () => {
    const { view: exporting, saved } = view(SUCCESS);

    await exporting.export();

    expect(saved).toEqual([FILE]);
  });

  it.each(['shared', 'downloaded'] as const)(
    'reports the counts once the file is %s',
    async (kind) => {
      const { view: exporting } = view(SUCCESS, [{ kind }]);

      await exporting.export();

      expect(exporting.state).toEqual({ kind: 'saved', summary: SUMMARY });
    },
  );

  it('returns to idle when the share sheet is dismissed', async () => {
    const { view: exporting } = view(SUCCESS, [{ kind: 'cancelled' }]);

    await exporting.export();

    expect(exporting.state).toEqual({ kind: 'idle' });
  });

  it('holds the file for a second tap when the share sheet needs a fresh activation', async () => {
    const { view: exporting } = view(SUCCESS, [{ kind: 'needs-another-tap' }]);

    await exporting.export();

    expect(exporting.state).toEqual({
      kind: 'needs-another-tap',
      file: FILE,
      summary: SUMMARY,
    });
  });

  it('saves the held file again on the second tap without gathering again', async () => {
    const {
      view: exporting,
      saved,
      exports,
    } = view(SUCCESS, [{ kind: 'needs-another-tap' }, { kind: 'shared' }]);
    await exporting.export();

    await exporting.saveAgain();

    expect(saved).toEqual([FILE, FILE]);
    expect(exports()).toBe(1);
    expect(exporting.state).toEqual({ kind: 'saved', summary: SUMMARY });
  });

  it('starts the second save before its first await, so the tap still counts', async () => {
    const { view: exporting, saved } = view(SUCCESS, [
      { kind: 'needs-another-tap' },
      { kind: 'shared' },
    ]);
    await exporting.export();

    const again = exporting.saveAgain();

    expect(saved).toHaveLength(2);
    await again;
  });

  it('saves nothing on a second tap that no refused share asked for', async () => {
    const { view: exporting, saved } = view(SUCCESS);

    await exporting.saveAgain();

    expect(saved).toEqual([]);
    expect(exporting.state).toEqual({ kind: 'idle' });
  });

  it('reports nothing to export with what was left out, and saves no file', async () => {
    const leftOut = {
      bookless: 2,
      unreadable: { books: 0, tags: 0, captures: 1 },
    };
    const { view: exporting, saved } = view(() =>
      Promise.resolve({ kind: 'nothing-to-export', ...leftOut }),
    );

    await exporting.export();

    expect(exporting.state).toEqual({ kind: 'nothing-to-export', leftOut });
    expect(saved).toEqual([]);
  });

  it('reports storage-unavailable when the browser blocks local storage', async () => {
    const { view: exporting } = view(() => Promise.resolve(STORAGE_UNAVAILABLE));

    await exporting.export();

    expect(exporting.state).toEqual({ kind: 'storage-unavailable' });
  });

  it('returns to idle and rethrows an unexpected failure', async () => {
    const failure = new Error('database closed');
    const { view: exporting } = view(() => Promise.reject(failure));

    await expect(exporting.export()).rejects.toBe(failure);
    expect(exporting.state).toEqual({ kind: 'idle' });
  });

  it('returns to idle and rethrows when the second save fails unexpectedly', async () => {
    const { view: exporting } = view(SUCCESS, [{ kind: 'needs-another-tap' }]);
    await exporting.export();

    await expect(exporting.saveAgain()).rejects.toThrow('no outcome left');
    expect(exporting.state).toEqual({ kind: 'idle' });
  });
});

describe('savedText', () => {
  it('counts the captures and books written', () => {
    expect(savedText(SUMMARY)).toBe('Exported 12 captures from 3 books.');
  });

  it('writes a single capture and book in the singular', () => {
    expect(savedText({ ...SUMMARY, captures: 1, books: 1 })).toBe(
      'Exported 1 capture from 1 book.',
    );
  });
});

describe('leftOutNotes', () => {
  it('says nothing when nothing was left out', () => {
    expect(leftOutNotes({ bookless: 0, unreadable: NONE_UNREADABLE })).toEqual([]);
  });

  it('names each kind of row that was left out', () => {
    expect(
      leftOutNotes({
        bookless: 2,
        unreadable: { books: 1, tags: 3, captures: 4 },
      }),
    ).toEqual([
      '2 captures belong to no book and were left out.',
      '4 stored captures could not be read and were left out.',
      '3 stored tags could not be read and were left out.',
      '1 stored book could not be read.',
    ]);
  });

  it('writes a single left-out capture in the singular', () => {
    expect(leftOutNotes({ bookless: 1, unreadable: NONE_UNREADABLE })).toEqual([
      '1 capture belongs to no book and was left out.',
    ]);
  });
});

describe('exportStatus', () => {
  it('shows nothing while idle or exporting', () => {
    expect(exportStatus({ kind: 'idle' })).toBeNull();
    expect(exportStatus({ kind: 'exporting' })).toBeNull();
  });

  it('reports a saved export as a success with what was left out', () => {
    expect(exportStatus({ kind: 'saved', summary: SUMMARY })).toEqual({
      variant: 'success',
      message: 'Exported 12 captures from 3 books.',
      notes: ['1 capture belongs to no book and was left out.'],
    });
  });

  it('says there is nothing to export, with what was left out', () => {
    expect(
      exportStatus({
        kind: 'nothing-to-export',
        leftOut: { bookless: 2, unreadable: NONE_UNREADABLE },
      }),
    ).toEqual({
      variant: 'info',
      message: 'There are no captures to export.',
      notes: ['2 captures belong to no book and were left out.'],
    });
  });

  it('asks for a tap on Save file when the share sheet needs one', () => {
    expect(exportStatus({ kind: 'needs-another-tap', file: FILE, summary: SUMMARY })).toMatchObject(
      {
        variant: 'info',
        message: expect.stringContaining('Tap Save file'),
      },
    );
  });

  it('warns when the browser blocks local storage', () => {
    expect(exportStatus({ kind: 'storage-unavailable' })).toMatchObject({
      variant: 'warning',
    });
  });
});
