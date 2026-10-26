import { describe, expect, it } from 'vitest';
import {
  finishRun,
  IDLE,
  mayRunNow,
  requestRun,
  runOutcome,
  runsOnVisibility,
} from './sync-schedule';

describe('requestRun and finishRun', () => {
  it('starts a run when idle, asks for another run when one is going, and then goes idle', () => {
    const first = requestRun(IDLE);
    const second = requestRun(first.gate);
    const afterFirst = finishRun(second.gate);
    const afterSecond = finishRun(afterFirst.gate);

    expect([first.start, second.start, afterFirst.start, afterSecond.start]).toEqual([
      true,
      false,
      true,
      false,
    ]);
    expect(afterSecond.gate).toEqual(IDLE);
  });
});

describe('mayRunNow', () => {
  it('runs only while connected and online', () => {
    expect([
      mayRunNow({ connected: true, online: true }),
      mayRunNow({ connected: true, online: false }),
      mayRunNow({ connected: false, online: true }),
    ]).toEqual([true, false, false]);
  });
});

describe('runsOnVisibility', () => {
  it('runs when the page becomes visible and not when it hides', () => {
    expect([runsOnVisibility('visible'), runsOnVisibility('hidden')]).toEqual([true, false]);
  });
});

describe('runOutcome', () => {
  it('names a finished run synced, a refused sign-in signed out, and every other failure quiet', () => {
    const success = {
      kind: 'success',
      pushed: 0,
      waiting: 0,
      applied: 0,
      held: 0,
      skipped: 0,
      downloaded: 0,
      downloadFailed: 0,
    } as const;

    expect([
      runOutcome(success).kind,
      runOutcome({ kind: 'unauthorized' }).kind,
      runOutcome({ kind: 'offline' }).kind,
    ]).toEqual(['synced', 'signed-out', 'quiet']);
  });
});
