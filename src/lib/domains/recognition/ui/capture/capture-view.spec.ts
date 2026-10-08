import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container, RecognitionNotices } from '$lib/container';
import type { Arrangement } from '$lib/shared/arrangement';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { TextQuote } from '$lib/shared/anchor';
import { pageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { Notice, Notify } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import { LOADING, readFailed, readReady } from '$lib/shared/read-state';
import { STORAGE_UNAVAILABLE } from '$lib/shared/storage-unavailable';
import { at } from '$lib/shared/testing/at';
import type { Capture } from '../../domain/capture/capture';
import { namedTag } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import { JAPANESE_OCR_MODEL, modelFootprint } from '../../domain/model/model-footprint';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizeRegionResult } from '../../use-cases/engine/recognize-region';
import { createTestQueryClient } from '$lib/shared/testing/query-client';
import { askedWrites } from '$lib/shared/testing/unrun-write-query';
import type { EngineGateRead } from '../engine/engine-gate';
import { READ } from './capture-read';
import type { CaptureListing } from './capture-read';
import { CaptureView } from './capture-view.svelte';

vi.mock('$lib/shared/write-query.svelte', () => import('$lib/shared/testing/unrun-write-query'));

beforeEach(() => {
  askedWrites.splice(0);
});

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

type Reading = RecognizeRegionResult;

type Call = {
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly notices: RecognitionNotices;
  readonly settle: (reading: Reading) => void;
};

type Consent = {
  readonly granted: Set<Language>;
  readonly reads: Language[];
  readFails: boolean;
};

type Store = {
  rows: Capture[];
};

type Tags = {
  rows: readonly Tag[];
};

type Step = {
  readonly label: string;
  readonly name: string;
  readonly detail: Record<string, unknown>;
};

type Engine = {
  files: number;
  readonly prepares: Language[];
  readonly closes: Language[];
  failure: string | null;
  noModel: boolean;
  language: Language;
  reads: 'ready' | 'loading' | 'failed';
  reloads: number;
};

type Fakes = {
  readonly container: Container;
  readonly calls: Call[];
  readonly consent: Consent;
  readonly store: Store;
  readonly tags: Tags;
  readonly engine: Engine;
  readonly steps: Step[];
  readonly ended: string[];
  readonly notices: Notice[];
  readonly notify: Notify;
};

const OPENED_SESSION: RecognizerSession = {
  modelId: 'DigitalLarynx/manga-ocr-onnx',
  device: 'webgpu',
  fellBackFrom: null,
};

function unused(): never {
  throw new Error('The library is not used by the capture panel');
}

function fakes(granted: readonly Language[] = ['ja']): Fakes {
  const calls: Call[] = [];
  const consent: Consent = {
    granted: new Set(granted),
    reads: [],
    readFails: false,
  };

  const store: Store = { rows: [] };

  const tags: Tags = { rows: [] };

  const engine: Engine = {
    files: 0,
    prepares: [],
    closes: [],
    failure: null,
    noModel: false,
    language: 'ja',
    reads: 'ready',
    reloads: 0,
  };

  const steps: Step[] = [];
  const ended: string[] = [];

  const container: Container = {
    beginTrace: (label: string): Trace => ({
      step: (name: string, detail: Record<string, unknown>): void => {
        steps.push({ label, name, detail });
      },
      image: (): void => undefined,
      end: (): void => {
        ended.push(label);
      },
    }),
    catalog: {} as Container['catalog'],
    library: {
      openFile: unused,
      replaceBookFile: unused,
      openForReading: unused,
      listBooks: unused,
      readBook: unused,
      readCover: unused,
      readSource: unused,
      removeBook: unused,
      listRemovedBooks: unused,
      deleteRemovedBookCaptures: unused,
      removeBookAndCaptures: unused,
      mergeIntoBook: unused,
      exportBookCaptures: unused,
      editBook: unused,
      saveReadingPlace: unused,
      markFinished: unused,
      markUnread: unused,
      readLibrarySize: unused,
      readPageSizes: unused,
    },
    recognition: {
      readModelConsent: unused,
      grantModelConsent: unused,
      recognizeRegion: (language, _source, taken, _arrangement, notices = {}) =>
        new Promise<Reading>((resolve) => {
          calls.push({ language, regions: taken, notices, settle: resolve });
        }),
      listCaptures: (book: BookId) =>
        Promise.resolve({
          kind: 'success',
          captures: store.rows.filter((row) => row.bookId === book),
          unreadable: [],
        }),
      listEveryCapture: unused,
      saveCapture: unused,
      writeNote: unused,
      editCaptureText: unused,
      writeCaptureNote: unused,
      removeCapture: unused,
      restoreCapture: unused,
      removeUnreadableCaptures: unused,
      clearCaptures: unused,
      listTags: () => Promise.resolve({ kind: 'success', tags: tags.rows, unreadable: [] }),
      createTag: unused,
      addTagToCapture: unused,
      removeTagFromCapture: unused,
      renameTag: unused,
      recolourTag: unused,
      deleteTag: unused,
      removeUnreadableTags: unused,
      readModelStorage: unused,
      deleteModel: unused,
      readRecognizerSetup: unused,
      saveRecognizerSetup: unused,
      detectCompute: unused,
      prepareRecognizer: (language: Language, notices: RecognitionNotices = {}) => {
        engine.prepares.push(language);
        if (engine.failure !== null) {
          return Promise.resolve({ kind: 'unavailable' as const, cause: engine.failure });
        }

        notices.onSession?.(OPENED_SESSION);
        return Promise.resolve({ kind: 'success', session: OPENED_SESSION });
      },
      pauseModelLoad: unused,
      cancelModelLoad: unused,
      exportBookCaptures: () => Promise.resolve({ kind: 'nothing-to-export' }),
      exportUnreadableRows: () => ({ kind: 'nothing-to-export' }),
      closeRecognizer: (language: Language) => {
        engine.closes.push(language);
        return Promise.resolve();
      },
    },
    flowing: {
      readReadingSettings: unused,
      saveReadingSettings: unused,
    },
    storage: {
      readStorageAccount: unused,
      exportCaptures: unused,
      previewCapturesImport: unused,
      applyCapturesImport: unused,
    },
  };

  const notices: Notice[] = [];

  return {
    container,
    calls,
    consent,
    store,
    tags,
    engine,
    steps,
    ended,
    notices,
    notify: (notice) => {
      notices.push(notice);
    },
  };
}

const ONE = bookId('book-one');

const TWO = bookId('book-two');

function storedRow(id: string, book: BookId, text: string, createdAt: number): Capture {
  return {
    id: captureId(id),
    bookId: book,
    anchor: regionAnchor(regions(4)),
    text,
    note: null,
    confidence: null,
    origin: 'recognized',
    createdAt,
    editedAt: null,
    tagIds: [],
  };
}

function panelTexts(view: CaptureView): readonly string[] {
  return view.list.captures.map((capture) =>
    capture.status === 'done' ? capture.text.text : capture.status,
  );
}

function editedFlags(view: CaptureView): readonly boolean[] {
  return view.list.captures.map((capture) => capture.status === 'done' && capture.edited);
}

const source = {} as PageSource;

function gates(world: Fakes): readonly string[] {
  return world.steps
    .filter((step) => step.label === 'capture-gate')
    .map((step) => `${step.name} ${String(step.detail.gate ?? step.detail.guard)}`);
}

function regions(index = 13): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: pageRect(0, 0, 0.04, 0.02) }];
}

function read(view: CaptureView): Promise<void> {
  return view.recognize(source, 'ja', regions(), 'row');
}

function listingOf(world: Fakes, book: BookId | null): CaptureListing {
  return {
    state: READ,
    captures: world.store.rows.filter((row) => row.bookId === book),
    tags: world.tags.rows,
    unreadable: [],
    reload: () => undefined,
  };
}

function gateOf(world: Fakes): EngineGateRead {
  const { consent, engine } = world;
  const language = engine.language;
  const modelId = modelFootprint(language)?.modelId ?? 'none';
  const answered = <T>(value: T) =>
    engine.reads === 'ready'
      ? readReady(value)
      : engine.reads === 'failed'
        ? readFailed('The engine choice could not be read: gone')
        : LOADING;
  return {
    language,
    chosen: answered(engine.noModel ? null : modelFootprint(language)),
    get consent() {
      consent.reads.push(language);
      return answered(
        consent.readFails
          ? STORAGE_UNAVAILABLE
          : {
              kind: 'success' as const,
              decision: consent.granted.has(language)
                ? ('granted' as const)
                : ('undecided' as const),
            },
      );
    },
    storage: answered({
      kind: 'success' as const,
      snapshot: {
        report: {
          modelId,
          files: engine.files,
          bytes: engine.files * 1_000,
          unsized: 0,
          required: REQUIRED_WEIGHTS,
          weights: engine.files > 0 ? REQUIRED_WEIGHTS : [],
        },
        partial: { modelId, files: 0, bytes: 0 },
        usage: null,
        quota: null,
        persisted: false,
      },
    }),
    reload: () => {
      engine.reloads += 1;
    },
  };
}

function viewOf(world: Fakes): CaptureView {
  const view: CaptureView = new CaptureView(
    world.container,
    world.notify,
    createTestQueryClient(),
    () => listingOf(world, view.list.book),
    () => gateOf(world),
  );
  return view;
}

async function started(world: Fakes, index: number): Promise<Call> {
  for (let tick = 0; tick < 50 && world.calls.length <= index; tick += 1) {
    await Promise.resolve();
  }
  return at(world.calls, index);
}

describe('CaptureView', () => {
  it('appends a pending capture and settles it in place', async () => {
    const world = fakes();
    const view = viewOf(world);

    const running = read(view);
    const call = await started(world, 0);
    expect(view.list.captures.map((capture) => capture.status)).toEqual(['pending']);
    expect(at(view.list.captures, 0).anchor).toEqual(regionAnchor(regions()));

    call.settle({ kind: 'success', text: recognizedText('どうしたんだ') });
    await running;

    const settled = at(view.list.captures, 0);
    expect(view.list.captures).toHaveLength(1);
    expect(settled.status).toBe('done');
    expect(settled.status === 'done' ? settled.text.text : null).toBe('どうしたんだ');
  });

  it('keeps two captures apart when the replies arrive out of order', async () => {
    const world = fakes();
    const view = viewOf(world);

    const first = view.recognize(source, 'ja', regions(1), 'row');
    const second = view.recognize(source, 'ja', regions(2), 'row');

    (await started(world, 1)).settle({ kind: 'success', text: recognizedText('second') });
    await second;
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('first') });
    await first;

    const texts = view.list.captures.map((capture) =>
      capture.status === 'done' ? capture.text.text : capture.status,
    );
    expect(texts).toEqual(['first', 'second']);
  });

  it('maps each recognition failure to a sentence', async () => {
    const world = fakes();
    const view = viewOf(world);

    const failures: readonly [RecognizeRegionResult, string][] = [
      [
        { kind: 'nothing-selected' },
        'That box covered no part of a page, so there was nothing to crop.',
      ],
      [
        { kind: 'unreadable', cause: 'the canvas was tainted' },
        'That page could not be cropped: the canvas was tainted',
      ],
      [
        { kind: 'model-unavailable', cause: 'the worker died' },
        'The recognition model could not be loaded: the worker died',
      ],
      [
        { kind: 'recognition-failed', cause: 'onnx blew up' },
        'The recognizer failed: onnx blew up',
      ],
    ];

    for (const [index, [failure, sentence]] of failures.entries()) {
      const running = read(view);
      (await started(world, index)).settle(failure);
      await running;

      const capture = at(view.list.captures, index);
      expect(capture.status).toBe('failed');
      expect(capture.status === 'failed' ? capture.message : null).toBe(sentence);
    }
  });

  it('reports a no-text result as having read nothing rather than as a failure', async () => {
    const world = fakes();
    const view = viewOf(world);

    const running = read(view);
    (await started(world, 0)).settle({ kind: 'no-text' });
    await running;

    expect(at(view.list.captures, 0).status).toBe('empty');
  });

  it('forgets the session when the reader opens another book', async () => {
    const world = fakes();
    const view = viewOf(world);

    const running = read(view);
    const call = await started(world, 0);
    call.notices.onSession?.({
      modelId: 'DigitalLarynx/manga-ocr-onnx',
      device: 'wasm',
      fellBackFrom: null,
    });
    call.settle({ kind: 'success', text: recognizedText('done') });
    await running;

    view.open(TWO);
    expect(view.warmup.session).toBeNull();
  });

  it('starts nothing when the selection holds no region', async () => {
    const world = fakes();
    const view = viewOf(world);

    await view.recognize(source, 'ja', [], 'row');

    expect(world.calls).toEqual([]);
    expect(view.list.captures).toEqual([]);
  });

  it('orders the newest capture first for the panel', async () => {
    const world = fakes();
    const view = viewOf(world);

    const first = view.recognize(source, 'ja', regions(1), 'row');
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('older') });
    await first;

    const second = view.recognize(source, 'ja', regions(2), 'row');
    (await started(world, 1)).settle({ kind: 'success', text: recognizedText('newer') });
    await second;

    const shown = view.list.newestFirst.map((capture) =>
      capture.status === 'done' ? capture.text.text : capture.status,
    );
    expect(shown).toEqual(['newer', 'older']);
  });

  const UNAGREED_LANGUAGES: readonly (readonly [string, Language, Arrangement])[] = [
    ['a large model', 'ja', 'row'],
    ['a small model', 'ko', 'column'],
  ];

  it.each(UNAGREED_LANGUAGES)(
    'starts no recognition and asks for agreement to %s the reader has not agreed to',
    async (_size, language, arrangement) => {
      const world = fakes([]);
      world.engine.language = language;
      const view = viewOf(world);

      await view.recognize(source, language, regions(), arrangement);

      expect(world.calls).toEqual([]);
      expect(view.list.captures).toEqual([]);
      expect(view.consent.request?.language).toBe(language);
      expect(view.consent.request?.footprint).toEqual(modelFootprint(language));
    },
  );

  it('recognizes the selection it was holding when the reader agreed', async () => {
    const world = fakes([]);
    const view = viewOf(world);

    await view.recognize(source, 'ja', regions(7), 'row');
    expect(world.calls).toEqual([]);

    const running = view.agree();
    const call = await started(world, 0);
    expect(call.regions).toEqual(regions(7));

    call.settle({ kind: 'success', text: recognizedText('held') });
    await running;

    expect(view.consent.request).toBeNull();
    expect(askedWrites).toContain('ja');
    expect(at(view.list.captures, 0).anchor).toEqual(regionAnchor(regions(7)));
  });

  it('drops the consent request when the reader opens another book', async () => {
    const world = fakes([]);
    const view = viewOf(world);
    await read(view);

    view.open(TWO);

    expect(view.consent.request).toBeNull();
  });

  it('asks the reader and still recognizes when the decision cannot be stored', async () => {
    const world = fakes([]);
    world.consent.readFails = true;
    const view = viewOf(world);

    await read(view);
    expect(view.consent.request?.language).toBe('ja');

    const running = view.agree();
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('read anyway') });
    await running;

    expect(at(view.list.captures, 0).status).toBe('done');
  });

  it('names the gate that admitted each capture', async () => {
    const stored = fakes(['ja']);
    const view = viewOf(stored);

    const first = read(view);
    (await started(stored, 0)).settle({ kind: 'success', text: recognizedText('first') });
    await first;

    const second = read(view);
    (await started(stored, 1)).settle({ kind: 'success', text: recognizedText('second') });
    await second;

    const unnamed = fakes([]);
    unnamed.engine.noModel = true;
    unnamed.engine.language = 'ko';
    const unreadable = viewOf(unnamed);
    const running = unreadable.recognize(source, 'ko', regions(), 'column');
    (await started(unnamed, 0)).settle({ kind: 'success', text: recognizedText('안녕') });
    await running;

    expect(gates(stored)).toEqual(['reading consent-stored', 'reading agreed-this-session']);
    expect(gates(unnamed)).toEqual(['reading nothing-to-download']);
  });

  it('names the guard that stopped each capture', async () => {
    const world = fakes([]);
    const view = viewOf(world);

    await view.recognize(source, 'ja', [], 'row');
    await read(view);
    view.consent.decline();
    await read(view);

    expect(gates(world)).toEqual([
      'stopped no-regions',
      'asking consent-dialog',
      'stopped declined-this-session',
    ]);
    expect(world.calls).toEqual([]);
  });

  it('closes the gate trace before the recognition it admits starts', async () => {
    const world = fakes(['ja']);
    const view = viewOf(world);

    const running = read(view);
    await started(world, 0);

    expect(world.ended).toEqual(['capture-gate']);

    at(world.calls, 0).settle({ kind: 'success', text: recognizedText('done') });
    await running;
  });

  const UNSTORED_READINGS: readonly (readonly [string, Reading, string])[] = [
    ['failed', { kind: 'nothing-selected' }, 'failed'],
    ['read no text', { kind: 'no-text' }, 'empty'],
  ];

  it.each(UNSTORED_READINGS)(
    'stores nothing for a capture that %s',
    async (_outcome, reading, status) => {
      const world = fakes();
      const view = viewOf(world);
      view.open(ONE);

      const running = read(view);
      (await started(world, 0)).settle(reading);
      await running;

      expect(at(view.list.captures, 0).status).toBe(status);
      expect(askedWrites).toEqual([]);
    },
  );

  it('asks to store a capture that settled as read, in the book that is open', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('これは保存される') });
    await running;

    expect(askedWrites).toEqual([
      {
        id: at(view.list.captures, 0).id,
        bookId: ONE,
        anchor: regionAnchor(regions()),
        text: 'これは保存される',
        confidence: null,
        origin: 'recognized',
      },
    ]);
  });

  it('asks to store nothing for a capture read while no book is open', async () => {
    const world = fakes();
    const view = viewOf(world);

    const running = read(view);
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('どこにも') });
    await running;

    expect(at(view.list.captures, 0).status).toBe('done');
    expect(askedWrites).toEqual([]);
  });

  it('shows a stored capture that was edited in an earlier session as edited', () => {
    const world = fakes();
    world.store.rows = [{ ...storedRow('a', ONE, 'corrected', 1), editedAt: 42 }];
    const view = viewOf(world);

    view.open(ONE);

    expect(editedFlags(view)).toEqual([true]);
  });

  const UNCHANGING_EDITS: readonly (readonly [string, string])[] = [
    ['is blank', '   \n  '],
    ['changes no text', '  model reading  '],
  ];

  it.each(UNCHANGING_EDITS)(
    'keeps the previous text and stores nothing for an edit that %s',
    async (_edit, typed) => {
      const world = fakes();
      world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
      const view = viewOf(world);
      view.open(ONE);

      expect(await view.edits.edit(captureId('a'), typed)).toBe('saved');
      expect(panelTexts(view)).toEqual(['model reading']);
      expect(editedFlags(view)).toEqual([false]);
      expect(askedWrites).toEqual([]);
    },
  );

  it('edits nothing for a capture that read no text', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle({ kind: 'no-text' });
    await running;

    expect(await view.edits.edit(at(view.list.captures, 0).id, 'typed over a blank card')).toBe(
      'saved',
    );
    expect(at(view.list.captures, 0).status).toBe('empty');
  });

  it('drops a capture the store never held from the list', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('保存できなかった') });
    await running;

    await view.removal.remove(at(view.list.captures, 0).id);

    expect(view.list.captures).toEqual([]);
  });
});

describe('CaptureView.engineRead', () => {
  it('holds a capture asked before the engine settings are read, and reads it once they are', async () => {
    const world = fakes(['ja']);
    world.engine.reads = 'loading';
    const view = viewOf(world);
    view.open(ONE);

    await view.recognize(source, 'ja', regions(5), 'row');
    expect(world.calls).toEqual([]);

    world.engine.reads = 'ready';
    const resumed = view.engineRead('ja');
    const call = await started(world, 0);
    call.settle({ kind: 'success', text: recognizedText('waited') });
    await resumed;

    expect(call.regions).toEqual(regions(5));
    expect(gates(world)).toEqual(['waiting engine-reads', 'reading consent-stored']);
  });

  it('reads no held capture once the reader has opened another book', async () => {
    const world = fakes(['ja']);
    world.engine.reads = 'loading';
    const view = viewOf(world);
    view.open(ONE);
    await view.recognize(source, 'ja', regions(5), 'row');

    view.open(TWO);
    world.engine.reads = 'ready';
    await view.engineRead('ja');

    expect(world.calls).toEqual([]);
  });

  it('opens the engine once the reads settle after a warm-up asked too early', async () => {
    const world = fakes();
    world.engine.files = 9;
    world.engine.reads = 'loading';
    const view = viewOf(world);
    view.open(ONE);

    await view.warm(ONE, 'ja');
    expect(world.engine.prepares).toEqual([]);

    world.engine.reads = 'ready';
    await view.engineRead('ja');

    expect(world.engine.prepares).toEqual(['ja']);
    expect(view.warmup.session).toEqual(OPENED_SESSION);
  });
});

describe('CaptureView.warm', () => {
  it('opens the engine on weights that are here although no grant was ever recorded, reading no consent record', async () => {
    const world = fakes([]);
    world.engine.files = 9;
    const view = viewOf(world);

    view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(world.engine.prepares).toEqual(['ja']);
    expect(view.warmup.session).toEqual(OPENED_SESSION);
    expect(view.warmup.engine.stored).toBe(true);
    expect(world.consent.reads).toEqual([]);
    expect(askedWrites).not.toContain('ja');
  });

  it('asks for no agreement on a later selection once it has opened the engine', async () => {
    const world = fakes([]);
    world.engine.files = 9;
    const view = viewOf(world);

    view.open(ONE);
    await view.warm(ONE, 'ja');

    void view.recognize(source, 'ja', regions(3), 'row');
    const call = await started(world, 0);

    expect(view.consent.request).toBeNull();
    expect(call.regions).toEqual(regions(3));
  });

  it('opens no engine for a book other than the one open', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = viewOf(world);

    view.open(ONE);
    await view.warm(TWO, 'ja');

    expect(world.engine.prepares).toEqual([]);
    expect(view.warmup.session).toBeNull();
  });

  it('opens the engine to the end when every capture is cleared while it opens', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = viewOf(world);
    view.open(ONE);

    const warming = view.warm(ONE, 'ja');
    void view.clearAll.clear();
    await warming;

    expect(view.warmup.session).toEqual(OPENED_SESSION);
    expect(view.warmup.engine.opening).toBe(false);
  });
});

describe('CaptureView.close', () => {
  it('closes the engine it opened when the reader leaves the book', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = viewOf(world);

    view.open(ONE);
    await view.warm(ONE, 'ja');
    view.close();

    expect(world.engine.closes).toEqual(['ja']);
    expect(view.warmup.session).toBeNull();
    expect(view.warmup.engine.stored).toBe(false);
  });

  it('drops the consent request when the reader leaves the book', async () => {
    const world = fakes([]);
    const view = viewOf(world);
    view.open(ONE);
    await read(view);

    view.close();

    expect(view.consent.request).toBeNull();
  });

  it('opens the engine again for the next book after the previous one closed it', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = viewOf(world);

    view.open(ONE);
    await view.warm(ONE, 'ja');
    view.close();

    view.open(TWO);
    await view.warm(TWO, 'ja');

    expect(world.engine.closes).toEqual(['ja']);
    expect(world.engine.prepares).toEqual(['ja', 'ja']);
    expect(view.warmup.session).toEqual(OPENED_SESSION);
  });

  it('drops every open draft when the reader leaves the book', () => {
    const world = fakes();
    world.store.rows = [storedRow('one', ONE, '先', 1)];
    const view = viewOf(world);
    view.open(ONE);
    view.drafts.open('text', captureId('one'), '先', null);

    view.close();

    expect(view.drafts.holds('text', captureId('one'))).toBe(false);
  });

  it('reads nothing when agreed to with no recognition waiting', async () => {
    const world = fakes([]);
    const view = viewOf(world);
    view.open(ONE);

    await view.agree();

    expect(world.calls).toEqual([]);
    expect(view.list.captures).toEqual([]);
  });
});

describe('CaptureView notes', () => {
  it('puts an empty written note in the panel at once', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    await view.recording.write(ONE, regions(5));

    const card = at(view.list.captures, 0);
    expect(card.origin).toBe('written');
    expect(card.status === 'done' ? card.text.text : null).toBe('');
    expect(card.anchor).toEqual(regionAnchor(regions(5)));
    expect(askedWrites).toEqual([{ id: card.id, book: ONE, anchor: regionAnchor(regions(5)) }]);
    expect(world.notices).toEqual([]);
  });

  it('stores nothing when the drag covered no page', () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    view.recording.note([]);

    expect(view.list.captures).toEqual([]);
    expect(askedWrites).toEqual([]);
  });

  it('opens the draft of each written note at once, and keeps it for the panel that comes', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    view.recording.note(regions());
    await view.recording.write(ONE, regions(5));

    const written = at(view.list.captures, 0).id;
    expect([view.drafts.holds('text', written), view.drafts.draft('text', written)]).toEqual([
      true,
      '',
    ]);
    expect(view.list.captures.map((card) => view.drafts.holds('text', card.id))).toEqual([
      true,
      true,
    ]);
  });

  it('closes the drafts of the book it leaves', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);
    await view.recording.write(ONE, regions());
    const written = at(view.list.captures, 0).id;

    view.open(TWO);

    expect(view.drafts.holds('text', written)).toBe(false);
  });

  it('keeps a note and a recognized capture apart in the glow', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle({ kind: 'success', text: recognizedText('どうしたんだ') });
    await running;
    await view.recording.write(ONE, regions(2));

    expect(view.list.read.map((capture) => capture.origin)).toEqual(['recognized', 'written']);
  });
});

const SFX = tagId('tag-sfx');

const KEIGO = tagId('tag-keigo');

function taggedRow(id: string, book: BookId, carried: readonly TagId[]): Capture {
  return { ...storedRow(id, book, 'こっちに来て', 1), tagIds: carried };
}

function sfxTag(): Tag {
  return namedTag(SFX, 'sfx', 'slate', 1);
}

async function tagging(world: Fakes, carried: readonly TagId[] = []): Promise<CaptureView> {
  world.store.rows = [taggedRow('a', ONE, carried)];
  const view = viewOf(world);
  view.open(ONE);

  return view;
}

function carriedBy(view: CaptureView): readonly TagId[] {
  return at(view.list.captures, 0).tagIds;
}

describe('CaptureView lifted passages', () => {
  const CFI = 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)';

  const QUOTE: TextQuote = {
    exact: 'こっちに来て',
    prefix: 'そして彼は',
    suffix: 'と言った',
  };

  it('puts a lifted passage in the panel at once, anchored to its cfi and chapter', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    await view.recording.keepLifted(ONE, CFI, QUOTE, '第一章');

    const card = at(view.list.captures, 0);
    expect(card.origin).toBe('lifted');
    expect(card.status === 'done' ? card.text.text : null).toBe('こっちに来て');
    expect(card.anchor).toEqual(textAnchor(CFI, QUOTE, '第一章'));
    expect(askedWrites).toEqual([
      {
        id: card.id,
        bookId: ONE,
        anchor: textAnchor(CFI, QUOTE, '第一章'),
        text: 'こっちに来て',
        origin: 'lifted',
      },
    ]);
  });

  it('names each capture the reader makes as the latest, and forgets it with the book', async () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    await view.recording.keepLifted(ONE, CFI, QUOTE, null);
    const lifted = view.list.latest;
    await view.recording.write(ONE, regions(5));
    const written = view.list.latest;
    const running = view.recognize(source, 'ja', regions(2), 'row');
    const call = await started(world, 0);
    const reading = view.list.latest;
    call.settle({ kind: 'success', text: recognizedText('ねこ') });
    await running;

    expect([lifted, written, reading]).toEqual(view.list.captures.map((capture) => capture.id));
    view.open(TWO);
    expect(view.list.latest).toBeNull();
  });

  it('stores nothing when no book is open', () => {
    const world = fakes();
    const view = viewOf(world);

    view.recording.lift(CFI, QUOTE, null);

    expect(view.list.captures).toEqual([]);
    expect(askedWrites).toEqual([]);
  });

  it('stores nothing for a selection that is only space', () => {
    const world = fakes();
    const view = viewOf(world);
    view.open(ONE);

    view.recording.lift(CFI, { exact: '  \n ', prefix: '', suffix: '' }, null);

    expect(view.list.captures).toEqual([]);
    expect(askedWrites).toEqual([]);
  });
});

describe('CaptureView tags', () => {
  it('holds the tags as soon as the book opens, so a tagged card shows its chips', () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    world.store.rows = [taggedRow('a', ONE, [SFX])];
    const view = viewOf(world);

    view.open(ONE);

    expect(view.tagging.tags.map((tag) => tag.name)).toEqual(['sfx']);
  });

  it('tags nothing and reports it when the capture was never stored', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world);

    await view.tagging.addTag(captureId('never-saved'), SFX);

    expect(at(world.store.rows, 0).tagIds).toEqual([]);
    expect(carriedBy(view)).toEqual([]);
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: 'The tag could not be added',
        message: 'This capture is not in storage.',
      },
    ]);
  });

  it('counts only the tags the open book carries', () => {
    const world = fakes();
    world.tags.rows = [sfxTag(), namedTag(KEIGO, 'keigo', 'clay', 2)];
    world.store.rows = [
      taggedRow('a', ONE, [SFX]),
      taggedRow('b', ONE, [SFX, KEIGO]),
      taggedRow('c', TWO, [SFX]),
    ];
    const view = viewOf(world);

    view.open(ONE);

    expect(view.tagging.bookCounts.get(SFX)).toBe(2);
    expect(view.tagging.bookCounts.get(KEIGO)).toBe(1);
  });
});
