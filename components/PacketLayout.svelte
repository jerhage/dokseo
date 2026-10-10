<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';
  import { packetProblems } from './packet';
  import type { PacketRow, PacketTone } from './packet';
  import { SCROLL_REGION } from './scroll-region';

  type Props = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'role' | 'aria-label'> & {
    label: string;
    bits: number;
    offsets: readonly number[];
    rows: readonly PacketRow[];
  };

  let { label, bits, offsets, rows, class: className, ...rest }: Props = $props();

  const FIELD_TONES: Readonly<Record<PacketTone, string>> = {
    primary: 'packet-field-primary',
    accent: 'packet-field-accent',
    success: 'packet-field-success',
    warning: 'packet-field-warning',
    danger: 'packet-field-danger',
  };

  const checked = $derived.by(() => {
    const problems = packetProblems(bits, offsets, rows);
    if (problems.length > 0) throw new Error(problems.join('\n'));
    return rows;
  });
</script>

<div
  {...rest}
  {...SCROLL_REGION}
  class={['packet', className]}
  aria-label={label}
  style:--packet-bits={bits}
>
  <div class="packet-ruler" aria-hidden="true">
    {#each offsets as offset (offset)}
      <span class="packet-offset" style:--packet-offset={offset}>{offset}</span>
    {/each}
  </div>
  {#each checked as row, rowIndex (rowIndex)}
    <div class="packet-row">
      {#each row as field, fieldIndex (fieldIndex)}
        <div
          class={[
            'packet-field',
            field.emphasis === 'active' && 'packet-field-active',
            field.emphasis === 'dimmed' && 'step-through-dimmed',
            field.tone !== undefined && FIELD_TONES[field.tone],
          ]}
          style:--packet-span={field.span}
        >
          <span class="packet-field-name">{field.name}</span>
          {#if field.detail !== undefined}
            <span class="packet-field-detail">{field.detail}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/each}
</div>
