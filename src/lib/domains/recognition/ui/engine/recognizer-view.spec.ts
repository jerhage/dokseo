import { describe, expect, it } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container, RecognitionNotices } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { JAPANESE_OCR_MODEL, modelFootprint } from '../../domain/model/model-footprint';
import type { ModelLoad } from '../../domain/model/model-load';
import type { ModelConsentDecision, ModelConsentError } from '../../domain/model/model-consent';
import { recognizedText } from '../../domain/engine/recognized-text';
import type { RecognizedText } from '../../domain/engine/recognized-text';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import type { RecognizeRegionError } from '../../use-cases/engine/recognize-region';
import {
  modelLoadAnnouncement,
  modelLoadNote,
  READING_SELECTION,
  RecognizerView,
} from './recognizer-view.svelte';
import type { PendingRecognition } from './recognizer-view.svelte';

const REQUIRED_WEIGHTS = JAPANESE_OCR_MODEL.weightFiles;

const OPENED_SESSION: RecognizerSession = {
  modelId: 'DigitalLarynx/manga-ocr-onnx',
  device: 'webgpu',
  fellBackFrom: null,
};

type Reading = Result<RecognizedText, RecognizeRegionError>;

type Call = {
  readonly notices: RecognitionNotices;
  readonly settle: (reading: Reading) => void;
};

type Fakes = {
  readonly container: Container;
  readonly calls: Call[];
  readonly granted: Set<Language>;
  readonly grants: Language[];
  readonly closes: Language[];
};

function unused(): never {
  throw new Error('The recognizer does not use this');
}

function fakes(granted: readonly Language[] = []): Fakes {
  const calls: Call[] = [];
  const grants: Language[] = [];
  const closes: Language[] = [];
  const agreed = new Set(granted);

  const container: Container = {
    beginTrace: (): Trace => ({
      step: (): void => undefined,
      image: (): void => undefined,
      end: (): void => undefined,
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
    },
    recognition: {
      readModelConsent: (
        language: Language,
      ): Promise<Result<ModelConsentDecision, ModelConsentError>> =>
        Promise.resolve(ok(agreed.has(language) ? 'granted' : 'undecided')),
      grantModelConsent: (language: Language): Promise<Result<void, ModelConsentError>> => {
        grants.push(language);
        agreed.add(language);
        return Promise.resolve(ok(undefined));
      },
      recognizeRegion: (_language, _source, _taken, _arrangement, notices = {}) =>
        new Promise<Reading>((resolve) => {
          calls.push({ notices, settle: resolve });
        }),
      listCaptures: unused,
      listEveryCapture: unused,
      saveCapture: unused,
      writeNote: unused,
      editCaptureText: unused,
      writeCaptureNote: unused,
      removeCapture: unused,
      clearCaptures: unused,
      listTags: unused,
      createTag: unused,
      addTagToCapture: unused,
      removeTagFromCapture: unused,
      renameTag: unused,
      recolourTag: unused,
      deleteTag: unused,
      readModelStorage: (modelId: string) =>
        Promise.resolve(
          ok({
            report: {
              modelId,
              files: REQUIRED_WEIGHTS.length,
              bytes: 1_000,
              unsized: 0,
              required: REQUIRED_WEIGHTS,
              weights: REQUIRED_WEIGHTS,
            },
            partial: { modelId, files: 0, bytes: 0 },
            usage: null,
            quota: null,
            persisted: false,
          }),
        ),
      deleteModel: unused,
      readRecognizerSetup: (language: Language) =>
        Promise.resolve(ok({ model: modelFootprint(language), compute: 'auto' as const })),
      saveRecognizerSetup: unused,
      detectCompute: unused,
      prepareRecognizer: (_language: Language, notices: RecognitionNotices = {}) => {
        notices.onSession?.(OPENED_SESSION);
        return Promise.resolve(ok(OPENED_SESSION));
      },
      pauseModelLoad: unused,
      cancelModelLoad: unused,
      closeRecognizer: (language: Language) => {
        closes.push(language);
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

  return { container, calls, granted: agreed, grants, closes };
}

const source = {} as PageSource;

function regions(index = 13): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(0, 0, 40, 20) }];
}

function selection(language: Language = 'ja'): PendingRecognition {
  return { source, language, regions: regions(), arrangement: 'row' };
}

function fixed(generation = 0): () => number {
  return () => generation;
}

async function started(world: Fakes, index: number): Promise<Call> {
  for (let tick = 0; tick < 50 && world.calls.length <= index; tick += 1) {
    await Promise.resolve();
  }
  return at(world.calls, index);
}

describe('RecognizerView', () => {
  it('refuses a selection it has no agreement for and holds it for the dialog', async () => {
    const world = fakes();
    const view = new RecognizerView(world.container, fixed());

    const admitted = await view.admits(selection());

    expect(admitted).toBe(false);
    expect(view.consentRequest?.language).toBe('ja');
  });

  it('hands back the held selection once the reader agrees, and stores the grant', async () => {
    const world = fakes();
    const view = new RecognizerView(world.container, fixed());
    const held = selection();
    await view.admits(held);

    const released = await view.agree();

    expect(released).toBe(held);
    expect(view.consentRequest).toBeNull();
    expect(world.grants).toEqual(['ja']);
  });

  it('hands back nothing and refuses a second selection after the reader declines', async () => {
    const world = fakes();
    const view = new RecognizerView(world.container, fixed());
    await view.admits(selection());

    view.decline();

    expect(view.consentRequest).toBeNull();
    expect(await view.agree()).toBeNull();
    expect(await view.admits(selection())).toBe(false);
    expect(view.consentRequest).toBeNull();
  });

  it('holds the load progress until the last recognition in flight settles', async () => {
    const world = fakes(['ja']);
    const view = new RecognizerView(world.container, fixed());
    const first = view.read(selection());
    const second = view.read(selection());

    const load: ModelLoad = { fraction: 0.4, source: 'network', loadedBytes: 0, totalBytes: 0 };
    (await started(world, 0)).notices.onProgress?.(load);
    (await started(world, 0)).settle(ok(recognizedText('一', null)));
    await first;

    expect(view.progress).toEqual(load);

    (await started(world, 1)).settle(ok(recognizedText('二', null)));
    await second;

    expect(view.progress).toBeNull();
  });

  it('closes the recognizer it opened and forgets the session it reported', async () => {
    const world = fakes(['ja']);
    const view = new RecognizerView(world.container, fixed());
    await view.warm('ja');

    expect(view.session).toEqual(OPENED_SESSION);

    view.close();

    expect(world.closes).toEqual(['ja']);
    expect(view.session).toBeNull();
  });
});

describe('modelLoadNote', () => {
  it('calls a load that reported no download a load, not a download', () => {
    const load: ModelLoad = { fraction: 0.37, source: 'cache', loadedBytes: 0, totalBytes: 0 };
    expect(modelLoadNote(load)).toBe('Loading the model · 37%');
  });

  it('calls a load that reported a download a download', () => {
    const load: ModelLoad = { fraction: 0.37, source: 'network', loadedBytes: 0, totalBytes: 0 };
    expect(modelLoadNote(load)).toBe('Downloading the model · 37%');
  });
});

describe('modelLoadAnnouncement', () => {
  it('announces a cached load as loading rather than downloading', () => {
    expect(
      modelLoadAnnouncement({ fraction: 0.37, source: 'cache', loadedBytes: 0, totalBytes: 0 }),
    ).toBe('Loading the recognition model, 37 percent.');
  });

  it('announces a fetched load as downloading', () => {
    expect(
      modelLoadAnnouncement({ fraction: 0.9, source: 'network', loadedBytes: 0, totalBytes: 0 }),
    ).toBe('Downloading the recognition model, 90 percent.');
  });

  it('agrees with the card note about whether bytes are being downloaded', () => {
    const cached: ModelLoad = { fraction: 0.5, source: 'cache', loadedBytes: 0, totalBytes: 0 };
    const fetched: ModelLoad = { fraction: 0.5, source: 'network', loadedBytes: 0, totalBytes: 0 };

    expect(modelLoadNote(cached).startsWith('Loading')).toBe(true);
    expect(modelLoadAnnouncement(cached).startsWith('Loading')).toBe(true);
    expect(modelLoadNote(fetched).startsWith('Downloading')).toBe(true);
    expect(modelLoadAnnouncement(fetched).startsWith('Downloading')).toBe(true);
  });

  it('announces a reading with no load in flight without naming the model', () => {
    expect(modelLoadAnnouncement(null)).toBe(READING_SELECTION);
  });
});
