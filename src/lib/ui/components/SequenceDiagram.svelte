<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { sequenceProblems, sequenceRows } from './sequence';
  import type { SequenceParticipant, SequenceStep, SequenceTone } from './sequence';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role' | 'aria-label'> & {
    label: string;
    participants: readonly SequenceParticipant[];
    steps: readonly SequenceStep[];
  };

  let { label, participants, steps, class: className, ...rest }: Props = $props();

  const PARTICIPANT_TONES: Readonly<Record<SequenceTone, string>> = {
    primary: 'sequence-participant-primary',
    accent: 'sequence-participant-accent',
  };

  const rows = $derived.by(() => {
    const problems = sequenceProblems(participants.length, steps);
    if (problems.length > 0) throw new Error(problems.join('\n'));
    return sequenceRows(participants, steps);
  });
</script>

<div
  {...rest}
  class={['sequence', className]}
  role="group"
  aria-label={label}
  style:--sequence-columns={participants.length}
>
  <div class="sequence-participants">
    {#each participants as participant, index (index)}
      <div
        class={[
          'sequence-participant',
          participant.tone !== undefined && PARTICIPANT_TONES[participant.tone],
        ]}
      >
        {participant.label}
      </div>
    {/each}
  </div>
  <div class="sequence-body">
    {#each participants as _, index (index)}
      <div class="sequence-lifeline" aria-hidden="true" style:--sequence-index={index + 1}></div>
    {/each}
    {#each rows as row, index (index)}
      {#if row.kind === 'note'}
        <div
          class={[
            'sequence-note',
            row.emphasis === 'active' && 'sequence-note-active',
            row.emphasis === 'dimmed' && 'step-through-dimmed',
          ]}
          style:--sequence-start={row.start}
          style:--sequence-end={row.end}
        >
          {row.text}
        </div>
      {:else}
        <div
          class={[
            'sequence-message',
            row.span.direction === 'reverse' && 'sequence-message-reverse',
            row.span.direction === 'self' && 'sequence-message-self',
            row.dashed && 'sequence-message-dashed',
            row.emphasis === 'active' && 'sequence-message-active',
            row.emphasis === 'dimmed' && 'step-through-dimmed',
          ]}
          style:--sequence-start={row.span.start}
          style:--sequence-end={row.span.direction === 'self' ? undefined : row.span.end}
        >
          <span class="visually-hidden">{row.speech}</span>
          <span class="sequence-message-label">{row.label}</span>
        </div>
      {/if}
    {/each}
  </div>
</div>
