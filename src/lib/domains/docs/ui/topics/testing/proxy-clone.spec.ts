import { describe, expect, it } from 'vitest';
import { CloneTrial, attempt } from './proxy-clone.svelte';

const COPY = '{"captures":[{"id":"capture-1","text":"本を読む"}],"tags":["Grammar"]}';

describe('CloneTrial', () => {
  it('clones the $state plan in Node, where the server build of runes makes no proxy', () => {
    const trial = new CloneTrial();
    trial.cloneDirect();

    expect(trial.outcome).toEqual({ kind: 'cloned', way: 'direct', copy: COPY });
  });

  it('clones a snapshot of the plan', () => {
    const trial = new CloneTrial();
    trial.cloneSnapshot();

    expect(trial.outcome).toEqual({ kind: 'cloned', way: 'snapshot', copy: COPY });
  });
});

describe('attempt', () => {
  it('reports the name and message of a refused clone', () => {
    const outcome = attempt('direct', { run: () => undefined });

    expect(outcome.kind).toBe('refused');
    expect(outcome.kind === 'refused' && outcome.name).toBe('DataCloneError');
  });
});
