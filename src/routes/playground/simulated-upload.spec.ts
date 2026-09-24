import { describe, expect, it } from 'vitest';
import type { FileItemData, FileItemState } from '$lib/components/file-item';
import { SimulatedUploads, advanceUpload, uploadPace, withUploadState } from './simulated-upload';
import type { Cancel, RandomSource, UploadClock } from './simulated-upload';

type Scheduled = { readonly at: number; readonly run: () => void; cancelled: boolean };

class ManualClock implements UploadClock {
  #now = 0;
  readonly #pending: Scheduled[] = [];

  get waiting(): number {
    return this.#pending.filter((entry) => !entry.cancelled).length;
  }

  schedule(delay: number, run: () => void): Cancel {
    const entry: Scheduled = { at: this.#now + delay, run, cancelled: false };
    this.#pending.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  advance(milliseconds: number): void {
    const end = this.#now + milliseconds;
    for (;;) {
      const due = this.#pending
        .toSorted((a, b) => a.at - b.at)
        .find((entry) => !entry.cancelled && entry.at <= end);
      if (due === undefined) break;
      due.cancelled = true;
      this.#now = due.at;
      due.run();
    }
    this.#now = end;
  }
}

function sequence(...values: number[]): RandomSource {
  let index = 0;
  return () => values[index++ % values.length] ?? 0;
}

function recorder(): {
  readonly changes: [string, FileItemState][];
  readonly listen: (id: string, state: FileItemState) => void;
} {
  const changes: [string, FileItemState][] = [];
  return { changes, listen: (id, state) => changes.push([id, state]) };
}

function lastState(changes: readonly [string, FileItemState][], id: string): FileItemState {
  return changes.findLast(([changed]) => changed === id)?.[1] ?? { state: 'pending' };
}

describe('advanceUpload', () => {
  it('starts a pending item uploading at zero', () => {
    expect(advanceUpload({ state: 'pending' }, 5)).toEqual({ state: 'uploading', progress: 0 });
  });

  it('adds the amount to an uploading item', () => {
    expect(advanceUpload({ state: 'uploading', progress: 40 }, 7)).toEqual({
      state: 'uploading',
      progress: 47,
    });
  });

  it('completes an item that reaches or passes one hundred', () => {
    expect([
      advanceUpload({ state: 'uploading', progress: 95 }, 5),
      advanceUpload({ state: 'uploading', progress: 98 }, 7),
    ]).toEqual([{ state: 'complete' }, { state: 'complete' }]);
  });

  it('leaves a complete or a failed item as it is', () => {
    const failed: FileItemState = { state: 'error', message: 'File type not allowed' };

    expect([advanceUpload({ state: 'complete' }, 5), advanceUpload(failed, 5)]).toEqual([
      { state: 'complete' },
      failed,
    ]);
  });
});

describe('uploadPace', () => {
  it('spans a queue delay of 400 to 1199 ms and a step of 3 to 7 per 150 ms tick', () => {
    expect([uploadPace(sequence(0)), uploadPace(sequence(0.9999))]).toEqual([
      { queueDelay: 400, tickInterval: 150, step: 3 },
      { queueDelay: 1199, tickInterval: 150, step: 7 },
    ]);
  });
});

describe('withUploadState', () => {
  const items: readonly FileItemData[] = [
    { id: 'a', name: 'a.png', size: 10, state: 'uploading', progress: 90 },
    { id: 'b', name: 'b.png', size: 20, state: 'pending' },
  ];

  it('replaces the state of the named item and drops the fields of its old state', () => {
    expect(withUploadState(items, 'a', { state: 'complete' })).toEqual([
      { id: 'a', name: 'a.png', size: 10, state: 'complete' },
      items[1],
    ]);
  });

  it('returns the items unchanged when no item has the id', () => {
    expect(withUploadState(items, 'gone', { state: 'complete' })).toEqual(items);
  });
});

describe('SimulatedUploads', () => {
  it('keeps an item pending until its queue delay has passed', () => {
    const clock = new ManualClock();
    const { changes, listen } = recorder();
    new SimulatedUploads(clock, sequence(0.5), listen).start('a');

    clock.advance(799);

    expect(changes).toEqual([]);
  });

  it('reports pending to uploading, each step, then complete, and stops', () => {
    const clock = new ManualClock();
    const { changes, listen } = recorder();
    const uploads = new SimulatedUploads(clock, sequence(0, 0.9999), listen);
    uploads.start('a');

    clock.advance(400 + 150 * 20);

    const progress = changes.map(([, state]) =>
      state.state === 'uploading' ? state.progress : state.state,
    );
    expect(progress).toEqual([
      0,
      7,
      14,
      21,
      28,
      35,
      42,
      49,
      56,
      63,
      70,
      77,
      84,
      91,
      98,
      'complete',
    ]);
    expect([uploads.active, clock.waiting]).toEqual([0, 0]);
  });

  it('moves two files at different paces', () => {
    const clock = new ManualClock();
    const { changes, listen } = recorder();
    const uploads = new SimulatedUploads(clock, sequence(0, 0, 0, 0.9999), listen);
    uploads.start('slow');
    uploads.start('fast');

    clock.advance(400 + 150 * 5);

    expect([lastState(changes, 'slow'), lastState(changes, 'fast')]).toEqual([
      { state: 'uploading', progress: 15 },
      { state: 'uploading', progress: 35 },
    ]);
  });

  it('reports nothing more for a cancelled upload and leaves no timer behind', () => {
    const clock = new ManualClock();
    const { changes, listen } = recorder();
    const uploads = new SimulatedUploads(clock, sequence(0), listen);
    uploads.start('a');
    clock.advance(400 + 150 * 2);
    const before = changes.length;

    uploads.cancel('a');
    clock.advance(10_000);

    expect([changes.length - before, uploads.active, clock.waiting]).toEqual([0, 0, 0]);
  });

  it('cancels every running upload at once', () => {
    const clock = new ManualClock();
    const { changes, listen } = recorder();
    const uploads = new SimulatedUploads(clock, sequence(0), listen);
    uploads.start('a');
    uploads.start('b');
    clock.advance(400);
    const before = changes.length;

    uploads.cancelAll();
    clock.advance(10_000);

    expect([changes.length - before, uploads.active, clock.waiting]).toEqual([0, 0, 0]);
  });

  it('restarts an id that is started again rather than running it twice', () => {
    const clock = new ManualClock();
    const { changes, listen } = recorder();
    const uploads = new SimulatedUploads(clock, sequence(0), listen);
    uploads.start('a');
    uploads.start('a');

    clock.advance(400);

    expect([changes.length, uploads.active, clock.waiting]).toEqual([1, 1, 1]);
  });
});
