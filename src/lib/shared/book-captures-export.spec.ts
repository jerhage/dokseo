import { describe, expect, it } from 'vitest';
import type { FileToSave, SaveFileOutcome } from '$lib/platform/files/save-file';
import { BookCapturesExport } from './book-captures-export.svelte';
import { ANOTHER_TAP_PROMPT } from './book-captures-export-rules';
import type { BookCapturesFile, BookCapturesFileRead } from './book-captures-export-rules';
import { bookId } from './ids';
import { STORAGE_UNAVAILABLE } from './storage-unavailable';

const BOOK = bookId('book-1');

const EXPORTED: BookCapturesFile = {
  file: {
    text: '{"format":"dokseo-captures"}',
    name: 'dokseo-captures-aria-2026-10-03.json',
    type: 'application/json',
  },
  captures: 4,
};

const READY: BookCapturesFileRead = { kind: 'success', exported: EXPORTED };

type Deferred<T> = {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

type Harness = {
  readonly view: BookCapturesExport;
  readonly saved: FileToSave[];
  readonly asked: string[];
};

function harness(
  read: (id: string) => Promise<BookCapturesFileRead> = () => Promise.resolve(READY),
  outcomes: readonly SaveFileOutcome[] = [{ kind: 'shared' }],
): Harness {
  const saved: FileToSave[] = [];
  const asked: string[] = [];
  const queue = [...outcomes];
  const view = new BookCapturesExport(
    {
      exportBookCaptures: (id) => {
        asked.push(id);
        return read(id);
      },
    },
    (file) => {
      saved.push(file);
      return Promise.resolve(queue.shift() ?? { kind: 'shared' });
    },
  );
  return { view, saved, asked };
}

describe('BookCapturesExport', () => {
  it('offers nothing before it is prepared', () => {
    const { view } = harness();

    expect(view.offer).toEqual({ kind: 'none' });
  });

  it('builds the file of the book it is prepared for and offers the export', async () => {
    const { view, asked } = harness();

    await view.prepare(BOOK);

    expect(asked).toEqual([BOOK]);
    expect(view.offer).toEqual({ kind: 'export', busy: false, confirmation: null });
  });

  it.each([{ kind: 'nothing-to-export' } as const, STORAGE_UNAVAILABLE])(
    'offers nothing when the read answers $kind',
    async (read) => {
      const { view } = harness(() => Promise.resolve(read));

      await view.prepare(BOOK);

      expect(view.offer).toEqual({ kind: 'none' });
    },
  );

  it('saves the prepared file and confirms how many captures it holds', async () => {
    const { view, saved } = harness();
    await view.prepare(BOOK);

    await view.save();

    expect(saved).toEqual([EXPORTED.file]);
    expect(view.offer).toEqual({ kind: 'export', busy: false, confirmation: 'Saved 4 captures.' });
  });

  it('saves nothing before the file is prepared', async () => {
    const { view, saved } = harness();

    await view.save();

    expect(saved).toEqual([]);
  });

  it('returns to the plain offer when the reader cancels the share sheet', async () => {
    const { view } = harness(undefined, [{ kind: 'cancelled' }]);
    await view.prepare(BOOK);

    await view.save();

    expect(view.state).toEqual({ kind: 'ready', exported: EXPORTED });
  });

  it('asks for another tap and saves the same file on it', async () => {
    const { view, saved } = harness(undefined, [{ kind: 'needs-another-tap' }, { kind: 'shared' }]);
    await view.prepare(BOOK);

    await view.save();
    const asking = view.offer;
    await view.save();

    expect(asking).toEqual({ kind: 'another-tap', prompt: ANOTHER_TAP_PROMPT });
    expect(saved).toEqual([EXPORTED.file, EXPORTED.file]);
    expect(view.state).toEqual({ kind: 'saved', exported: EXPORTED });
  });

  it('shows the export as busy while the file is saving', async () => {
    const pending = deferred<SaveFileOutcome>();
    const view = new BookCapturesExport(
      { exportBookCaptures: () => Promise.resolve(READY) },
      () => pending.promise,
    );
    await view.prepare(BOOK);

    const saving = view.save();
    const busy = view.offer;
    pending.resolve({ kind: 'downloaded' });
    await saving;

    expect(busy).toEqual({ kind: 'export', busy: true, confirmation: null });
  });

  it('keeps the answer of the latest preparation when an earlier one settles last', async () => {
    const first = deferred<BookCapturesFileRead>();
    const answers = [first.promise, Promise.resolve<BookCapturesFileRead>(READY)];
    const { view } = harness(() => answers.shift() ?? Promise.resolve(READY));

    const stale = view.prepare(BOOK);
    await view.prepare(BOOK);
    first.resolve({ kind: 'nothing-to-export' });
    await stale;

    expect(view.state).toEqual({ kind: 'ready', exported: EXPORTED });
  });

  it('starts over when it is prepared again after a save', async () => {
    const { view } = harness();
    await view.prepare(BOOK);
    await view.save();

    await view.prepare(BOOK);

    expect(view.state).toEqual({ kind: 'ready', exported: EXPORTED });
  });

  it('prepares once when asked to ensure a file, keeping a saved confirmation', async () => {
    const { view, asked } = harness();

    await view.ensurePrepared(BOOK);
    await view.save();
    await view.ensurePrepared(BOOK);

    expect(asked).toEqual([BOOK]);
    expect(view.state).toEqual({ kind: 'saved', exported: EXPORTED });
  });

  it('offers nothing and rethrows when the read throws', async () => {
    const { view } = harness(() => Promise.reject(new Error('broken')));

    await expect(view.prepare(BOOK)).rejects.toThrow('broken');

    expect(view.offer).toEqual({ kind: 'none' });
  });

  it('keeps the file ready and rethrows when the save throws', async () => {
    const view = new BookCapturesExport({ exportBookCaptures: () => Promise.resolve(READY) }, () =>
      Promise.reject(new Error('no disk')),
    );
    await view.prepare(BOOK);

    await expect(view.save()).rejects.toThrow('no disk');

    expect(view.state).toEqual({ kind: 'ready', exported: EXPORTED });
  });
});
