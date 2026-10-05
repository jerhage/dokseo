import { describe, expect, it } from 'vitest';
import type { FileSelection } from '$lib/ui/components/file-selection';
import type { Capture } from '$lib/domains/recognition/domain/capture/capture';
import { regionAnchor } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, contentHash, imageIndex } from '$lib/shared/ids';
import type { CaptureId } from '$lib/shared/ids';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import type {
  ApplyCapturesImportResult,
  CapturesImportCounts,
  ConflictResolution,
} from '../use-cases/apply-captures-import';
import type {
  CaptureConflict,
  CapturesImportPlan,
  CapturesImportSummary,
} from '../use-cases/captures-import-plan';
import type { FileBook } from '../use-cases/captures-file';
import type { PreviewCapturesImportResult } from '../use-cases/preview-captures-import';
import {
  CapturesImportView,
  conflictsOf,
  resolutionOf,
  strategyOf,
} from './captures-import.svelte';
import type { ImportFile } from './captures-import.svelte';

const BOOK: FileBook = {
  key: 'book-1',
  contentHash: contentHash('0123456789abcdef0123456789abcdef'),
  fileName: 'volume-1.cbz',
  title: 'Volume 1',
  alias: null,
  seriesId: null,
  volume: null,
  language: 'ja',
  direction: 'rtl',
  layoutKind: 'paged',
  sourceKind: 'archive',
  imageCount: 100,
};

function capture(id: string, fields: Partial<Capture> = {}): Capture {
  return {
    id: captureId(id),
    bookId: bookId('device-book'),
    anchor: regionAnchor([{ index: imageIndex(2), rect: pageRect(0.001, 0.002, 0.003, 0.004) }]),
    text: `device text of ${id}`,
    origin: 'recognized',
    confidence: null,
    note: `device note of ${id}`,
    createdAt: 100,
    editedAt: null,
    tagIds: [],
    ...fields,
  } as Capture;
}

function conflict(id: string): CaptureConflict {
  const device = capture(id);
  return {
    id: device.id,
    book: BOOK,
    device,
    file: { ...device, text: `file text of ${id}`, editedAt: 200 },
    tagIds: [],
    onAnotherBook: false,
  };
}

const SUMMARY: CapturesImportSummary = {
  added: 1,
  identical: 0,
  tagsOnly: 0,
  conflicts: 2,
  onAnotherBook: 0,
  notOnThisDevice: { books: 0, captures: 0 },
  newTags: 0,
  unreadable: 0,
  droppedTags: 0,
  storedUnreadable: 0,
};

const FIRST = conflict('first');
const SECOND = conflict('second');

const PLAN: CapturesImportPlan = {
  books: [],
  records: [],
  tags: [],
  captures: [
    { kind: 'new', capture: capture('fresh'), onShelf: true },
    { kind: 'conflict', conflict: FIRST },
    { kind: 'conflict', conflict: SECOND },
  ],
  summary: SUMMARY,
  unreadable: [],
  droppedTags: [],
};

const COUNTS: CapturesImportCounts = { added: 1, updated: 1, kept: 1, held: 0, tagsCreated: 0 };

const EXPORT_TEXT = '{"format":"dokseo-captures"}';

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
  readonly view: CapturesImportView;
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
  const view = new CapturesImportView(
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

async function reviewing(): Promise<Harness> {
  const opened = await previewing();
  opened.view.pickStrategy('review');
  return opened;
}

function choicesOf(resolution: ConflictResolution | undefined): ReadonlyMap<CaptureId, unknown> {
  if (resolution?.kind !== 'review') throw new Error(`not a review: ${resolution?.kind}`);
  return resolution.choices;
}

describe('CapturesImportView', () => {
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

  it('previews the plan with the newer edit chosen and nothing reviewed', async () => {
    const { view, applies } = await previewing();

    expect(view.state).toEqual({
      kind: 'preview',
      plan: PLAN,
      strategy: 'newer',
      choices: new Map(),
    });
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

  it('applies with the newer edit by default', async () => {
    const { view, applies } = await previewing();

    await view.importNow();

    expect(applies).toEqual([{ kind: 'newer' }]);
  });

  it("applies keeping this device's version when that is chosen", async () => {
    const { view, applies } = await previewing();

    view.pickStrategy('this-device');
    await view.importNow();

    expect(applies).toEqual([{ kind: 'this-device' }]);
  });

  it('reports importing while the plan is written', async () => {
    const written = deferred<ApplyCapturesImportResult>();
    const opened = harness(undefined, () => written.promise);
    await opened.view.choose(chosen(jsonFile()));

    const importing = opened.view.importNow();

    expect(opened.view.state).toEqual({ kind: 'importing' });
    written.resolve({ kind: 'imported', counts: COUNTS });
    await importing;
  });

  it('reports the counts and refreshes the cache after an import', async () => {
    const { view, refreshes } = await previewing();

    await view.importNow();

    expect(view.state).toEqual({ kind: 'imported', counts: COUNTS });
    expect(refreshes()).toBe(1);
  });

  it('refreshes the cache when the import stops at a refused write', async () => {
    const opened = harness(undefined, () => Promise.resolve(STORAGE_UNAVAILABLE));
    await opened.view.choose(chosen(jsonFile()));

    await opened.view.importNow();

    expect(opened.view.state).toEqual({ kind: 'storage-unavailable' });
    expect(opened.refreshes()).toBe(1);
  });

  it('returns to idle, refreshes and rethrows an unexpected import failure', async () => {
    const failure = new Error('quota');
    const opened = harness(undefined, () => Promise.reject(failure));
    await opened.view.choose(chosen(jsonFile()));

    await expect(opened.view.importNow()).rejects.toBe(failure);
    expect(opened.view.state).toEqual({ kind: 'idle' });
    expect(opened.refreshes()).toBe(1);
  });

  it('refreshes nothing before an import', async () => {
    const { refreshes } = await previewing();

    expect(refreshes()).toBe(0);
  });

  it('moves to reviewing on Review all and back to a preview on another choice', async () => {
    const { view } = await reviewing();

    expect(view.state).toMatchObject({ kind: 'reviewing', draft: null });
    expect(view.strategy).toBe('review');
    view.pickStrategy('this-device');
    expect(view.state).toMatchObject({ kind: 'preview', strategy: 'this-device' });
  });

  it('keeps the reviewed choices across a switch away from Review all and back', async () => {
    const { view } = await reviewing();
    view.pick(FIRST.id, 'file');

    view.pickStrategy('newer');
    view.pickStrategy('review');

    expect(view.state).toMatchObject({ choices: new Map([[FIRST.id, { kind: 'file' }]]) });
  });

  it('applies each picked side, and leaves an unchosen conflict out of the choices', async () => {
    const { view, applies } = await reviewing();

    view.pick(FIRST.id, 'file');
    await view.importNow();

    expect(applies).toEqual([{ kind: 'review', choices: new Map([[FIRST.id, { kind: 'file' }]]) }]);
    expect(choicesOf(applies[0]).has(SECOND.id)).toBe(false);
  });

  it("opens an edit from this device's text and note", async () => {
    const { view } = await reviewing();

    view.edit(FIRST.id);

    expect(view.state).toMatchObject({
      draft: { id: FIRST.id, text: FIRST.device.text, note: 'device note of first' },
    });
  });

  it('opens an edit with an empty note for a capture that has none', async () => {
    const { id, bookId: book, anchor, text, createdAt, editedAt, tagIds } = capture('written');
    const written: Capture = {
      id,
      bookId: book,
      anchor,
      text,
      origin: 'written',
      createdAt,
      editedAt,
      tagIds,
    };
    const plan: CapturesImportPlan = {
      ...PLAN,
      captures: [{ kind: 'conflict', conflict: { ...FIRST, id: written.id, device: written } }],
    };
    const opened = harness(() => Promise.resolve({ kind: 'success', plan }));
    await opened.view.choose(chosen(jsonFile()));
    opened.view.pickStrategy('review');

    opened.view.edit(written.id);

    expect(opened.view.state).toMatchObject({ draft: { note: '' } });
  });

  it('applies a saved hand edit as the choice for its conflict', async () => {
    const { view, applies } = await reviewing();

    view.edit(FIRST.id);
    view.draftText('hand text');
    view.draftNote('hand note');
    view.saveDraft();
    await view.importNow();

    expect(applies).toEqual([
      {
        kind: 'review',
        choices: new Map([[FIRST.id, { kind: 'edit', text: 'hand text', note: 'hand note' }]]),
      },
    ]);
  });

  it('reopens a saved edit from the edit, not from this device', async () => {
    const { view } = await reviewing();
    view.edit(FIRST.id);
    view.draftText('hand text');
    view.saveDraft();

    view.edit(FIRST.id);

    expect(view.state).toMatchObject({ draft: { text: 'hand text' } });
  });

  it('drops a cancelled edit and keeps the earlier choice', async () => {
    const { view, applies } = await reviewing();
    view.pick(FIRST.id, 'device');
    view.edit(FIRST.id);
    view.draftText('abandoned');

    view.cancelDraft();
    await view.importNow();

    expect(view.state).toEqual({ kind: 'imported', counts: COUNTS });
    expect(applies).toEqual([
      { kind: 'review', choices: new Map([[FIRST.id, { kind: 'device' }]]) },
    ]);
  });

  it('ignores an unsaved draft when importing', async () => {
    const { view, applies } = await reviewing();
    view.edit(SECOND.id);
    view.draftText('never saved');

    await view.importNow();

    expect(choicesOf(applies[0]).size).toBe(0);
  });

  it('replaces a saved edit with a picked side', async () => {
    const { view, applies } = await reviewing();
    view.edit(FIRST.id);
    view.saveDraft();

    view.pick(FIRST.id, 'device');
    await view.importNow();

    expect(choicesOf(applies[0]).get(FIRST.id)).toEqual({ kind: 'device' });
  });

  it('opens no edit for an id that is not a conflict', async () => {
    const { view } = await reviewing();

    view.edit(captureId('fresh'));

    expect(view.state).toMatchObject({ draft: null });
  });

  it('applies nothing when no plan is held', async () => {
    const { view, applies } = harness();

    await view.importNow();

    expect(applies).toEqual([]);
    expect(view.state).toEqual({ kind: 'idle' });
  });
});

describe('resolutionOf', () => {
  it('builds each whole-file strategy and the reviewed choices', () => {
    const choices = new Map([[FIRST.id, { kind: 'file' } as const]]);

    expect(resolutionOf({ kind: 'preview', plan: PLAN, strategy: 'newer', choices })).toEqual({
      kind: 'newer',
    });
    expect(resolutionOf({ kind: 'preview', plan: PLAN, strategy: 'this-device', choices })).toEqual(
      { kind: 'this-device' },
    );
    expect(resolutionOf({ kind: 'reviewing', plan: PLAN, choices, draft: null })).toEqual({
      kind: 'review',
      choices,
    });
  });
});

describe('strategyOf', () => {
  it('reports the newer edit outside a preview', () => {
    expect(strategyOf({ kind: 'idle' })).toBe('newer');
  });
});

describe('conflictsOf', () => {
  it('lists only the conflicts, in plan order', () => {
    expect(conflictsOf(PLAN)).toEqual([FIRST, SECOND]);
  });
});
