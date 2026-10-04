import { describe, expect, it } from 'vitest';
import type { Clock } from '$lib/components/clock';
import { COPIED_HOLD_MS, CopyFeedback } from './copy-feedback.svelte';

type Scheduled = { readonly at: number; readonly run: () => void; cancelled: boolean };

class FakeClock implements Clock {
  #time = 0;
  #scheduled: Scheduled[] = [];

  readonly now = (): number => this.#time;

  readonly schedule = (run: () => void, ms: number): (() => void) => {
    const entry: Scheduled = { at: this.#time + ms, run, cancelled: false };
    this.#scheduled.push(entry);
    return () => {
      entry.cancelled = true;
    };
  };

  advance(ms: number): void {
    this.#time += ms;
    const due = this.#scheduled.filter((entry) => !entry.cancelled && entry.at <= this.#time);
    this.#scheduled = this.#scheduled.filter((entry) => !due.includes(entry));
    for (const entry of due) entry.run();
  }
}

function feedbackWriting(write: (text: string) => Promise<void>): {
  feedback: CopyFeedback;
  clock: FakeClock;
} {
  const clock = new FakeClock();
  return { feedback: new CopyFeedback(write, clock), clock };
}

describe('CopyFeedback', () => {
  it('writes the text and shows it copied', async () => {
    const written: string[] = [];
    const { feedback } = feedbackWriting(async (text) => {
      written.push(text);
    });

    const outcome = await feedback.copy('Cross-Origin-Opener-Policy: same-origin');

    expect({ outcome, written, copied: feedback.copied }).toEqual({
      outcome: 'copied',
      written: ['Cross-Origin-Opener-Policy: same-origin'],
      copied: true,
    });
  });

  it('stops showing it copied once the hold has passed', async () => {
    const { feedback, clock } = feedbackWriting(async () => {});
    await feedback.copy('x');

    clock.advance(COPIED_HOLD_MS - 1);
    const during = feedback.copied;
    clock.advance(1);

    expect({ during, after: feedback.copied }).toEqual({ during: true, after: false });
  });

  it('holds a second copy for a full hold from the second press', async () => {
    const { feedback, clock } = feedbackWriting(async () => {});
    await feedback.copy('x');
    clock.advance(COPIED_HOLD_MS - 1);

    await feedback.copy('x');
    clock.advance(1);

    expect(feedback.copied).toBe(true);
  });

  it('reports a refused write and shows nothing copied', async () => {
    const { feedback } = feedbackWriting(() => Promise.reject(new Error('not allowed')));

    const outcome = await feedback.copy('x');

    expect({ outcome, copied: feedback.copied }).toEqual({ outcome: 'refused', copied: false });
  });
});
