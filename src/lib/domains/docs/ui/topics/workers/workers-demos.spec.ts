import { describe, expect, it } from 'vitest';
import { ROOT_WORKER_SOURCE } from '../../../domain/demo-protocol';
import {
  BUFFER_WORKER_SOURCE,
  COUNTER_WORKER_SOURCE,
  ECHO_WORKER_SOURCE,
  PRIMES_WORKER_SOURCE,
} from './demo-workers';
import type { DemoPort, StartDemoWorker } from './demo-workers';
import { JankDemo } from './jank-demo.svelte';
import type { FrameClock } from './jank-demo.svelte';
import { POST_SAMPLES } from './post-samples';
import { PostTester } from './post-tester.svelte';
import { ProtocolDemo, TERMINATED } from './protocol-demo.svelte';
import { SharedCounter } from './shared-counter.svelte';
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

describe('PostTester', () => {
  it('shows what arrived for a value that clones and the error for one that does not', async () => {
    const tester = new PostTester(inProcess().start);
    const runnable = POST_SAMPLES.filter((sample) => !sample.needsDocument);

    await tester.postAll(runnable);

    expect(ECHO_WORKER_SOURCE).toContain('function describeValue');
    for (const sample of runnable) {
      const outcome = tester.outcomes.get(sample.name);
      if (sample.arrives === null)
        expect(outcome).toMatchObject({ kind: 'threw', name: 'DataCloneError' });
      else expect(outcome).toEqual({ kind: 'arrived', description: sample.arrives });
    }
  });
});

describe('ProtocolDemo', () => {
  it('matches replies that arrive out of order to their requests and shows the error reply', async () => {
    const demo = new ProtocolDemo(inProcess().start);

    await demo.sendBatch(false);

    expect(ROOT_WORKER_SOURCE).toContain('Math.sqrt');
    expect(demo.rows.map((row) => [row.value, row.state])).toEqual([
      [9, { kind: 'answered', root: 3, arrival: 4 }],
      [81, { kind: 'answered', root: 9, arrival: 2 }],
      [-4, { kind: 'refused', message: 'No real square root of -4', arrival: 3 }],
      [2, { kind: 'answered', root: Math.SQRT2, arrival: 1 }],
    ]);
  });

  it('abandons every waiting request when the worker crashes', async () => {
    const worker = inProcess();
    const demo = new ProtocolDemo(worker.start);

    await demo.sendBatch(true);

    expect(demo.crash).toContain('no code for');
    expect(demo.rows.every((row) => row.state.kind === 'abandoned')).toBe(true);
    expect(worker.stopped()).toBe(1);
  });

  it('abandons every waiting request on terminate', async () => {
    const demo = new ProtocolDemo(inProcess().start);

    const sent = demo.sendBatch(false);
    demo.terminate();
    await sent;

    expect(demo.rows.map((row) => row.state)).toEqual(
      Array.from({ length: 4 }, () => ({ kind: 'abandoned', cause: TERMINATED })),
    );
  });
});

describe('SharedCounter', () => {
  it('adds every increment with Atomics.add from two workers', async () => {
    const counter = new SharedCounter({
      startWorker: inProcess().start,
      now: () => 0,
      times: 1000,
    });

    await counter.count('atomic');

    expect(COUNTER_WORKER_SOURCE).toContain('Atomics.add');
    expect(counter.runs[0]).toMatchObject({ mode: 'atomic', expected: 2000, total: 2000 });
  });

  it('reports what Atomics.wait does on the calling thread', () => {
    const counter = new SharedCounter({ startWorker: inProcess().start, now: () => 0 });

    counter.waitOnPage();

    expect(counter.pageWait).toBe('Returned "timed-out"');
  });

  it('wakes a waiting worker with Atomics.notify', async () => {
    const posted: unknown[] = [];
    const counter = new SharedCounter({
      startWorker: inProcess((m) => posted.push(m)).start,
      now: () => 0,
    });

    counter.startWaiter();
    expect(counter.wake()).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(posted).toMatchObject([{ mode: 'wait' }]);
    expect(counter.waiter).toEqual({ kind: 'woke', result: 'not-equal' });
  });
});
