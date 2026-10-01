import { describe, expect, it } from 'vitest';
import type { Container } from '$lib/container';
import type { Notice } from '$lib/shared/notice';
import { ok } from '$lib/shared/result';
import type { Result } from '$lib/shared/result';
import { IDLE } from '../../domain/model/model-download';
import { JAPANESE_OCR_MODEL } from '../../domain/model/model-footprint';
import type { ModelLoad, ModelLoadError } from '../../domain/model/model-load';
import type { RecognizerSession } from '../../domain/engine/recognizer-session';
import { ModelDownload } from './model-download.svelte';
import { OperationClock } from './operation-clock';

const OPENED: RecognizerSession = {
  modelId: JAPANESE_OCR_MODEL.modelId,
  device: 'webgpu',
  fellBackFrom: null,
};

const HALF: ModelLoad = { fraction: 0.5, source: 'network', loadedBytes: 1, totalBytes: 2 };

type World = {
  readonly download: ModelDownload;
  readonly clock: OperationClock;
  readonly grants: (() => void)[];
  readonly prepares: {
    readonly settle: (opened: Result<RecognizerSession, ModelLoadError>) => void;
    readonly progress: (load: ModelLoad) => void;
  }[];
  readonly notices: Notice[];
};

function world(): World {
  const grants: (() => void)[] = [];
  const prepares: World['prepares'] = [];
  const notices: Notice[] = [];
  const container = {
    recognition: {
      grantModelConsent: () =>
        new Promise<Result<void, never>>((resolve) => {
          grants.push(() => resolve(ok(undefined)));
        }),
      prepareRecognizer: (
        _language: string,
        reporting: { readonly onProgress: (load: ModelLoad) => void },
      ) =>
        new Promise<Result<RecognizerSession, ModelLoadError>>((resolve) => {
          prepares.push({ settle: resolve, progress: reporting.onProgress });
        }),
      pauseModelLoad: () => Promise.resolve(),
      cancelModelLoad: () => Promise.resolve(null),
    },
  } as unknown as Container;
  const clock = new OperationClock();
  const download = new ModelDownload(container, (notice) => notices.push(notice), clock);
  return { download, clock, grants, prepares, notices };
}

async function settled(): Promise<void> {
  for (let turn = 0; turn < 4; turn += 1) await Promise.resolve();
}

describe('ModelDownload', () => {
  it('opens nothing when the grant answers after a newer operation began', async () => {
    const held = world();
    const starting = held.download.start('ja', held.clock.next());

    held.clock.next();
    held.grants[0]?.();
    const current = await starting;

    expect(current).toBe(false);
    expect(held.prepares).toEqual([]);
  });

  it('ignores progress reported after a newer operation began', async () => {
    const held = world();
    void held.download.start('ja', held.clock.next());
    held.grants[0]?.();
    await settled();

    held.clock.next();
    held.prepares[0]?.progress(HALF);

    expect(held.download.state).toEqual({ kind: 'loading', load: null });
  });

  it('keeps the session it opened', async () => {
    const held = world();
    const starting = held.download.start('ja', held.clock.next());
    held.grants[0]?.();
    await settled();

    held.prepares[0]?.settle(ok(OPENED));
    await starting;

    expect(held.download.session).toEqual(OPENED);
    expect(held.download.state.kind).toBe('ready');
  });

  it('drops the session when paused or stopped', async () => {
    const held = world();
    held.download.session = OPENED;

    await held.download.pause('ja');
    const paused = held.download.session;
    held.download.session = OPENED;
    await held.download.stop('ja', JAPANESE_OCR_MODEL.modelId);

    expect(paused).toBeNull();
    expect(held.download.session).toBeNull();
  });

  it('resets to idle with no session', () => {
    const held = world();
    held.download.session = OPENED;

    held.download.reset();

    expect(held.download.state).toEqual(IDLE);
    expect(held.download.session).toBeNull();
  });
});
