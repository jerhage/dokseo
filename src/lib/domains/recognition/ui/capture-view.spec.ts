import { describe, expect, it } from 'vitest';
import type { Trace } from '$lib/platform/trace/pipeline-trace';
import type { Container, RecognitionProgress } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { Language } from '$lib/shared/language';
import type { PageSource } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import type { ModelConsentDecision, ModelConsentError } from '../domain/model-consent';
import { recognizedText, type RecognizedText } from '../domain/recognized-text';
import type { RecognizeRegionError } from '../use-cases/recognize-region';
import { CaptureView } from './capture-view.svelte';

type Reading = Result<RecognizedText, RecognizeRegionError>;

type Call = {
  readonly language: Language;
  readonly regions: readonly ImageRegion[];
  readonly report: RecognitionProgress | undefined;
  readonly settle: (reading: Reading) => void;
};

type Consent = {
  readonly granted: Set<Language>;
  readonly reads: Language[];
  readonly grants: Language[];
  readFails: boolean;
  grantFails: boolean;
};

type Step = {
  readonly label: string;
  readonly name: string;
  readonly detail: Record<string, unknown>;
};

type Fakes = {
  readonly container: Container;
  readonly calls: Call[];
  readonly consent: Consent;
  readonly steps: Step[];
  readonly ended: string[];
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
      readCover: unused,
      removeBook: unused,
      editBook: unused,
      readStorageUsage: unused,
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
      recognizeRegion: (language, _source, taken, _arrangement, report) =>
        new Promise<Reading>((resolve) => {
          calls.push({ language, regions: taken, report, settle: resolve });
        }),
    },
  };

  return { container, calls, consent, steps, ended };
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

async function started(world: Fakes, index: number): Promise<Call> {
  for (let tick = 0; tick < 50 && world.calls.length <= index; tick += 1) {
    await Promise.resolve();
  }
  return at(world.calls, index);
}

describe('CaptureView', () => {
  it('appends a pending capture and settles it in place', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const running = read(view);
    const call = await started(world, 0);
    expect(view.captures.map((capture) => capture.status)).toEqual(['pending']);
    expect(at(view.captures, 0).regions).toEqual(regions());

    call.settle(ok(recognizedText('どうしたんだ')));
    await running;

    const settled = at(view.captures, 0);
    expect(view.captures).toHaveLength(1);
    expect(settled.status).toBe('done');
    expect(settled.status === 'done' ? settled.text.text : null).toBe('どうしたんだ');
  });

  it('keeps two captures apart when the replies arrive out of order', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

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
    const view = new CaptureView(world.container);

    const running = read(view);
    const call = await started(world, 0);
    view.clear();
    call.settle(ok(recognizedText('late')));
    await running;

    expect(view.captures).toEqual([]);
  });

  it('maps each recognition failure to a sentence', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

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
    const view = new CaptureView(world.container);

    const running = read(view);
    (await started(world, 0)).settle(err({ kind: 'recognition', error: { kind: 'no-text' } }));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
  });

  it('reports an empty recognized line as having read nothing', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const running = read(view);
    (await started(world, 0)).settle(ok(recognizedText('   ')));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
  });

  it('stores the download fraction and clears it when the recognition settles', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);
    expect(view.progress).toBeNull();

    const running = read(view);
    const call = await started(world, 0);
    call.report?.(0.42);
    expect(view.progress).toBe(0.42);

    call.settle(ok(recognizedText('done')));
    await running;
    expect(view.progress).toBeNull();
  });

  it('holds the download fraction until the last capture in flight settles', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const first = read(view);
    const second = read(view);
    (await started(world, 0)).report?.(0.5);

    (await started(world, 0)).settle(ok(recognizedText('first')));
    await first;
    expect(view.progress).toBe(0.5);

    (await started(world, 1)).settle(ok(recognizedText('second')));
    await second;
    expect(view.progress).toBeNull();
  });

  it('clears the list', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

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
    const view = new CaptureView(world.container);

    await view.recognize(source, 'ja', [], 'row');

    expect(world.calls).toEqual([]);
    expect(view.captures).toEqual([]);
  });

  it('orders the newest capture first for the panel', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

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
    const view = new CaptureView(world.container);

    expect(view.consentRequest).toBeNull();
    expect(world.consent.reads).toEqual([]);
    expect(world.consent.grants).toEqual([]);
  });

  it('starts no recognition for a language the reader has not agreed to', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container);

    await read(view);

    expect(world.calls).toEqual([]);
    expect(view.captures).toEqual([]);
    expect(view.consentRequest?.language).toBe('ja');
    expect(view.consentRequest?.footprint.weightsBytes).toBe(116_595_703);
  });

  it('recognizes the selection it was holding when the reader agreed', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container);

    await view.recognize(source, 'ja', regions(7), 'row');
    expect(world.calls).toEqual([]);

    const running = view.agree();
    const call = await started(world, 0);
    expect(call.regions).toEqual(regions(7));

    call.settle(ok(recognizedText('held')));
    await running;

    expect(view.consentRequest).toBeNull();
    expect(world.consent.grants).toEqual(['ja']);
    expect(at(view.captures, 0).regions).toEqual(regions(7));
  });

  it('discards the held selection and asks no second time when the reader declines', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container);

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
    const asked = new CaptureView(world.container);

    await read(asked);
    const granting = asked.agree();
    (await started(world, 0)).settle(ok(recognizedText('first')));
    await granting;

    const later = new CaptureView(world.container);
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
    const view = new CaptureView(world.container);

    await read(view);
    expect(view.consentRequest?.language).toBe('ja');

    const running = view.agree();
    (await started(world, 0)).settle(ok(recognizedText('read anyway')));
    await running;

    expect(at(view.captures, 0).status).toBe('done');
  });

  it('names the gate that admitted each capture', async () => {
    const stored = fakes(['ja']);
    const view = new CaptureView(stored.container);

    const first = read(view);
    (await started(stored, 0)).settle(ok(recognizedText('first')));
    await first;

    const second = read(view);
    (await started(stored, 1)).settle(ok(recognizedText('second')));
    await second;

    const unmetered = fakes([]);
    const korean = new CaptureView(unmetered.container);
    const running = korean.recognize(source, 'ko', regions(), 'column');
    (await started(unmetered, 0)).settle(ok(recognizedText('안녕')));
    await running;

    expect(gates(stored)).toEqual(['reading consent-stored', 'reading agreed-this-session']);
    expect(gates(unmetered)).toEqual(['reading nothing-to-download']);
  });

  it('names the guard that stopped each capture', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container);

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
    const view = new CaptureView(world.container);

    const running = read(view);
    await started(world, 0);

    expect(world.ended).toEqual(['capture-gate']);

    at(world.calls, 0).settle(ok(recognizedText('done')));
    await running;
  });

  it('asks for no agreement for a language whose model has not been chosen', async () => {
    const world = fakes([]);
    const view = new CaptureView(world.container);

    const running = view.recognize(source, 'ko', regions(), 'column');
    (await started(world, 0)).settle(ok(recognizedText('안녕')));
    await running;

    expect(view.consentRequest).toBeNull();
    expect(world.consent.reads).toEqual([]);
    expect(at(view.captures, 0).status).toBe('done');
  });
});
