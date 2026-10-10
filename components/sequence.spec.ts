import { describe, expect, it } from 'vitest';
import { messageSpan, messageSpeech, sequenceProblems, sequenceRows } from './sequence';
import type { SequenceParticipant, SequenceStep } from './sequence';

const PARTICIPANTS: readonly SequenceParticipant[] = [{ label: 'Client' }, { label: 'Server' }];

describe('messageSpan', () => {
  it('runs forward over the columns from the sender to the receiver, counted from 1', () => {
    expect(messageSpan(0, 1)).toEqual({ direction: 'forward', start: 1, end: 2 });
  });

  it('runs in reverse over the same columns when the receiver comes first', () => {
    expect(messageSpan(2, 0)).toEqual({ direction: 'reverse', start: 1, end: 3 });
  });

  it('names only the column of a participant that messages itself', () => {
    expect(messageSpan(1, 1)).toEqual({ direction: 'self', start: 2 });
  });
});

describe('messageSpeech', () => {
  it('reads sender to receiver, or to itself', () => {
    expect([messageSpeech(PARTICIPANTS, 0, 1), messageSpeech(PARTICIPANTS, 1, 1)]).toEqual([
      'Client to Server:',
      'Server to itself:',
    ]);
  });
});

describe('sequenceRows', () => {
  it('orders a note across the columns it spans whichever way it is given', () => {
    const [row] = sequenceRows(PARTICIPANTS, [{ kind: 'note', from: 1, to: 0, text: 'Agreed' }]);

    expect(row).toMatchObject({ kind: 'note', start: 1, end: 2 });
  });
});

describe('sequenceProblems', () => {
  it('reports a step that names a participant that does not exist', () => {
    const steps: readonly SequenceStep[] = [
      { kind: 'message', from: 0, to: 1, label: 'Hello' },
      { kind: 'message', from: 0, to: 2, label: 'Lost' },
    ];

    expect(sequenceProblems(2, steps)).toHaveLength(1);
    expect(sequenceProblems(2, steps)[0]).toContain('Step 2');
  });

  it('reports nothing for steps between participants that exist', () => {
    expect(sequenceProblems(2, [{ kind: 'message', from: 1, to: 0, label: 'Hi' }])).toEqual([]);
  });
});
