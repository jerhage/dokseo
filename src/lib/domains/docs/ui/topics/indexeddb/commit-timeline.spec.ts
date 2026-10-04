import { describe, expect, it } from 'vitest';
import type { CommitVariant } from './auto-commit';
import { CommitTimeline } from './commit-timeline.svelte';

function clock(): () => number {
  let time = 100;
  return () => {
    time += 5;
    return time;
  };
}

describe('CommitTimeline', () => {
  it('records each note with the time since the run started', async () => {
    const timeline = new CommitTimeline({
      now: clock(),
      run: (_variant, note) => {
        note('step', "put('first') was accepted");
        note('failure', "put('second') threw TransactionInactiveError");
        return Promise.resolve();
      },
    });

    await timeline.run();

    expect(timeline.entries).toEqual([
      { at: 5, tone: 'step', text: "put('first') was accepted" },
      { at: 10, tone: 'failure', text: "put('second') threw TransactionInactiveError" },
    ]);
  });

  it('runs the chosen variant and clears the previous run', async () => {
    const ran: CommitVariant[] = [];
    const timeline = new CommitTimeline({
      now: clock(),
      run: (variant, note) => {
        ran.push(variant);
        note('event', `ran ${variant}`);
        return Promise.resolve();
      },
    });

    await timeline.run();
    timeline.variant = 'unrelated-first';
    await timeline.run();

    expect(ran).toEqual(['unrelated-await', 'unrelated-first']);
    expect(timeline.entries.map((entry) => entry.text)).toEqual(['ran unrelated-first']);
  });

  it('adds a rejected run to the timeline as a failure and stops running', async () => {
    const timeline = new CommitTimeline({
      now: clock(),
      run: () => Promise.reject(new Error('The database failed to open')),
    });

    await timeline.run();

    expect(timeline.entries.at(-1)).toMatchObject({
      tone: 'failure',
      text: 'The database failed to open',
    });
    expect(timeline.running).toBe(false);
  });
});
