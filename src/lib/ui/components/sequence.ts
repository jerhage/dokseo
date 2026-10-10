import type { Emphasis } from './emphasis';

type SequenceTone = 'primary' | 'accent';

type SequenceParticipant = {
  readonly label: string;
  readonly tone?: SequenceTone;
};

type SequenceMessage = {
  readonly kind: 'message';
  readonly from: number;
  readonly to: number;
  readonly label: string;
  readonly dashed?: boolean;
  readonly emphasis?: Emphasis;
};

type SequenceNote = {
  readonly kind: 'note';
  readonly from: number;
  readonly to: number;
  readonly text: string;
  readonly emphasis?: Emphasis;
};

type SequenceStep = SequenceMessage | SequenceNote;

type MessageSpan =
  | { readonly direction: 'forward' | 'reverse'; readonly start: number; readonly end: number }
  | { readonly direction: 'self'; readonly start: number };

type SequenceRow =
  | {
      readonly kind: 'message';
      readonly speech: string;
      readonly label: string;
      readonly span: MessageSpan;
      readonly dashed: boolean;
      readonly emphasis: Emphasis | undefined;
    }
  | {
      readonly kind: 'note';
      readonly text: string;
      readonly start: number;
      readonly end: number;
      readonly emphasis: Emphasis | undefined;
    };

function messageSpan(from: number, to: number): MessageSpan {
  if (from === to) return { direction: 'self', start: from + 1 };
  return {
    direction: from < to ? 'forward' : 'reverse',
    start: Math.min(from, to) + 1,
    end: Math.max(from, to) + 1,
  };
}

function messageSpeech(
  participants: readonly SequenceParticipant[],
  from: number,
  to: number,
): string {
  const sender = participants[from]?.label ?? '';
  const receiver = from === to ? 'itself' : (participants[to]?.label ?? '');
  return `${sender} to ${receiver}:`;
}

function sequenceRows(
  participants: readonly SequenceParticipant[],
  steps: readonly SequenceStep[],
): readonly SequenceRow[] {
  return steps.map((step): SequenceRow => {
    if (step.kind === 'note') {
      return {
        kind: 'note',
        text: step.text,
        start: Math.min(step.from, step.to) + 1,
        end: Math.max(step.from, step.to) + 1,
        emphasis: step.emphasis,
      };
    }
    return {
      kind: 'message',
      speech: messageSpeech(participants, step.from, step.to),
      label: step.label,
      span: messageSpan(step.from, step.to),
      dashed: step.dashed === true,
      emphasis: step.emphasis,
    };
  });
}

function sequenceProblems(count: number, steps: readonly SequenceStep[]): readonly string[] {
  const outside = (index: number): boolean =>
    !Number.isInteger(index) || index < 0 || index >= count;
  return steps.flatMap((step, position) =>
    outside(step.from) || outside(step.to)
      ? [
          `Step ${position + 1} of the sequence names a participant that does not exist: ${step.from} to ${step.to}, with ${count} participants`,
        ]
      : [],
  );
}

export { messageSpan, messageSpeech, sequenceProblems, sequenceRows };
export type {
  MessageSpan,
  SequenceMessage,
  SequenceNote,
  SequenceParticipant,
  SequenceRow,
  SequenceStep,
  SequenceTone,
};
