import { describe, expect, it } from 'vitest';
import { JAPANESE_OCR_MODEL } from '$lib/domains/recognition/domain/model/model-footprint';
import type { RecognizeRegionResult } from '$lib/domains/recognition/use-cases/engine/recognize-region';
import { LiveRecognition } from './live-recognition.svelte';
import type { LiveNotices, LiveRecognitionDeps, ModelPresence } from './live-recognition.svelte';

type Fake = {
  readonly deps: LiveRecognitionDeps;
  readonly closed: () => number;
};

function fake(
  presence: ModelPresence,
  recognize: (notices: LiveNotices) => Promise<RecognizeRegionResult>,
): Fake {
  let time = 0;
  let closes = 0;
  return {
    deps: {
      chosenModel: async () => JAPANESE_OCR_MODEL,
      presence: async () => presence,
      recognize: async (notices) => {
        time += 400;
        return await recognize(notices);
      },
      close: async () => {
        closes += 1;
      },
      now: () => time,
    },
    closed: () => closes,
  };
}

const READ: RecognizeRegionResult = {
  kind: 'success',
  text: { text: '今日は天気がいいね', confidence: null },
};

describe('LiveRecognition', () => {
  it('reports whether the chosen model is already stored', async () => {
    const live = new LiveRecognition(fake('not-stored', async () => READ).deps);

    await live.check();

    expect(live.state).toEqual({
      kind: 'ready',
      model: JAPANESE_OCR_MODEL,
      presence: 'not-stored',
    });
  });

  it('reports no model when none is chosen', async () => {
    const live = new LiveRecognition({
      ...fake('stored', async () => READ).deps,
      chosenModel: async () => null,
    });

    await live.check();

    expect(live.state).toEqual({ kind: 'no-model' });
  });

  it('shows the text, the time taken and the session the worker opened', async () => {
    const session = {
      modelId: JAPANESE_OCR_MODEL.modelId,
      device: 'wasm',
      fellBackFrom: null,
    } as const;
    const live = new LiveRecognition(
      fake('stored', async (notices) => {
        notices.onSession(session);
        return READ;
      }).deps,
    );
    await live.check();

    await live.read();

    expect(live.state).toEqual({
      kind: 'read',
      model: JAPANESE_OCR_MODEL,
      text: '今日は天気がいいね',
      confidence: null,
      elapsedMs: 400,
      session,
    });
  });

  it('follows the download progress while it reads', async () => {
    let seen: unknown = null;
    const live = new LiveRecognition(
      fake('not-stored', async (notices) => {
        notices.onProgress({ fraction: 0.25, source: 'network', loadedBytes: 25, totalBytes: 100 });
        seen = live.state;
        return READ;
      }).deps,
    );
    await live.check();

    await live.read();

    expect(seen).toMatchObject({ kind: 'reading', load: { fraction: 0.25, source: 'network' } });
  });

  it('passes a successful reading on', async () => {
    const heard: unknown[] = [];
    const live = new LiveRecognition({
      ...fake('stored', async () => READ).deps,
      onread: (text, confidence) => heard.push({ text, confidence }),
    });
    await live.check();

    await live.read();

    expect(heard).toEqual([{ text: '今日は天気がいいね', confidence: null }]);
  });

  it('turns an expected failure into a sentence', async () => {
    const live = new LiveRecognition(
      fake('stored', async () => ({ kind: 'model-unavailable', cause: 'offline' })).deps,
    );
    await live.check();

    await live.read();

    expect(live.state).toEqual({
      kind: 'failed',
      model: JAPANESE_OCR_MODEL,
      message: 'The model could not be opened: offline',
    });
  });

  it('reports a thrown failure', async () => {
    const live = new LiveRecognition(
      fake('stored', () => Promise.reject(new Error('worker died'))).deps,
    );
    await live.check();

    await live.read();

    expect(live.state).toMatchObject({ kind: 'failed', message: 'worker died' });
  });

  it('starts nothing before the check has finished', async () => {
    let calls = 0;
    const live = new LiveRecognition(
      fake('stored', async () => {
        calls += 1;
        return READ;
      }).deps,
    );

    await live.read();

    expect({ calls, state: live.state }).toEqual({ calls: 0, state: { kind: 'checking' } });
  });

  it('closes the recognizer on disposal only after a read was started', async () => {
    const untouched = fake('stored', async () => READ);
    const used = fake('stored', async () => READ);
    const idle = new LiveRecognition(untouched.deps);
    const busy = new LiveRecognition(used.deps);
    await busy.check();
    await busy.read();

    await idle.dispose();
    await busy.dispose();

    expect({ idle: untouched.closed(), busy: used.closed() }).toEqual({ idle: 0, busy: 1 });
  });
});
