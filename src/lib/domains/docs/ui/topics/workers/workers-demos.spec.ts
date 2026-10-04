import { describe, expect, it } from 'vitest';
import { BUFFER_WORKER_SOURCE, PRIMES_WORKER_SOURCE } from './demo-workers';
import type { DemoPort, StartDemoWorker } from './demo-workers';
import { JankDemo } from './jank-demo.svelte';
import type { FrameClock } from './jank-demo.svelte';
import { TransferDemo } from './transfer-demo.svelte';

type Scope = { onmessage: ((event: { data: unknown }) => void) | null };

function inProcess(onPost?: (message: unknown) => void): {
  start: StartDemoWorker;
  stopped: () => number;
} {
  let stops = 0;
  const start: StartDemoWorker = (source, listeners) => {
    const scope: Scope = { onmessage: null };
    const reply = (message: unknown): void => {
      queueMicrotask(() => listeners.onReply(structuredClone(message)));
    };
    const later = (callback: () => void, delayMs: number): void => {
      setTimeout(callback, delayMs / 100);
    };
    new Function('self', 'postMessage', 'setTimeout', 'performance', source)(
      scope,
      reply,
      later,
      performance,
    );
    const port: DemoPort = {
      post(message, transfer) {
        onPost?.(message);
        const delivered: unknown = structuredClone(message, { transfer });
        queueMicrotask(() => {
          try {
            scope.onmessage?.({ data: delivered });
          } catch (cause) {
            listeners.onCrash(cause instanceof Error ? cause.message : String(cause));
          }
        });
      },
      stop() {
        stops += 1;
      },
    };
    return port;
  };
  return {
    start,
    stopped: () => stops,
  };
}

function fakeClock(): FrameClock & { advance(ms: number): void; block(ms: number): void } {
  let time = 0;
  let waiting: ((at: number) => void) | null = null;
  return {
    now: () => time,
    request(callback) {
      waiting = callback;
      return 1;
    },
    cancel() {
      waiting = null;
    },
    advance(ms) {
      const end = time + ms;
      while (time + 16 <= end) {
        time += 16;
        const next = waiting;
        waiting = null;
        next?.(time);
      }
      time = end;
    },
    block(ms) {
      time += ms;
    },
  };
}

describe('JankDemo', () => {
  it('records a long gap between frames when the page does the work', async () => {
    const clock = fakeClock();
    const demo = new JankDemo({
      clock,
      below: 100,
      pause: (ms) => {
        clock.advance(ms);
        return Promise.resolve();
      },
      countOnPage: (below) => {
        clock.block(1000);
        return below;
      },
      startWorker: inProcess().start,
    });

    await demo.run('page');

    expect(demo.resultFor('page')).toMatchObject({ count: 100, workMs: 1000 });
    expect(demo.resultFor('page')?.longestGapMs).toBeGreaterThan(1000);
    expect(demo.running).toBeNull();
  });

  it('counts in a worker built from the same function and keeps frames coming', async () => {
    const clock = fakeClock();
    const demo = new JankDemo({
      clock,
      below: 100,
      pause: (ms) => {
        clock.advance(ms);
        return Promise.resolve();
      },
      countOnPage: () => 0,
      startWorker: inProcess().start,
    });

    await demo.run('worker');

    expect(demo.resultFor('worker')).toMatchObject({ count: 25, longestGapMs: 16 });
    expect(PRIMES_WORKER_SOURCE).toContain('function countPrimes');
  });
});

describe('TransferDemo', () => {
  it('copies on clone and detaches the sender buffer on transfer', async () => {
    const demo = new TransferDemo({ now: () => 0, startWorker: inProcess().start });
    demo.megabytes = 16;

    await demo.run('clone');
    await demo.run('transfer');

    expect(BUFFER_WORKER_SOURCE).toContain('byteLength');
    expect(
      demo.results.map(({ way, lengthBefore, lengthAfter, received }) => ({
        way,
        lengthBefore,
        lengthAfter,
        received,
      })),
    ).toEqual([
      { way: 'transfer', lengthBefore: 16_777_216, lengthAfter: 0, received: 16_777_216 },
      { way: 'clone', lengthBefore: 16_777_216, lengthAfter: 16_777_216, received: 16_777_216 },
    ]);
  });
});
