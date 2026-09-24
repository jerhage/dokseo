import { match } from 'ts-pattern';
import type { FileItemData, FileItemState } from '$lib/components/file-item';

type Cancel = () => void;

type UploadClock = {
  readonly schedule: (delay: number, run: () => void) => Cancel;
};

type RandomSource = () => number;

type UploadPace = {
  readonly queueDelay: number;
  readonly tickInterval: number;
  readonly step: number;
};

type UploadListener = (id: string, state: FileItemState) => void;

type RunningUpload = {
  state: FileItemState;
  cancel: Cancel;
};

const TICK_INTERVAL = 150;
const MIN_QUEUE_DELAY = 400;
const QUEUE_DELAY_SPREAD = 800;
const MIN_STEP = 3;
const STEP_SPREAD = 5;
const COMPLETE = 100;

const browserClock: UploadClock = {
  schedule: (delay, run) => {
    const handle = setTimeout(run, delay);
    return () => clearTimeout(handle);
  },
};

function uploadPace(random: RandomSource): UploadPace {
  return {
    queueDelay: MIN_QUEUE_DELAY + Math.floor(random() * QUEUE_DELAY_SPREAD),
    tickInterval: TICK_INTERVAL,
    step: MIN_STEP + Math.floor(random() * STEP_SPREAD),
  };
}

function advanceUpload(state: FileItemState, amount: number): FileItemState {
  return match<FileItemState, FileItemState>(state)
    .with({ state: 'pending' }, () => ({ state: 'uploading', progress: 0 }))
    .with({ state: 'uploading' }, ({ progress }) => {
      const next = progress + amount;
      return next >= COMPLETE ? { state: 'complete' } : { state: 'uploading', progress: next };
    })
    .with({ state: 'complete' }, (done) => done)
    .with({ state: 'error' }, (failed) => failed)
    .exhaustive();
}

function withUploadState(
  items: readonly FileItemData[],
  id: string,
  state: FileItemState,
): readonly FileItemData[] {
  return items.map((item) =>
    item.id === id ? { id: item.id, name: item.name, size: item.size, ...state } : item,
  );
}

class SimulatedUploads {
  readonly #running = new Map<string, RunningUpload>();
  readonly #clock: UploadClock;
  readonly #random: RandomSource;
  readonly #onchange: UploadListener;

  constructor(clock: UploadClock, random: RandomSource, onchange: UploadListener) {
    this.#clock = clock;
    this.#random = random;
    this.#onchange = onchange;
  }

  get active(): number {
    return this.#running.size;
  }

  start(id: string): void {
    this.cancel(id);
    const pace = uploadPace(this.#random);
    const upload: RunningUpload = { state: { state: 'pending' }, cancel: () => undefined };
    this.#running.set(id, upload);
    const tick = (): void => {
      upload.state = advanceUpload(upload.state, pace.step);
      this.#onchange(id, upload.state);
      if (upload.state.state === 'uploading') {
        upload.cancel = this.#clock.schedule(pace.tickInterval, tick);
      } else this.#running.delete(id);
    };
    upload.cancel = this.#clock.schedule(pace.queueDelay, tick);
  }

  cancel(id: string): void {
    this.#running.get(id)?.cancel();
    this.#running.delete(id);
  }

  cancelAll(): void {
    for (const upload of this.#running.values()) upload.cancel();
    this.#running.clear();
  }
}

export { SimulatedUploads, advanceUpload, browserClock, uploadPace, withUploadState };
export type { Cancel, RandomSource, UploadClock, UploadListener, UploadPace };
