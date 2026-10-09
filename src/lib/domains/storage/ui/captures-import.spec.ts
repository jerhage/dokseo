import { describe, expect, it } from 'vitest';
import type { FileSelection } from '$lib/ui/components/file-selection';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type {
  ApplyCapturesImportResult,
  ConflictResolution,
} from '../use-cases/apply-captures-import';
import type { PreviewCapturesImportResult } from '../use-cases/preview-captures-import';
import { CapturesImport } from './captures-import.svelte';
import type { ImportFile } from './captures-import.svelte';
import { COUNTS, PLAN } from './captures-import-fixtures';

const EXPORT_TEXT = '{"format":"dokseo-captures"}';

const NEWER: ConflictResolution = { kind: 'newer' };

function jsonFile(text = EXPORT_TEXT): ImportFile {
  return {
    name: 'dokseo-captures-2026-10-03.json',
    type: 'application/json',
    size: text.length,
    text: () => Promise.resolve(text),
  };
}

function chosen(file: ImportFile): FileSelection<ImportFile> {
  return { accepted: [file], rejected: [], arrived: [{ file, verdict: { kind: 'accepted' } }] };
}

function refused(file: ImportFile): FileSelection<ImportFile> {
  const reason = { kind: 'wrong-type' } as const;
  return { accepted: [], rejected: [{ file, reason }], arrived: [{ file, verdict: reason }] };
}

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
  readonly view: CapturesImport;
  readonly previews: string[];
  readonly applies: ConflictResolution[];
  readonly refreshes: () => number;
};

function harness(
  preview: () => Promise<PreviewCapturesImportResult> = () =>
    Promise.resolve({ kind: 'success', plan: PLAN }),
  apply: () => Promise<ApplyCapturesImportResult> = () =>
    Promise.resolve({ kind: 'imported', counts: COUNTS }),
): Harness {
  const previews: string[] = [];
  const applies: ConflictResolution[] = [];
  let refreshes = 0;
  const view = new CapturesImport(
    {
      previewCapturesImport: (text) => {
        previews.push(text);
        return preview();
      },
      applyCapturesImport: (_plan, resolution) => {
        applies.push(resolution);
        return apply();
      },
    },
    () => {
      refreshes += 1;
      return Promise.resolve();
    },
  );
  return { view, previews, applies, refreshes: () => refreshes };
}

async function previewing(): Promise<Harness> {
  const opened = harness();
  await opened.view.choose(chosen(jsonFile()));
  return opened;
}

describe('CapturesImport', () => {
  it('starts idle', () => {
    expect(harness().view.state).toEqual({ kind: 'idle' });
  });

  it('reports reading while the file is previewed, and reads once for a second choice', async () => {
    const previewed = deferred<PreviewCapturesImportResult>();
    const { view, previews } = harness(() => previewed.promise);

    const first = view.choose(chosen(jsonFile()));
    const second = view.choose(chosen(jsonFile()));
    await Promise.resolve();

    expect(view.state).toEqual({ kind: 'reading' });
    previewed.resolve({ kind: 'success', plan: PLAN });
    await Promise.all([first, second]);
    expect(previews).toEqual([EXPORT_TEXT]);
  });

  it('previews the plan and writes nothing', async () => {
    const { view, applies } = await previewing();

    expect(view.state).toEqual({ kind: 'preview', plan: PLAN });
    expect(applies).toEqual([]);
  });

  it('reports a file that is not an export', async () => {
    const { view } = harness(() => Promise.resolve({ kind: 'not-an-export' }));

    await view.choose(chosen(jsonFile('{}')));

    expect(view.state).toEqual({ kind: 'not-an-export' });
  });

  it('reports a file the type check refused as not an export, without reading it', async () => {
    const { view, previews } = harness();

    await view.choose(refused(jsonFile()));

    expect(view.state).toEqual({ kind: 'not-an-export' });
    expect(previews).toEqual([]);
  });

  it('stays idle when no file arrives', async () => {
    const { view } = harness();

    await view.choose({ accepted: [], rejected: [], arrived: [] });

    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('reports a file from a newer version with its version', async () => {
    const { view } = harness(() => Promise.resolve({ kind: 'newer-version', version: 2 }));

    await view.choose(chosen(jsonFile()));

    expect(view.state).toEqual({ kind: 'newer-version', version: 2 });
  });

  it('reports storage-unavailable when the preview cannot read this device', async () => {
    const { view } = harness(() => Promise.resolve(STORAGE_UNAVAILABLE));

    await view.choose(chosen(jsonFile()));

    expect(view.state).toEqual({ kind: 'storage-unavailable' });
  });

  it('returns to idle and rethrows an unexpected preview failure', async () => {
    const failure = new Error('database closed');
    const { view } = harness(() => Promise.reject(failure));

    await expect(view.choose(chosen(jsonFile()))).rejects.toBe(failure);
    expect(view.state).toEqual({ kind: 'idle' });
  });

  it('discards the preview on cancel without writing', async () => {
    const { view, applies } = await previewing();

    view.cancel();

    expect(view.state).toEqual({ kind: 'idle' });
    expect(applies).toEqual([]);
  });

  it('applies the plan with the resolution it is given', async () => {
    const { view, applies } = await previewing();

    await view.importNow({ kind: 'this-device' });

    expect(applies).toEqual([{ kind: 'this-device' }]);
  });

  it('reports importing while the plan is written', async () => {
    const written = deferred<ApplyCapturesImportResult>();
    const opened = harness(undefined, () => written.promise);
    await opened.view.choose(chosen(jsonFile()));

    const importing = opened.view.importNow(NEWER);

    expect(opened.view.state).toEqual({ kind: 'importing' });
    written.resolve({ kind: 'imported', counts: COUNTS });
    await importing;
  });

  it('reports the counts and refreshes the cache after an import', async () => {
    const { view, refreshes } = await previewing();

    await view.importNow(NEWER);

    expect(view.state).toEqual({ kind: 'imported', counts: COUNTS });
    expect(refreshes()).toBe(1);
  });

  it('refreshes the cache when the import stops at a refused write', async () => {
    const opened = harness(undefined, () => Promise.resolve(STORAGE_UNAVAILABLE));
    await opened.view.choose(chosen(jsonFile()));

    await opened.view.importNow(NEWER);

    expect(opened.view.state).toEqual({ kind: 'storage-unavailable' });
    expect(opened.refreshes()).toBe(1);
  });

  it('returns to idle, refreshes and rethrows an unexpected import failure', async () => {
    const failure = new Error('quota');
    const opened = harness(undefined, () => Promise.reject(failure));
    await opened.view.choose(chosen(jsonFile()));

    await expect(opened.view.importNow(NEWER)).rejects.toBe(failure);
    expect(opened.view.state).toEqual({ kind: 'idle' });
    expect(opened.refreshes()).toBe(1);
  });

  it('refreshes nothing before an import', async () => {
    const { refreshes } = await previewing();

    expect(refreshes()).toBe(0);
  });

  it('applies nothing when no plan is held', async () => {
    const { view, applies } = harness();

    await view.importNow(NEWER);

    expect(applies).toEqual([]);
    expect(view.state).toEqual({ kind: 'idle' });
  });
});
