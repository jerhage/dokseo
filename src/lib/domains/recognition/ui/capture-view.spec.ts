import { describe, expect, it } from 'vitest';
import type { Container, RecognitionProgress } from '$lib/container';
import { imageRect } from '$lib/shared/geometry';
import { imageIndex } from '$lib/shared/ids';
import type { ImageRegion } from '$lib/shared/image-region';
import type { PageSource } from '$lib/shared/page-source';
import { err, ok, type Result } from '$lib/shared/result';
import { at } from '$lib/shared/testing/at';
import { recognizedText, type RecognizedText } from '../domain/recognized-text';
import type { RecognizeRegionError } from '../use-cases/recognize-region';
import { CaptureView } from './capture-view.svelte';

type Reading = Result<RecognizedText, RecognizeRegionError>;

type Call = {
  readonly report: RecognitionProgress | undefined;
  readonly settle: (reading: Reading) => void;
};

type Fakes = {
  readonly container: Container;
  readonly calls: Call[];
};

function unused(): never {
  throw new Error('The library is not used by the capture panel');
}

function fakes(): Fakes {
  const calls: Call[] = [];

  const container: Container = {
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
      recognizeRegion: (_language, _source, _regions, _arrangement, report) =>
        new Promise<Reading>((resolve) => {
          calls.push({ report, settle: resolve });
        }),
    },
  };

  return { container, calls };
}

const source = {} as PageSource;

function regions(index = 13): readonly ImageRegion[] {
  return [{ index: imageIndex(index), rect: imageRect(0, 0, 40, 20) }];
}

function read(view: CaptureView): Promise<void> {
  return view.recognize(source, 'ja', regions(), 'row');
}

describe('CaptureView', () => {
  it('appends a pending capture and settles it in place', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const running = read(view);
    expect(view.captures.map((capture) => capture.status)).toEqual(['pending']);
    expect(at(view.captures, 0).regions).toEqual(regions());

    at(world.calls, 0).settle(ok(recognizedText('どうしたんだ')));
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

    at(world.calls, 1).settle(ok(recognizedText('second')));
    await second;
    at(world.calls, 0).settle(ok(recognizedText('first')));
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
    view.clear();
    at(world.calls, 0).settle(ok(recognizedText('late')));
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
      at(world.calls, index).settle(err(failure));
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
    at(world.calls, 0).settle(err({ kind: 'recognition', error: { kind: 'no-text' } }));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
  });

  it('reports an empty recognized line as having read nothing', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const running = read(view);
    at(world.calls, 0).settle(ok(recognizedText('   ')));
    await running;

    expect(at(view.captures, 0).status).toBe('empty');
  });

  it('stores the download fraction and clears it when the recognition settles', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);
    expect(view.progress).toBeNull();

    const running = read(view);
    at(world.calls, 0).report?.(0.42);
    expect(view.progress).toBe(0.42);

    at(world.calls, 0).settle(ok(recognizedText('done')));
    await running;
    expect(view.progress).toBeNull();
  });

  it('holds the download fraction until the last capture in flight settles', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const first = read(view);
    const second = read(view);
    at(world.calls, 0).report?.(0.5);

    at(world.calls, 0).settle(ok(recognizedText('first')));
    await first;
    expect(view.progress).toBe(0.5);

    at(world.calls, 1).settle(ok(recognizedText('second')));
    await second;
    expect(view.progress).toBeNull();
  });

  it('clears the list', async () => {
    const world = fakes();
    const view = new CaptureView(world.container);

    const running = read(view);
    at(world.calls, 0).settle(ok(recognizedText('one')));
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
    at(world.calls, 0).settle(ok(recognizedText('older')));
    await first;

    const second = view.recognize(source, 'ja', regions(2), 'row');
    at(world.calls, 1).settle(ok(recognizedText('newer')));
    await second;

    const shown = view.newestFirst.map((capture) =>
      capture.status === 'done' ? capture.text.text : capture.status,
    );
    expect(shown).toEqual(['newer', 'older']);
  });
});
