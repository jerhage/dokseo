import { describe, expect, it } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container, RecognitionNotices } from '$lib/container';
import { regionAnchor, textAnchor } from '$lib/shared/anchor';
import type { Anchor, TextQuote } from '$lib/shared/anchor';
import { imageRect } from '$lib/shared/geometry';
import { bookId, captureId, imageIndex, tagId } from '$lib/shared/ids';
import type { BookId, CaptureId, TagId } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import { ACTION_NOTICE_MS } from '$lib/shared/notice';
import type { Notice, Notify } from '$lib/shared/notice';
import type { PageSource } from '$lib/shared/page-source';
import { err, ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { editedCapture, notedCapture, takenCapture } from '../../domain/capture/capture';
import type { Capture, CaptureDraft, NotableCapture } from '../../domain/capture/capture';
import type { CaptureError } from '../../domain/capture/capture-repository';
import { captureHolds } from '../../domain/capture/capture-results';
import { taggedCapture, untaggedCapture } from '../../domain/tag/capture-tags';
import { namedTag, sameTagName } from '../../domain/tag/tag';
import type { Tag } from '../../domain/tag/tag';
import type { TagError } from '../../domain/tag/tag-repository';
import type { CreateTagError } from '../../use-cases/tag/create-tag';
import type { ModelConsentDecision, ModelConsentError } from '../../domain/model/model-consent';
import { JAPANESE_OCR_MODEL, modelFootprint } from '../../domain/model/model-footprint';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizeRegionError } from '../../use-cases/engine/recognize-region';
import { CAPTURE_REMOVED, RESTORE_FAILED } from './capture-collection.svelte';
import { CaptureView } from './capture-view.svelte';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

type Reading = Result<RecognizedText, RecognizeRegionError>;

type Call = {
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly notices: RecognitionNotices;
  readonly settle: (reading: Reading) => void;
};

type Consent = {
  readonly granted: Set<Language>;
  readonly reads: Language[];
  readonly grants: Language[];
  readFails: boolean;
  grantFails: boolean;
};

type Listing = {
  readonly book: BookId;
  readonly release: () => void;
};

type Write = {
  readonly release: () => void;
};

type Store = {
  rows: Capture[];
  readonly listings: Listing[];
  readonly writes: Write[];
  readonly edits: string[];
  defer: boolean;
  deferWrites: boolean;
  listFails: boolean;
  saveFails: boolean;
  editFails: boolean;
  noteFails: boolean;
  removeFails: boolean;
  restoreFails: boolean;
  clearFails: boolean;
};

type Tags = {
  rows: readonly Tag[];
  readonly created: Tag[];
  listFails: boolean;
  createFails: boolean;
  attachFails: boolean;
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
  setupFails: boolean;
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
    grants: [],
    readFails: false,
    grantFails: false,
  };

  const store: Store = {
    rows: [],
    listings: [],
    writes: [],
    edits: [],
    defer: false,
    deferWrites: false,
    listFails: false,
    saveFails: false,
    editFails: false,
    noteFails: false,
    removeFails: false,
    restoreFails: false,
    clearFails: false,
  };

  function settled<T>(write: () => Result<T, CaptureError>): Promise<Result<T, CaptureError>> {
    if (!store.deferWrites) return Promise.resolve(write());

    return new Promise((resolve) => {
      store.writes.push({ release: () => resolve(write()) });
    });
  }

  const tags: Tags = {
    rows: [],
    created: [],
    listFails: false,
    createFails: false,
    attachFails: false,
  };

  function attached(capture: Capture): Promise<Result<Capture, CaptureError>> {
    if (tags.attachFails) {
      return Promise.resolve(err({ kind: 'storage-failed', cause: 'the quota is spent' }));
    }

    store.rows = store.rows.map((row) => (row.id === capture.id ? capture : row));
    return Promise.resolve(ok(capture));
  }

  const engine: Engine = {
    files: 0,
    prepares: [],
    closes: [],
    failure: null,
    setupFails: false,
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
    library: {
      openFile: unused,
      openForReading: unused,
      listBooks: unused,
      readBook: unused,
      readCover: unused,
      readSource: unused,
      removeBook: unused,
      editBook: unused,
      saveReadingPlace: unused,
      markFinished: unused,
      markUnread: unused,
      readLibrarySize: unused,
      readPageSizes: unused,
    },
    recognition: {
      readModelConsent: (
        language: Language,
      ): Promise<Result<ModelConsentDecision, ModelConsentError>> => {
        consent.reads.push(language);
        if (consent.readFails) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the store is blocked' }));
        }
        return Promise.resolve(ok(consent.granted.has(language) ? 'granted' : 'undecided'));
      },
      grantModelConsent: (language: Language): Promise<Result<void, ModelConsentError>> => {
        consent.grants.push(language);
        if (consent.grantFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));
        consent.granted.add(language);
        return Promise.resolve(ok(undefined));
      },
      recognizeRegion: (language, _source, taken, _arrangement, notices = {}) =>
        new Promise<Reading>((resolve) => {
          calls.push({ language, regions: taken, notices, settle: resolve });
        }),
      listCaptures: (book: BookId): Promise<Result<readonly Capture[], CaptureError>> => {
        if (store.listFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        const held = store.rows.filter((row) => row.bookId === book);
        if (!store.defer) return Promise.resolve(ok(held));

        return new Promise((resolve) => {
          store.listings.push({ book, release: () => resolve(ok(held)) });
        });
      },
      listEveryCapture: (): Promise<Result<readonly Capture[], CaptureError>> => {
        if (store.listFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        return Promise.resolve(ok([...store.rows]));
      },
      saveCapture: (draft: CaptureDraft): Promise<Result<Capture, CaptureError>> => {
        if (store.saveFails) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the quota is spent' }));
        }
        const kept = takenCapture(draft, store.rows.length + 1);
        store.rows = [...store.rows, kept];
        return Promise.resolve(ok(kept));
      },
      writeNote: (
        id: CaptureId,
        book: BookId,
        taken: Anchor,
      ): Promise<Result<Capture, CaptureError>> => {
        if (store.saveFails) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the quota is spent' }));
        }

        const note = takenCapture(
          { id, bookId: book, anchor: taken, text: '', origin: 'written' },
          store.rows.length + 1,
        );
        store.rows = [...store.rows, note];
        return Promise.resolve(ok(note));
      },
      editCaptureText: (capture: Capture, text: string): Promise<Result<Capture, CaptureError>> => {
        store.edits.push(text);
        if (store.editFails) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the quota is spent' }));
        }

        const edited = editedCapture(capture, text, 99);
        return settled(() => {
          store.rows = store.rows.map((row) => (row.id === edited.id ? edited : row));
          return ok(edited);
        });
      },
      writeCaptureNote: <T extends NotableCapture>(
        capture: T,
        note: string,
      ): Promise<Result<T, CaptureError>> => {
        if (store.noteFails) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the quota is spent' }));
        }

        const noted = notedCapture(capture, note);
        store.rows = store.rows.map((row) => (row.id === noted.id ? noted : row));
        return Promise.resolve(ok(noted));
      },
      removeCapture: (capture: CaptureId): Promise<Result<void, CaptureError>> =>
        settled(() => {
          if (store.removeFails) return err({ kind: 'storage-failed', cause: 'the disk is busy' });

          store.rows = store.rows.filter((row) => row.id !== capture);
          return ok(undefined);
        }),
      restoreCapture: (capture: Capture): Promise<Result<void, CaptureError>> => {
        if (store.restoreFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        store.rows = [...store.rows.filter((row) => row.id !== capture.id), capture];
        return Promise.resolve(ok(undefined));
      },
      clearCaptures: (book: BookId): Promise<Result<void, CaptureError>> => {
        if (store.clearFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        store.rows = store.rows.filter((row) => row.bookId !== book);
        return Promise.resolve(ok(undefined));
      },
      listTags: (): Promise<Result<readonly Tag[], TagError>> => {
        if (tags.listFails) return Promise.resolve(err({ kind: 'storage-unavailable' }));

        return Promise.resolve(ok(tags.rows));
      },
      createTag: (id: TagId, name: string): Promise<Result<Tag, CreateTagError>> => {
        const taken = tags.rows.find((tag) => sameTagName(tag.name, name));
        if (taken !== undefined) return Promise.resolve(err({ kind: 'name-taken', tag: taken }));
        if (tags.createFails) {
          return Promise.resolve(err({ kind: 'storage-failed', cause: 'the quota is spent' }));
        }

        const made = namedTag(id, name, 'slate', tags.rows.length + 1);
        tags.rows = [...tags.rows, made];
        tags.created.push(made);
        return Promise.resolve(ok(made));
      },
      addTagToCapture: (capture: Capture, tag: TagId) => attached(taggedCapture(capture, tag)),
      removeTagFromCapture: (capture: Capture, tag: TagId) =>
        attached(untaggedCapture(capture, tag)),
      renameTag: () => Promise.reject(new Error('not used')),
      recolourTag: () => Promise.reject(new Error('not used')),
      deleteTag: () => Promise.reject(new Error('not used')),
      readModelStorage: (modelId: string) =>
        Promise.resolve(
          ok({
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
          }),
        ),
      deleteModel: unused,
      readRecognizerSetup: (language: Language) =>
        Promise.resolve(
          engine.setupFails
            ? err({ kind: 'storage-unavailable' as const })
            : ok({ model: modelFootprint(language), compute: 'auto' as const }),
        ),
      saveRecognizerSetup: unused,
      detectCompute: unused,
      prepareRecognizer: (language: Language, notices: RecognitionNotices = {}) => {
        engine.prepares.push(language);
        if (engine.failure !== null) {
          return Promise.resolve(err({ kind: 'unavailable' as const, cause: engine.failure }));
        }

        notices.onSession?.(OPENED_SESSION);
        return Promise.resolve(ok(OPENED_SESSION));
      },
      pauseModelLoad: unused,
      cancelModelLoad: unused,
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
  return view.captures.map((capture) =>
    capture.status === 'done' ? capture.text.text : capture.status,
  );
}

function panelNotes(view: CaptureView): readonly (string | null)[] {
  return view.captures.map((capture) => (capture.origin === 'written' ? null : capture.note));
}

function storedNotes(world: Fakes): readonly (string | null)[] {
  return world.store.rows.map((row) => (row.origin === 'written' ? null : row.note));
}

function told(world: Fakes): readonly string[] {
  return world.notices.map((notice) => `${notice.tone}: ${notice.title}`);
}

function editedFlags(view: CaptureView): readonly boolean[] {
  return view.captures.map((capture) => capture.status === 'done' && capture.edited);
}

const source = {} as PageSource;

function gates(world: Fakes): readonly string[] {
  return world.steps
    .filter((step) => step.label === 'capture-gate')
    .map((step) => `${step.name} ${String(step.detail.gate ?? step.detail.guard)}`);
}

function regions(index = 13): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(0, 0, 40, 20) }];
}

function read(view: CaptureView): Promise<void> {
  return view.recognize(source, 'ja', regions(), 'row');
}

async function settle(): Promise<void> {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
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
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    const call = await started(world, 0);
    expect(view.captures.map((capture) => capture.status)).toEqual(['pending']);
    expect(at(view.captures, 0).anchor).toEqual(regionAnchor(regions()));

    call.settle(ok(recognizedText('どうしたんだ')));
    await running;

    const settled = at(view.captures, 0);
    expect(view.captures).toHaveLength(1);
    expect(settled.status).toBe('done');
    expect(settled.status === 'done' ? settled.text.text : null).toBe('どうしたんだ');
  });

  it('keeps two captures apart when the replies arrive out of order', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const first = view.recognize(source, 'ja', regions(1), 'row');
    const second = view.recognize(source, 'ja', regions(2), 'row');

    (await started(world, 1)).settle(ok(recognizedText('second')));
    await second;
    (await started(world, 0)).settle(ok(recognizedText('first')));
    await first;

    const texts = view.captures.map((capture) =>
      capture.status === 'done' ? capture.text.text : capture.status,
    );
    expect(texts).toEqual(['first', 'second']);
  });

  it('leaves a settled capture untouched when its reply arrives after a clear', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    const call = await started(world, 0);
    view.clear();
    call.settle(ok(recognizedText('late')));
    await running;

    expect(view.captures).toEqual([]);
  });

  it('maps each recognition failure to a sentence', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const failures: readonly [RecognizeRegionError, string][] = [
      [
        { kind: 'crop', error: { kind: 'nothing-selected' } },
        'That box covered no part of a page, so there was nothing to crop.',
      ],
      [
        { kind: 'crop', error: { kind: 'unreadable', cause: 'the canvas was tainted' } },
        'That page could not be cropped: the canvas was tainted',
      ],
      [
        { kind: 'recognition', error: { kind: 'model-unavailable', cause: 'the worker died' } },
        'The recognition model could not be loaded: the worker died',
      ],
      [
        { kind: 'recognition', error: { kind: 'recognition-failed', cause: 'onnx blew up' } },
        'The recognizer failed: onnx blew up',
      ],
    ];

    for (const [index, [failure, sentence]] of failures.entries()) {
      const running = read(view);
      (await started(world, index)).settle(err(failure));
      await running;

      const capture = at(view.captures, index);
      expect(capture.status).toBe('failed');
      expect(capture.status === 'failed' ? capture.message : null).toBe(sentence);
    }
  });

  it('reports a no-text result as having read nothing rather than as a failure', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    (await started(world, 0)).settle(err({ kind: 'recognition', error: { kind: 'no-text' } }));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
  });

  it('reports an empty recognized line as having read nothing', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('   ')));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
  });

  it('stores the load progress and clears it when the recognition settles', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    expect(view.progress).toBeNull();

    const running = read(view);
    const call = await started(world, 0);
    call.notices.onProgress?.({ fraction: 0.42, source: 'network', loadedBytes: 0, totalBytes: 0 });
    expect(view.progress).toEqual({
      fraction: 0.42,
      source: 'network',
      loadedBytes: 0,
      totalBytes: 0,
    });

    call.settle(ok(recognizedText('done')));
    await running;
    expect(view.progress).toBeNull();
  });

  it('holds the load progress until the last capture in flight settles', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const first = read(view);
    const second = read(view);
    (await started(world, 0)).notices.onProgress?.({
      fraction: 0.5,
      source: 'cache',
      loadedBytes: 0,
      totalBytes: 0,
    });

    (await started(world, 0)).settle(ok(recognizedText('first')));
    await first;
    expect(view.progress).toEqual({
      fraction: 0.5,
      source: 'cache',
      loadedBytes: 0,
      totalBytes: 0,
    });

    (await started(world, 1)).settle(ok(recognizedText('second')));
    await second;
    expect(view.progress).toBeNull();
  });

  it('holds no session until the recognizer reports one', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    expect(view.session).toBeNull();

    const running = read(view);
    const call = await started(world, 0);
    expect(view.session).toBeNull();

    call.settle(ok(recognizedText('done')));
    await running;
    expect(view.session).toBeNull();
  });

  it('records the model and the device the recognizer opened its session on', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    const call = await started(world, 0);
    call.notices.onSession?.({
      modelId: 'DigitalLarynx/manga-ocr-onnx',
      device: 'webgpu',
      fellBackFrom: null,
    });

    call.settle(ok(recognizedText('done')));
    await running;
    expect(view.session).toEqual({
      modelId: 'DigitalLarynx/manga-ocr-onnx',
      device: 'webgpu',
      fellBackFrom: null,
    });
  });

  it('forgets the session when the reader opens another book', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    const call = await started(world, 0);
    call.notices.onSession?.({
      modelId: 'DigitalLarynx/manga-ocr-onnx',
      device: 'wasm',
      fellBackFrom: null,
    });
    call.settle(ok(recognizedText('done')));
    await running;

    await view.open(TWO);
    expect(view.session).toBeNull();
  });

  it('clears the list', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('one')));
    await running;
    expect(view.count).toBe(1);

    view.clear();
    expect(view.captures).toEqual([]);
    expect(view.count).toBe(0);
  });

  it('starts nothing when the selection holds no region', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    await view.recognize(source, 'ja', [], 'row');

    expect(world.calls).toEqual([]);
    expect(view.captures).toEqual([]);
  });

  it('orders the newest capture first for the panel', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    const first = view.recognize(source, 'ja', regions(1), 'row');
    (await started(world, 0)).settle(ok(recognizedText('older')));
    await first;

    const second = view.recognize(source, 'ja', regions(2), 'row');
    (await started(world, 1)).settle(ok(recognizedText('newer')));
    await second;

    const shown = view.newestFirst.map((capture) =>
      capture.status === 'done' ? capture.text.text : capture.status,
    );
    expect(shown).toEqual(['newer', 'older']);
  });

  it('reads and records no decision before a selection is committed', () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    expect(view.consentRequest).toBeNull();
    expect(world.consent.reads).toEqual([]);
    expect(world.consent.grants).toEqual([]);
  });

  it('starts no recognition for a language the reader has not agreed to', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    await read(view);

    expect(world.calls).toEqual([]);
    expect(view.captures).toEqual([]);
    expect(view.consentRequest?.language).toBe('ja');
    expect(view.consentRequest?.footprint).toEqual(modelFootprint('ja'));
  });

  it('asks before a selection fetches weights this device does not have', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');
    await read(view);

    expect(world.engine.prepares).toEqual([]);
    expect(world.calls).toEqual([]);
    expect(view.consentRequest?.language).toBe('ja');
  });

  it('recognizes the selection it was holding when the reader agreed', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    await view.recognize(source, 'ja', regions(7), 'row');
    expect(world.calls).toEqual([]);

    const running = view.agree();
    const call = await started(world, 0);
    expect(call.regions).toEqual(regions(7));

    call.settle(ok(recognizedText('held')));
    await running;

    expect(view.consentRequest).toBeNull();
    expect(world.consent.grants).toEqual(['ja']);
    expect(at(view.captures, 0).anchor).toEqual(regionAnchor(regions(7)));
  });

  it('discards the held selection and asks no second time when the reader declines', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    await read(view);
    view.decline();

    expect(view.consentRequest).toBeNull();
    expect(world.calls).toEqual([]);
    expect(view.captures).toEqual([]);
    expect(world.consent.grants).toEqual([]);

    await read(view);

    expect(view.consentRequest).toBeNull();
    expect(world.calls).toEqual([]);
  });

  it('asks once and recognizes a later selection without asking again', async () => {
    const world = fakes([]);
    const asked = new CaptureView(world.container, world.notify);

    await read(asked);
    const granting = asked.agree();
    (await started(world, 0)).settle(ok(recognizedText('first')));
    await granting;

    const later = new CaptureView(world.container, world.notify);
    const running = read(later);
    (await started(world, 1)).settle(ok(recognizedText('second')));
    await running;

    expect(later.consentRequest).toBeNull();
    expect(world.consent.grants).toEqual(['ja']);
    expect(at(later.captures, 0).status).toBe('done');
  });

  it('asks the reader and still recognizes when the decision cannot be stored', async () => {
    const world = fakes([]);
    world.consent.readFails = true;
    world.consent.grantFails = true;
    const view = new CaptureView(world.container, world.notify);

    await read(view);
    expect(view.consentRequest?.language).toBe('ja');

    const running = view.agree();
    (await started(world, 0)).settle(ok(recognizedText('read anyway')));
    await running;

    expect(at(view.captures, 0).status).toBe('done');
  });

  it('names the gate that admitted each capture', async () => {
    const stored = fakes(['ja']);
    const view = new CaptureView(stored.container, stored.notify);

    const first = read(view);
    (await started(stored, 0)).settle(ok(recognizedText('first')));
    await first;

    const second = read(view);
    (await started(stored, 1)).settle(ok(recognizedText('second')));
    await second;

    const unnamed = fakes([]);
    unnamed.engine.setupFails = true;
    const unreadable = new CaptureView(unnamed.container, unnamed.notify);
    const running = unreadable.recognize(source, 'ko', regions(), 'column');
    (await started(unnamed, 0)).settle(ok(recognizedText('안녕')));
    await running;

    expect(gates(stored)).toEqual(['reading consent-stored', 'reading agreed-this-session']);
    expect(gates(unnamed)).toEqual(['reading nothing-to-download']);
  });

  it('names the guard that stopped each capture', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    await view.recognize(source, 'ja', [], 'row');
    await read(view);
    view.decline();
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
    const view = new CaptureView(world.container, world.notify);

    const running = read(view);
    await started(world, 0);

    expect(world.ended).toEqual(['capture-gate']);

    at(world.calls, 0).settle(ok(recognizedText('done')));
    await running;
  });

  it('asks for agreement to a small model on the same terms as a large one', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container, world.notify);

    await view.recognize(source, 'ko', regions(), 'column');

    expect(view.consentRequest?.language).toBe('ko');
    expect(view.consentRequest?.footprint).toEqual(modelFootprint('ko'));
    expect(world.calls).toEqual([]);
  });

  it('loads the stored captures of the book it opens and no other book', async () => {
    const world = fakes();
    world.store.rows = [
      storedRow('a', ONE, 'from the first book', 1),
      storedRow('b', TWO, 'from the second book', 2),
      storedRow('c', ONE, 'also from the first book', 3),
    ];
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(panelTexts(view)).toEqual(['from the first book', 'also from the first book']);
    expect(view.newestFirst.map((capture) => capture.id)).toEqual(['c', 'a']);
  });

  it('reports a failed load in place of an empty panel and raises no toast', async () => {
    const world = fakes();
    world.store.listFails = true;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(view.captures).toEqual([]);
    expect(view.load).toEqual({
      kind: 'failed',
      message: 'This browser blocks local storage.',
    });
    expect(world.notices).toEqual([]);
  });

  it('reports a failed tag listing as a failed load and still lists the captures', async () => {
    const world = fakes();
    world.tags.listFails = true;
    world.store.rows = [storedRow('a', ONE, 'kept', 1)];
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(panelTexts(view)).toEqual(['kept']);
    expect(view.load.kind).toBe('failed');
  });

  it('marks the load as done when both listings succeed', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(view.load).toEqual({ kind: 'ready' });
  });

  it('lists the stored captures on a second try after a failed load', async () => {
    const world = fakes();
    world.store.listFails = true;
    world.store.rows = [storedRow('a', ONE, 'there all along', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    world.store.listFails = false;
    await view.reload();

    expect(panelTexts(view)).toEqual(['there all along']);
    expect(view.load).toEqual({ kind: 'ready' });
  });

  it('keeps an unstored card from this session when the second try lists the store', async () => {
    const world = fakes();
    world.store.listFails = true;
    world.store.saveFails = true;
    world.store.rows = [storedRow('a', ONE, 'older', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('newer')));
    await running;
    world.store.listFails = false;
    await view.reload();

    expect(panelTexts(view)).toEqual(['older', 'failed']);
  });

  it('shows a stored capture once when the second try lists it again', async () => {
    const world = fakes();
    world.store.listFails = true;
    world.store.rows = [storedRow('a', ONE, 'older', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('newer')));
    await running;
    world.store.listFails = false;
    await view.reload();

    expect(panelTexts(view)).toEqual(['older', 'newer']);
  });

  it('ignores a stale load that lands after the reader has opened another book', async () => {
    const world = fakes();
    world.store.defer = true;
    world.store.rows = [
      storedRow('a', ONE, 'from the first book', 1),
      storedRow('b', TWO, 'newer', 2),
    ];
    const view = new CaptureView(world.container, world.notify);

    const stale = view.open(ONE);
    const current = view.open(TWO);

    at(world.store.listings, 1).release();
    await current;
    at(world.store.listings, 0).release();
    await stale;

    expect(panelTexts(view)).toEqual(['newer']);
  });

  it('stores a capture that settled as read', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('これは保存される')));
    await running;

    expect(world.store.rows.map((row) => row.text)).toEqual(['これは保存される']);
    expect(at(world.store.rows, 0).bookId).toBe(ONE);
    expect(at(world.store.rows, 0).anchor).toEqual(regionAnchor(regions()));
  });

  it('stores nothing for a capture that failed', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(err({ kind: 'crop', error: { kind: 'nothing-selected' } }));
    await running;

    expect(at(view.captures, 0).status).toBe('failed');
    expect(world.store.rows).toEqual([]);
  });

  it('stores nothing for a capture that read no text', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(err({ kind: 'recognition', error: { kind: 'no-text' } }));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
    expect(world.store.rows).toEqual([]);
  });

  it('marks a capture it could not store as failed and reports it once', async () => {
    const world = fakes();
    world.store.saveFails = true;
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('読めたが保存できない')));
    await running;

    expect(at(view.captures, 0)).toMatchObject({
      status: 'failed',
      message: 'Not saved. Local storage failed: the quota is spent',
    });
    expect(world.store.rows).toEqual([]);
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: 'The capture could not be saved',
        message: 'Local storage failed: the quota is spent',
      },
    ]);
  });

  it('reports nothing when a capture is stored', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('保存できた')));
    await running;

    expect(world.notices).toEqual([]);
  });

  it('marks a capture whose save threw as failed with the thrown reason', async () => {
    const world = fakes();
    const view = new CaptureView(
      {
        ...world.container,
        recognition: {
          ...world.container.recognition,
          saveCapture: () => Promise.reject(new Error('the database closed')),
        },
      },
      world.notify,
    );
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('投げた')));
    await running;

    expect(at(view.captures, 0).status).toBe('failed');
    expect(world.notices.map((notice) => notice.message)).toEqual([
      'Local storage failed: the database closed',
    ]);
  });

  it('empties the list and the store of the open book when it is cleared', async () => {
    const world = fakes();
    world.store.rows = [storedRow('b', TWO, 'another book', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('一時的')));
    await running;
    expect(view.count).toBe(1);

    await view.clear();

    expect(view.captures).toEqual([]);
    expect(world.store.rows.map((row) => row.text)).toEqual(['another book']);
    expect(world.notices).toEqual([]);
  });

  it('puts every card back and reports it when the store refuses to clear', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1), storedRow('b', ONE, 'second', 2)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    world.store.clearFails = true;

    await view.clear();

    expect(panelTexts(view)).toEqual(['first', 'second']);
    expect(world.store.rows.map((row) => row.id)).toEqual(['a', 'b']);
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: 'Your captures could not be deleted',
        message: 'This browser blocks local storage.',
      },
    ]);
  });

  it('keeps writing to the cards that came back after a refused clear', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    world.store.clearFails = true;
    await view.clear();

    expect(await view.edit(captureId('a'), 'fixed')).toBe('saved');
    expect(world.store.rows.map((row) => row.text)).toEqual(['fixed']);
  });

  it('stores the edited text and shows it in place', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.edit(captureId('a'), 'the reader’s reading');

    expect(panelTexts(view)).toEqual(['the reader’s reading']);
    expect(world.store.rows.map((row) => row.text)).toEqual(['the reader’s reading']);
  });

  it('marks a capture the reader has edited', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    expect(editedFlags(view)).toEqual([false]);

    await view.edit(captureId('a'), 'corrected');

    expect(editedFlags(view)).toEqual([true]);
    expect(at(world.store.rows, 0).editedAt).toBe(99);
  });

  it('shows a stored capture that was edited in an earlier session as edited', async () => {
    const world = fakes();
    world.store.rows = [{ ...storedRow('a', ONE, 'corrected', 1), editedAt: 42 }];
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(editedFlags(view)).toEqual([true]);
  });

  it('keeps the previous text and stores nothing for a blank edit', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.edit(captureId('a'), '   \n  ');

    expect(panelTexts(view)).toEqual(['model reading']);
    expect(editedFlags(view)).toEqual([false]);
    expect(world.store.edits).toEqual([]);
  });

  it('stores nothing for an edit that changes no text', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.edit(captureId('a'), '  model reading  ');

    expect(panelTexts(view)).toEqual(['model reading']);
    expect(editedFlags(view)).toEqual([false]);
    expect(world.store.edits).toEqual([]);
  });

  it('edits nothing for a capture that read no text', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(err({ kind: 'recognition', error: { kind: 'no-text' } }));
    await running;

    await view.edit(at(view.captures, 0).id, 'typed over a blank card');

    expect(at(view.captures, 0).status).toBe('empty');
    expect(world.store.edits).toEqual([]);
  });

  it('keeps the stored text and reports it when the store refuses an edit', async () => {
    const world = fakes();
    world.store.editFails = true;
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const outcome = await view.edit(captureId('a'), 'corrected by hand');

    expect(outcome).toBe('failed');
    expect(panelTexts(view)).toEqual(['model reading']);
    expect(editedFlags(view)).toEqual([false]);
    expect(world.store.rows.map((row) => row.text)).toEqual(['model reading']);
    expect(told(world)).toEqual(['danger: The text could not be saved']);
  });

  it('reports a stored edit as saved and raises no toast', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    expect(await view.edit(captureId('a'), 'corrected by hand')).toBe('saved');
    expect(world.notices).toEqual([]);
  });

  it('writes the note onto the card and onto the record it keeps', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.annotate(captureId('a'), '  he is speaking to his sister  ');

    expect(panelNotes(view)).toEqual(['he is speaking to his sister']);
    expect(storedNotes(world)).toEqual(['he is speaking to his sister']);
  });

  it('leaves the recognized text and the edited mark alone when a note is written', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.annotate(captureId('a'), 'a thought');

    expect(panelTexts(view)).toEqual(['model reading']);
    expect(editedFlags(view)).toEqual([false]);
    expect(at(world.store.rows, 0).editedAt).toBeNull();
  });

  it('keeps the card as it was when the note cannot be stored', async () => {
    const world = fakes();
    world.store.noteFails = true;
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const outcome = await view.annotate(captureId('a'), 'a thought');

    expect(outcome).toBe('failed');
    expect(panelNotes(view)).toEqual([null]);
    expect(storedNotes(world)).toEqual([null]);
    expect(told(world)).toEqual(['danger: The note could not be saved']);
  });

  it('reports a stored note as saved and raises no toast', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'model reading', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    expect(await view.annotate(captureId('a'), 'a thought')).toBe('saved');
    expect(world.notices).toEqual([]);
  });

  it('writes no note for a capture the store never held', async () => {
    const world = fakes();
    world.store.saveFails = true;
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('保存できなかった')));
    await running;

    await view.annotate(at(view.captures, 0).id, 'a thought');

    expect(panelNotes(view)).toEqual([null]);
    expect(world.store.rows).toEqual([]);
  });

  it('drops a removed capture from the list and from the store', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1), storedRow('b', ONE, 'second', 2)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const outcome = await view.remove(captureId('a'));

    expect(outcome).toBe('saved');
    expect(panelTexts(view)).toEqual(['second']);
    expect(world.store.rows.map((row) => row.id)).toEqual(['b']);
  });

  it('offers Undo once a removal is stored', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.remove(captureId('a'));

    expect(world.notices).toEqual([
      {
        tone: 'success',
        title: CAPTURE_REMOVED,
        action: { label: 'Undo', run: expect.any(Function) },
        duration: ACTION_NOTICE_MS,
      },
    ]);
  });

  it('puts the card back at its place and stores its record again on Undo', async () => {
    const world = fakes();
    const middle = { ...storedRow('b', ONE, 'second', 2), note: 'a thought' };
    world.store.rows = [storedRow('a', ONE, 'first', 1), middle, storedRow('c', ONE, 'third', 3)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.remove(captureId('b'));

    at(world.notices, 0).action?.run();
    await settle();

    expect(panelTexts(view)).toEqual(['first', 'second', 'third']);
    expect(world.store.rows.find((row) => row.id === 'b')).toEqual(middle);
    expect(await view.edit(captureId('b'), 'fixed')).toBe('saved');
    expect(world.notices).toHaveLength(1);
  });

  it('reports an Undo the store refuses and leaves the card out', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1), storedRow('b', ONE, 'second', 2)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.remove(captureId('a'));
    world.store.restoreFails = true;

    at(world.notices, 0).action?.run();
    await settle();

    expect(panelTexts(view)).toEqual(['second']);
    expect(world.notices.at(-1)).toEqual({
      tone: 'danger',
      title: RESTORE_FAILED,
      message: 'This browser blocks local storage.',
    });
  });

  it('stores the record again but leaves the new book’s list alone on a late Undo', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1), storedRow('b', TWO, 'other', 2)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.remove(captureId('a'));
    await view.open(TWO);

    at(world.notices, 0).action?.run();
    await settle();

    expect(panelTexts(view)).toEqual(['other']);
    expect(world.store.rows.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('takes a card off the list before the store answers', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1), storedRow('b', ONE, 'second', 2)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    world.store.deferWrites = true;
    const removing = view.remove(captureId('a'));

    expect(panelTexts(view)).toEqual(['second']);
    at(world.store.writes, 0).release();
    await removing;
  });

  it('puts a card back in its place and reports it when the store refuses the removal', async () => {
    const world = fakes();
    world.store.rows = [
      storedRow('a', ONE, 'first', 1),
      storedRow('b', ONE, 'second', 2),
      storedRow('c', ONE, 'third', 3),
    ];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    world.store.removeFails = true;

    const outcome = await view.remove(captureId('b'));

    expect(outcome).toBe('failed');
    expect(panelTexts(view)).toEqual(['first', 'second', 'third']);
    expect(world.store.rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(world.notices).toEqual([
      {
        tone: 'danger',
        title: 'The capture could not be removed',
        message: 'Local storage failed: the disk is busy',
      },
    ]);
  });

  it('keeps writing to a card that came back after a refused removal', async () => {
    const world = fakes();
    world.store.rows = [storedRow('a', ONE, 'first', 1)];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    world.store.removeFails = true;
    await view.remove(captureId('a'));

    expect(await view.edit(captureId('a'), 'fixed')).toBe('saved');
    expect(world.store.rows.map((row) => row.text)).toEqual(['fixed']);
  });

  it('drops a capture the store never held from the list', async () => {
    const world = fakes();
    world.store.saveFails = true;
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('保存できなかった')));
    await running;

    await view.remove(at(view.captures, 0).id);

    expect(view.captures).toEqual([]);
  });

  it('ignores an edit reply that lands after the reader has opened another book', async () => {
    const world = fakes();
    world.store.rows = [
      storedRow('a', ONE, 'from the first book', 1),
      storedRow('b', TWO, 'from the second book', 2),
    ];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    world.store.deferWrites = true;
    const stale = view.edit(captureId('a'), 'edited late');
    await view.open(TWO);
    at(world.store.writes, 0).release();
    await stale;

    expect(panelTexts(view)).toEqual(['from the second book']);
    expect(editedFlags(view)).toEqual([false]);
  });

  it('ignores a removal reply that lands after the reader has opened another book', async () => {
    const world = fakes();
    world.store.rows = [
      storedRow('a', ONE, 'from the first book', 1),
      storedRow('b', TWO, 'from the second book', 2),
    ];
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    world.store.deferWrites = true;
    const stale = view.remove(captureId('a'));
    await view.open(TWO);
    at(world.store.writes, 0).release();
    await stale;

    expect(panelTexts(view)).toEqual(['from the second book']);
  });

  it('keeps a book’s stored captures when the reader leaves it', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('残る')));
    await running;

    view.close();
    expect(view.captures).toEqual([]);

    const returning = new CaptureView(world.container, world.notify);
    await returning.open(ONE);

    expect(panelTexts(returning)).toEqual(['残る']);
  });
});

describe('CaptureView.warm', () => {
  it('opens the engine when the book opens and the weights are already here', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(world.engine.prepares).toEqual(['ja']);
    expect(view.session).toEqual(OPENED_SESSION);
    expect(view.engine.stored).toBe(true);
  });

  it('opens nothing when the weights are not on this device', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(world.engine.prepares).toEqual([]);
    expect(view.session).toBeNull();
    expect(view.engine.stored).toBe(false);
  });

  it('opens the engine on weights that are here although no grant was ever recorded', async () => {
    const world = fakes([]);
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(world.engine.prepares).toEqual(['ja']);
    expect(view.session).toEqual(OPENED_SESSION);
    expect(view.engine.stored).toBe(true);
  });

  it('reads no consent record on the way to opening weights that are here', async () => {
    const world = fakes([]);
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(world.consent.reads).toEqual([]);
    expect(world.consent.grants).toEqual([]);
  });

  it('reports the weights as absent and opens nothing when only the grant is here', async () => {
    const world = fakes(['ja']);
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(world.engine.prepares).toEqual([]);
    expect(view.engine.stored).toBe(false);
  });

  it('asks for no agreement on a later selection once it has opened the engine', async () => {
    const world = fakes([]);
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    void view.recognize(source, 'ja', regions(3), 'row');
    const call = await started(world, 0);

    expect(view.consentRequest).toBeNull();
    expect(call.regions).toEqual(regions(3));
  });

  it('opens the engine once for one book however often the reader asks', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');
    await view.warm(ONE, 'ja');

    expect(world.engine.prepares).toEqual(['ja']);
  });

  it('names the failure rather than a session when the engine will not open', async () => {
    const world = fakes();
    world.engine.files = 9;
    world.engine.failure = 'the worker died';
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');

    expect(view.session).toBeNull();
    expect(view.engineFailure).toBe('the worker died');
  });
});

describe('CaptureView.close', () => {
  it('closes the engine it opened when the reader leaves the book', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');
    view.close();

    expect(world.engine.closes).toEqual(['ja']);
    expect(view.session).toBeNull();
    expect(view.engine.stored).toBe(false);
  });

  it('closes nothing when no engine was ever opened', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');
    view.close();

    expect(world.engine.closes).toEqual([]);
  });

  it('opens the engine again for the next book after the previous one closed it', async () => {
    const world = fakes();
    world.engine.files = 9;
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.warm(ONE, 'ja');
    view.close();

    await view.open(TWO);
    await view.warm(TWO, 'ja');

    expect(world.engine.closes).toEqual(['ja']);
    expect(world.engine.prepares).toEqual(['ja', 'ja']);
    expect(view.session).toEqual(OPENED_SESSION);
  });
});

describe('CaptureView notes', () => {
  it('puts an empty written note in the panel and in the store', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.write(ONE, regions(5));

    const card = at(view.captures, 0);
    expect(card.origin).toBe('written');
    expect(card.status === 'done' ? card.text.text : null).toBe('');
    expect(card.anchor).toEqual(regionAnchor(regions(5)));

    const row = at(world.store.rows, 0);
    expect(row.origin).toBe('written');
    expect(row.text).toBe('');
    expect(row.bookId).toBe(ONE);
    expect(row.anchor).toEqual(regionAnchor(regions(5)));
    expect(world.notices).toEqual([]);
  });

  it('marks a note it could not store as failed, offers no editor and reports it once', async () => {
    const world = fakes();
    world.store.saveFails = true;
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const writing = view.write(ONE, regions(5));
    const written = at(view.captures, 0).id;
    expect(view.drafts.holds('text', written)).toBe(true);
    await writing;

    expect(at(view.captures, 0)).toMatchObject({ origin: 'written', status: 'failed' });
    expect(view.drafts.holds('text', written)).toBe(false);
    expect(told(world)).toEqual(['danger: The note could not be saved']);
  });

  it('stores nothing when no book is open', () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    view.note(regions());

    expect(view.captures).toEqual([]);
    expect(world.store.rows).toEqual([]);
  });

  it('stores nothing when the drag covered no page', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    view.note([]);

    expect(view.captures).toEqual([]);
    expect(world.store.rows).toEqual([]);
  });

  it('opens the draft of a written note at once', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    view.note(regions());

    const written = at(view.captures, 0).id;
    expect([view.drafts.holds('text', written), view.drafts.draft('text', written)]).toEqual([
      true,
      '',
    ]);
  });

  it('keeps the draft of a note written while no panel shows open for the panel that comes', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.write(ONE, regions());
    await view.write(ONE, regions(5));

    expect(view.captures.map((card) => view.drafts.holds('text', card.id))).toEqual([true, true]);
  });

  it('closes the drafts of the book it leaves', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.write(ONE, regions());
    const written = at(view.captures, 0).id;

    await view.open(TWO);

    expect(view.drafts.holds('text', written)).toBe(false);
  });

  it('empties a note whose text is taken away again', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.write(ONE, regions());
    const written = at(view.captures, 0).id;

    await view.edit(written, 'ひとこと');
    await view.edit(written, '   ');

    expect(panelTexts(view)).toEqual(['']);
    expect(at(world.store.rows, 0).text).toBe('');
  });

  it('keeps a note and a recognized capture apart in the glow', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('どうしたんだ')));
    await running;
    await view.write(ONE, regions(2));

    expect(view.read.map((capture) => capture.origin)).toEqual(['recognized', 'written']);
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
  const view = new CaptureView(world.container, world.notify);
  await view.open(ONE);
  await view.loadTagCounts();

  return view;
}

function carriedBy(view: CaptureView): readonly TagId[] {
  return at(view.captures, 0).tagIds;
}

describe('CaptureView lifted passages', () => {
  const CFI = 'epubcfi(/6/14!/4/2/6,/1:0,/1:5)';

  const QUOTE: TextQuote = {
    exact: 'こっちに来て',
    prefix: 'そして彼は',
    suffix: 'と言った',
  };

  it('puts a lifted passage in the panel and in the store, anchored to its cfi and chapter', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.keepLifted(ONE, CFI, QUOTE, '第一章');

    const card = at(view.captures, 0);
    expect(card.origin).toBe('lifted');
    expect(card.status === 'done' ? card.text.text : null).toBe('こっちに来て');
    expect(card.anchor).toEqual(textAnchor(CFI, QUOTE, '第一章'));

    const row = at(world.store.rows, 0);
    expect(row.origin).toBe('lifted');
    expect(row.text).toBe('こっちに来て');
    expect(row.bookId).toBe(ONE);
    expect(row.anchor).toEqual(textAnchor(CFI, QUOTE, '第一章'));
  });

  it('names each capture the reader makes as the latest, and forgets it with the book', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.keepLifted(ONE, CFI, QUOTE, null);
    const lifted = view.latest;
    await view.write(ONE, regions(5));
    const written = view.latest;
    const running = view.recognize(source, 'ja', regions(2), 'row');
    const call = await started(world, 0);
    const reading = view.latest;
    call.settle(ok(recognizedText('ねこ')));
    await running;

    expect([lifted, written, reading]).toEqual(view.captures.map((capture) => capture.id));
    await view.open(TWO);
    expect(view.latest).toBeNull();
  });

  it('marks a lifted passage it could not store as failed and reports it once', async () => {
    const world = fakes();
    world.store.saveFails = true;
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    await view.keepLifted(ONE, CFI, QUOTE, null);

    expect(at(view.captures, 0)).toMatchObject({ origin: 'lifted', status: 'failed' });
    expect(told(world)).toEqual(['danger: The capture could not be saved']);
  });

  it('stores nothing when no book is open', () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);

    view.lift(CFI, QUOTE, null);

    expect(view.captures).toEqual([]);
    expect(world.store.rows).toEqual([]);
  });

  it('stores nothing for a selection that is only space', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);

    view.lift(CFI, { exact: '  \n ', prefix: '', suffix: '' }, null);

    expect(view.captures).toEqual([]);
    expect(world.store.rows).toEqual([]);
  });

  it('carries a note written onto a lifted passage into the store', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.keepLifted(ONE, CFI, QUOTE, null);
    const lifted = at(view.captures, 0).id;

    await view.annotate(lifted, 'he means his sister');

    const card = at(view.captures, 0);
    expect(card.origin === 'lifted' ? card.note : null).toBe('he means his sister');
    const row = at(world.store.rows, 0);
    expect(row.origin === 'lifted' ? row.note : null).toBe('he means his sister');
  });

  it('finds a lifted passage by the note written on it', async () => {
    const world = fakes();
    const view = new CaptureView(world.container, world.notify);
    await view.open(ONE);
    await view.keepLifted(ONE, CFI, QUOTE, null);
    const lifted = at(view.captures, 0).id;
    await view.annotate(lifted, '海の音');

    expect(view.read.map((found) => captureHolds(found, '海'))).toEqual([true]);
  });
});

describe('CaptureView tags', () => {
  it('lists every tag', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = new CaptureView(world.container, world.notify);

    await view.loadTags();

    expect(view.tags.map((tag) => tag.name)).toEqual(['sfx']);
  });

  it('holds the tags as soon as the book opens, so a tagged card shows its chips', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    world.store.rows = [taggedRow('a', ONE, [SFX])];
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(view.tags.map((tag) => tag.name)).toEqual(['sfx']);
  });

  it('reads no library-wide count until one is asked for', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    world.store.rows = [taggedRow('a', ONE, [SFX]), taggedRow('b', TWO, [SFX])];
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);

    expect(view.libraryCounts.size).toBe(0);
  });

  it('counts how often the whole library carries each tag when asked', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    world.store.rows = [taggedRow('a', ONE, [SFX]), taggedRow('b', TWO, [SFX])];
    const view = new CaptureView(world.container, world.notify);

    await view.loadTagCounts();

    expect(view.libraryCounts.get(SFX)).toBe(2);
  });

  it('keeps the tags it holds when the listing fails', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = new CaptureView(world.container, world.notify);
    await view.loadTags();

    world.tags.listFails = true;
    world.tags.rows = [];
    await view.loadTags();

    expect(view.tags.map((tag) => tag.name)).toEqual(['sfx']);
  });

  it('keeps the counts it holds when the capture listing fails', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    world.store.rows = [taggedRow('a', ONE, [SFX])];
    const view = new CaptureView(world.container, world.notify);
    await view.loadTagCounts();

    world.store.listFails = true;
    await view.loadTagCounts();

    expect(view.libraryCounts.get(SFX)).toBe(1);
  });

  it('puts a tag on the capture, on its card and in the counts', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world);

    await view.addTag(captureId('a'), SFX);

    expect(carriedBy(view)).toEqual([SFX]);
    expect(at(world.store.rows, 0).tagIds).toEqual([SFX]);
    expect(view.libraryCounts.get(SFX)).toBe(1);
    expect(world.notices).toEqual([]);
  });

  it('takes a tag off the capture, off its card and out of the counts', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world, [SFX]);

    await view.removeTag(captureId('a'), SFX);

    expect(carriedBy(view)).toEqual([]);
    expect(at(world.store.rows, 0).tagIds).toEqual([]);
    expect(view.libraryCounts.get(SFX)).toBe(0);
    expect(world.notices).toEqual([]);
  });

  it('keeps the moment the reader last edited the text when a tag arrives', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world);

    await view.addTag(captureId('a'), SFX);

    expect(at(world.store.rows, 0).editedAt).toBeNull();
    expect(world.store.edits).toEqual([]);
  });

  it('mints a tag and puts it straight on the capture', async () => {
    const world = fakes();
    const view = await tagging(world);

    await view.createTag(captureId('a'), 'grammar  to ask');

    const made = at(world.tags.created, 0);
    expect(made.name).toBe('grammar to ask');
    expect(carriedBy(view)).toEqual([made.id]);
    expect(view.tags.map((tag) => tag.id)).toEqual([made.id]);
    expect(view.libraryCounts.get(made.id)).toBe(1);
    expect(world.notices).toEqual([]);
  });

  it('adds the tag a taken name already belongs to and mints nothing', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world);

    await view.createTag(captureId('a'), 'SFX');

    expect(carriedBy(view)).toEqual([SFX]);
    expect(world.tags.created).toEqual([]);
    expect(world.tags.rows).toHaveLength(1);
  });

  it('leaves the card as stored and reports it when storing an added tag fails', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world);
    world.tags.attachFails = true;

    await view.addTag(captureId('a'), SFX);

    expect(carriedBy(view)).toEqual([]);
    expect(carriedBy(view)).toEqual(at(world.store.rows, 0).tagIds);
    expect(view.libraryCounts.get(SFX)).toBeUndefined();
    expect(told(world)).toEqual(['danger: The tag could not be added']);
  });

  it('leaves the card as stored and reports it when storing a removed tag fails', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world, [SFX]);
    world.tags.attachFails = true;

    await view.removeTag(captureId('a'), SFX);

    expect(carriedBy(view)).toEqual([SFX]);
    expect(carriedBy(view)).toEqual(at(world.store.rows, 0).tagIds);
    expect(view.libraryCounts.get(SFX)).toBe(1);
    expect(told(world)).toEqual(['danger: The tag could not be removed']);
  });

  it('leaves the card as stored and reports it when minting a tag fails', async () => {
    const world = fakes();
    const view = await tagging(world);
    world.tags.createFails = true;

    await view.createTag(captureId('a'), 'grammar');

    expect(carriedBy(view)).toEqual([]);
    expect(view.tags).toEqual([]);
    expect(told(world)).toEqual(['danger: The tag could not be created']);
  });

  it('reports the failed add once when a minted tag cannot be put on the capture', async () => {
    const world = fakes();
    const view = await tagging(world);
    world.tags.attachFails = true;

    await view.createTag(captureId('a'), 'grammar');

    expect(carriedBy(view)).toEqual([]);
    expect(view.tags.map((tag) => tag.name)).toEqual(['grammar']);
    expect(told(world)).toEqual(['danger: The tag could not be added']);
  });

  it('tags nothing and reports it when the capture was never stored', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag()];
    const view = await tagging(world);

    await view.addTag(captureId('never-saved'), SFX);

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

  it('counts only the tags the open book carries', async () => {
    const world = fakes();
    world.tags.rows = [sfxTag(), namedTag(KEIGO, 'keigo', 'clay', 2)];
    world.store.rows = [
      taggedRow('a', ONE, [SFX]),
      taggedRow('b', ONE, [SFX, KEIGO]),
      taggedRow('c', TWO, [SFX]),
    ];
    const view = new CaptureView(world.container, world.notify);

    await view.open(ONE);
    await view.loadTagCounts();

    expect(view.bookCounts.get(SFX)).toBe(2);
    expect(view.bookCounts.get(KEIGO)).toBe(1);
    expect(view.libraryCounts.get(SFX)).toBe(3);
  });
});
