import { describe, expect, it } from 'vitest';
import type { SyncNowResult } from '../use-cases/sync-now';
import { SyncScheduler } from './sync-scheduler';
import type { SchedulerEnv } from './sync-scheduler';

const SUCCESS: SyncNowResult = {
  kind: 'success',
  pushed: 0,
  waiting: 0,
  applied: 0,
  held: 0,
  skipped: 0,
  downloaded: 0,
  downloadFailed: 0,
};

type Timer = { readonly callback: () => void; readonly delayMs: number; cancelled: boolean };

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}

function fixture(
  start: {
    connected?: boolean;
    online?: boolean;
    lockFree?: boolean;
    result?: SyncNowResult;
    hold?: Promise<void>;
  } = {},
) {
  const log = {
    syncs: 0,
    synced: 0,
    signedOut: 0,
    failures: [] as unknown[],
    timers: [] as Timer[],
    notify: null as (() => void) | null,
    watching: false,
  };
  const state = { online: start.online ?? true, connected: start.connected ?? true };
  const env: SchedulerEnv = {
    isConnected: () => Promise.resolve(state.connected),
    isOnline: () => state.online,
    exclusively: async (work) => {
      if (start.lockFree === false) return;
      await work();
    },
    sync: async () => {
      log.syncs += 1;
      await start.hold;
      return start.result ?? SUCCESS;
    },
    synced: () => {
      log.synced += 1;
    },
    signedOut: () => {
      log.signedOut += 1;
    },
    failed: (cause) => log.failures.push(cause),
    watchChanges: (onChange) => {
      log.notify = onChange;
      log.watching = true;
      return () => {
        log.watching = false;
      };
    },
    startTimer: (callback, delayMs) => {
      const timer: Timer = { callback, delayMs, cancelled: false };
      log.timers.push(timer);
      return () => {
        timer.cancelled = true;
      };
    },
  };
  return { scheduler: new SyncScheduler(env), log, state };
}

describe('SyncScheduler', () => {
  it('syncs once at start while connected and online, then reports the run', async () => {
    const { scheduler, log } = fixture();

    scheduler.start();
    await settle();

    expect(log.syncs).toBe(1);
    expect(log.synced).toBe(1);
  });

  it('syncs nothing at start when offline or not connected', async () => {
    const offline = fixture({ online: false });
    const signedOff = fixture({ connected: false });

    offline.scheduler.start();
    signedOff.scheduler.start();
    await settle();

    expect([offline.log.syncs, signedOff.log.syncs]).toEqual([0, 0]);
  });

  it('syncs when the page becomes visible and not when it hides', async () => {
    const { scheduler, log } = fixture();
    scheduler.start();
    await settle();

    scheduler.visibilityChanged('hidden');
    await settle();
    scheduler.visibilityChanged('visible');
    await settle();

    expect(log.syncs).toBe(2);
  });

  it('restarts a five second timer on each change and syncs when the last one fires', async () => {
    const { scheduler, log } = fixture();
    scheduler.start();
    await settle();

    log.notify?.();
    log.notify?.();
    const [first, second] = log.timers;
    expect([first?.cancelled, second?.cancelled, second?.delayMs]).toEqual([true, false, 5000]);
    second?.callback();
    await settle();

    expect(log.syncs).toBe(2);
  });

  it('runs once more after a run that was requested while another was going', async () => {
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { scheduler, log } = fixture({ hold });
    scheduler.start();
    scheduler.request();
    scheduler.request();
    await settle();
    expect(log.syncs).toBe(1);

    release();
    await settle();

    expect(log.syncs).toBe(2);
  });

  it('skips the run when another tab holds the lock', async () => {
    const { scheduler, log } = fixture({ lockFree: false });

    scheduler.start();
    await settle();

    expect(log.syncs).toBe(0);
  });

  it('tells the reader once per session that the sign-in was refused', async () => {
    const { scheduler, log } = fixture({ result: { kind: 'unauthorized' } });

    scheduler.start();
    await settle();
    scheduler.request();
    await settle();

    expect([log.syncs, log.signedOut, log.synced]).toEqual([2, 1, 0]);
  });

  it('stops listening and ignores requests after stop', async () => {
    const { scheduler, log } = fixture();
    scheduler.start();
    await settle();

    scheduler.stop();
    scheduler.request();
    await settle();

    expect([log.watching, log.syncs]).toEqual([false, 1]);
  });
});
